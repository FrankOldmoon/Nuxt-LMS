/**
 * 流式返回本地文件，支持 HTTP Range（206 分段）。
 *
 * 为什么需要：HTML5 <video>/<audio> 拖动进度条依赖字节范围请求
 * （请求带 Range，响应需 206 + Content-Range + Accept-Ranges）。
 * 若服务端只回 200 + 整文件（且无 Accept-Ranges），浏览器会把媒体源判定为
 * 不可 seek —— 进度条拖不动 / 拖了弹回，尤其是本站上传的视频。
 *
 * 调用方先按需设置 Content-Type / Content-Disposition / CSP 等头，再调用本函数；
 * 本函数负责 Accept-Ranges、Range 解析、206/416 状态与 Content-Range/Content-Length。
 */
import { createReadStream, statSync } from 'node:fs'
import { sendStream, setResponseHeader, setResponseStatus, getRequestHeader } from 'h3'

export function serveFileWithRange(event: any, absolutePath: string) {
  const size = statSync(absolutePath).size
  setResponseHeader(event, 'Accept-Ranges', 'bytes')

  const rangeHeader = getRequestHeader(event, 'range')
  const match = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim()) : null

  if (match) {
    const hasStart = match[1] !== ''
    const hasEnd = match[2] !== ''
    let start: number
    let end: number

    if (!hasStart && hasEnd) {
      // bytes=-N：最后 N 字节
      const suffix = Number(match[2])
      start = Math.max(0, size - suffix)
      end = size - 1
    } else {
      start = Number(match[1])
      end = hasEnd ? Number(match[2]) : size - 1
    }

    const invalid = !Number.isFinite(start) || !Number.isFinite(end)
      || start < 0 || start > end || start >= size
    if (invalid) {
      setResponseStatus(event, 416)
      setResponseHeader(event, 'Content-Range', `bytes */${size}`)
      setResponseHeader(event, 'Content-Length', 0)
      return ''
    }

    if (end > size - 1) end = size - 1
    setResponseStatus(event, 206)
    setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${size}`)
    setResponseHeader(event, 'Content-Length', end - start + 1)
    return sendStream(event, createReadStream(absolutePath, { start, end }))
  }

  // 无 Range：整文件（显式 Content-Length，避免分块传输导致播放器无法计算总长）
  setResponseHeader(event, 'Content-Length', size)
  return sendStream(event, createReadStream(absolutePath))
}
