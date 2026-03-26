import { useState, useEffect, useRef, useCallback } from 'react'
import { getShiftsForWeek, getGroupMembers, subscribeToShifts, deleteShift } from '../lib/supabase'
import ShiftEntryModal from './ShiftEntryModal'

const DAY_START = 6   // 6am
const DAY_END = 23    // 11pm
const TOTAL_HOURS = DAY_END - DAY_START
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i + DAY_START)

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function getShiftStyle(shift, hourHeight) {
  const startMin = timeToMinutes(shift.start_time) - DAY_START * 60
  const endMin = timeToMinutes(shift.end_time) - DAY_START * 60
  const top = Math.max(0, (startMin / 60) * hourHeight)
  const height = Math.max(16, ((endMin - startMin) / 60) * hourHeight)
  return { top, height }
}

// Layout overlapping shifts side-by-side
function layoutShifts(shifts) {
  if (!shifts.length) return []
  const sorted = [...shifts].sort((a, b) =>
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  )

  const cols = []
  const result = sorted.map(shift => {
    const start = timeToMinutes(shift.start_time)
    const end = timeToMinutes(shift.end_time)
    for (let c = 0; c < cols.length; c++) {
      if (cols[c] <= start) {
        cols[c] = end
        return { shift, col: c }
      }
    }
    cols.push(end)
    return { shift, col: cols.length - 1 }
  })

  const numCols = cols.length
  return result.map(item => ({ ...item, numCols }))
}

