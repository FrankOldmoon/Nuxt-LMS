export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const quota = await getDriveQuota({ id: user.id, roles: user.roles })
  const used = await getDriveUsed(user.id)

  return cResp({
    quota,
    used,
    free: quota === Infinity ? Infinity : Math.max(0, quota - used),
    unlimited: quota === Infinity,
  })
})
