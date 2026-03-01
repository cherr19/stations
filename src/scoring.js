import { SCORING_PARAMS } from './questions'

const SIMILARITY_THRESHOLD = 0.5

/** Нормализация строки для сравнения: нижний регистр, разбивка на слова без стоп-слов */
function tokenize(str) {
  if (str == null) return []
  const s = String(str).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  return s ? s.split(/\s+/).filter(Boolean) : []
}

/** Пересечение ключевых слов/фраз: доля общих токенов от максимума длин (Jaccard-like) */
export function textSimilarity(a, b) {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.length === 0 && tb.length === 0) return 1
  if (ta.length === 0 || tb.length === 0) return 0
  const setB = new Set(tb)
  const intersection = ta.filter((t) => setB.has(t)).length
  const unionSize = new Set([...ta, ...tb]).size
  return unionSize > 0 ? intersection / unionSize : 0
}

/** Извлечь значение для сравнения: примитив или JSON-строка для объектов */
function getComparableValue(data, id) {
  const v = data[id]
  if (v == null) return null
  if (typeof v === 'object' && !Array.isArray(v)) {
    const parts = Object.values(v).map((x) => (x != null ? String(x).trim() : '')).filter(Boolean)
    return parts.join(' ')
  }
  if (Array.isArray(v)) return v.map((x) => String(x)).join(' ')
  return v
}

/** Сравнение двух значений: 'full' | 'partial' | 'none' | 'empty' */
function compareValues(tVal, aVal, id) {
  const tEmpty = tVal == null || (typeof tVal === 'string' && !tVal.trim()) || (Array.isArray(tVal) && tVal.length === 0)
  const aEmpty = aVal == null || (typeof aVal === 'string' && !aVal.trim()) || (Array.isArray(aVal) && aVal.length === 0)
  if (tEmpty || aEmpty) return 'empty'

  const t = getComparableValue({ [id]: tVal }, id)
  const a = getComparableValue({ [id]: aVal }, id)
  const tStr = t != null ? String(t).trim() : ''
  const aStr = a != null ? String(a).trim() : ''

  if (tStr === aStr) return 'full'

  const numT = Number(tVal)
  const numA = Number(aVal)
  if (Number.isFinite(numT) && Number.isFinite(numA)) {
    const diff = Math.abs(numT - numA)
    const avg = (numT + numA) / 2
    if (avg === 0) return numT === numA ? 'full' : 'none'
    if (diff / avg < 0.2) return 'partial'
    return 'none'
  }

  const sim = textSimilarity(tStr, aStr)
  if (sim >= 0.8) return 'full'
  if (sim >= SIMILARITY_THRESHOLD) return 'partial'
  return 'none'
}

/** Подсчёт баллов: все параметры, критические вес 4, остальные 2. full=weight, partial=weight/2, none/empty=0 */
export function calculateScore(tanyaData, alenaData) {
  let totalScore = 0
  let maxScore = 0
  const details = []

  for (const param of SCORING_PARAMS) {
    const weight = param.critical ? 4 : 2
    maxScore += weight

    const tVal = tanyaData[param.id]
    const aVal = alenaData[param.id]
    const match = compareValues(tVal, aVal, param.id)

    let earned = 0
    if (match === 'full') earned = weight
    else if (match === 'partial') earned = weight / 2

    totalScore += earned
    details.push({
      id: param.id,
      label: param.label,
      critical: param.critical,
      match,
      weight,
      earned,
      tVal,
      aVal,
    })
  }

  return { score: totalScore, max: maxScore, details }
}

export function getDecision(score, max) {
  if (max === 0) return { type: '—', color: 'neutral', pct: 0 }
  const pct = (score / max) * 100
  if (pct >= 70) return { type: 'GO', color: 'lime', pct }
  if (pct >= 50) return { type: 'GO с оговорками', color: 'yellow', pct }
  if (pct >= 30) return { type: 'PIVOT', color: 'orange', pct }
  return { type: 'NO-GO', color: 'red', pct }
}

export function formatCellValue(val) {
  if (val == null) return '—'
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.join(', ') || '—'
    const parts = Object.entries(val).map(([k, v]) => (v != null && String(v).trim() ? `${v}` : null)).filter(Boolean)
    return parts.join(' · ') || '—'
  }
  return String(val).trim() || '—'
}
