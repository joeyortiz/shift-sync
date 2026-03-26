export default function DesktopIcon({ icon, label, onDoubleClick, active }) {
  return (
    <div
      className={`desktop-icon ${active ? 'active' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      <div className="desktop-icon-img">{icon}</div>
      <div className="desktop-icon-label">{label}</div>
    </div>
  )
}
