import { useState, useRef, useEffect } from 'react'

export default function Window({
  id,
  title,
  icon,
  children,
  defaultPos = { x: 120, y: 60 },
  defaultSize = { w: 600, h: 420 },
  onClose,
  onFocus,
  onMinimize,
  minimized = false,
  zIndex = 10,
  titlebarColor = 'linear-gradient(to right, #7c3aed, #4f46e5)',
  isMobile = false,
}) {
  const [pos, setPos] = useState(defaultPos)
  const [size, setSize] = useState(defaultSize)
  const sizeRef = useRef(defaultSize)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizing = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const windowRef = useRef(null)

  useEffect(() => { sizeRef.current = size }, [size])

  const onTitlebarMouseDown = (e) => {
    if (isMobile) return
    if (e.target.closest('.win-titlebar-btns')) return
    onFocus?.(id)
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }

  const onResizeMouseDown = (e) => {
    if (isMobile) return
    e.stopPropagation()
    e.preventDefault()
    onFocus?.(id)
    resizing.current = true
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: sizeRef.current.w,
      h: sizeRef.current.h,
    }
  }

  useEffect(() => {
    if (isMobile) return
    const onMouseMove = (e) => {
      if (dragging.current) {
        setPos({
          x: Math.max(0, e.clientX - dragOffset.current.x),
          y: Math.max(0, e.clientY - dragOffset.current.y),
        })
      }
      if (resizing.current) {
        const dw = e.clientX - resizeStart.current.x
        const dh = e.clientY - resizeStart.current.y
        setSize({
          w: Math.max(300, resizeStart.current.w + dw),
          h: Math.max(200, resizeStart.current.h + dh),
        })
      }
    }
    const onMouseUp = () => {
      dragging.current = false
      resizing.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isMobile])

  if (minimized) return null

  // ── Mobile: fill the entire desktop-area ──────────────────────
  if (isMobile) {
    return (
      <div ref={windowRef} className="win-window win-window--mobile" style={{ zIndex }}>
        <div className="win-titlebar" style={{ background: titlebarColor }}>
          <span className="win-titlebar-icon">{icon}</span>
          <span className="win-titlebar-title">{title}</span>
          <div className="win-titlebar-btns">
            <div className="win-btn close" onClick={() => onMinimize?.(id)} title="Back">✕</div>
          </div>
        </div>
        <div className="win-content win-content--mobile">
          {children}
        </div>
      </div>
    )
  }

  // ── Desktop: floating draggable window ────────────────────────
  return (
    <div
      ref={windowRef}
      className="win-window"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex }}
      onMouseDown={() => onFocus?.(id)}
    >
      <div
        className="win-titlebar"
        style={{ background: titlebarColor }}
        onMouseDown={onTitlebarMouseDown}
      >
        <span className="win-titlebar-icon">{icon}</span>
        <span className="win-titlebar-title">{title}</span>
        <div className="win-titlebar-btns">
          <div className="win-btn minimize" onClick={() => onMinimize?.(id)} title="Minimize">_</div>
          <div className="win-btn close" onClick={() => onClose?.(id)} title="Close">✕</div>
        </div>
      </div>
      <div className="win-content" style={{ height: size.h - 26 }}>
        {children}
      </div>
      <div className="win-resize-handle" onMouseDown={onResizeMouseDown} />
    </div>
  )
}
