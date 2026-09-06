# Skill: 文件上传（含外部 URL 传入）

> 用途：把图片等资源上传到站内网盘，拿到 `/api/files/serve?pathname=...` 的站内 URL，
> 供课程封面、章节/课程 content 里的 `<img>`、富组件等引用。
> **不要在 content 里直接引用外部图片 URL**（防盗链/失效风险），一律先上传转站内 URL。

## 接口

`POST /api/files/upload`（需登录，管理员或普通用户均可，受网盘配额限制）

两种来源模式：

### 模式一：外部 URL 传入（推荐给 AI/脚本流程）

JSON body 直接传远程图片地址，服务端负责下载、压缩、落盘：

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H 'Content-Type: application/json' \
  -b <登录 cookie> \
  -d '{"url": "https://example.com/some-image.png", "group": "course-8"}'
```

- 仅支持**图片**：服务端按 magic number 白名单校验真实图片格式，非图片内容直接拒绝
- 下载后自动用 sharp 压缩为 **webp**；GIF 会转为保留动画的 animated webp
- 内置 SSRF 防护：禁止 http/https 以外的协议，禁止内网/保留地址（IP 字面量与 DNS 解析后均校验）
- `group` 可选：网盘分组目录名（不传则入默认组）

### 模式二：multipart 表单上传（任意文件）

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -b <登录 cookie> \
  -F 'files=@/path/to/file.pdf' \
  -F 'group=course-8'
```

- 字段名必须是 `files`；`group` 为可选 form 字段
- 类型约束：危险后缀黑名单（.exe/.sh/.bat/.cmd/.ps1/.php）拒绝；
  若站点配置了 `site:allowedFileTypes` 白名单则按白名单限制；大小上限 `site:maxFileSize`（默认 50MB）
- SVG 会做内容消毒（移除 script / on* 事件 / javascript: URL）

## 响应与查重

成功（含"已存在"）返回：

```json
{
  "success": true,
  "data": {
    "id": 123,
    "url": "/api/files/serve?pathname=files%2Fcourse-8%2Fab12cd....webp",
    "name": "some-image.png",
    "size": 45678
  }
}
```

- 服务端按内容 sha256 查重：**相同内容重复上传不占配额**，直接返回已存在文件的
  `url`，`msg` 为「文件已存在」——脚本流程可直接拿 `data.url` 用，无需特判
- `data.url` 是站内 URL，可直接放进 content 的 image 节点 `attrs.src`、
  课程 `config.coverImg`、富组件资源等

## 典型用法：批量建课/写章节时配图

1. 对每张外部图片调用本接口（url 模式），收集返回的站内 `url`
2. 把 `url` 填入 markdown 图片语法 `![](url)` 或 tiptap image 节点，
   再走 skills/01 / skills/03 的正常创建流程

> 注意：url 模式只能传**图片**；PDF/压缩包等任意文件请用 multipart 模式。
> 上传本身不校验 group 是否属于某课程，`group` 仅作目录分组用途。
