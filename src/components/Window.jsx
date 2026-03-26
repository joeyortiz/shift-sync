import { useState, useRef, useEffect, useCallback } from 'react'

export default function Window({
  id,
  title,
  icon,
  children,
  defaultPos = { x: 120, y: 60 },
  defaultSize = { w: 600, h: 420 },
  onClose,
  onFocus,
  zIndex = 10,
  titlebarColor = 'linear-gradient(to right, #7c3aed, #4f46e5)',
}) {
  const [pos, setPos] = useState(defaultPos)
  const [size] = useState(defaultSize)
  const [minimized, setMinimized] = useState(false)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const windowRef = useRef(null)

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('.win-titlebar-btns')) return
    onFocus?.(id)
    dragging.current = true
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    }
    e.preventDefault()
  }, [id, onFocus, pos])

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return
      setPos({
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y),
      })
    }
    const onMouseUp = () => { dragging.current = false }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (minimized) return null

  return (
    <div
      ref={windowRef}
      className="win-window"
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex,
      }}
      onMouseDown={() => onFocus?.(id)}
    >
      {/* Title bar */}
      <div
        className="win-titlebar"
        style={{ background: titlebarColor }}
        onMouseDown={onMouseDown}
      >
        <span className="win-titlebar-icon">{icon}</span>
        <span className="win-titlebar-title">{title}</span>
        <div className="win-titlebar-btns">
          <div className="win-btn minimize" onClick={() => setMinimized(true)} title="Minimize">_</div>
          <div className="win-btn close" onClick={() => onClose?.(id)} title="Close">✕</div>
        </div>
      </div>

      {/* Content */}
      <div className="win-content" style={{ height: size.h - 26 }}>
        {children}
      </div>
    </div>
  )
}
