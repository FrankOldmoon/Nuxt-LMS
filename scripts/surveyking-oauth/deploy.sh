#!/usr/bin/env bash
#
# 在 SurveyKing 服务器（10.28.1.157）上重新打补丁并部署
#
# 为什么需要这个脚本
# ------------------
# SurveyKing 的 jar 是**打过补丁的二进制**（把「Google 登录」通道改指向 LMS），
# 官方镜像每次升级都会把补丁冲掉。升级之后跑这个脚本就能重新打上。
#
# 它做的是：
#   1. 从正在运行的容器里取出原始 jar（官方镜像那份）
#   2. 用 scripts/surveyking-oauth/patch_google_to_lms.py 打补丁
#   3. 备份原 jar 与 H2 数据库
#   4. 把补丁 jar 塞回容器并重启
#   5. 校验：首页可达、授权入口指向 LMS、登录页文案已是「LMS 账号登录」
#
# 用法（在任意能 ssh 到 157 的机器上）：
#   bash scripts/surveyking-oauth/deploy.sh
#   bash scripts/surveyking-oauth/deploy.sh --issuer http://10.28.1.151
#   bash scripts/surveyking-oauth/deploy.sh --host 10.28.1.157 --key ~/.ssh/id_ed25519
#
set -euo pipefail

HOST=10.28.1.157
KEY=${KEY:-/Users/oldmoon/Documents/github/157/10.28.1.157_id_ed25519}
CONTAINER=dk_surveyking-surveyking-1
SK_DIR=/www/dk_project/dk_app/dk_surveyking
ISSUER=http://10.28.1.151

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --key) KEY="$2"; shift 2 ;;
    --issuer) ISSUER="$2"; shift 2 ;;
    --container) CONTAINER="$2"; shift 2 ;;
    -h|--help)
      echo "用法: $0 [--host 10.28.1.157] [--key <私钥>] [--issuer http://10.28.1.151] [--container 名称]"
      exit 0 ;;
    *) echo "未知参数：$1"; exit 1 ;;
  esac
done

HERE=$(cd "$(dirname "$0")" && pwd)
PATCHER="$HERE/patch_google_to_lms.py"
[[ -f "$PATCHER" ]] || { echo "❌ 找不到补丁脚本：$PATCHER"; exit 1; }

SSH="ssh -i $KEY -o StrictHostKeyChecking=no root@$HOST"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

say() { printf '\n== %s\n' "$1"; }

say "1. 取原始 jar"
# 必须是**官方未打补丁**的那份：
# 容器里跑的是打过补丁的 jar，直接拿来会找不到 Google 常量（脚本会正确地拒绝部署）。
# 所以优先用备份的官方原件，没有就从容器取一次并保存下来。
PRISTINE=$SK_DIR/backup/surveyking.jar.orig
if $SSH "test -f $PRISTINE" 2>/dev/null; then
  echo "  用官方原件 $PRISTINE"
  scp -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST:$PRISTINE" "$WORK/surveyking-orig.jar" >/dev/null
else
  echo "  首次：从容器取出官方 jar 并留存"
  $SSH "docker cp $CONTAINER:/app/surveyking.jar /tmp/sk-orig.jar" >/dev/null
  scp -i "$KEY" -o StrictHostKeyChecking=no "root@$HOST:/tmp/sk-orig.jar" "$WORK/surveyking-orig.jar" >/dev/null
  scp -i "$KEY" -o StrictHostKeyChecking=no "$WORK/surveyking-orig.jar" "root@$HOST:$PRISTINE" >/dev/null
  $SSH "mkdir -p $SK_DIR/backup"
fi
ls -lh "$WORK/surveyking-orig.jar"

say "2. 打补丁"
python3 "$PATCHER" \
  --jar "$WORK/surveyking-orig.jar" \
  --out "$WORK/surveyking-lms.jar" \
  --issuer "$ISSUER" \
  --authorize "$ISSUER/api/oauth/authorize" \
  --token "$ISSUER/api/oauth/token" \
  --jwks "$ISSUER/api/oauth/jwks"

say "3. 备份（原始 jar + H2 数据库）"
$SSH "mkdir -p $SK_DIR/backup && cp $SK_DIR/surveyking-lms.jar $SK_DIR/backup/surveyking-lms.jar.\$(date +%Y%m%d%H%M%S) 2>/dev/null; cp /var/lib/docker/volumes/4c1834fffd95868e632ce5cb62ddd03701ab3c70f43f7990272c6375acbae965/_data/surveyking.mv.db $SK_DIR/backup/surveyking.mv.db.\$(date +%Y%m%d%H%M%S) 2>/dev/null; ls -1t $SK_DIR/backup | head -4"

say "4. 部署并重启"
scp -i "$KEY" -o StrictHostKeyChecking=no "$WORK/surveyking-lms.jar" "root@$HOST:$SK_DIR/surveyking-lms.jar" >/dev/null
$SSH "docker cp $SK_DIR/surveyking-lms.jar $CONTAINER:/app/surveyking.jar && docker restart $CONTAINER >/dev/null"
sleep 20
$SSH "docker ps --filter name=$CONTAINER --format '{{.Status}}'"

say "5. 校验"
echo -n "  首页 HTTP          : "
curl -s -o /dev/null -w '%{http_code}\n' "http://$HOST/"
echo -n "  授权入口指向        : "
curl -s -X POST "http://$HOST/api/public/oauth/login/google/start" \
  -H 'content-type: application/json' -d '{"redirect":"/"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['authorizationUrl'].split('?')[0])"
echo -n "  第三方登录可用      : "
curl -s "http://$HOST/api/system" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['oauthProviders'])"
echo -n "  自助注册开关        : "
curl -s "http://$HOST/api/system" | python3 -c "
import json,sys
r = (json.load(sys.stdin)['data'].get('registerInfo') or {})
print('已开启 ✓' if r.get('registerEnabled') else '❌ 已关闭 —— 没绑定的 LMS 用户会被拒（报 not_bound），用 set-register.mjs --enable 打开')
"

# 登录页 chunk 的文件名从**本地刚打好的 jar** 里读（服务器上的 /asset-manifest.json
# 会被 SPA 兜底成首页，取不到 JSON），再去服务器拉这个文件看内容对不对。
LOGIN_CHUNK=$(python3 - "$WORK/surveyking-lms.jar" <<'PY'
import sys, zipfile, json
z = zipfile.ZipFile(sys.argv[1])
manifest = json.loads(z.read('BOOT-INF/classes/static/asset-manifest.json'))
print(manifest.get('/p__user__Login.js', ''))
PY
)
echo -n "  登录页 chunk        : "
echo "$LOGIN_CHUNK"
echo -n "  按钮文案            : "
if curl -s "http://$HOST$LOGIN_CHUNK" | grep -q 'LMS \\u8d26\\u53f7\\u767b\\u5f55'; then
  echo "是「LMS 账号登录」✓"
else
  echo "不是 LMS（检查补丁）"
fi
echo -n "  残留 Google 按钮    : "
if curl -s "http://$HOST$LOGIN_CHUNK" | grep -q 'socialLabel,children:"Google"'; then
  echo "还有（异常）"
else
  echo "无 ✓"
fi

say "完成"
cat <<EOF
  回退（换回官方 jar）：
    $SSH "cp $SK_DIR/backup/surveyking.jar.orig /tmp/ && docker cp /tmp/surveyking.jar.orig $CONTAINER:/app/surveyking.jar && docker restart $CONTAINER"
EOF
