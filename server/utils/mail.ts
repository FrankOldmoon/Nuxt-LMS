import nodemailer from 'nodemailer'
import { getSiteConfigSync } from './siteConfig'

/**
 * 邮件发送工具
 *
 * SMTP 配置从 site_config.mail 读取（管理员在 settingsModal 配置）
 * - host, port, secure, user, pass, from
 *
 * 调用 sendMail() 前确保 site_config 已加载（启动插件会自动加载）
 */

let _transporter: nodemailer.Transporter | null = null
let _transporterKey = ''

/**
 * 根据当前 site_config 创建/复用 transporter
 */
function getTransporter(): nodemailer.Transporter | null {
  const cfg = getSiteConfigSync()
  const mail = cfg?.mail
  if (!mail?.host || !mail?.user || !mail?.pass) return null

  const key = `${mail.host}:${mail.port}:${mail.user}`
  if (_transporter && _transporterKey === key) return _transporter

  _transporter = nodemailer.createTransport({
    host: mail.host,
    port: Number(mail.port) || 465,
    secure: mail.secure !== false,
    auth: { user: mail.user, pass: mail.pass },
  })
  _transporterKey = key
  return _transporter
}

/**
 * 发送邮件
 * @param to 收件人
 * @param subject 主题
 * @param html HTML 正文
 */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) {
    console.error('[mail] SMTP 未配置，无法发送邮件')
    return false
  }
  const cfg = getSiteConfigSync()
  const from = cfg?.mail?.from || cfg?.mail?.user
  try {
    await transporter.sendMail({ from, to, subject, html })
    return true
  } catch (e) {
    console.error('[mail] 发送失败', e)
    return false
  }
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #333;">密码重置</h2>
      <p style="color: #666; font-size: 14px;">你收到此邮件是因为有人请求重置你的账号密码。</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">重置密码</a>
      </p>
      <p style="color: #999; font-size: 12px;">如果按钮无法点击，请复制以下链接到浏览器：</p>
      <p style="color: #999; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">如果你没有请求重置密码，请忽略此邮件。</p>
      <p style="color: #999; font-size: 12px;">此链接 30 分钟后失效。</p>
    </div>
  `
  return sendMail(to, '密码重置', html)
}
