import nodemailer from 'nodemailer'
import { getConfigByPrefix } from './config/reload'

/**
 * Mail sending utility
 *
 * SMTP config read from site:mail.* (configured by admin in settingsModal)
 * - host, port, secure, user, pass, from, siteUrl
 *
 * Ensure config is loaded before calling sendMail() (startup plugin loads automatically)
 */

let _transporter: nodemailer.Transporter | null = null
let _transporterKey = ''

/**
 * Create/reuse transporter based on current site:mail config
 */
async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const mail = await getConfigByPrefix('site:mail')
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
 * Send mail
 * @param to recipient
 * @param subject subject
 * @param html HTML body
 */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = await getTransporter()
  if (!transporter) {
    console.error('[mail] SMTP not configured, cannot send mail')
    return false
  }
  const mail = await getConfigByPrefix('site:mail')
  const from = mail?.from || mail?.user
  try {
    await transporter.sendMail({ from, to, subject, html })
    return true
  } catch (e) {
    console.error('[mail] Send failed', e)
    return false
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #333;">Password Reset</h2>
      <p style="color: #666; font-size: 14px;">You received this email because someone requested a password reset for your account.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">Reset Password</a>
      </p>
      <p style="color: #999; font-size: 12px;">If the button is not clickable, copy the following link to your browser:</p>
      <p style="color: #999; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">If you did not request a password reset, please ignore this email.</p>
      <p style="color: #999; font-size: 12px;">This link expires after 30 minutes.</p>
    </div>
  `
  return sendMail(to, 'Password Reset', html)
}
