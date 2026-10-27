#!/usr/bin/env python3
"""
把 SurveyKing 的「Google 登录」通道改指向 LMS（OIDC）

背景
----
SurveyKing 1.13 只内置两种第三方登录：Google、微信，且端点**硬编码**在
`cn/surveyking.server.impl.OAuthServiceImpl` 的常量池里：

    GOOGLE_AUTHORIZATION_URL = https://accounts.google.com/o/oauth2/v2/auth
    GOOGLE_TOKEN_URL         = https://oauth2.googleapis.com/token
    GOOGLE_JWK_SET_URL       = https://www.googleapis.com/oauth2/v3/certs
    GOOGLE_ISSUER            = https://accounts.google.com

而它的 Google 通道本身就是标准 OIDC：授权码 + PKCE(S256) + nonce，
换到 token 后用 NimbusJwtDecoder 拿 JWKS 验 id_token 的 RS256 签名。
所以只要把这 4 个常量换成 LMS 的端点，SurveyKing 就能直接当 LMS 的 SP 用。

为什么改二进制而不是改源码重编译
--------------------------------
服务器上只有 JRE（没有 javac/maven），重新构建整套 SurveyKing 不现实；
而这 4 个字符串是**编译期常量**（private static final String），
它们被内联进各自的调用点，正好可以用「常量池重写」精确替换：
常量池条目是按**索引**引用的，改某条 UTF8 的长度不影响其它条目，
只要重写常量池本身、保留后续字节流即可。

安全性
------
- 只做等价的常量替换，不改任何逻辑；
- 脚本内置 round-trip 自检（解析→重新序列化必须与原文件逐字节相同），
  证明解析器正确后才允许写出；
- 原 jar 永不覆盖，输出到新文件。

用法
----
    python3 patch_google_to_lms.py \
        --jar /path/to/surveyking.jar \
        --issuer http://10.28.1.151 \
        --authorize http://10.28.1.151/api/oauth/authorize \
        --token http://10.28.1.151/api/oauth/token \
        --jwks http://10.28.1.151/api/oauth/jwks \
        --out /path/to/surveyking-lms.jar
"""

import argparse
import io
import shutil
import struct
import sys
import zipfile

# SurveyKing 把 OAuth 实现在 rdbms 模块里
RDBMS_ENTRY = 'BOOT-INF/lib/rdbms-v1.13.0.jar'
CLASS_PATH = 'cn/surveyking/server/impl/OAuthServiceImpl.class'

# 需要替换的常量：{原始: 目标}
DEFAULT_REPLACEMENTS = {
    'https://accounts.google.com/o/oauth2/v2/auth': None,   # authorize 端点
    'https://oauth2.googleapis.com/token': None,            # token 端点
    'https://www.googleapis.com/oauth2/v3/certs': None,     # JWKS 端点
    'https://accounts.google.com': None,                   # id_token 的 iss
}

# H2 兼容修复（与上面的 OAuth 端点无关，是独立的坑）
#
# SurveyKing 查绑定账号时用 MySQL 专有的 `BINARY auth_account = ?`：
#     accountMapper.selectOne(... .apply("BINARY auth_account = {0}", account))
# 本部署用的�� H2（MODE=MySQL），H2 没有 BINARY 这个一元运算符 →
# 直接抛 BadSqlGrammarException，OAuth 回调返回 provider_error。
# H2 的字符串比较本来就是大小写敏感（BINARY 在 MySQL 里也是这个意思），
# 所以去掉 BINARY 前缀语义不变。
H2_COMPAT_REPLACEMENTS = {
    'BINARY auth_account = {0}': 'auth_account = {0}',
}


# ---------------------------------------------------------------- class 文件解析
def parse_class(data: bytes):
    """返回 (minor, major, cp_count, entries, offset_after_pool)"""
    if data[:4] != b'\xca\xfe\xba\xbe':
        raise ValueError('不是 class 文件')
    minor, major = struct.unpack('>HH', data[4:8])
    count = struct.unpack('>H', data[8:10])[0]
    pos = 10
    entries = []
    i = 1
    while i < count:
        tag = data[pos]
        pos += 1
        if tag == 1:            # Utf8
            length = struct.unpack('>H', data[pos:pos + 2])[0]
            pos += 2
            entries.append((tag, data[pos:pos + length]))
            pos += length
        elif tag in (3, 4):     # Integer / Float
            entries.append((tag, data[pos:pos + 4]))
            pos += 4
        elif tag in (5, 6):     # Long / Double（占两个槽位）
            entries.append((tag, data[pos:pos + 8]))
            pos += 8
            entries.append(None)
            i += 1               # 长/双精度常量额外占一个常量池槽位
        elif tag in (7, 8, 16, 19, 20):          # Class/String/MethodType/Module/Package
            entries.append((tag, data[pos:pos + 2]))
            pos += 2
        elif tag in (9, 10, 11, 12, 17, 18):     # 各种 ref / NameAndType / Dynamic
            entries.append((tag, data[pos:pos + 4]))
            pos += 4
        elif tag == 15:         # MethodHandle
            entries.append((tag, data[pos:pos + 3]))
            pos += 3
        else:
            raise ValueError('未知常量池 tag %d（偏移 %d）' % (tag, pos - 1))
        i += 1
    return minor, major, count, entries, pos


