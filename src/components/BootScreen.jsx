import { useState, useEffect, useRef, useCallback } from 'react'
import { signIn, signUp, getUserGroup, createGroup, joinGroup } from '../lib/supabase'

const BOOT_LINES = [
  { text: '', color: 'dim' },
  { text: 'DEVICE_ID (A000SYNC) F2C5AE10', color: 'purple' },
  { text: '', color: 'dim' },
  { text: ' Memory test      : 4096kb', color: 'white', append: { text: ' OK', color: 'green' }, delay: 400 },
  { text: ' System core      : SHIFTSYNC-OS v1.0', color: 'white', delay: 200 },
  { text: ' Display adapter  : VESA 1024x768', color: 'white', delay: 150 },
  { text: '', color: 'dim' },
  { text: 'Detecting CALENDAR module', color: 'white', append: { text: '....... SUCCESS', color: 'green' }, delay: 500 },
  { text: 'Detecting SCHEDULER module', color: 'white', append: { text: '...... SUCCESS', color: 'green' }, delay: 400 },
  { text: 'Detecting SYNC module', color: 'white', append: { text: '........... SUCCESS', color: 'green' }, delay: 600 },
  { text: 'Initializing group protocol', color: 'white', append: { text: '.... SUCCESS', color: 'green' }, delay: 500 },
  { text: '', color: 'dim' },
  { text: 'SHIFTSYNC OS v1.0 READY.', color: 'cyan', delay: 300 },
  { text: '', color: 'dim' },
]

function Line({ content, color, append }) {
  return (
    <div className={`boot-line color-${color}`}>
      {content}
      {append && <span className={`color-${append.color}`}>{append.text}</span>}
    </div>
  )
}