export default function CalendarWindow({ user, group, profile }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [shifts, setShifts] = useState([])
  const [members, setMembers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editShift, setEditShift] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hourHeight, setHourHeight] = useState(24)

  // Measure the calendar body and compute a fitting hour height
  const bodyRef = useRef(null)
  useEffect(() => {
    if (!bodyRef.current) return
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height ?? 0
      if (h > 0) {
        // Subtract the 8px top offset, divide remaining height across all hours
        setHourHeight(Math.max(20, Math.floor((h - 8) / TOTAL_HOURS)))
      }
    })
    obs.observe(bodyRef.current)
    return () => obs.disconnect()
  }, [])

  const loadData = useCallback(async () => {
    if (!group?.id) return
    setLoading(true)
    try {
      const [shiftsData, membersData] = await Promise.all([
        getShiftsForWeek(group.id, weekStart),
        getGroupMembers(group.id)
      ])
      setShifts(shiftsData)
      setMembers(membersData)
    } catch (err) {
      console.error('Failed to load calendar data:', err)
    } finally {
      setLoading(false)
    }
  }, [group?.id, weekStart])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription
  useEffect(() => {
    if (!group?.id) return
    const channel = subscribeToShifts(group.id, () => loadData())
    return () => channel.unsubscribe()
  }, [group?.id, loadData])

  const goBack = () => setWeekStart(prev => addDays(prev, -7))
  const goNext = () => setWeekStart(prev => addDays(prev, 7))

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i))
  const today = toDateStr(new Date())

  const weekLabel = (() => {
    const end = addDays(weekStart, 6)
    const opts = { month: 'short', day: 'numeric' }
    return `${weekStart.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], { ...opts, year: 'numeric' })}`
  })()

  const handleDayClick = (date) => {
    setSelectedDate(toDateStr(date))
    setEditShift(null)
    setShowModal(true)
  }

  const handleShiftClick = (e, shift) => {
    e.stopPropagation()
    if (shift.user_id !== user.id) return
    setEditShift(shift)
    setSelectedDate(shift.shift_date)
    setShowModal(true)
  }

  const handleDelete = async (shiftId) => {
    try {
      await deleteShift(shiftId)
      setShifts(prev => prev.filter(s => s.id !== shiftId))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleShiftSaved = (newShift, isEdit) => {
    if (isEdit) {
      setShifts(prev => prev.map(s => s.id === newShift.id ? newShift : s))
    } else {
      setShifts(prev => [...prev, newShift])
    }
    setShowModal(false)
  }

  // Group shifts by date
  const shiftsByDate = {}
  shifts.forEach(s => {
    if (!shiftsByDate[s.shift_date]) shiftsByDate[s.shift_date] = []
    shiftsByDate[s.shift_date].push(s)
  })

  return (
    <div className="cal-container">
      {/* Header */}
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={goBack}>◀ Back</button>
        <h2>📅 {weekLabel}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cal-nav-btn" onClick={() => setWeekStart(getMonday(new Date()))}>Today</button>
          <button className="cal-nav-btn" onClick={goNext}>Next ▶</button>
          <button className="cal-add-btn" onClick={() => { setEditShift(null); setSelectedDate(today); setShowModal(true) }}>
            + Add Shift
          </button>
        </div>
      </div>

      {/* Horizontally scrollable wrapper (days header + body scroll together) */}
      <div className="cal-scroll-wrapper">

      {/* Days header */}
      <div className="cal-days-header">
        <div className="cal-day-header" style={{ background: '#ccc' }} />
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date)
          const isToday = dateStr === today
          return (
            <div key={i} className={`cal-day-header ${isToday ? 'today' : ''}`}>
              <div style={{ fontWeight: 'bold' }}>{DAYS[i]}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                {date.toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Calendar body — ref here so ResizeObserver can measure it */}
      <div className="cal-body" ref={bodyRef}>
        {/* Time labels column */}
        <div className="cal-time-col">
          <div style={{ height: 8 }} />
          {HOURS.map(h => (
            <div key={h} className="cal-time-label" style={{ height: hourHeight }}>
              {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, di) => {
          const dateStr = toDateStr(date)
          const isToday = dateStr === today
          const dayShifts = shiftsByDate[dateStr] || []
          const laid = layoutShifts(dayShifts)

          return (
            <div
              key={di}
              className={`cal-day-col ${isToday ? 'today-col' : ''}`}
              style={{ height: TOTAL_HOURS * hourHeight + 8 }}
              onClick={() => handleDayClick(date)}
              title="Click to add shift"
            >
              <div style={{ height: 8 }} />
              {HOURS.map(h => (
                <div key={h} className="cal-hour-line" style={{ height: hourHeight }} />
              ))}

              {/* Shift blocks */}
              {laid.map(({ shift, col, numCols }, i) => {
                const { top, height } = getShiftStyle(shift, hourHeight)
                const color = shift.profiles?.color || '#a855f7'
                const isOwn = shift.user_id === user.id
                const width = numCols > 1 ? `calc(${100 / numCols}% - 6px)` : 'calc(100% - 8px)'
                const left = numCols > 1 ? `calc(${(col / numCols) * 100}% + 2px)` : '4px'

                return (
                  <div
                    key={shift.id || i}
                    className="cal-shift-block"
                    style={{
                      top: top + 8,
                      height,
                      left,
                      width,
                      background: color,
                      color: '#fff',
                      cursor: isOwn ? 'pointer' : 'default',
                      opacity: 0.92,
                    }}
                    onClick={(e) => handleShiftClick(e, shift)}
                    title={isOwn ? 'Click to edit' : `${shift.profiles?.username}'s shift`}
                  >
                    <div className="shift-name">{shift.profiles?.username || 'You'}</div>
                    <div className="shift-time">
                      {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                    </div>
                    {isOwn && (
                      <div
                        style={{
                          position: 'absolute', top: 2, right: 4,
                          fontSize: 10, opacity: 0.8, cursor: 'pointer',
                        }}
                        onClick={(e) => { e.stopPropagation(); handleDelete(shift.id) }}
                        title="Delete shift"
                      >✕</div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      </div> {/* end cal-scroll-wrapper */}

      {/* Legend */}
      <div className="cal-legend">
        {members.map(m => (
          <div key={m.id} className="cal-legend-item">
            <div className="cal-legend-dot" style={{ background: m.color }} />
            <span>{m.username}{m.id === user.id ? ' (you)' : ''}</span>
          </div>
        ))}
        {loading && <span style={{ fontSize: 11, color: '#888' }}>Loading...</span>}
      </div>

      {/* Add/Edit Shift Modal */}
      {showModal && (
        <ShiftEntryModal
          user={user}
          group={group}
          defaultDate={selectedDate}
          editShift={editShift}
          onSave={handleShiftSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
