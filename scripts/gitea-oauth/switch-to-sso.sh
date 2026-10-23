#!/usr/bin/env bash
#
# 把 10.28.1.160 上的 Gitea 切成「只能用 LMS 账号登录」
#
# 做四件事（幂等，可重复跑）：
#   1. 建 OAuth2 登录源（provider=openidConnect，指向 LMS 的 discovery 文档）
#   2. 写入 external_login_user 绑定表（学号 = LMS username）
#   3. 改 app.ini：关掉密码表单 / 密码 Basic Auth / Passkey
#   4. 重启 + 自检
#
# 为什么 Gitea 只能走 openidConnect：
#   Gitea 没有「通用 OAuth2」provider，唯一的通用档就是 OpenID Connect，
#   而 goth 的实现强制要求 ① discovery 文档 ② token 响应里带 id_token
#   （services/auth/source/oauth2/providers_openid.go → openidConnect.New）。
#   所以 LMS 侧补了 /api/oauth/openid-configuration 和 id_token 签发。
#
# 用法（在 160 上以 root 跑）：
#   bash switch-to-sso.sh --client-id lms_xxx --client-secret yyy \
#        --discovery http://10.28.1.151/api/oauth/openid-configuration \
#        --bindings bindings.sql
#   bash switch-to-sso.sh --rollback          # 恢复密码登录
#
set -euo pipefail

GITEA_BIN=/usr/local/bin/gitea
APP_INI=/data/gitea/conf/app.ini
GITEA_WORK_DIR=/data/gitea
GITEA_CUSTOM=/data/gitea
PGPASSWORD_VAL=$(grep -m1 '^PASSWD' "$APP_INI" | sed 's/.*= *//')
PGDB=$(grep -m1 '^NAME' "$APP_INI" | sed 's/.*= *//')
PGUSER=$(grep -m1 '^USER' "$APP_INI" | sed 's/.*= *//')
SOURCE_NAME=lms

CLIENT_ID="" CLIENT_SECRET="" DISCOVERY="" BINDINGS="" ROLLBACK=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --client-id) CLIENT_ID="$2"; shift 2 ;;
    --client-secret) CLIENT_SECRET="$2"; shift 2 ;;
    --discovery) DISCOVERY="$2"; shift 2 ;;
    --bindings) BINDINGS="$2"; shift 2 ;;
    --rollback) ROLLBACK=1; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$*"; }

gitea_cli() {
  sudo -u git env GITEA_WORK_DIR="$GITEA_WORK_DIR" GITEA_CUSTOM="$GITEA_CUSTOM" \
    "$GITEA_BIN" --config "$APP_INI" "$@"
}

psql_g() {
  PGPASSWORD="$PGPASSWORD_VAL" psql -h 127.0.0.1 -U "$PGUSER" -d "$PGDB" "$@"
}

