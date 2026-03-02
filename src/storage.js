/**
 * Облачное хранилище: приоритет Supabase → Firebase → localStorage.
 * Комната (roomId) в URL — оба пользователя используют один roomId для синхронизации.
 */

import { hasFinishedAll } from './questions.js'
import * as logger from './logger.js'

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
    logger.log('storage', 'Supabase client initialized')
    return supabaseClient
  } catch (e) {
    logger.warn('storage', 'Supabase init failed', { error: String(e) })
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

const ADMIN_STORAGE_KEY = 'vision_admin'

/** Проверить, вошёл ли пользователь как админ (по sessionStorage) */
export function isAdmin() {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) === '1'
}

/** Если в URL есть ?admin=SECRET и он совпадает с VITE_ADMIN_SECRET — запомнить админа и убрать параметр из URL */
export function applyAdminFromUrl() {
  if (typeof window === 'undefined') return false
  const secret = import.meta.env.VITE_ADMIN_SECRET
  if (!secret) return isAdmin()
  const params = new URLSearchParams(window.location.search)
  const key = params.get('admin')
  if (key === secret) {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, '1')
    params.delete('admin')
    const url = new URL(window.location.href)
    url.search = params.toString()
    window.history.replaceState({}, '', url.pathname + (url.search ? '?' + url.search : ''))
    return true
  }
  return isAdmin()
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

/** screen = 'select' | 'intro' | 'filling' | 'comparison' | null */
export function getScreenFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const s = params.get('screen')
  return s === 'comparison' ? 'comparison' : null
}

export function setScreenInUrl(screen) {
  const url = new URL(window.location.href)
  if (screen) url.searchParams.set('screen', screen)
  else url.searchParams.delete('screen')
  window.history.replaceState({}, '', url.toString())
}

export function setUserInUrl(user) {
  const url = new URL(window.location.href)
  if (user) url.searchParams.set('user', user)
  else url.searchParams.delete('user')
  window.history.replaceState({}, '', url.toString())
}

