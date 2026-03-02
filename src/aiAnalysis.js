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
# Анализ совместимости со-основательниц

## Контекст опросника

Опросник из трёх частей:
1. **Личный аудит** — жизнь через 5 лет (q1), роли, доход, энергия, ограничения (q6), риск-профиль, три сценария будущего (scenario_a/b/c)
2. **Бизнес-видение** — winning aspiration, амбиции, клиент, масштаб, роли, делегирование, жертвы
3. **Сценарный анализ** — реакции на SUCCESS, STAGNATION, FAILURE

**ВАЖНО: Анализируй только части 1–2 и сценарий SUCCESS (q18). Полностью игнорируй STAGNATION и FAILURE — они не влияют на оценку совместимости.**

**КРИТИЧНО про источник стремлений:**
- **Стремления (чего ХОТЯТ):** q1 (идеальная жизнь — главный источник), q2–q5, q7, q8–q17, q18 SUCCESS, scenario_favorite. q6 — ЛИМИТЫ: «не готова к долгим в Сибири» ≠ «не хочет командировок»; если в q1 «хочу командировки» — значит хотят.
- **НЕ использовать:** scenario_a (консервативный) — чаще описание НЕжелательного («живу в X», «никаких командировок»). Не говори «живёт в X» или «не хочет поездок», если упомянуто только там. q19, q20, q21 — негатив, не цели.

---

## Входные данные

**Численный скор (формальное совпадение):** ${score} / ${max} баллов (${pct}%).

**Таблица сравнения:**
${detailsText}

**Ответы Тани:**
${tanyaSummary}

**Ответы Алены:**
${alenaSummary}

**Статус:** ${dataStatus}

---

## Критерии анализа

1. **Семантическое совпадение** — смысл, не буквальное совпадение. Идеальный день, роли, ограничения.
2. **Скрытые конфликты** — приоритет одного = жертва другого? Красные линии vs амбиции? Риск-профили?
3. **Operational compatibility** — дополняют ли роли? Есть ли gaps (никто не хочет продажи)? Конфликт за одну роль?
4. **Внутренняя согласованность** — противоречия внутри ответов одного человека?
5. **Emotional alignment** — что заряжает/истощает, мотивация (деньги vs миссия).
6. **Lifestyle compatibility** — география, часы, семья, здоровье.
7. **Success definition** — winning aspiration, главная амбиция, какой сценарий волнует.

---

## Правила вердикта

- **GO** (85–100): высокая совместимость, нет критических конфликтов, дополняют друг друга.
- **CONDITIONAL_GO** (65–84): хорошая совместимость, 1–2 расхождения, решаемы через обсуждение.
- **PIVOT** (45–64): средняя, несколько конфликтов, нужен пересмотр ролей/scope.
- **NO_GO** (0–44): критические несовместимости, фундаментальные расхождения.

Если численный скор высокий, но текстовый анализ выявляет конфликты — приоритет AI-анализу, объясни в summary.

---

## Тон и особые случаи

- Объективно, эмпатично. Конкретные примеры из ответов, конструктивные рекомендации.
- Если один не доработал ответы — отметить в maturity в summary, снизить confidence.
- Если оба выбрали сценарий A как желаемый — это alignment, не путать с отсутствием амбиций.

---

## Формат ответа

Верни **только валидный JSON** (без markdown) с ключами:

- **ai_compatibility_score** — 0–100
- **ai_verdict** — "GO" | "CONDITIONAL_GO" | "PIVOT" | "NO_GO"
- **strengths** — массив строк (2–5): совпадения по смыслу, можно в формате «Область: инсайт»
- **critical_conflicts** — массив { "title": "область/тема", "recommendation": "описание + что обсудить" }
- **divergence_areas** — массив { "area": "тема", "note": "на что обратить внимание" }, включая operational gaps
- **discussion_questions** — 3–5 конкретных вопросов для встречи
- **summary** — 2–3 абзаца (разделяй \\n\\n): резюме, точки совпадения, зоны обсуждения, рекомендация

Пиши на русском. Обязательно заполни все разделы.
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
          content: `Ты — эксперт по оценке совместимости со-основателей стартапов. Твоя задача — проанализировать ответы двух партнёров на глубокий аудит личного видения и бизнес-целей, чтобы определить их реальную совместимость для запуска совместного проекта.

Оценивай только сценарии, к которым стремится отвечающий. Не учитывай негативные сценарии жизни через 3–5 лет (STAGNATION, FAILURE, консервативный scenario_a — если там описание нежелательного). scenario_a с «живу в X», «никаких командировок» — это то, чего НЕ хотят. q6 — лимиты (условия), не отмена желаний из q1.

Верни валидный JSON по схеме. Пиши на русском. Объективно, эмпатично, с конкретными примерами из ответов и конструктивными рекомендациями.`,
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
