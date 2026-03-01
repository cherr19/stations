import { useState, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Download,
} from 'lucide-react'
import * as storage from './storage'
import { PARTS, SCORING_PARAMS } from './questions'
import { calculateScore, getDecision, formatCellValue } from './scoring'

const USER_LABELS = { tanya: 'Таня', alena: 'Алена' }
const USER_COLORS = {
  tanya: { border: 'border-purple-400', bg: 'bg-purple-400/10', text: 'text-purple-400', badge: 'border-purple-400 text-purple-400' },
  alena: { border: 'border-cyan-400', bg: 'bg-cyan-400/10', text: 'text-cyan-400', badge: 'border-cyan-400 text-cyan-400' },
}

function Section({ title, id, children, expanded, toggle }) {
  const isExpanded = expanded[id] !== false
  return (
    <div className="border border-neutral-800 mb-4">
      <button
        type="button"
        onClick={() => toggle(id)}
        className="w-full px-4 py-3 bg-neutral-950 hover:bg-neutral-900 flex items-center justify-between text-left"
      >
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-neutral-600 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-600 shrink-0" />
        )}
      </button>
      {isExpanded && <div className="p-4 space-y-4 bg-black">{children}</div>}
    </div>
  )
}

function Question({ label, type, value, onChange, options, placeholder, maxSelect, fields }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-400">{label}</label>
      {type === 'textarea' && (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2 border border-neutral-800 bg-black focus:border-lime-400 focus:outline-none resize-none text-white placeholder-neutral-700"
        />
      )}
      {type === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-neutral-800 bg-black focus:border-lime-400 focus:outline-none text-white placeholder-neutral-700"
        />
      )}
      {type === 'radio' && (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-start gap-2 cursor-pointer group">
              <input
                type="radio"
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="mt-1 accent-lime-400"
              />
              <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {type === 'multicheck' && (
        <div className="space-y-2">
          {options.map((opt) => {
            const arr = Array.isArray(value) ? value : []
            const isChecked = arr.includes(opt)
            const canSelect = !maxSelect || arr.length < maxSelect || isChecked
            return (
              <label
                key={opt}
                className={`flex items-start gap-2 ${canSelect ? 'cursor-pointer group' : 'opacity-50 cursor-not-allowed'}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={!canSelect}
                  onChange={(e) => {
                    let newVal = [...arr]
                    if (e.target.checked) newVal.push(opt)
                    else newVal = newVal.filter((x) => x !== opt)
                    onChange(newVal)
                  }}
                  className="mt-1 accent-lime-400"
                />
                <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">{opt}</span>
              </label>
            )
          })}
          {maxSelect != null && (
            <p className="text-xs text-neutral-600 mt-2">
              Выбрано: {Array.isArray(value) ? value.length : 0} / {maxSelect}
            </p>
          )}
        </div>
      )}
      {type === 'compound' && fields && (
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <span className="text-xs text-neutral-500 block mb-1">{f.label}</span>
              <input
                type="text"
                value={value?.[f.key] ?? ''}
                onChange={(e) => onChange({ ...(value || {}), [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-4 py-2 border border-neutral-800 bg-black focus:border-lime-400 focus:outline-none text-white placeholder-neutral-700 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FoundersVisionTool() {
  const [currentScreen, setCurrentScreen] = useState('select')
  const [currentPart, setCurrentPart] = useState(1)
  const [currentUser, setCurrentUser] = useState(null)
  const [tanyaData, setTanyaData] = useState({})
  const [alenaData, setAlenaData] = useState({})
  const [expandedSections, setExpandedSections] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [partnerStatus, setPartnerStatus] = useState({ tanyaStarted: false, alenaStarted: false })

  const loadRoomId = useCallback(() => {
    let id = storage.getRoomIdFromUrl()
    if (!id) {
      id = storage.generateRoomId()
      storage.setRoomIdInUrl(id)
    }
    setRoomId(id)
    return id
  }, [])

  useEffect(() => {
    const id = loadRoomId()
    const userFromUrl = storage.getUserFromUrl()
    if (userFromUrl && id) {
      setCurrentUser(userFromUrl)
      setCurrentScreen('intro')
    }
  }, [loadRoomId])

  const loadMyData = useCallback(async () => {
    if (!currentUser || !roomId) return
    setIsLoading(true)
    try {
      const data = await storage.loadMyData(roomId, currentUser)
      if (currentUser === 'tanya') setTanyaData(data || {})
      else setAlenaData(data || {})
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, roomId])

  useEffect(() => {
    loadMyData()
  }, [loadMyData])

  const refreshPartnerStatus = useCallback(async () => {
    if (!roomId) return
    const st = await storage.getRoomStatus(roomId)
    setPartnerStatus(st)
  }, [roomId])

  useEffect(() => {
    if (currentScreen !== 'filling' || !roomId) return
    refreshPartnerStatus()
    const t = setInterval(refreshPartnerStatus, 3000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPartnerStatus()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [currentScreen, roomId, refreshPartnerStatus])

  const saveData = useCallback(
    async (founder, data) => {
      if (!roomId) return
      try {
        await storage.saveData(roomId, founder, data)
      } catch (e) {
        console.error('Save failed', e)
      }
    },
    [roomId]
  )

  const updateData = useCallback(
    (founder, questionId, value) => {
      const setter = founder === 'tanya' ? setTanyaData : setAlenaData
      const current = founder === 'tanya' ? tanyaData : alenaData
      const newData = { ...current, [questionId]: value }
      setter(newData)
      saveData(founder, newData).then(() => refreshPartnerStatus())
    },
    [tanyaData, alenaData, saveData, refreshPartnerStatus]
  )

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: prev[id] === false }))
  }

  const downloadMyResults = (founder) => {
    const data = founder === 'tanya' ? tanyaData : alenaData
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${founder}-vision-results.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadBothForComparison = useCallback(async () => {
    if (!roomId) return
    setIsLoading(true)
    try {
      const { tanyaData: t, alenaData: a } = await storage.loadRoom(roomId)
      setTanyaData(t || {})
      setAlenaData(a || {})
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  const goToComparison = async () => {
    await loadBothForComparison()
    setCurrentScreen('comparison')
  }

  const { score, max, details } = calculateScore(tanyaData, alenaData)
  const decision = getDecision(score, max)
  const pct = max > 0 ? ((score / max) * 100).toFixed(1) : '0'

  const downloadFullReport = () => {
    const report = {
      date: new Date().toISOString(),
      roomId,
      score: { total: score, max, percentage: pct },
      decision: decision.type,
      tanyaData,
      alenaData,
      details,
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `founders-vision-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading && currentScreen === 'select') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center py-20">
          <div className="w-12 h-12 border-2 border-neutral-800 border-t-lime-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {currentScreen === 'select' && (
        <SelectUserScreen
          roomId={roomId}
          onSelect={(user) => {
            setCurrentUser(user)
            setCurrentScreen('intro')
          }}
          onCopyLinkForUser={(user) => {
            const url = storage.getLinkForUser(roomId, user)
            if (url && navigator.clipboard) navigator.clipboard.writeText(url)
            return url
          }}
        />
      )}

      {currentScreen === 'intro' && currentUser && (
        <IntroScreen
          userName={USER_LABELS[currentUser]}
          onStart={() => setCurrentScreen('filling')}
          onSwitchUser={() => {
            setCurrentUser(null)
            setCurrentScreen('select')
          }}
        />
      )}

      {currentScreen === 'filling' && currentUser && (
        <FillingScreen
          currentUser={currentUser}
          currentPart={currentPart}
          setCurrentPart={setCurrentPart}
          data={currentUser === 'tanya' ? tanyaData : alenaData}
          updateData={(qId, val) => updateData(currentUser, qId, val)}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          partnerStatus={partnerStatus}
          onBack={() => setCurrentScreen('intro')}
          onGoToComparison={goToComparison}
          onDownloadMyResults={() => downloadMyResults(currentUser)}
        />
      )}

      {currentScreen === 'comparison' && (
        <ComparisonScreen
          details={details}
          score={score}
          max={max}
          pct={pct}
          decision={decision}
          tanyaData={tanyaData}
          alenaData={alenaData}
          onBackToFilling={() => setCurrentScreen('filling')}
          onDownloadReport={downloadFullReport}
        />
      )}
    </div>
  )
}

function SelectUserScreen({ roomId, onSelect, onCopyLinkForUser }) {
  const handleCopy = (user) => {
    const url = onCopyLinkForUser?.(user)
    if (url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
        Аудит видения основателей
      </h1>
      <p className="text-neutral-500 mb-8">
        Комната: <code className="text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">{roomId || '—'}</code>
        {' '}
        <button
          type="button"
          onClick={() => {
            const id = storage.generateRoomId()
            storage.setRoomIdInUrl(id)
            window.location.reload()
          }}
          className="text-lime-400 hover:underline text-sm"
        >
          Создать новую
        </button>
      </p>
      <div className="border-l-4 border-lime-400 bg-neutral-950 pl-6 py-4 mb-10">
        <p className="text-neutral-300 text-sm">
          Каждый из вас независимо заполняет опросник. Ответы сохраняются в облаке и не видны друг другу до момента сравнения. Затем вы вместе смотрите результат и рекомендацию (GO / PIVOT / NO-GO).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => onSelect('tanya')}
          className="border-2 border-neutral-800 hover:border-purple-400 bg-neutral-950 p-8 flex flex-col items-center justify-center gap-4 transition-colors"
        >
          <span className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-3xl font-bold text-purple-400">
            T
          </span>
          <span className="text-xl font-semibold text-white">Таня</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect('alena')}
          className="border-2 border-neutral-800 hover:border-cyan-400 bg-neutral-950 p-8 flex flex-col items-center justify-center gap-4 transition-colors"
        >
          <span className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-3xl font-bold text-cyan-400">
            A
          </span>
          <span className="text-xl font-semibold text-white">Алена</span>
        </button>
      </div>
      {roomId && (
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <p className="text-neutral-500 text-sm mb-2">Отправить ссылку (скопирует в буфер):</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleCopy('alena')}
              className="text-sm border border-neutral-700 hover:border-cyan-400 text-cyan-400 px-4 py-2 transition-colors"
            >
              Ссылка для Алены
            </button>
            <button
              type="button"
              onClick={() => handleCopy('tanya')}
              className="text-sm border border-neutral-700 hover:border-purple-400 text-purple-400 px-4 py-2 transition-colors"
            >
              Ссылка для Тани
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function IntroScreen({ userName, onStart, onSwitchUser }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={onSwitchUser}
          className="text-sm text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 transition-colors"
        >
          Сменить пользователя
        </button>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
        Привет, {userName}
      </h1>
      <p className="text-neutral-400 mb-8">
        Опросник состоит из трёх частей. Заполняй в своём темпе; ответы сохраняются автоматически.
      </p>
      <ul className="space-y-2 text-neutral-400 mb-10">
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400" />
          Часть 1: Личный аудит (≈30 мин)
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400" />
          Часть 2: Бизнес-видение (≈30 мин)
        </li>
        <li className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400" />
          Часть 3: Сценарный анализ (≈20 мин)
        </li>
      </ul>
      <button
        type="button"
        onClick={onStart}
        className="bg-lime-400 hover:bg-lime-300 text-black font-semibold px-8 py-3 uppercase tracking-wide transition-colors"
      >
        Начать аудит
      </button>
    </div>
  )
}

function FillingScreen({
  currentUser,
  currentPart,
  setCurrentPart,
  data,
  updateData,
  expandedSections,
  toggleSection,
  partnerStatus,
  onBack,
  onGoToComparison,
  onDownloadMyResults,
}) {
  const part = PARTS.find((p) => p.id === currentPart)
  const isLastPart = currentPart === 3
  const theme = USER_COLORS[currentUser]

  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <header className="sticky top-0 z-10 bg-black/95 border-b border-neutral-800 py-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-bold text-white">
            {part?.title}
            <span className={`ml-2 text-xs px-2 py-0.5 border rounded ${theme.badge}`}>
              {USER_LABELS[currentUser]}
            </span>
          </h2>
          <div className="flex gap-2">
            {[1, 2, 3].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentPart(id)}
                className={`px-3 py-1.5 text-sm border transition-colors ${
                  currentPart === id ? `${theme.border} ${theme.bg} ${theme.text}` : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                Часть {id}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {[1, 2, 3].map((id) => (
            <div
              key={id}
              className={`h-1 flex-1 rounded ${
                id < currentPart ? 'bg-lime-400' : id === currentPart ? (currentUser === 'tanya' ? 'bg-purple-400' : 'bg-cyan-400') : 'bg-neutral-800'
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex items-center gap-4 mb-6 p-4 border border-neutral-800 bg-neutral-950">
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${theme.border} ${theme.text}`}>
          {currentUser === 'tanya' ? 'T' : 'A'}
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={onDownloadMyResults}
            className="text-sm text-neutral-400 hover:text-lime-400 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать мои ответы (JSON)
          </button>
        </div>
      </div>

      <div className="mb-6 p-3 border border-neutral-800 bg-neutral-950 text-sm text-neutral-500">
        Статус партнёра: {currentUser === 'alena' ? 'Таня' : 'Алена'}{' '}
        {(currentUser === 'alena' ? partnerStatus.tanyaStarted : partnerStatus.alenaStarted)
          ? 'уже начала заполнение'
          : 'ещё не начала заполнение'}
      </div>

      {part?.blocks.map((block) => (
        <Section
          key={block.id}
          id={block.id}
          title={block.title}
          expanded={expandedSections}
          toggle={toggleSection}
        >
          {block.questions.map((q) => (
            <Question
              key={q.id}
              label={q.label}
              type={q.type}
              value={data[q.id]}
              onChange={(v) => updateData(q.id, v)}
              options={q.options}
              placeholder={q.placeholder}
              maxSelect={q.maxSelect}
              fields={q.fields}
            />
          ))}
        </Section>
      ))}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-black/95 py-4 px-6 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="border border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-400 hover:text-white px-6 py-2 transition-colors"
        >
          Назад
        </button>
        {isLastPart ? (
          <button
            type="button"
            onClick={onGoToComparison}
            className="border-2 border-lime-400 bg-lime-400/10 hover:bg-lime-400/20 text-white px-6 py-2 transition-colors"
          >
            Перейти к сравнению
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentPart((p) => Math.min(3, p + 1))}
            className="border-2 border-lime-400 bg-lime-400/10 hover:bg-lime-400/20 text-white px-6 py-2 transition-colors"
          >
            Следующая часть
          </button>
        )}
      </footer>
    </div>
  )
}

const DECISION_ICONS = { GO: CheckCircle, 'GO с оговорками': AlertTriangle, PIVOT: AlertCircle, 'NO-GO': XCircle }
const DECISION_BORDER = { GO: 'border-lime-400', 'GO с оговорками': 'border-yellow-400', PIVOT: 'border-orange-400', 'NO-GO': 'border-red-400' }
const DECISION_BG = { GO: 'bg-lime-400/5', 'GO с оговорками': 'bg-yellow-400/5', PIVOT: 'bg-orange-400/5', 'NO-GO': 'bg-red-400/5' }
const MATCH_CLASS = {
  full: 'border-lime-400 bg-lime-400/10 text-lime-400',
  partial: 'border-yellow-400 bg-yellow-400/10 text-yellow-400',
  none: 'border-red-400 bg-red-400/10 text-red-400',
  empty: 'border-neutral-700 bg-neutral-900 text-neutral-500',
}
const MATCH_LABEL = { full: '✓ Полное', partial: '~ Частичное', none: '✗ Различия', empty: '—' }

const DECISION_ICON_COLOR = { GO: 'text-lime-400', 'GO с оговорками': 'text-yellow-400', PIVOT: 'text-orange-400', 'NO-GO': 'text-red-400' }

function ComparisonScreen({ details, score, max, pct, decision, onBackToFilling, onDownloadReport }) {
  const Icon = DECISION_ICONS[decision.type] || AlertCircle
  const borderClass = DECISION_BORDER[decision.type] || 'border-neutral-600'
  const bgClass = DECISION_BG[decision.type] || 'bg-neutral-900'
  const iconColorClass = DECISION_ICON_COLOR[decision.type] || 'text-neutral-400'

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-24">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-6">
        Результаты сравнения
      </h1>

      <div className={`border-2 ${borderClass} ${bgClass} p-6 mb-8`}>
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`w-8 h-8 ${iconColorClass}`} />
          <span className="text-xl font-bold text-white">{decision.type}</span>
        </div>
        <p className="text-neutral-400 text-sm">
          Совместимость видения: <strong className="text-white">{pct}%</strong> ({score} / {max} баллов)
        </p>
        <div className="mt-4 h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-lime-400 transition-all duration-500"
            style={{ width: `${Math.min(100, Number(pct))}%` }}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="text-left py-3 px-2 text-neutral-400 font-medium">Параметр</th>
              <th className="text-left py-3 px-2 text-neutral-400 font-medium">Таня</th>
              <th className="text-left py-3 px-2 text-neutral-400 font-medium">Алена</th>
              <th className="text-left py-3 px-2 text-neutral-400 font-medium">Совпадение</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d) => (
              <tr key={d.id} className="border-b border-neutral-800 hover:bg-neutral-950/50">
                <td className="py-3 px-2 text-white">
                  {d.label}
                  {d.critical && ' ⭐'}
                </td>
                <td className="py-3 px-2 text-neutral-300 max-w-xs truncate" title={formatCellValue(d.tVal)}>
                  {formatCellValue(d.tVal)}
                </td>
                <td className="py-3 px-2 text-neutral-300 max-w-xs truncate" title={formatCellValue(d.aVal)}>
                  {formatCellValue(d.aVal)}
                </td>
                <td className="py-3 px-2">
                  <span className={`inline-block px-2 py-1 border rounded ${MATCH_CLASS[d.match]}`}>
                    {MATCH_LABEL[d.match]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-l-4 border-lime-400 bg-neutral-950 pl-6 py-4 mt-8 mb-8">
        <h3 className="font-semibold text-white mb-2">Следующие шаги</h3>
        <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-sm">
          <li>Обсудите параметры с пометкой «Различия» и «Частичное».</li>
          <li>Зафиксируйте компромиссы и красные линии в совместной декларации.</li>
          <li>Назначьте дату ревью видения (например, через 3–6 месяцев).</li>
        </ol>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBackToFilling}
          className="border border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-400 hover:text-white px-6 py-2 transition-colors"
        >
          Вернуться к ответам
        </button>
        <button
          type="button"
          onClick={onDownloadReport}
          className="border-2 border-lime-400 bg-lime-400/10 hover:bg-lime-400/20 text-white px-6 py-2 flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          Скачать полный отчёт
        </button>
      </div>
    </div>
  )
}
