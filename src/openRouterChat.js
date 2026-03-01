/**
 * Чат с Claude через OpenRouter для песочницы обсуждения ответов.
 * Ключ берётся из VITE_OPENROUTER_API_KEY (не коммитить в репозиторий).
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-sonnet-4.5'

function getApiKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || ''
}

export function isChatAvailable() {
  return !!getApiKey().trim()
}

const SYSTEM_PROMPT = `Ты помощник для основателя, который заполняет опросник по выравниванию видения (Founders Vision Alignment). 
Отвечай кратко и по делу. Помогай сформулировать мысли, прояснить вопросы, не подсказывай конкретные ответы "за" пользователя. 
Контекст: пользователь заполняет одну из трёх частей опросника (личный аудит, бизнес-видение, сценарный анализ).`

export async function sendMessage(messages, context = {}) {
  const key = getApiKey()
  if (!key.trim()) {
    throw new Error('OpenRouter API key not configured')
  }
  const partNum = context.partNumber || 1
  const partTitle = context.partTitle || `Часть ${partNum}`
  const questionLabel = context.currentQuestionLabel ? `Текущий вопрос: «${context.currentQuestionLabel}»` : ''
  const systemContent = `${SYSTEM_PROMPT}\n\nСейчас: ${partTitle}. ${questionLabel}`.trim()
  const fullMessages = [
    { role: 'system', content: systemContent },
    ...messages,
  ]
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: fullMessages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${errText}`)
  }
  const data = await res.json()
  const choice = data.choices?.[0]
  const content = choice?.message?.content ?? ''
  return { content, usage: data.usage }
}
