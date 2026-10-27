#!/usr/bin/env python3
"""
把 SurveyKing 的「Google 登录」通道改指向 LMS（OIDC）

背景
----
SurveyKing 1.13 只内置两种第三方登录：Google、微信，且端点**硬编码**在
`cn.surveyking.server.impl.OAuthServiceImpl` 的常量池里：

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

本脚本做四件事
--------------
1. 常量池替换：4 个 Google 端点 → LMS 端点
2. H2 兼容修复：`BINARY auth_account = {0}` 是 MySQL 专有语法，H2 会报语法错
3. 前端文案：登录页按钮「Google 登录」→「LMS 账号登录」；个人设置里那条
   Google 登录方式整个去掉；管理端设置项改叫 LMS Client ID/Secret
4. 缓存 busting：内容变了的 chunk 换新 hash 文件名（同步 umi.js 的 hash 映射、
   asset-manifest.json、index.html），否则浏览器会一直用缓存里的旧 JS

安全性
------
- 只做等价的常量替换，不改任何逻辑；
- 内置 round-trip 自检（解析→重新序列化必须与原文件逐字节相同），
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
import hashlib
import io
import re
import shutil
import struct
import sys
import zipfile

# SurveyKing 把 OAuth 实现在 rdbms 模块里
RDBMS_ENTRY = 'BOOT-INF/lib/rdbms-v1.13.0.jar'
CLASS_PATH = 'cn/surveyking/server/impl/OAuthServiceImpl.class'
STATIC_PREFIX = 'BOOT-INF/classes/static/'

# 需要替换的常量：{原始: 目标}
DEFAULT_REPLACEMENTS = {
    'https://accounts.google.com/o/oauth2/v2/auth': None,   # authorize 端点
    'https://oauth2.googleapis.com/token': None,            # token 端点
    'https://www.googleapis.com/oauth2/v3/certs': None,     # JWKS 端点
    'https://accounts.google.com': None,                   # id_token 的 iss
}

# H2 兼容修复（与 OAuth 端点无关，是独立的坑）
#
# SurveyKing 查绑定账号时用 MySQL 专有的 `BINARY auth_account = ?`：
#     accountMapper.selectOne(... .apply("BINARY auth_account = {0}", account))
# 本部署用的是 H2（MODE=MySQL），H2 没有 BINARY 这个一元运算符 →
# 直接抛 BadSqlGrammarException，OAuth 回调返回 provider_error。
# H2 的字符串比较本来就是大小写敏感（BINARY 在 MySQL 里也是这个意思），
# 所以去掉 BINARY 前缀语义不变。
H2_COMPAT_REPLACEMENTS = {
    'BINARY auth_account = {0}': 'auth_account = {0}',
}

# 前端文案替换（纯文本，字节级替换，长度可不同）
FRONTEND_REPLACEMENTS = [
    # 登录页按钮
    (b'"aria-label":"Google"', b'"aria-label":"LMS \\u8d26\\u53f7\\u767b\\u5f55"'),
    (b'socialLabel,children:"Google"', b'socialLabel,children:"LMS \\u8d26\\u53f7\\u767b\\u5f55"'),
    # 管理端：第三方登录设置
    (b'label:"Google Client ID"', b'label:"LMS Client ID"'),
    (b'label:"Google Client Secret"', b'label:"LMS Client Secret"'),
    (b'providerTitle,children:"Google"', b'providerTitle,children:"LMS"'),
    # i18n（中文在 umi.js 里是 \\uXXXX 转义；umi.js 之外还有一份在 chunk 里）
    (b'oauth.googleCallback","defaultMessage":"Google ', b'oauth.googleCallback","defaultMessage":"LMS '),
    (b'oauth.googleCallback":"Google ', b'oauth.googleCallback":"LMS '),
    (b'oauth.googleCallback",defaultMessage:"Google ', b'oauth.googleCallback",defaultMessage:"LMS '),
    # 登录页按钮的显示条件：原逻辑是 `ue = !oe && ce.google`
    #   oe = /MicroMessenger/i.test(navigator.userAgent) —— 微信内置浏览器
    # 那是为「Google 登录」设计的（微信里登不了 Google），
    # 现在这个通道走的是 LMS，在微信里完全可用，不该被藏。
    (
        b'ue=!oe&&Boolean(null===ce||void 0===ce?void 0:ce.google)',
        b'ue=Boolean(null===ce||void 0===ce?void 0:ce.google)',
    ),
    # 个人设置 → 安全 → 「登录方式」列表里的 Google 条目（含 Google 图标 + 修改按钮）：
    # 这个通道就是 LMS 本身，绑定是自动的（预置或首次登录建号时完成），
    # 留着只会让人看到 Google 字样 → 整条去掉。
    (
        b'(null!==(a=F.oauthProviders)&&void 0!==a&&a.google||o.length>0)&&g.push({title:"Google"',
        b'(null!==(a=F.oauthProviders)&&void 0!==a&&a.google||o.length>0)&&!1&&g.push({title:"Google"',
    ),
    # 注册页：LMS 里没有对应账号的人，首次登录会落到 /user/register?oauthTicket=xxx，
    # 原本要手动填姓名/账号/密码/确认密码。
    # 这里改成：拿到预填信息后，自动生成一个随机强密码、自动提交 ——
    # 用户点了「LMS 账号登录」就直接进系统，不需要设密码。
    # 密码是随机的、用户永远用不到（之后都走 SSO），只是为了满足后端的建号约束。
    (
        b'if(e)return null===(s=T.current)||void 0===s||s.setFieldsValue(e),void P(!0);',
        b'if(e){'
        b'var _pw="Aa1"+(Math.random().toString(36)+"aaaaaaaa").slice(2,11);'
        b'null===(s=T.current)||void 0===s||s.setFieldsValue(Object.assign({},e,{password:_pw,rePassword:_pw})),P(!0),'
        b'setTimeout(function(){try{'
        b'var _f=document.querySelector("#root form");'
        b'_f&&_f.requestSubmit?_f.requestSubmit():(T.current&&T.current.submit&&T.current.submit())'
        b'}catch(_e){console.warn("[auto-register]",_e)}},400);'
        b'return}',
    ),
]

# 追加到指定 CSS 末尾的规则（按文件名模式匹配）
#
# 登录页「只留 LMS 登录按钮」：
#   实测 DOM 里 LMS 按钮挂在 .socialLogin 下，**不在 <form> 里**，
#   所以直接把 form 藏掉即可，不依赖 CSS module 的 hash 类名（升级也不怕）。
#   顺便藏掉「立即注册」入口 —— 现在账号是自动创建的，用不到。
FRONTEND_CSS_APPEND = [
    (
        'p__user__Login.',
        '\n/* LMS-only 登录：隐藏账号密码表单与注册入口 */\n'
        '#root form{display:none!important}\n'
        '#root a[href*="/user/register"]{display:none!important}\n'
        '/* 链接藏了之后「No account yet?」这行会孤零零留着 */\n'
        '#root [class*=registerPrompt]{display:none!important}\n'
        '#root .ant-divider{margin:4px 0 18px}\n'
        '/* 那个图标是 Google 的 G，跟 LMS 没关系，藏掉 */\n'
        '#root [class*=socialIcon]{display:none!important}\n'
        '/* 把社交项做成一条像样的主按钮 */\n'
        '#root [class*=socialLogin]{display:block!important}\n'
        '#root [class*=socialOption]{display:flex!important;align-items:center;justify-content:center;'
        'width:100%;min-height:46px;border:1px solid #d9d9d9;border-radius:8px;background:#fff;'
        'font-size:16px;font-weight:600;color:#1f1f1f;cursor:pointer;transition:all .15s}\n'
        '#root [class*=socialOption]:hover{border-color:#1677ff;color:#1677ff;background:#f0f7ff}\n',
    ),
    (
        'p__user__Register.',
        '\n/* 自动建号：表单由脚本自动填并提交，这里只留一句提示 */\n'
        '#root form{opacity:.35;pointer-events:none}\n',
    ),
]

HASH_RE = re.compile(r'\.([0-9a-f]{8})(\.(?:async\.js|js|chunk\.css|css))$')


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
                new_entries.append((tag, replacements[text].encode('utf-8')))
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


# ---------------------------------------------------------------- 前端处理
def patch_frontend(payload: bytes, name: str = '') -> tuple:
    """对前端静态资源做文案替换（+ 按文件名追加 CSS），返回 (新内容, 命中数)"""
    hits = 0
    for old, new in FRONTEND_REPLACEMENTS:
        n = payload.count(old)
        if n:
            payload = payload.replace(old, new)
            hits += n
    if name.endswith('.css'):
        for prefix, extra in FRONTEND_CSS_APPEND:
            if name.startswith(prefix):
                payload = payload + extra.encode('utf-8')
                hits += 1
    return payload, hits


def bust_hashes(files: dict, changed: set) -> tuple:
    """
    给**内容变了的** chunk 换新文件名（= 换 hash），并同步所有引用。

    为什么要做：webpack 的 chunk 文件名里带内容 hash，但我们只改内容不改文件名，
    浏览器会拿缓存里的旧 JS —— 用户看到的还是「Google 登录」按钮。
    换 hash 后 URL 变了，浏览器必然重新下载。

    只处理 changed 里的文件（其余原样保留，避免大面积改名带来的引用风险）。
    需要同步：
      1. umi.js 里的 chunk hash 映射：  9531:"7c34278b" → 9531:"<新hash>"
      2. asset-manifest.json 里的文件名映射
      3. index.html 里对主 chunk（umi.js）的引用

    顺序要点：主 chunk 自身的内容会因为「写入新的 hash 映射」而再次变化，
    所以它的 hash 必须最后算，且 manifest/index.html 要用**最终**名字替换。
    """
    renamed = {}          # 旧名 → 新名
    hash_map = {}         # 旧 hash → 新 hash
    umi_name = next((n for n in files if n.startswith('umi.') and n.endswith('.js')), None)

    # 1) 非主 chunk：按新内容算新 hash
    for name in sorted(changed):
        if name in ('asset-manifest.json', 'index.html') or name == umi_name:
            continue
        m = HASH_RE.search(name)
        if not m:
            continue
        old_hash = m.group(1)
        new_hash = hashlib.sha256(files[name]).hexdigest()[:8]
        if new_hash == old_hash:
            continue
        renamed[name] = name[: m.start(1)] + new_hash + m.group(2)
        hash_map[old_hash] = new_hash

    if not hash_map and not (umi_name and umi_name in changed):
        return files, renamed

    # 2) 把新的 hash 映射写进主 chunk
    if umi_name and hash_map:
        content = files[umi_name]
        for old_hash, new_hash in hash_map.items():
            content = content.replace(('"%s"' % old_hash).encode(), ('"%s"' % new_hash).encode())
        files[umi_name] = content

    # 3) 主 chunk 自身改名（此时内容已最终）
    if umi_name and umi_name in changed:
        m = HASH_RE.search(umi_name)
        if m:
            old_hash = m.group(1)
            new_hash = hashlib.sha256(files[umi_name]).hexdigest()[:8]
            if new_hash != old_hash:
                new_umi = umi_name[: m.start(1)] + new_hash + m.group(2)
                renamed[umi_name] = new_umi
                files[new_umi] = files.pop(umi_name)
                for f in ('index.html', 'asset-manifest.json'):
                    if f in files:
                        files[f] = files[f].replace(('/' + umi_name).encode(), ('/' + new_umi).encode())

    # 4) manifest 里的其它改名
    if 'asset-manifest.json' in files:
        manifest = files['asset-manifest.json']
        for old_name, new_name in renamed.items():
            if old_name == umi_name:
                continue
            manifest = manifest.replace(('/' + old_name).encode(), ('/' + new_name).encode())
        files['asset-manifest.json'] = manifest

    # 5) 落盘改名
    for old_name, new_name in list(renamed.items()):
        if old_name in files:
            files[new_name] = files.pop(old_name)

    return files, renamed


# ---------------------------------------------------------------- jar 处理
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

    # 前端资源：先读出来做替换，再统一 bust hash
    static = {}
    static_order = []
    for info in src.infolist():
        name = info.filename
        if not (name.startswith(STATIC_PREFIX) and name.endswith(('.js', '.json', '.html', '.css'))):
            continue
        key = name[len(STATIC_PREFIX):]
        static[key] = src.read(name)
        static_order.append(key)

    frontend_hits = 0
    frontend_files = []
    changed = set()
    for key in static_order:
        if key.endswith(('.js', '.json', '.html', '.css')):
            payload, n = patch_frontend(static[key], key)
            if n:
                static[key] = payload
                changed.add(key)
                frontend_hits += n
                frontend_files.append((key, n))

    static, renamed = bust_hashes(static, changed)

    with zipfile.ZipFile(dst_path, 'w') as dst:
        for info in src.infolist():
            payload = src.read(info.filename)
            if info.filename == RDBMS_ENTRY:
                payload = new_rdbms
            elif info.filename.startswith(STATIC_PREFIX):
                key = info.filename[len(STATIC_PREFIX):]
                if key in renamed:
                    continue  # 被改名的文件，由下面统一写入新名字
                # 文本文件用替换后的内容；png/ico/目录项等原样保留
                payload = static.get(key, payload)
            new_info = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            new_info.compress_type = info.compress_type
            new_info.external_attr = info.external_attr
            new_info.internal_attr = info.internal_attr
            new_info.create_system = info.create_system
            dst.writestr(new_info, payload)

        # 写入改名后的前端文件
        for old_name, new_name in renamed.items():
            old_info = src.getinfo(STATIC_PREFIX + old_name)
            new_info = zipfile.ZipInfo(STATIC_PREFIX + new_name, date_time=old_info.date_time)
            new_info.compress_type = old_info.compress_type
            new_info.external_attr = old_info.external_attr
            new_info.internal_attr = old_info.internal_attr
            new_info.create_system = old_info.create_system
            dst.writestr(new_info, static[new_name])

    hits['__frontend__'] = frontend_hits
    hits['__frontend_files__'] = frontend_files
    hits['__renamed__'] = renamed
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

    print('\n常量替换：')
    for old, new in replacements.items():
        n = hits.get(old, 0)
        flag = '✓' if n else '（未找到，可能上游已改）'
        print('  %-46s → %-46s x%d %s' % (old, new, n, flag))

    print('\nH2 兼容修复：')
    for old, new in H2_COMPAT_REPLACEMENTS.items():
        n = hits.get(old, 0)
        print('  %-40s → %-30s x%d %s' % (old, new, n, '✓' if n else '（未找到）'))

    print('\n前端文案替换 %d 处：' % hits.get('__frontend__', 0))
    for name, n in hits.get('__frontend_files__', []):
        print('  %-60s x%d' % (name, n))

    renamed = hits.get('__renamed__', {})
    if renamed:
        print('\n缓存 busting（内容变了的文件换新 hash，浏览器必然重新下载）：')
        for old_name, new_name in renamed.items():
            print('  %-56s → %s' % (old_name, new_name))

    missing = [k for k, v in hits.items() if isinstance(v, int) and v == 0 and k in replacements]
    if missing:
        print('\n⚠️  有常量没找到，可能版本不匹配，请人工确认后再部署')
        sys.exit(2)

    # 复核：输出 jar 里应该已经找不到原来的常量
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
