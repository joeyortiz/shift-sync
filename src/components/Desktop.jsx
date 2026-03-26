import { useState, useCallback } from 'react'
import Window from './Window'
import Taskbar from './Taskbar'
import DesktopIcon from './DesktopIcon'
import CalendarWindow from './CalendarWindow'
import SettingsWindow, { THEMES } from './SettingsWindow'
import { useIsMobile } from '../hooks/useIsMobile'

const WINDOW_DEFS = {
  calendar: {
    id: 'calendar',
    title: 'Shift Sync — Calendar',
    icon: '📅',
    defaultPos: { x: 180, y: 40 },
    defaultSize: { w: 820, h: 520 },
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    defaultPos: { x: 80, y: 100 },
    defaultSize: { w: 400, h: 540 },
  },
}

export default function Desktop({ user, group, profile: initialProfile, onSignOut }) {
  const isMobile = useIsMobile()
  const [profile, setProfile] = useState(initialProfile)
  const [openWindows, setOpenWindows] = useState(['calendar'])
  const [minimizedWindows, setMinimizedWindows] = useState({})
  const [activeWindowId, setActiveWindowId] = useState('calendar')
  const [zOrders, setZOrders] = useState({ calendar: 10, settings: 9 })
  const [zCounter, setZCounter] = useState(20)

  const theme = THEMES[profile?.theme || 'vaporwave']

  const openWindow = useCallback((id) => {
    setOpenWindows(prev => prev.includes(id) ? prev : [...prev, id])
    focusWindow(id)
  }, [])

  const closeWindow = useCallback((id) => {
    setOpenWindows(prev => prev.filter(w => w !== id))
    setMinimizedWindows(prev => { const n = { ...prev }; delete n[id]; return n })
  }, [])

  const minimizeWindow = useCallback((id) => {
    setMinimizedWindows(prev => ({ ...prev, [id]: true }))
  }, [])

  const restoreWindow = useCallback((id) => {
    setMinimizedWindows(prev => { const n = { ...prev }; delete n[id]; return n })
    focusWindow(id)
  }, [])

  const focusWindow = useCallback((id) => {
    setActiveWindowId(id)
    setZCounter(prev => {
      const next = prev + 1
      setZOrders(z => ({ ...z, [id]: next }))
      return next
    })
  }, [])

  const handleTaskbarClick = (id) => {
    if (!openWindows.includes(id)) {
      openWindow(id)
    } else if (minimizedWindows[id]) {
      restoreWindow(id)
    } else if (activeWindowId === id) {
      minimizeWindow(id)
    } else {
      focusWindow(id)
    }
  }

  const handleProfileUpdate = (updated) => {
    setProfile(updated)
  }

  const taskbarWindows = openWindows.map(id => WINDOW_DEFS[id]).filter(Boolean)

  // On mobile, a window is visible only if it's open, not minimized, and active
  const isWindowVisible = (id) => {
    if (!openWindows.includes(id)) return false
    if (minimizedWindows[id]) return false
    if (isMobile) return id === activeWindowId
    return true
  }

  return (
    <div
      className="desktop"
      style={{ background: theme.desktop }}
    >
      <div className="desktop-area">
        {/* Desktop icons — hidden on mobile */}
        {!isMobile && (
          <div className="desktop-icons">
            <DesktopIcon
              icon="📅"
              label="Calendar"
              active={activeWindowId === 'calendar'}
              onDoubleClick={() => openWindow('calendar')}
            />
            <DesktopIcon
              icon="⚙️"
              label="Settings"
              active={activeWindowId === 'settings'}
              onDoubleClick={() => openWindow('settings')}
            />
          </div>
        )}

        {/* Calendar window */}
        {isWindowVisible('calendar') && (
          <Window
            {...WINDOW_DEFS.calendar}
            onClose={closeWindow}
            onFocus={focusWindow}
            onMinimize={minimizeWindow}
            minimized={!!minimizedWindows.calendar}
            zIndex={zOrders.calendar}
            titlebarColor={theme.titlebar}
            isMobile={isMobile}
          >
            <CalendarWindow
              user={user}
              group={group}
              profile={profile}
            />
          </Window>
        )}

        {/* Settings window */}
        {isWindowVisible('settings') && (
          <Window
            {...WINDOW_DEFS.settings}
            onClose={closeWindow}
            onFocus={focusWindow}
            onMinimize={minimizeWindow}
            minimized={!!minimizedWindows.settings}
            zIndex={zOrders.settings}
            titlebarColor={theme.titlebar}
            isMobile={isMobile}
          >
            <SettingsWindow
              user={user}
              profile={profile}
              group={group}
              onProfileUpdate={handleProfileUpdate}
              onSignOut={onSignOut}
            />
          </Window>
        )}
      </div>

      {/* Taskbar */}
      <Taskbar
        windows={taskbarWindows}
        onWindowClick={handleTaskbarClick}
        activeWindowId={activeWindowId}
        minimizedWindows={minimizedWindows}
        theme={theme}
        isMobile={isMobile}
      />
    </div>
  )
}