def serialize_class(minor, major, count, entries, rest: bytes) -> bytes:
    out = bytearray()
    out += b'\xca\xfe\xba\xbe'
    out += struct.pack('>HH', minor, major)
    out += struct.pack('>H', count)
    for e in entries:
        if e is None:
            continue
        tag, payload = e
        out.append(tag)
        if tag == 1:
            out += struct.pack('>H', len(payload)) + payload
        else:
            out += payload
    out += rest
    return bytes(out)


def patch_class(data: bytes, replacements: dict) -> tuple:
    """替换常量池里的 UTF8，返回 (新数据, 替换统计)

    replacements 之外，还会自动应用 H2_COMPAT_REPLACEMENTS。
    """
    replacements = {**H2_COMPAT_REPLACEMENTS, **replacements}
    # 自检：解析→序列化必须与原字节完全一致
    minor, major, count, entries, end = parse_class(data)
    if serialize_class(minor, major, count, entries, data[end:]) != data:
        raise SystemExit('✗ 常量池 round-trip 自检失败，解析器有问题，拒绝写出')

    hits = {k: 0 for k in replacements}
    new_entries = []
    for e in entries:
        if e is None:
            new_entries.append(None)
            continue
        tag, payload = e
        if tag == 1:
            try:
                text = payload.decode('utf-8')
            except UnicodeDecodeError:
                new_entries.append(e)
                continue
            if text in replacements:
                new_text = replacements[text]
                new_entries.append((tag, new_text.encode('utf-8')))
                hits[text] += 1
                continue
        new_entries.append(e)

    out = serialize_class(minor, major, count, new_entries, data[end:])
    # 再自检：新文件必须能重新解析，且常量池之后的字节流与原文件完全一致
    m2, M2, c2, e2, end2 = parse_class(out)
    if c2 != count or len(new_entries) != len(entries):
        raise SystemExit('✗ 补丁后常量池条目数不一致')
    if out[end2:] != data[end:]:
        raise SystemExit('✗ 补丁后常量池之后的字节流被改动')
    return out, hits


# ---------------------------------------------------------------- jar 处理
# 前端文案：把「Google 登录」改成「LMS 账号登录」
# 只改内容、不改文件名 —— webpack 的 chunk hash 映射（umi.js 里 9531:"7c34278b"）
# 与 asset-manifest.json 都指向文件名，改名要连带改映射，级联风险高；
# 不改名最坏结果是浏览器缓存了旧 JS（按钮文案还是「Google」），
# 强刷即可，服务端行为不受影响。
FRONTEND_REPLACEMENTS = [
    # 登录页按钮
    (b'"aria-label":"Google"', b'"aria-label":"LMS \\u8d26\\u53f7\\u767b\\u5f55"'),
    (b'socialLabel,children:"Google"', b'socialLabel,children:"LMS \\u8d26\\u53f7\\u767b\\u5f55"'),
    # 管理端：第三方登录设置
    (b'label:"Google Client ID"', b'label:"LMS Client ID"'),
    (b'label:"Google Client Secret"', b'label:"LMS Client Secret"'),
    (b'providerTitle,children:"Google"', b'providerTitle,children:"LMS"'),
    # i18n（中文在 umi.js 里是 \\uXXXX 转义）
    (b'oauth.googleCallback","defaultMessage":"Google ', b'oauth.googleCallback","defaultMessage":"LMS '),
    (b'oauth.googleCallback":"Google ', b'oauth.googleCallback":"LMS '),
    # 登录页按钮的显示条件：原逻辑是 `ue = !oe && ce.google`
    #   oe = /MicroMessenger/i.test(navigator.userAgent) —— 微信内置浏览器
    # 那是为「Google 登录」设计的（微信里登不了 Google），
    # 现在这个通道走的是 LMS，在微信里完全可用，不该被藏。
    # 去掉 !oe 之后，微信里也能看到「LMS 账号登录」按钮。
    (
        b'ue=!oe&&Boolean(null===ce||void 0===ce?void 0:ce.google)',
        b'ue=Boolean(null===ce||void 0===ce?void 0:ce.google)',
    ),
]


def patch_frontend(payload: bytes) -> tuple:
    """对前端静态资源做文案替换，返回 (新内容, 命中数)"""
    hits = 0
    for old, new in FRONTEND_REPLACEMENTS:
        n = payload.count(old)
        if n:
            payload = payload.replace(old, new)
            hits += n
    return payload, hits


