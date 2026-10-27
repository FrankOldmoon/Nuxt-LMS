#!/usr/bin/env bash
#
# 在 SurveyKing 的 H2 库里执行 SQL / 配置 LMS 第三方登录
#
# SurveyKing 跑在 Docker 里，数据在 H2 文件库（/app/db/surveyking.mv.db），
# 官方镜像只有 JRE，但 jar 里自带 h2-*.jar，可以用它的 Shell 工具操作。
#
# 注意：
#   - 应用运行时 H2 文件被锁，必须先 `docker stop` 再操作；
#   - 表名是 T_XXX（T_SYS_INFO / T_USER / T_ACCOUNT），
#     H2 用 MySQL 模式且 NON_KEYWORDS=USER，大小写敏感；
#   - SQL 通过 -script 文件喂进去（-sql 会被 shell 的引号吃掉 JSON 里的双引号）。
#
# 用法（在 157 上）：
#   bash sk-h2.sh sql "SELECT * FROM T_SYS_INFO"
#   bash sk-h2.sh file /path/to/query.sql
#   bash sk-h2.sh enable-lms <clientId> <clientSecret> <publicBaseUrl>
#   bash sk-h2.sh bind <lmsUserId> <surveykingUserId>
#   bash sk-h2.sh tables
#
set -euo pipefail

SK_DIR=${SK_DIR:-/www/dk_project/dk_app/dk_surveyking}
CONTAINER=${CONTAINER:-dk_surveyking-surveyking-1}
H2_JAR=$SK_DIR/lib/h2-2.1.214.jar
DB_VOLUME=$(docker inspect "$CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/app/db"}}{{.Name}}{{end}}{{end}}')
H2_URL="jdbc:h2:/app/db/surveyking;MODE=MySQL;NON_KEYWORDS=USER"

[ -n "$DB_VOLUME" ] || { echo "❌ 找不到 /app/db 对应的卷"; exit 1; }
[ -f "$H2_JAR" ] || { echo "❌ 缺少 $H2_JAR"; exit 1; }

# 用「SQL 放文件、容器内 $(cat) 读入」的方式执行，
# 避免 -sql 参数被外层 shell 吃掉 JSON 里的双引号。
# （H2 2.1.214 的 Shell 不支持 -script，只能这么绕。）
run_sql_file() {
  local file="$1" tmp
  tmp=$(mktemp -d)
  cp "$file" "$tmp/query.sql"
  chmod 644 "$tmp/query.sql"
  docker run --rm \
    --entrypoint sh \
    -v "$DB_VOLUME":/app/db \
    -v "$H2_JAR":/h2.jar:ro \
    -v "$tmp":/q:ro \
    surveyking/surveyking \
    -c 'java -cp /h2.jar org.h2.tools.Shell -url "jdbc:h2:/app/db/surveyking;MODE=MySQL;NON_KEYWORDS=USER" -user sa -password sa -sql "$(cat /q/query.sql)"' \
    2>&1 | grep -v '^$'
  rm -rf "$tmp"
}

run_sql() {
  local tmp
  tmp=$(mktemp -d)
  printf '%s\n' "$1" > "$tmp/query.sql"
  chmod 644 "$tmp/query.sql"
  run_sql_file "$tmp/query.sql"
  rm -rf "$tmp"
}

case "${1:-}" in
  sql)
    run_sql "$2"
    ;;
  file)
    run_sql_file "$2"
    ;;
  tables)
    run_sql "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC'"
    ;;
  enable-lms)
    CID="$2"; CSEC="$3"; BASE="$4"
    tmp=$(mktemp -d)
    cat > "$tmp/query.sql" <<SQL
UPDATE T_SYS_INFO SET OAUTH_SETTING = '{"publicBaseUrl":"${BASE}","google":{"enabled":true,"clientId":"${CID}","clientSecret":"${CSEC}"}}' WHERE ID = '1';
SELECT OAUTH_SETTING FROM T_SYS_INFO WHERE ID = '1';
SQL
    run_sql_file "$tmp/query.sql"
    rm -rf "$tmp"
    ;;
  bind)
    # bind <lmsUserId> <surveykingUserId>
    # 把 LMS 身份（id_token 的 sub = LMS users.id）绑到 SurveyKing 账号上
    LMS_ID="$2"; SK_USER="$3"
    tmp=$(mktemp -d)
    cat > "$tmp/query.sql" <<SQL
INSERT INTO T_ACCOUNT (ID, USER_TYPE, USER_ID, AUTH_TYPE, AUTH_ACCOUNT, STATUS, IS_DELETED, CREATE_AT, CREATE_BY)
SELECT (SELECT COALESCE(MAX(ID), 0) + 1 FROM T_ACCOUNT),
       'SysUser', '${SK_USER}', 'GOOGLE', '${LMS_ID}', 1, 0, CURRENT_TIMESTAMP, 'lms-sso'
WHERE NOT EXISTS (SELECT 1 FROM T_ACCOUNT WHERE AUTH_TYPE = 'GOOGLE' AND AUTH_ACCOUNT = '${LMS_ID}');
SELECT id, user_id, auth_type, auth_account, status FROM T_ACCOUNT;
SQL
    run_sql_file "$tmp/query.sql"
    rm -rf "$tmp"
    ;;
  *)
    echo "用法: $0 sql <语句> | file <sql文件> | tables | enable-lms <id> <secret> <baseUrl> | bind <lmsUserId> <skUserId>"
    exit 1
    ;;
esac
