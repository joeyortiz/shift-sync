import { useState } from 'react'
import { updateProfile, signOut } from '../lib/supabase'

const PRESET_COLORS = [
  '#a855f7', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#8b5cf6', // violet
  '#84cc16', // lime
]

export const THEMES = {
  vaporwave: {
    name: 'Vaporwave',
    desktop: 'linear-gradient(135deg, #ff71ce 0%, #b967ff 35%, #01cdfe 70%, #05ffa1 100%)',
    taskbar: 'linear-gradient(to right, rgba(50,0,80,0.92), rgba(0,30,60,0.92))',
    titlebar: 'linear-gradient(to right, #b967ff, #01cdfe)',
    previewFrom: '#ff71ce',
    previewTo: '#05ffa1',
  },
  midnight: {
    name: 'Midnight',
    desktop: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    taskbar: 'linear-gradient(to right, rgba(10,5,30,0.95), rgba(20,10,50,0.95))',
    titlebar: 'linear-gradient(to right, #302b63, #5a54a0)',
    previewFrom: '#0f0c29',
    previewTo: '#302b63',
  },
  forest: {
    name: 'Forest',
    desktop: 'linear-gradient(135deg, #0f2d0f 0%, #1a4a1a 50%, #0d3d1a 100%)',
    taskbar: 'linear-gradient(to right, rgba(5,20,5,0.95), rgba(10,30,10,0.95))',
    titlebar: 'linear-gradient(to right, #1a4a1a, #2d7a2d)',
    previewFrom: '#0f2d0f',
    previewTo: '#2d7a2d',
  },
  retrowave: {
    name: 'Retrowave',
    desktop: 'linear-gradient(135deg, #120458 0%, #3d0068 40%, #ff0054 100%)',
    taskbar: 'linear-gradient(to right, rgba(10,2,40,0.95), rgba(40,0,60,0.95))',
    titlebar: 'linear-gradient(to right, #3d0068, #ff0054)',
    previewFrom: '#120458',
    previewTo: '#ff0054',
  },
  candy: {
    name: 'Candy',
    desktop: 'linear-gradient(135deg, #fce4ec 0%, #e1bee7 50%, #bbdefb 100%)',
    taskbar: 'linear-gradient(to right, rgba(180,100,120,0.85), rgba(120,80,160,0.85))',
    titlebar: 'linear-gradient(to right, #e91e63, #9c27b0)',
    previewFrom: '#fce4ec',
    previewTo: '#bbdefb',
  },
  arctic: {
    name: 'Arctic',
    desktop: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #e0e7ff 100%)',
    taskbar: 'linear-gradient(to right, rgba(50,100,150,0.85), rgba(80,80,160,0.85))',
    titlebar: 'linear-gradient(to right, #0284c7, #4f46e5)',
    previewFrom: '#e0f2fe',
    previewTo: '#e0e7ff',
  },
  matrix: {
    name: 'Matrix',
    desktop: 'linear-gradient(135deg, #000000 0%, #001a00 50%, #001500 100%)',
    taskbar: 'linear-gradient(to right, rgba(0,10,0,0.98), rgba(0,20,0,0.98))',
    titlebar: 'linear-gradient(to right, #003300, #00aa00)',
    previewFrom: '#000000',
    previewTo: '#003300',
  },
  sunset: {
    name: 'Sunset',
    desktop: 'linear-gradient(135deg, #ff512f 0%, #dd2476 50%, #7c3aed 100%)',
    taskbar: 'linear-gradient(to right, rgba(80,20,10,0.92), rgba(60,10,50,0.92))',
    titlebar: 'linear-gradient(to right, #ff512f, #dd2476)',
    previewFrom: '#ff512f',
    previewTo: '#7c3aed',
  },
}

export default function SettingsWindow({ user, profile, group, onProfileUpdate, onSignOut }) {
  const [selectedColor, setSelectedColor] = useState(profile?.color || '#a855f7')
  const [selectedTheme, setSelectedTheme] = useState(profile?.theme || 'vaporwave')
  const [customColor, setCustomColor] = useState(profile?.color || '#a855f7')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProfile(user.id, {
        color: selectedColor,
        theme: selectedTheme,
      })
      onProfileUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const copyInviteCode = () => {
    if (!group?.invite_code) return
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="settings-container">

      {/* Crew info */}
      <div className="settings-section">
        <div className="settings-section-title">⚡ Your Crew</div>
        {group ? (
          <>
            <div style={{ marginBottom: 8, fontSize: 13, color: '#444' }}>
              Invite code — share with friends to join your crew:
            </div>
            <div className="settings-invite-box">{group.invite_code}</div>
            <button className="settings-copy-btn" onClick={copyInviteCode}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </>
        ) : (
          <div style={{ color: '#888', fontSize: 12 }}>No group found.</div>
        )}
      </div>

      {/* Shift color */}
      <div className="settings-section">
        <div className="settings-section-title">🎨 Your Shift Color</div>
        <div style={{ marginBottom: 10, fontSize: 12, color: '#555' }}>
          This color appears on the calendar for your shifts.
        </div>
        <div className="settings-row">
          <div className="color-swatches">
            {PRESET_COLORS.map(c => (
              <div
                key={c}
                className={`color-swatch ${selectedColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => { setSelectedColor(c); setCustomColor(c) }}
                title={c}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#555' }}>Custom:</span>
            <input
              type="color"
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); setSelectedColor(e.target.value) }}
              style={{ width: 34, height: 34, border: '2px solid #888', padding: 0, cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Preview */}
        <div style={{
          marginTop: 8, padding: '6px 10px', background: selectedColor,
          color: '#fff', fontFamily: 'Share Tech Mono', fontSize: 12,
          borderRadius: 3, display: 'inline-block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}>
          {profile?.username || 'You'} — 9:00am–5:00pm
        </div>
      </div>

      {/* Desktop theme */}
      <div className="settings-section">
        <div className="settings-section-title">🖥️ Desktop Theme</div>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([key, t]) => (
            <div
              key={key}
              className={`theme-option ${selectedTheme === key ? 'selected' : ''}`}
              style={{
                background: `linear-gradient(135deg, ${t.previewFrom}, ${t.previewTo})`,
              }}
              onClick={() => setSelectedTheme(key)}
              title={t.name}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
        {saved ? '✓ Saved!' : saving ? 'Saving...' : '💾 Save Settings'}
      </button>

      {/* Account */}
      <div className="settings-section" style={{ marginTop: 20 }}>
        <div className="settings-section-title">👤 Account</div>
        <div style={{ marginBottom: 8, fontSize: 13, color: '#444' }}>
          Logged in as: <strong>{profile?.username}</strong>
        </div>
        <button
          className="modal-btn"
          style={{ background: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' }}
          onClick={onSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
