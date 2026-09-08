# Skill: File upload (including external URL pass-through)

> Purpose: upload images and other assets to the in-site drive and get an in-site URL
> (`/api/files/serve?pathname=...`) for course covers, `<img>` in chapter/course content, rich components etc.
> **Never reference external image URLs directly in content** (hotlink protection / link rot risk) — always upload first and use the in-site URL.

## Endpoint

`POST /api/files/upload` (login required, admin or regular user, subject to drive quota)

Two source modes:

### Mode 1: external URL pass-through (recommended for AI/script flows)

JSON body takes a remote image URL directly; the server downloads, compresses and stores it:

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -H 'Content-Type: application/json' \
  -b <login cookie> \
  -d '{"url": "https://example.com/some-image.png", "group": "course-8"}'
```

- **Images only**: the server validates the real format against a magic-number whitelist; non-image content is rejected
- After download it compresses to **webp** with sharp; GIFs become animated webp (animation preserved)
- Built-in SSRF protection: protocols other than http/https are forbidden; intranet/reserved addresses are blocked (checked both for IP literals and after DNS resolution)
- `group` is optional: the drive group/folder name (omitted → default group)

### Mode 2: multipart form upload (any file)

```bash
curl -X POST http://localhost:3000/api/files/upload \
  -b <login cookie> \
  -F 'files=@/path/to/file.pdf' \
  -F 'group=course-8'
```

- The field name must be `files`; `group` is an optional form field
- Type constraints: a dangerous-extension blacklist (.exe/.sh/.bat/.cmd/.ps1/.php) is rejected;
  if the site configures a `site:allowedFileTypes` whitelist, that whitelist applies; size cap is `site:maxFileSize` (default 50MB)
- SVG is sanitised (script / on* event handlers / javascript: URLs removed)

## Response and dedupe

Success (including "already exists") returns:

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

- The server dedupes by content sha256: **re-uploading identical content does not consume quota**; it returns the
  existing file's `url` directly and `msg` reads "file already exists" — scripts can just take `data.url`, no special-casing
- `data.url` is an in-site URL, usable directly as `attrs.src` of an image node in content,
  as course `config.coverImg`, or in rich-component assets

## Typical usage: illustrations when batch-creating courses / writing chapters

1. Call this endpoint (url mode) for each external image and collect the returned in-site `url`
2. Put the `url` into the markdown image syntax `![](url)` or a tiptap image node,
   then follow the normal creation flow in skills/01 / skills/03

> Note: url mode accepts **images only**; use multipart mode for PDFs, archives and any other files.
> Upload does not validate whether `group` belongs to a course; `group` is only a folder grouping.
