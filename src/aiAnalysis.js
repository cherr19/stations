/**
 * AI-анализ совместимости видения основателей через OpenRouter (Claude).
 * Семантика ответов, скрытые конфликты, operational compatibility.
 * Ключ: VITE_OPENROUTER_API_KEY (тот же, что для песочницы).
 */

import { formatCellValue } from './scoring'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-sonnet-4.5'

function getApiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || ''
}

export function isAiAnalysisAvailable() {
  return !!getApiKey().trim()
}

function buildDetailsText(details) {
  return details
    .map((d) => {
      const t = formatCellValue(d.tVal).replace(/\n/g, ' ')
      const a = formatCellValue(d.aVal).replace(/\n/g, ' ')
      return `[${d.label}${d.critical ? ' ⭐критический' : ''}] совпадение: ${d.match}\n  Таня: ${t}\n  Алена: ${a}`
    })
    .join('\n\n')
}

function buildAnswersSummary(data, prefix) {
  const lines = []
  for (const [id, val] of Object.entries(data || {})) {
    if (val == null || (typeof val === 'string' && !val.trim())) continue
    const str = formatCellValue(val).slice(0, 200).replace(/\n/g, ' ')
    if (str && str !== '—') lines.push(`${id}: ${str}`)
  }
  return lines.length ? `${prefix}:\n${lines.join('\n')}` : ''
}

/**
 * Запуск AI-анализа. Возвращает объект для сохранения в ai_analysis.
 * @param {{ tanyaData: object, alenaData: object, score: number, max: number, pct: string, details: array }} input
 * @returns {Promise<{ ai_compatibility_score: number, ai_verdict: string, strengths: string[], critical_conflicts: { title: string, recommendation: string }[], discussion_questions: string[], summary: string }>}
 */
export async function runAiAnalysis(input) {
  const key = getApiKey()
  if (!key.trim()) throw new Error('OpenRouter API key not configured')

  const { tanyaData, alenaData, score, max, pct, details } = input
  const detailsText = buildDetailsText(details)
  const tanyaSummary = buildAnswersSummary(tanyaData, 'Ответы Тани')
  const alenaSummary = buildAnswersSummary(alenaData, 'Ответы Алены')

  const userContent = `
Ниже данные двух со-основательниц (Таня и Алена), заполнивших опросник по выравниванию видения (Founders Vision Alignment).

**Численный скор совместимости (по формальному совпадению ответов):** ${score} / ${max} баллов (${pct}%).

**Таблица сравнения по параметрам (полное / частичное / различия / пусто):**
${detailsText}

${tanyaSummary}

${alenaSummary}

---

Проведи семантический анализ и верни ответ **строго в формате JSON** (без markdown-блоков и пояснений до/после), один объект с ключами:

- **ai_compatibility_score** — число 0–100 (оценка совместимости по смыслу, не только по буквальному совпадению).
- **ai_verdict** — одна из строк: "GO", "CONDITIONAL_GO", "PIVOT", "NO_GO".
- **strengths** — массив строк (2–5 пунктов): в чём партнёры совпадают по смыслу (миссия, риски, роли, ценности).
- **critical_conflicts** — массив объектов с полями "title" (короткое название конфликта) и "recommendation" (что обсудить или как смягчить). Только реальные противоречия по сути (приоритеты одного vs ограничения другого, расхождения по часам/ролям и т.п.).
- **divergence_areas** — массив объектов с полями "area" (тема/область, где есть расхождения: например "Доход и уровень жизни", "Роли в бизнесе") и "note" (на что обратить внимание и что стоит обсудить по этой теме). 3–7 пунктов: все значимые зоны расхождения с конкретными подсказками для обсуждения.
- **discussion_questions** — массив из 3–5 конкретных вопросов для живой встречи, чтобы закрыть расхождения.
- **summary** — одна строка с 2–3 абзацами (разделяй абзацы символом \\n\\n): резюме совместимости, главные точки совпадения и зоны для обсуждения.

Критерии: (1) семантическое совпадение текстов, (2) скрытые конфликты по сути, (3) operational compatibility (роли, делегирование, готовность к нагрузке). Пиши на русском.
`.trim()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Ты аналитик совместимости видения со-основателей. Отвечай только валидным JSON с запрошенными полями. Без комментариев вне JSON.',
        },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  })

  clearTimeout(timeoutId)
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${errText}`)
  }

  const data = await res.json()
  let raw = data.choices?.[0]?.message?.content?.trim() ?? ''
  raw = raw.replace(/^```json\s*/i, '').replace(/^json\s*/i, '').replace(/\s*```$/i, '').trim()
  const firstBrace = raw.indexOf('{')
  const jsonStr = firstBrace >= 0 ? raw.slice(firstBrace) : raw
  let parsed
  try {
    parsed = JSON.parse(jsonStr)
  } catch (e1) {
    const lastBrace = jsonStr.lastIndexOf('}')
    const trimmed = lastBrace >= 0 ? jsonStr.slice(0, lastBrace + 1) : jsonStr
    try {
      parsed = JSON.parse(trimmed)
    } catch (e2) {
      parsed = salvageParsedFromRaw(jsonStr)
    }
  }

  return {
    ai_compatibility_score: Number(parsed.ai_compatibility_score) || 0,
    ai_verdict: String(parsed.ai_verdict || 'PIVOT').toUpperCase().replace(/\s/g, '_'),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    critical_conflicts: Array.isArray(parsed.critical_conflicts)
      ? parsed.critical_conflicts.map((c) => ({
          title: c?.title != null ? String(c.title) : '',
          recommendation: c?.recommendation != null ? String(c.recommendation) : '',
        }))
      : [],
    divergence_areas: Array.isArray(parsed.divergence_areas)
      ? parsed.divergence_areas.map((d) => ({
          area: d?.area != null ? String(d.area) : '',
          note: d?.note != null ? String(d.note) : '',
        })).filter((d) => d.area.trim())
      : [],
    discussion_questions: Array.isArray(parsed.discussion_questions) ? parsed.discussion_questions.map(String) : [],
    summary: String(parsed.summary ?? ''),
  }
}

/** Вытащить из обрезанного/невалидного JSON хотя бы score и verdict по regex */
function salvageParsedFromRaw(str) {
  const scoreMatch = str.match(/"ai_compatibility_score"\s*:\s*(\d+)/)
  const verdictMatch = str.match(/"ai_verdict"\s*:\s*"([^"]*)"/)
  const strengthsMatch = str.match(/"strengths"\s*:\s*\[([\s\S]*?)\]/)
  const summaryMatch = str.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  const strengths = []
  if (strengthsMatch) {
    const arrStr = strengthsMatch[1]
    const parts = arrStr.match(/"([^"]*(?:\\.[^"]*)*)"/g)
    if (parts) strengths.push(...parts.map((p) => p.slice(1, -1).replace(/\\"/g, '"')))
  }
  return {
    ai_compatibility_score: scoreMatch ? Number(scoreMatch[1]) : 0,
    ai_verdict: verdictMatch ? verdictMatch[1] : 'PIVOT',
    strengths,
    critical_conflicts: [],
    divergence_areas: [],
    discussion_questions: [],
    summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : '',
  }
}
