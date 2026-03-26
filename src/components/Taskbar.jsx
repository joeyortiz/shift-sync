import { useState, useEffect } from 'react'

export default function Taskbar({ windows, onWindowClick, activeWindowId, theme }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div className="taskbar" style={{ background: theme.taskbar }}>
      {/* Start button */}
      <div className="taskbar-start">
        <span>⚡</span>
        <span>SYNC</span>
      </div>

      <div className="taskbar-divider" />

      {/* Open windows */}
      {windows.map(w => (
        <div
          key={w.id}
          className={`taskbar-btn ${w.id === activeWindowId ? 'active' : ''}`}
          onClick={() => onWindowClick(w.id)}
          title={w.title}
        >
          <span>{w.icon}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</span>
        </div>
      ))}

      {/* Clock */}
      <div className="taskbar-clock">
        {timeStr}&nbsp;&nbsp;{dateStr}
      </div>
    </div>
  )
}
