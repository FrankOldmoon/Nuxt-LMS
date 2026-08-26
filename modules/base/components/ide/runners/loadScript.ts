/**
 * 通用的 CDN 脚本加载工具：仅加载一次，后续请求直接返回。
 */
export function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((document as any).querySelector(`script[src="${url}"]`)) {
            resolve()
            return
        }
        const script = document.createElement('script')
        script.src = url
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load ${url}`))
        document.head.appendChild(script)
    })
}