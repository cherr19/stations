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
      <div className="h-full flex flex-col items-center justify-center p-4 bg-white/80 text-center border border-border rounded-lg">
        <p className="text-ink text-sm">
          Песочница с Claude недоступна: не задан <code className="text-ink font-mono">VITE_OPENROUTER_API_KEY</code>.
        </p>
        <p className="text-inkMuted text-xs mt-2">Добавьте ключ в .env.local и перезапустите приложение.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white/80 rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-ink">Песочница: обсуждение с Claude</h3>
        <p className="text-xs text-inkMuted mt-0.5">
          {partTitle || 'Часть опросника'} {currentQuestionLabel ? `· ${currentQuestionLabel.slice(0, 40)}…` : ''}
        </p>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0"
        style={{ overflowAnchor: 'none' }}
      >
        {messages.length === 0 && (
          <p className="text-inkMuted text-sm">{PLACEHOLDER}</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm border border-border ${
              m.role === 'user'
                ? 'bg-ink/5 ml-4 text-ink'
                : 'bg-white border-border mr-4 text-ink'
            }`}
          >
            <span className="font-medium text-ink text-xs">{m.role === 'user' ? 'Вы' : 'Claude'}</span>
            <div className="mt-1 whitespace-pre-wrap break-words text-ink">
              {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="rounded-lg px-3 py-2 bg-white border border-border text-ink text-sm mr-4">
            Думаю…
          </div>
        )}
        {error && (
          <div className="rounded-lg px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border shrink-0">
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
          className="w-full px-3 py-2 bg-white border border-border rounded text-ink text-sm placeholder-inkMuted focus:border-ink focus:outline-none resize-none"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="mt-2 w-full py-2 bg-ink hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed text-paper font-medium text-sm rounded transition-colors"
        >
          Отправить
        </button>
      </div>
    </div>
  )
}
