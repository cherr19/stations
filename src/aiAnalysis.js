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
  let alenaSummary = buildAnswersSummary(alenaData, 'Ответы Алены')
  // Fallback: если buildAnswersSummary пуст, но в details есть ответы Алены — собираем из таблицы
  if (!alenaSummary && details.some((d) => d.aVal != null && formatCellValue(d.aVal) !== '—')) {
    const lines = details
      .filter((d) => d.aVal != null && formatCellValue(d.aVal) !== '—')
      .map((d) => `${d.label}: ${formatCellValue(d.aVal).slice(0, 200).replace(/\n/g, ' ')}`)
    alenaSummary = lines.length ? `Ответы Алены:\n${lines.join('\n')}` : ''
  }
  const hasAlenaFromData = Object.keys(alenaData || {}).some((k) => {
    const v = alenaData[k]
    if (v == null) return false
    if (typeof v === 'string') return v.trim() !== ''
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.values(v).some((x) => x != null && String(x).trim() !== '')
    return true
  })
  const hasAlena = hasAlenaFromData || !!alenaSummary
  const dataStatus = hasAlena ? 'Обе со-основательницы заполнили опросник. Ответы Алены обязательно учти — они есть в блоке «Ответы Алены» и в таблице сравнения выше.' : 'Только Таня заполнила.'

  const userContent = `
Ниже данные двух со-основательниц (Таня и Алена), заполнивших опросник по выравниванию видения (Founders Vision Alignment).

**ВАЖНО: ${dataStatus}**

**Численный скор совместимости (по формальному совпадению ответов):** ${score} / ${max} баллов (${pct}%).

**Таблица сравнения по параметрам (полное / частичное / различия / пусто):**
${detailsText}

${tanyaSummary}

${alenaSummary}

---

**КРИТИЧНО: Различай стремления и описания нежелательного.**
- **Стремления (чего ХОТЯТ):** q1 (идеальная жизнь — главный источник), q2–q5, q7, q8–q17, q18 (SUCCESS), scenario_favorite. Из q6 (ограничения) — это ЛИМИТЫ, а не отказ от целой категории: «не готова к долгим в Сибири» ≠ «не хочет командировок»; если в q1 написано «хочу командировки» — значит хотят.
- **НЕ использовать как желания:**
  - **scenario_a** (консервативный) — часто описание того, чего НЕ хотят (застой, «живу в X», «никаких командировок»). Нельзя говорить «живёт в X» или «не хочет поездок», если X/отказ упомянуты только там.
  - **scenario_b** — нейтральный; осторожно, не подставляй как главное желание.
  - **q19 (STAGNATION), q20 (FAILURE), q21** — явно негатив. Никогда не трактуй это как цели.
- **Правило:** Если в q1 человек пишет, что хочет командировки/путешествия — это желание. Ограничения из q6 уточняют условия (например, не Сибирь), а не отменяют само желание.

Проведи семантический анализ и верни **полный** ответ **строго в формате JSON** (без markdown-блоков и пояснений до/после). Один объект со всеми ключами ниже. Обязательно заполни каждый раздел; не обрезай ответ.

- **ai_compatibility_score** — число 0–100 (оценка совместимости по смыслу).
- **ai_verdict** — одна из строк: "GO", "CONDITIONAL_GO", "PIVOT", "NO_GO".
- **strengths** — массив строк (2–5 пунктов): в чём партнёры совпадают по смыслу (миссия, риски, роли, ценности).
- **critical_conflicts** — массив объектов с полями "title" и "recommendation". Реальные противоречия по сути (приоритеты vs ограничения, расхождения по часам/ролям). Если явных конфликтов нет — пустой массив [].
- **divergence_areas** — массив объектов с полями "area" и "note": темы расхождений и на что обратить внимание. 3–7 пунктов.
- **discussion_questions** — массив из 3–5 конкретных вопросов для встречи. Обязательно заполни.
- **summary** — одна строка с 2–3 абзацами (разделяй \\n\\n): резюме совместимости, точки совпадения и зоны для обсуждения. Обязательно заполни.

Критерии: (1) семантика текстов, (2) скрытые конфликты, (3) operational compatibility. Пиши на русском. Верни полный JSON без сокращений.
`.trim()

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'founders_compatibility',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          ai_compatibility_score: { type: 'number', description: 'Оценка совместимости 0-100' },
          ai_verdict: { type: 'string', enum: ['GO', 'CONDITIONAL_GO', 'PIVOT', 'NO_GO'], description: 'Вердикт' },
          strengths: {
            type: 'array',
            items: { type: 'string' },
            description: '2-5 пунктов: совпадения по смыслу',
          },
          critical_conflicts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                recommendation: { type: 'string' },
              },
              required: ['title', 'recommendation'],
              additionalProperties: false,
            },
            description: 'Реальные противоречия',
          },
          divergence_areas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string' },
                note: { type: 'string' },
              },
              required: ['area', 'note'],
              additionalProperties: false,
            },
            description: '3-7 тем расхождений с подсказками',
          },
          discussion_questions: {
            type: 'array',
            items: { type: 'string' },
            description: '3-5 вопросов для встречи',
          },
          summary: { type: 'string', description: '2-3 абзаца резюме на русском' },
        },
        required: ['ai_compatibility_score', 'ai_verdict', 'strengths', 'critical_conflicts', 'divergence_areas', 'discussion_questions', 'summary'],
        additionalProperties: false,
      },
    },
  }

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
          content: 'Ты аналитик совместимости видения со-основателей. Источник стремлений: q1 (главный), q6–q17, q18 SUCCESS. scenario_a (консервативный) — чаще описание НЕжелательного (застой, «никаких командировок»). Не используй города/географию/отказ от поездок из scenario_a как желания. q6 — лимиты (не Сибирь, не 100% офис), а не отказ от командировок, если в q1 человек хочет поездки. q19, q20, q21 — негатив, не трактовать как цели. Верни валидный JSON по схеме. Пиши на русском.',
        },
        { role: 'user', content: userContent },
      ],
      max_tokens: 4096,
      temperature: 0.3,
      response_format: responseFormat,
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
