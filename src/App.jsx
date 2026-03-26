import { useState, useEffect } from 'react'
import BootScreen from './components/BootScreen'
import Desktop from './components/Desktop'
import { getSession, getProfile, getUserGroup, signOut } from './lib/supabase'

export default function App() {
  const [phase, setPhase] = useState('loading') // loading | boot | desktop
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [group, setGroup] = useState(null)

  // Check for existing session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getSession()
        if (session?.user) {
          const [prof, grp] = await Promise.all([
            getProfile(session.user.id),
            getUserGroup(session.user.id),
          ])
          if (prof && grp) {
            setUser(session.user)
            setProfile(prof)
            setGroup(grp)
            setPhase('desktop')
            return
          }
        }
      } catch (e) {
        // No session or error — go to boot
      }
      setPhase('boot')
    }
    checkSession()
  }, [])

  const handleBootComplete = async ({ user: u, group: g }) => {
    try {
      const prof = await getProfile(u.id)
      setUser(u)
      setProfile(prof)
      setGroup(g)
      setPhase('desktop')
    } catch (err) {
      console.error('Failed to load profile after boot:', err)
      setPhase('boot')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
    setGroup(null)
    setPhase('boot')
  }

  if (phase === 'loading') {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'VT323, monospace',
        color: '#a855f7',
        fontSize: 24,
        letterSpacing: 4,
      }}>
        SHIFT SYNC...
      </div>
    )
  }

  if (phase === 'boot') {
    return <BootScreen onComplete={handleBootComplete} />
  }

  return (
    <Desktop
      user={user}
      group={group}
      profile={profile}
      onSignOut={handleSignOut}
    />
  )
}