/** Выставить в адресной строке полный URL страницы сравнения комнаты (чтобы можно было вернуться по ссылке) */
export function setComparisonPageUrl(roomId, user) {
  if (typeof window === 'undefined') return
  const base = window.location.origin + window.location.pathname
  const params = new URLSearchParams({ room: roomId, screen: 'comparison' })
  if (user) params.set('user', user)
  const newUrl = `${base}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}

/** Ссылка на страницу сравнения комнаты (можно сохранить и открыть позже) */
export function getComparisonLink(roomId, user) {
  if (!roomId) return ''
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  const params = new URLSearchParams({ room: roomId, screen: 'comparison' })
  if (user) params.set('user', user)
  return `${base}?${params.toString()}`
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
      logger.log('storage', 'saveData OK', { roomId, user, backend: 'supabase' })
    } catch (e) {
      logger.error('storage', 'Supabase save failed', { roomId, user, error: String(e) })
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
      logger.log('storage', 'saveData OK', { roomId, user, backend: 'firebase' })
    } catch (e) {
      logger.error('storage', 'Firebase save failed', { roomId, user, error: String(e) })
      throw e
    }
    return
  }
  const key = `${STORAGE_PREFIX}${roomId}_${user}`
  try {
    localStorage.setItem(key, JSON.stringify(data))
    logger.log('storage', 'saveData OK', { roomId, user, backend: 'localStorage' })
  } catch (e) {
    logger.error('storage', 'localStorage save failed', { key, error: String(e) })
  }
}

/** Загрузить данные обоих пользователей и AI-анализ (для экрана сравнения) */
export async function loadRoom(roomId) {
  if (!roomId) {
    logger.log('storage', 'loadRoom skip', { reason: 'no roomId' })
    return { tanyaData: {}, alenaData: {}, aiAnalysis: null, aiAnalysisAt: null, roomUpdatedAt: null }
  }
  const sb = await getSupabaseAsync()
  if (sb) {
    try {
      const { data, error } = await sb
        .from(TABLE_NAME)
        .select('tanya_data, alena_data, ai_analysis, ai_analysis_at, updated_at')
        .eq('room_id', roomId)
        .maybeSingle()
      if (error) throw error
      const ensureObj = (v) => {
        if (v == null) return {}
        if (typeof v === 'object' && !Array.isArray(v)) return v
        if (typeof v === 'string') {
          try { return JSON.parse(v) } catch { return {} }
        }
        return {}
      }
      const out = {
        tanyaData: ensureObj(data?.tanya_data),
        alenaData: ensureObj(data?.alena_data),
        aiAnalysis: data?.ai_analysis ?? null,
        aiAnalysisAt: data?.ai_analysis_at ?? null,
        roomUpdatedAt: data?.updated_at ?? null,
      }
      logger.log('storage', 'loadRoom OK', { roomId, backend: 'supabase', keysT: Object.keys(out.tanyaData).length, keysA: Object.keys(out.alenaData).length })
      return out
    } catch (e) {
      logger.error('storage', 'Supabase loadRoom failed', { roomId, error: String(e) })
      return { tanyaData: {}, alenaData: {}, aiAnalysis: null, aiAnalysisAt: null, roomUpdatedAt: null }
    }
  }
  const db = await initFirebase()
  if (db) {
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const ref = doc(db, 'vision_rooms', roomId)
      const snap = await getDoc(ref)
      const d = snap.data() || {}
      const out = {
        tanyaData: d.tanyaData ? JSON.parse(d.tanyaData) : {},
        alenaData: d.alenaData ? JSON.parse(d.alenaData) : {},
        aiAnalysis: null,
        aiAnalysisAt: null,
        roomUpdatedAt: d.updatedAt ?? null,
      }
      logger.log('storage', 'loadRoom OK', { roomId, backend: 'firebase' })
      return out
    } catch (e) {
      logger.error('storage', 'Firebase loadRoom failed', { roomId, error: String(e) })
      return { tanyaData: {}, alenaData: {}, aiAnalysis: null, aiAnalysisAt: null, roomUpdatedAt: null }
    }
  }
  const tanyaRaw = localStorage.getItem(`${STORAGE_PREFIX}${roomId}_tanya`)
  const alenaRaw = localStorage.getItem(`${STORAGE_PREFIX}${roomId}_alena`)
  logger.log('storage', 'loadRoom OK', { roomId, backend: 'localStorage' })
  return {
    tanyaData: tanyaRaw ? JSON.parse(tanyaRaw) : {},
    alenaData: alenaRaw ? JSON.parse(alenaRaw) : {},
    aiAnalysis: null,
    aiAnalysisAt: null,
    roomUpdatedAt: null,
  }
}

/** Сохранить результат AI-анализа в комнату (Supabase). Только UPDATE полей ai_analysis, ai_analysis_at — не трогаем чаты и ответы, не зависим от наличия колонок чата. */
export async function saveAiAnalysis(roomId, payload) {
  if (!roomId || !payload) return
  const sb = await getSupabaseAsync()
  if (!sb) return
  const now = new Date().toISOString()
  try {
    const { error } = await sb
      .from(TABLE_NAME)
      .update({ ai_analysis: payload, ai_analysis_at: now })
      .eq('room_id', roomId)
    if (error) throw error
    logger.log('storage', 'saveAiAnalysis OK', { roomId })
  } catch (e) {
    logger.error('storage', 'saveAiAnalysis failed', { roomId, error: String(e) })
    throw e
  }
}

/** Загрузить только свои данные для формы */
export async function loadMyData(roomId, user) {
  const { tanyaData, alenaData } = await loadRoom(roomId)
  return user === 'tanya' ? tanyaData : alenaData
}

/** Загрузить переписку с Claude для комнаты и участника */
export async function loadChat(roomId, user) {
  if (!roomId || !user) return []
  const sb = await getSupabaseAsync()
  if (sb) {
    try {
      const { data, error } = await sb
        .from(TABLE_NAME)
        .select('tanya_chat, alena_chat')
        .eq('room_id', roomId)
        .maybeSingle()
      if (error) throw error
      const chat = user === 'tanya' ? (data?.tanya_chat ?? []) : (data?.alena_chat ?? [])
      return Array.isArray(chat) ? chat : []
    } catch (e) {
      logger.warn('storage', 'loadChat failed (columns may be missing)', { roomId, error: String(e) })
      return []
    }
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${roomId}_${user}_chat`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Сохранить переписку с Claude для комнаты и участника */
export async function saveChat(roomId, user, messages) {
  if (!roomId || !user || !Array.isArray(messages)) return
  const sb = await getSupabaseAsync()
  if (sb) {
    try {
      const { data: row, error: fetchError } = await sb
        .from(TABLE_NAME)
        .select('tanya_data, alena_data, tanya_chat, alena_chat')
        .eq('room_id', roomId)
        .maybeSingle()
      const existing = row || {}
      const payload = {
        room_id: roomId,
        tanya_data: existing.tanya_data ?? {},
        alena_data: existing.alena_data ?? {},
        tanya_chat: user === 'tanya' ? messages : (existing.tanya_chat ?? []),
        alena_chat: user === 'alena' ? messages : (existing.alena_chat ?? []),
        updated_at: new Date().toISOString(),
      }
      const { error } = await sb.from(TABLE_NAME).upsert(payload, { onConflict: 'room_id' })
      if (error) throw error
      logger.log('storage', 'saveChat OK', { roomId, user, count: messages.length })
    } catch (e) {
      logger.warn('storage', 'saveChat failed', { roomId, user, error: String(e) })
    }
    return
  }
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${roomId}_${user}_chat`, JSON.stringify(messages))
  } catch (e) {
    logger.warn('storage', 'saveChat localStorage failed', { roomId, user })
  }
}

/** Статус: кто начал и кто закончил заполнение (без раскрытия содержимого) */
export async function getRoomStatus(roomId) {
  const { tanyaData, alenaData } = await loadRoom(roomId)
  return {
    tanyaStarted: hasAnyData(tanyaData),
    alenaStarted: hasAnyData(alenaData),
    tanyaFinished: hasFinishedAll(tanyaData || {}),
    alenaFinished: hasFinishedAll(alenaData || {}),
  }
}

/** Список всех комнат, где есть хотя бы какие-то данные (для админа). Только Supabase. */
export async function getRoomsWithData() {
  const sb = await getSupabaseAsync()
  if (!sb) return []
  try {
    const { data: rows, error } = await sb
      .from(TABLE_NAME)
      .select('room_id, tanya_data, alena_data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw error
    if (!rows || !rows.length) return []
    const out = rows
      .filter((r) => hasAnyData(r.tanya_data) || hasAnyData(r.alena_data))
      .map((r) => ({
        roomId: r.room_id,
        tanyaStarted: hasAnyData(r.tanya_data),
        tanyaFinished: hasFinishedAll(r.tanya_data || {}),
        alenaStarted: hasAnyData(r.alena_data),
        alenaFinished: hasFinishedAll(r.alena_data || {}),
        updatedAt: r.updated_at || null,
      }))
    logger.log('storage', 'getRoomsWithData', { count: out.length })
    return out
  } catch (e) {
    logger.warn('storage', 'getRoomsWithData failed', { error: String(e) })
    return []
  }
}

export function isCloudStorageAvailable() {
  return !!getSupabaseConfig() || !!getFirebaseConfig()
}
