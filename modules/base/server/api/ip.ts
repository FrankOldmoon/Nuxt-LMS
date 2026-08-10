export default defineEventHandler(async (event) => {
  return {
    IP: getRequestIP(event, { xForwardedFor: true }),
  }
})