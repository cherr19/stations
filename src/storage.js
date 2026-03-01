/**
 * Облачное хранилище: приоритет Supabase → Firebase → localStorage.
 * Комната (roomId) в URL — оба пользователя используют один roomId для синхронизации.
 */

const STORAGE_PREFIX = 'vision_room_'
const TABLE_NAME = 'vision_rooms'

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

let supabaseClient = null

async function getSupabaseAsync() {
  if (supabaseClient) return supabaseClient
  const config = getSupabaseConfig()
  if (!config) return null
  try {
    const { createClient } = await import('@supabase/supabase-js')
    supabaseClient = createClient(config.url, config.anonKey)
    return supabaseClient
  } catch (e) {
    console.warn('Supabase init failed', e)
    return null
  }
}

function getFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  if (!apiKey || !projectId) return null
  return {
    apiKey,
    projectId,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  }
}

let firestoreDb = null

async function initFirebase() {
  if (firestoreDb) return firestoreDb
  const config = getFirebaseConfig()
  if (!config) return null
  try {
    const { initializeApp } = await import('firebase/app')
    const { getFirestore } = await import('firebase/firestore')
    const app = initializeApp(config)
    firestoreDb = getFirestore(app)
    return firestoreDb
  } catch (e) {
    console.warn('Firebase init failed', e)
    return null
  }
}

export function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('room') || ''
}

/** user = 'tanya' | 'alena' | null */
export function getUserFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const u = params.get('user')
  return u === 'tanya' || u === 'alena' ? u : null
}

/** Полная ссылка для отправки партнёру (с room и user) */
export function getLinkForUser(roomId, user) {
  if (!roomId || !user) return ''
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  const params = new URLSearchParams({ room: roomId, user })
  return `${base}?${params.toString()}`
}

export function setRoomIdInUrl(roomId) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  window.history.replaceState({}, '', url.toString())
  return roomId
}

export function generateRoomId() {
  return crypto.randomUUID?.() || `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function hasAnyData(data) {
  if (!data || typeof data !== 'object') return false
  return Object.keys(data).some((k) => {
    const v = data[k]
    if (v == null) return false
    if (typeof v === 'string') return v.trim() !== ''
    if (Array.isArray(v)) return v.length > 0
    return true
  })
}

/** Сохранить данные одного пользователя в комнату */
export async function saveData(roomId, user, data) {
  if (!roomId) return
  const sb = await getSupabaseAsync()
  if (sb) {
    try {
      const { data: row, error: fetchError } = await sb
        .from(TABLE_NAME)
        .select('tanya_data, alena_data')
        .eq('room_id', roomId)
        .maybeSingle()
      const existing = row || { tanya_data: null, alena_data: null }
      const payload = {
        room_id: roomId,
        tanya_data: user === 'tanya' ? data : (existing.tanya_data || {}),
        alena_data: user === 'alena' ? data : (existing.alena_data || {}),
        updated_at: new Date().toISOString(),
      }
      const { error } = await sb.from(TABLE_NAME).upsert(payload, {
        onConflict: 'room_id',
      })
      if (error) throw error
    } catch (e) {
      console.error('Supabase save failed', e)
      throw e
    }
    return
  }
  const db = await initFirebase()
  if (db) {
    try {
      const { doc, setDoc } = await import('firebase/firestore')
      const ref = doc(db, 'vision_rooms', roomId)
      await setDoc(ref, {
        [user === 'tanya' ? 'tanyaData' : 'alenaData']: JSON.stringify(data),
        updatedAt: new Date().toISOString(),
      }, { merge: true })
    } catch (e) {
      console.error('Firebase save failed', e)
      throw e
    }
    return
  }
  const key = `${STORAGE_PREFIX}${roomId}_${user}`
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('localStorage save failed', e)
  }
}

/** Загрузить данные обоих пользователей (для экрана сравнения) */
export async function loadRoom(roomId) {
  if (!roomId) return { tanyaData: {}, alenaData: {} }
  const sb = await getSupabaseAsync()
  if (sb) {
    try {
      const { data, error } = await sb
        .from(TABLE_NAME)
        .select('tanya_data, alena_data')
        .eq('room_id', roomId)
        .maybeSingle()
      if (error) throw error
      return {
        tanyaData: data?.tanya_data ?? {},
        alenaData: data?.alena_data ?? {},
      }
    } catch (e) {
      console.error('Supabase load failed', e)
      return { tanyaData: {}, alenaData: {} }
    }
  }
  const db = await initFirebase()
  if (db) {
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const ref = doc(db, 'vision_rooms', roomId)
      const snap = await getDoc(ref)
      const d = snap.data() || {}
      return {
        tanyaData: d.tanyaData ? JSON.parse(d.tanyaData) : {},
        alenaData: d.alenaData ? JSON.parse(d.alenaData) : {},
      }
    } catch (e) {
      console.error('Firebase load failed', e)
      return { tanyaData: {}, alenaData: {} }
    }
  }
  const tanyaRaw = localStorage.getItem(`${STORAGE_PREFIX}${roomId}_tanya`)
  const alenaRaw = localStorage.getItem(`${STORAGE_PREFIX}${roomId}_alena`)
  return {
    tanyaData: tanyaRaw ? JSON.parse(tanyaRaw) : {},
    alenaData: alenaRaw ? JSON.parse(alenaRaw) : {},
  }
}

/** Загрузить только свои данные для формы */
export async function loadMyData(roomId, user) {
  const { tanyaData, alenaData } = await loadRoom(roomId)
  return user === 'tanya' ? tanyaData : alenaData
}

/** Статус: кто уже начал заполнение (без раскрытия содержимого) */
export async function getRoomStatus(roomId) {
  const { tanyaData, alenaData } = await loadRoom(roomId)
  return {
    tanyaStarted: hasAnyData(tanyaData),
    alenaStarted: hasAnyData(alenaData),
  }
}

export function isCloudStorageAvailable() {
  return !!getSupabaseConfig() || !!getFirebaseConfig()
}
