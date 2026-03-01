import { useState, useRef, useEffect } from 'react'
import { sendMessage, isChatAvailable } from './openRouterChat'
import * as logger from './logger'

const PLACEHOLDER = 'Напишите, что думаете по поводу этого вопроса или части опросника…'

/** Простой рендер markdown: **жирный** и переносы строк */
function renderMarkdown(text) {
  if (!text || typeof text !== 'string') return text
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function SandboxChat({ partTitle, partNumber, currentQuestionLabel, messages = [], onMessagesChange }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const available = isChatAvailable()
  const setMessages = onMessagesChange || (() => {})

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || !available) return
    const userMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)
    logger.log('sandbox', 'send', { part: partNumber, question: currentQuestionLabel?.slice(0, 30) })
    try {
      const context = { partNumber, partTitle, currentQuestionLabel }
      const { content } = await sendMessage(newMessages, context)
      setMessages([...newMessages, { role: 'assistant', content }])
    } catch (e) {
      const errMsg = e?.message || String(e)
      setError(errMsg)
      logger.error('sandbox', 'send failed', { error: errMsg })
    } finally {
      setLoading(false)
    }
  }

  if (!available) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 bg-neutral-950 text-center">
        <p className="text-neutral-500 text-sm">
          Песочница с Claude недоступна: не задан <code className="text-neutral-400">VITE_OPENROUTER_API_KEY</code>.
        </p>
        <p className="text-neutral-600 text-xs mt-2">Добавьте ключ в .env.local и перезапустите приложение.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      <div className="px-3 py-2 border-b border-neutral-800 shrink-0">
        <h3 className="text-sm font-semibold text-white">Песочница: обсуждение с Claude</h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          {partTitle || 'Часть опросника'} {currentQuestionLabel ? `· ${currentQuestionLabel.slice(0, 40)}…` : ''}
        </p>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0"
        style={{ overflowAnchor: 'none' }}
      >
        {messages.length === 0 && (
          <p className="text-neutral-500 text-sm">{PLACEHOLDER}</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'bg-neutral-800 text-white ml-4'
                : 'bg-neutral-900 text-white mr-4'
            }`}
          >
            <span className="font-medium text-neutral-400 text-xs">{m.role === 'user' ? 'Вы' : 'Claude'}</span>
            <div className="mt-1 whitespace-pre-wrap break-words text-white">
              {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-3 py-2 bg-neutral-900 text-neutral-300 text-sm mr-4">
            Думаю…
          </div>
        )}
        {error && (
          <div className="rounded-lg px-3 py-2 bg-red-950/50 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-neutral-800 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={PLACEHOLDER}
          rows={2}
          className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white text-sm placeholder-neutral-500 focus:border-lime-400 focus:outline-none resize-none"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="mt-2 w-full py-2 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded transition-colors"
        >
          Отправить
        </button>
      </div>
    </div>
  )
}