# 在 app.ini 指定 section 内设置 key=value（存在则改，不存在则补在段末）
ini_set() {
  local sect="$1" key="$2" val="$3" tmp
  tmp=$(mktemp)
  awk -v sect="[$sect]" -v key="$key" -v val="$val" '
    BEGIN { insect = 0; done = 0 }
    /^\[/ {
      if (insect && !done) { print key " = " val; done = 1 }
      insect = ($0 == sect)
      print; next
    }
    {
      if (insect && !done && $0 ~ "^[ \t]*" key "[ \t]*=") { print key " = " val; done = 1; next }
      print
    }
    END { if (insect && !done) print key " = " val }
  ' "$APP_INI" > "$tmp"
  cat "$tmp" > "$APP_INI"
  rm -f "$tmp"
}

restart_gitea() {
  systemctl restart gitea
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1/api/v1/version; then ok "gitea 已就绪"; return 0; fi
    sleep 1
  done
  bad "gitea 启动超时，检查 journalctl -u gitea -n 80"
  return 1
}

# ---------------- 回滚 ----------------
if [[ $ROLLBACK -eq 1 ]]; then
  say "回滚：恢复密码登录"
  cp -a "$APP_INI" "$APP_INI.bak.rollback.$(date +%s)"
  ini_set service ENABLE_PASSWORD_SIGNIN_FORM true
  ini_set service ENABLE_BASIC_AUTHENTICATION true
  ini_set service ENABLE_PASSKEY_AUTHENTICATION true
  restart_gitea
  ok "已恢复密码登录（OAuth 源保留，可继续用 LMS 按钮登录）"
  exit 0
fi

[[ -n "$CLIENT_ID" && -n "$CLIENT_SECRET" && -n "$DISCOVERY" ]] || {
  echo "需要 --client-id / --client-secret / --discovery"; exit 1
}

# ---------------- 0. 预检 ----------------
say "0. 预检"
cp -a "$APP_INI" "$APP_INI.bak.$(date +%Y%m%d%H%M%S)"
ok "已备份 $APP_INI"

if curl -fsS "$DISCOVERY" -o /tmp/oidc-discovery.json; then
  ok "LMS discovery 可达：$(python3 -c 'import json;print(json.load(open("/tmp/oidc-discovery.json"))["issuer"])')"
else
  bad "LMS discovery 不可达：$DISCOVERY —— 先确认 LMS 已部署新版本"; exit 1
fi

# ---------------- 1. 建登录源 ----------------
say "1. OAuth2 登录源 ($SOURCE_NAME)"
SRC_ID=$(psql_g -At -c "select id from login_source where name = '$SOURCE_NAME';" | tr -d '[:space:]')
if [[ -n "$SRC_ID" ]]; then
  ok "已存在，id=$SRC_ID（跳过创建）"
else
  gitea_cli admin auth add-oauth \
    --name "$SOURCE_NAME" \
    --provider openidConnect \
    --key "$CLIENT_ID" \
    --secret "$CLIENT_SECRET" \
    --auto-discover-url "$DISCOVERY" \
    --scopes openid --scopes profile --scopes email \
    >/tmp/add-oauth.log 2>&1 || { bad "创建失败"; cat /tmp/add-oauth.log; exit 1; }
  SRC_ID=$(psql_g -At -c "select id from login_source where name = '$SOURCE_NAME';" | tr -d '[:space:]')
  ok "已创建，id=$SRC_ID"
fi

# ---------------- 2. 绑定表 ----------------
say "2. external_login_user 绑定"
if [[ -n "$BINDINGS" ]]; then
  psql_g -q -v ON_ERROR_STOP=1 -f "$BINDINGS"
  ok "已导入 $BINDINGS"
fi
psql_g -c "select count(*) as bound from external_login_user where login_source_id = $SRC_ID;"

# ---------------- 3. 关掉本地登录 ----------------
say "3. 关闭密码 / Passkey 登录"
ini_set service ENABLE_PASSWORD_SIGNIN_FORM false
ini_set service ENABLE_BASIC_AUTHENTICATION false
ini_set service ENABLE_PASSKEY_AUTHENTICATION false
ok "app.ini 已更新："
grep -E "^ENABLE_(PASSWORD_SIGNIN_FORM|BASIC_AUTHENTICATION|PASSKEY_AUTHENTICATION)" "$APP_INI" | sed 's/^/    /'

# ---------------- 4. 重启 + 自检 ----------------
say "4. 重启并自检"
restart_gitea

LOGIN_HTML=$(curl -s http://127.0.0.1/user/login)
[[ "$LOGIN_HTML" == *'name="password"'* ]] && bad "登录页仍有密码输入框" || ok "登录页无密码输入框"
[[ "$LOGIN_HTML" == *"/user/oauth2/$SOURCE_NAME"* ]] && ok "登录页有 LMS 按钮" || bad "登录页找不到 LMS 按钮"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -d 'user_name=frank&password=x' http://127.0.0.1/user/login)
[[ "$CODE" == "403" ]] && ok "POST /user/login 已拒绝（403）" || bad "POST /user/login 返回 $CODE"
CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/v1/user)
ok "匿名 GET /api/v1/user → $CODE（401 正常）"

say "完成"
cat <<'EOF'
  自救通道（万一 LMS 挂了 / 绑定错了）：
    1) 临时开回密码登录：bash switch-to-sso.sh --rollback
    2) 改管理员密码（不需要登录页）：
         sudo -u git env GITEA_WORK_DIR=/data/gitea GITEA_CUSTOM=/data/gitea \
           /usr/local/bin/gitea admin user change-password -u frank -p 'NewPassw0rd'
    3) 或造一个临时管理员：
         ... gitea admin user create --admin --username rescue --password 'xxx' --email r@local
EOF
