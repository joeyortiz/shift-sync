/**
 * Generates and downloads a .ics file (iCalendar) from an array of shift objects.
 * Compatible with Apple Calendar, Google Calendar, and Outlook.
 */

function padTime(timeStr) {
  // "09:30:00" → "093000"
  return timeStr.replace(/:/g, '').slice(0, 6).padEnd(6, '0')
}

function padDate(dateStr) {
  // "2026-03-27" → "20260327"
  return dateStr.replace(/-/g, '')
}

function escapeICS(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICS(shifts, calName = 'Shift Sync') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shift Sync//Shift Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calName)}`,
    'X-WR-TIMEZONE:America/New_York',
  ]

  for (const shift of shifts) {
    const date = padDate(shift.shift_date)
    const start = padTime(shift.start_time)
    const end = padTime(shift.end_time)
    const username = shift.profiles?.username || 'Team Member'
    const uid = shift.id
      ? `${shift.id}@shiftsync.app`
      : `${date}-${start}-${username}@shiftsync.app`

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;TZID=America/New_York:${date}T${start}`,
      `DTEND;TZID=America/New_York:${date}T${end}`,
      `SUMMARY:${escapeICS(username + "'s Shift")}`,
      `DESCRIPTION:${escapeICS(`Shift for ${username}`)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(shifts, filename = 'shifts.ics', calName = 'Shift Sync') {
  const content = generateICS(shifts, calName)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
