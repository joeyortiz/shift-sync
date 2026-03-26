import { useState, useEffect } from 'react'

export default function Taskbar({ windows, onWindowClick, activeWindowId, minimizedWindows = {}, theme, isMobile = false }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' })

  // ── Mobile: bottom tab bar ────────────────────────────────────
  if (isMobile) {
    // Always show both app tabs on mobile, open them if not yet open
    const ALL_TABS = [
      { id: 'calendar', icon: '📅', label: 'Calendar' },
      { id: 'settings', icon: '⚙️', label: 'Settings' },
    ]
    return (
      <div className="taskbar taskbar--mobile" style={{ background: theme.taskbar }}>
        {ALL_TABS.map(tab => {
          const isActive = tab.id === activeWindowId && !minimizedWindows[tab.id]
          return (
            <div
              key={tab.id}
              className={`mobile-tab ${isActive ? 'active' : ''}`}
              onClick={() => onWindowClick(tab.id)}
            >
              <span className="mobile-tab-icon">{tab.icon}</span>
              <span className="mobile-tab-label">{tab.label}</span>
            </div>
          )
        })}
        <div className="mobile-tab-clock">
          <span>{timeStr}</span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>{dateStr}</span>
        </div>
      </div>
    )
  }

  // ── Desktop: classic taskbar ──────────────────────────────────
  return (
    <div className="taskbar" style={{ background: theme.taskbar }}>
      <div className="taskbar-start">
        <span>⚡</span>
        <span>SYNC</span>
      </div>

      <div className="taskbar-divider" />

      {windows.map(w => (
        <div
          key={w.id}
          className={`taskbar-btn ${w.id === activeWindowId && !minimizedWindows[w.id] ? 'active' : ''} ${minimizedWindows[w.id] ? 'minimized' : ''}`}
          onClick={() => onWindowClick(w.id)}
          title={w.title}
        >
          <span>{w.icon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</span>
        </div>
      ))}

      <div className="taskbar-clock">
        {timeStr}&nbsp;&nbsp;{dateStr}
      </div>
    </div>
  )
}