export default function BootScreen({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState([])
  const [phase, setPhase] = useState('booting') // booting | login | password | authing | group-check | group-prompt | group-code | group-creating | group-success | done
  const [inputVal, setInputVal] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authData, setAuthData] = useState(null) // { user, session }
  const [groupData, setGroupData] = useState(null) // the group
  const [statusLines, setStatusLines] = useState([]) // dynamic lines after boot
  const [groupChoice, setGroupChoice] = useState(null) // '1' or '2'
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  const addStatus = useCallback((text, color = 'white') => {
    setStatusLines(prev => [...prev, { text, color }])
  }, [])

  // Boot animation
  useEffect(() => {
    let i = 0
    let cancelled = false

    async function showNext() {
      if (cancelled || i >= BOOT_LINES.length) {
        if (!cancelled) setPhase('login')
        return
      }
      const line = BOOT_LINES[i]
      await new Promise(r => setTimeout(r, i === 0 ? 600 : (line.delay || 100)))
      if (!cancelled) {
        setVisibleLines(prev => [...prev, line])
        i++
        showNext()
      }
    }

    showNext()
    return () => { cancelled = true }
  }, [])

  // Auto-focus input when prompts appear
  useEffect(() => {
    if (['login', 'password', 'group-prompt', 'group-code'].includes(phase)) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [phase])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleLines, statusLines, phase])

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = inputVal.trim()
    setInputVal('')

    if (phase === 'login') {
      if (!val) return
      setUsername(val)
      addStatus(`Login: ${val}`, 'white')
      setPhase('password')
    }

    else if (phase === 'password') {
      if (!val) return
      setPassword(val)
      addStatus('Password: ••••••••', 'white')
      setPhase('authing')
      addStatus('')
      addStatus('Authenticating...', 'cyan')

      await new Promise(r => setTimeout(r, 600))

      try {
        // Try sign in first
        let result
        try {
          result = await signIn(username, val)
        } catch {
          // If sign in fails, try sign up (new user)
          result = await signUp(username, val)
          await new Promise(r => setTimeout(r, 800))
          // After signup, sign in to get session
          result = await signIn(username, val)
        }

        setAuthData(result)
        addStatus(`Welcome, ${username}!`, 'green')
        addStatus('')
        addStatus('Checking group membership...', 'cyan')
        setPhase('group-check')

        await new Promise(r => setTimeout(r, 800))

        const group = await getUserGroup(result.user.id)
        if (group) {
          setGroupData(group)
          addStatus(`Group found: "${group.name}"`, 'green')
          addStatus(`Invite code: ${group.invite_code}`, 'purple')
          addStatus('')
          addStatus('Loading desktop...', 'cyan')
          setPhase('done')
          await new Promise(r => setTimeout(r, 1000))
          onComplete({ user: result.user, group })
        } else {
          addStatus('No group found.', 'yellow')
          addStatus('')
          addStatus('  [1] Create a new crew', 'white')
          addStatus('  [2] Join a crew with an invite code', 'white')
          addStatus('')
          setPhase('group-prompt')
        }
      } catch (err) {
        addStatus('')
        addStatus(`ERROR: ${err.message}`, 'red')
        addStatus('Press ENTER to try again.', 'yellow')
        setPhase('login')
        setUsername('')
      }
    }

    else if (phase === 'group-prompt') {
      if (val === '1') {
        setGroupChoice('1')
        addStatus('Enter choice: 1', 'white')
        addStatus('')
        addStatus('Creating your crew...', 'cyan')
        setPhase('group-creating')

        await new Promise(r => setTimeout(r, 800))

        try {
          const group = await createGroup(authData.user.id)
          setGroupData(group)
          addStatus('SUCCESS!', 'green')
          addStatus('')
          addStatus(`Your invite code is:  ${group.invite_code}`, 'purple')
          addStatus('Share this code with your crew!', 'white')
          addStatus('')
          addStatus('Press ENTER to continue...', 'yellow')
          setPhase('group-success')
        } catch (err) {
          addStatus(`ERROR: ${err.message}`, 'red')
          setPhase('group-prompt')
        }
      } else if (val === '2') {
        setGroupChoice('2')
        addStatus('Enter choice: 2', 'white')
        addStatus('')
        setPhase('group-code')
      } else {
        addStatus('Invalid choice. Enter 1 or 2.', 'red')
      }
    }

    else if (phase === 'group-code') {
      if (!val) return
      addStatus(`Invite code: ${val}`, 'white')
      addStatus('')
      addStatus('Joining crew...', 'cyan')
      setPhase('group-creating')

      await new Promise(r => setTimeout(r, 700))

      try {
        const group = await joinGroup(authData.user.id, val)
        setGroupData(group)
        addStatus('SUCCESS!', 'green')
        addStatus('')
        addStatus(`Joined crew: "${group.name}"`, 'green')
        addStatus('')
        addStatus('Press ENTER to continue...', 'yellow')
        setPhase('group-success')
      } catch (err) {
        addStatus(`ERROR: ${err.message}`, 'red')
        addStatus('')
        setPhase('group-code')
      }
    }

    else if (phase === 'group-success') {
      addStatus('')
      addStatus('Loading desktop...', 'cyan')
      setPhase('done')
      await new Promise(r => setTimeout(r, 900))
      onComplete({ user: authData.user, group: groupData })
    }
  }

  const promptLabel = {
    login: 'Login:',
    password: 'Password:',
    'group-prompt': 'Enter choice (1 or 2):',
    'group-code': 'Enter invite code:',
    'group-success': 'Press ENTER to continue...',
  }[phase]

  const showInput = ['login', 'password', 'group-prompt', 'group-code', 'group-success'].includes(phase)

  return (
    <div className="boot-screen">
      {/* Logo header */}
      <div className="boot-logo-row">
        <div className="boot-logo-box">
          SS
        </div>
        <div className="boot-logo-meta">
          <span className="name">SHIFT SYNC</span>
          <span className="sub">v1.0.0  (BETA 0325)  Open Source</span>
          <span className="sub" style={{ color: '#666' }}>Built for The Untitled Crew</span>
        </div>
      </div>

      {/* Boot lines */}
      <div className="boot-lines">
        {visibleLines.map((line, i) => (
          <Line key={i} content={line.text} color={line.color} append={line.append} />
        ))}

        {/* Dynamic status lines after boot */}
        {statusLines.map((line, i) => (
          <Line key={`s${i}`} content={line.text} color={line.color} />
        ))}

        {/* Input prompt */}
        {showInput && (
          <div className="boot-input-row">
            <span className="boot-prompt-label">{promptLabel}</span>
            <input
              ref={inputRef}
              className="boot-input"
              type={phase === 'password' ? 'password' : 'text'}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck="false"
            />
            <span className="boot-cursor" />
          </div>
        )}

        {/* Spinner for loading states */}
        {['authing', 'group-check', 'group-creating'].includes(phase) && (
          <div className="boot-line color-dim">
            <span className="boot-cursor" style={{ background: '#22d3ee' }} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
