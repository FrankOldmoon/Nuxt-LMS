/**
 * Formatting utility functions
 */

/**
 * Convert time string returned by database to local Date
 * Postgres timestamp (without timezone) returns ISO string with Z suffix which would be mistakenly treated as UTC,
 * here we remove the Z suffix so it is parsed as local timezone
 */
function parseLocalTime(time?: string | null): Date | null {
  if (!time) return null
  // Remove trailing Z (UTC marker) so new Date parses as local timezone
  const normalized = time.endsWith('Z') ? time.slice(0, -1) : time
  return new Date(normalized)
}

/** Format time as a local readable string (follows user locale) */
export function formatTime(time?: string | null): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format date as local short date */
export function formatDate(time?: string | null): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

