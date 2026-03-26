import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Shift Sync] Missing Supabase env vars. Make sure .env exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
)

// ─── Auth helpers ────────────────────────────────────────────
const toEmail = (username) => `${username.toLowerCase().trim()}@users.shiftsync.app`

export async function signUp(username, password) {
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username: username.trim() } }
  })
  if (error) throw error
  return data
}

export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── Profile helpers ─────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Group helpers ───────────────────────────────────────────
export async function getUserGroup(userId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? data.groups : null
}

export async function createGroup(userId) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .insert({ name: 'My Crew', invite_code: code, created_by: userId })
    .select()
    .single()
  if (gErr) throw gErr

  const { error: mErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId })
  if (mErr) throw mErr

  return group
}

export async function joinGroup(userId, code) {
  const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.toUpperCase().trim())
    .single()
  if (gErr) throw new Error('Invalid invite code. Try again.')

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return group

  const { error: mErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId })
  if (mErr) throw mErr

  return group
}

export async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(*)')
    .eq('group_id', groupId)
  if (error) throw error
  return data.map(m => m.profiles)
}

// ─── Shift helpers ───────────────────────────────────────────
export async function getShiftsForWeek(groupId, weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const startStr = weekStart.toISOString().slice(0, 10)
  const endStr = weekEnd.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('shifts')
    .select('*, profiles(username, color)')
    .eq('group_id', groupId)
    .gte('shift_date', startStr)
    .lte('shift_date', endStr)
  if (error) throw error
  return data
}

export async function addShift(shift) {
  const { data, error } = await supabase
    .from('shifts')
    .insert(shift)
    .select('*, profiles(username, color)')
    .single()
  if (error) throw error
  return data
}

export async function deleteShift(shiftId) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId)
  if (error) throw error
}

export async function updateShift(shiftId, updates) {
  const { data, error } = await supabase
    .from('shifts')
    .update(updates)
    .eq('id', shiftId)
    .select('*, profiles(username, color)')
    .single()
  if (error) throw error
  return data
}

// ─── Realtime subscription ───────────────────────────────────
export function subscribeToShifts(groupId, callback) {
  return supabase
    .channel(`shifts-${groupId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shifts',
      filter: `group_id=eq.${groupId}`
    }, callback)
    .subscribe()
}