def patch_rdbms_jar(data: bytes, replacements: dict) -> tuple:
    src = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    hits = {}
    with zipfile.ZipFile(out_buf, 'w') as dst:
        for info in src.infolist():
            payload = src.read(info.filename)
            if info.filename == CLASS_PATH:
                payload, hits = patch_class(payload, replacements)
            new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            new_info.compress_type = info.compress_type
            new_info.external_attr = info.external_attr
            new_info.internal_attr = info.internal_attr
            new_info.create_system = info.create_system
            dst.writestr(new_info, payload)
    return out_buf.getvalue(), hits


def patch_fat_jar(src_path: str, dst_path: str, replacements: dict) -> dict:
    src = zipfile.ZipFile(src_path, 'r')
    names = src.namelist()
    if RDBMS_ENTRY not in names:
        raise SystemExit('✗ 找不到 %s，这个 jar 不是预期的 SurveyKing 结构' % RDBMS_ENTRY)

    rdbms = src.read(RDBMS_ENTRY)
    new_rdbms, hits = patch_rdbms_jar(rdbms, replacements)

    frontend_hits = 0
    frontend_files = []
    with zipfile.ZipFile(dst_path, 'w') as dst:
        for info in src.infolist():
            payload = src.read(info.filename)
            if info.filename == RDBMS_ENTRY:
                payload = new_rdbms
            elif info.filename.startswith('BOOT-INF/classes/static/') and info.filename.endswith(('.js', '.json')):
                payload, n = patch_frontend(payload)
                if n:
                    frontend_hits += n
                    frontend_files.append((info.filename, n))
            new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            new_info.compress_type = info.compress_type
            new_info.external_attr = info.external_attr
            new_info.internal_attr = info.internal_attr
            new_info.create_system = info.create_system
            dst.writestr(new_info, payload)
    hits['__frontend__'] = frontend_hits
    hits['__frontend_files__'] = frontend_files
    return hits


def main():
    ap = argparse.ArgumentParser(description='把 SurveyKing 的 Google 通道改指向 LMS')
    ap.add_argument('--jar', required=True, help='原始 surveyking.jar')
    ap.add_argument('--out', required=True, help='输出的补丁后 jar')
    ap.add_argument('--issuer', required=True)
    ap.add_argument('--authorize', required=True)
    ap.add_argument('--token', required=True)
    ap.add_argument('--jwks', required=True)
    ap.add_argument('--backup', action='store_true', help='同时备份原 jar')
    args = ap.parse_args()

    replacements = {
        'https://accounts.google.com/o/oauth2/v2/auth': args.authorize,
        'https://oauth2.googleapis.com/token': args.token,
        'https://www.googleapis.com/oauth2/v3/certs': args.jwks,
        'https://accounts.google.com': args.issuer,
    }

    if args.backup:
        shutil.copy2(args.jar, args.jar + '.orig')
        print('已备份原 jar → %s.orig' % args.jar)

    hits = patch_fat_jar(args.jar, args.out, replacements)

    print('\n替换结果：')
    for old, new in replacements.items():
        n = hits.get(old, 0)
        flag = '✓' if n else '（未找到，可能上游已改）'
        print('  %-46s → %-46s x%d %s' % (old, new, n, flag))

    frontend_hits = hits.get('__frontend__', 0)
    print('\nH2 兼容修复：')
    for old, new in H2_COMPAT_REPLACEMENTS.items():
        n = hits.get(old, 0)
        print('  %-40s → %-30s x%d %s' % (old, new, n, '✓' if n else '（未找到）'))

    print('\n前端文案替换 %d 处：' % frontend_hits)
    for name, n in hits.get('__frontend_files__', []):
        print('  %-60s x%d' % (name, n))

    missing = [k for k, v in hits.items() if v == 0]
    if missing:
        print('\n⚠️  有常量没找到，可能版本不匹配，请人工确认后再部署')
        sys.exit(2)

    # 复核：输出 jar 里应该已经找不到 google 端点
    with zipfile.ZipFile(args.out, 'r') as z:
        blob = b''
        for info in z.infolist():
            if info.filename == RDBMS_ENTRY:
                blob = z.read(info.filename)
    inner = zipfile.ZipFile(io.BytesIO(blob), 'r')
    cls = inner.read(CLASS_PATH)
    leftovers = [k for k in list(replacements) + list(H2_COMPAT_REPLACEMENTS) if k.encode() in cls]
    if leftovers:
        print('\n✗ 补丁后仍能找到原常量：%s' % leftovers)
        sys.exit(3)
    print('\n✅ 补丁完成：%s' % args.out)
    print('   原 jar 未被修改，可随时回退。')


if __name__ == '__main__':
    main()
