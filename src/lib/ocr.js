// ─── OCR ─────────────────────────────────────────────────────
// Tesseract is loaded lazily on first use to avoid blocking the initial page load
export async function extractTextFromImage(imageFile, onProgress) {
  const Tesseract = (await import('tesseract.js')).default
  const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    }
  })
  return text
}

// ─── Schedule Parsing ─────────────────────────────────────────
const MONTH_MAP = {
  jan: 1, january: 1, feb: 2, february: 2,
  mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12
}

function parseTime(timeStr) {
  if (!timeStr) return null
  timeStr = timeStr.trim().toLowerCase().replace(/\s+/g, '')

  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    const h = parseInt(match24[1])
    const m = parseInt(match24[2])
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return { h, m }
  }

  const match12 = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)
  if (match12) {
    let h = parseInt(match12[1])
    const m = parseInt(match12[2] || '0')
    const ampm = match12[3]
    if (ampm === 'pm' && h !== 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return { h, m }
  }

  return null
}

function padTime(t) {
  return `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`
}

function extractDate(line, referenceYear) {
  const mdMatch = line.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (mdMatch) {
    const month = parseInt(mdMatch[1])
    const day = parseInt(mdMatch[2])
    let year = mdMatch[3] ? parseInt(mdMatch[3]) : referenceYear
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const monthMatch = line.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i)
  if (monthMatch) {
    const month = MONTH_MAP[monthMatch[1].toLowerCase().slice(0, 3)]
    const day = parseInt(monthMatch[2])
    const year = referenceYear
    if (month && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

export function parseScheduleText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const shifts = []
  const currentYear = new Date().getFullYear()

  let detectedYear = currentYear
  for (const line of lines) {
    const yearMatch = line.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      detectedYear = parseInt(yearMatch[1])
      break
    }
  }

  const timeRangePattern = /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  const time24RangePattern = /(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})/

  for (const line of lines) {
    const datePart = extractDate(line, detectedYear)
    if (!datePart) continue

    let startStr = null, endStr = null

    const m12 = line.match(timeRangePattern)
    if (m12) {
      startStr = m12[1].replace(/\s+/g, '')
      endStr = m12[2].replace(/\s+/g, '')
    }

    if (!startStr) {
      const m24 = line.match(time24RangePattern)
      if (m24) {
        startStr = m24[1]
        endStr = m24[2]
      }
    }

    if (!startStr || !endStr) continue

    const start = parseTime(startStr)
    const end = parseTime(endStr)

    if (start && end) {
      shifts.push({
        shift_date: datePart,
        start_time: padTime(start) + ':00',
        end_time: padTime(end) + ':00',
        notes: ''
      })
    }
  }

  return shifts
}
