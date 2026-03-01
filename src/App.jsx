import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Download,
  Upload,
  FileText,
  Bug,
} from 'lucide-react'
import * as storage from './storage'
import { PARTS, SCORING_PARAMS } from './questions'
import { calculateScore, getDecision, formatCellValue } from './scoring'
import { buildMyAnswersMd, buildReportMd } from './exportMd'
import * as logger from './logger'
import SandboxChat from './SandboxChat'
import { runAiAnalysis, isAiAnalysisAvailable } from './aiAnalysis'

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
        <h3 className="font-semibold text-white text-base">{title}</h3>
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
      <label className="block text-base font-medium text-neutral-400">{label}</label>
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
              <span className="text-base text-neutral-400 group-hover:text-white transition-colors">{opt}</span>
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
                <span className="text-base text-neutral-400 group-hover:text-white transition-colors">{opt}</span>
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
  const [partnerStatus, setPartnerStatus] = useState({
    tanyaStarted: false,
    alenaStarted: false,
    tanyaFinished: false,
    alenaFinished: false,
  })
  const [showComparisonConfirm, setShowComparisonConfirm] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [sandboxMessages, setSandboxMessages] = useState([])
  const [lockedUserFromUrl, setLockedUserFromUrl] = useState(null)
  const [roomsWithData, setRoomsWithData] = useState([])
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiAnalysisAt, setAiAnalysisAt] = useState(null)
  const [roomUpdatedAt, setRoomUpdatedAt] = useState(null)
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisError, setAiAnalysisError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') return false
    storage.applyAdminFromUrl()
    return storage.isAdmin()
  })
  const scrollLeftRef = useRef(null)

  useEffect(() => {
    storage.applyAdminFromUrl()
    setIsAdmin(storage.isAdmin())
  }, [])

  const loadRoomId = useCallback(() => {
    let id = storage.getRoomIdFromUrl()
    if (!id && isAdmin) {
      id = storage.generateRoomId()
      storage.setRoomIdInUrl(id)
    }
    if (!id && !isAdmin) {
      setRoomId('')
      return ''
    }
    setRoomId(id || '')
    return id || ''
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin && !storage.getRoomIdFromUrl()) return
    const id = loadRoomId()
    const userFromUrl = storage.getUserFromUrl()
    const screenFromUrl = storage.getScreenFromUrl()
    logger.log('app', 'init', { roomId: id, user: userFromUrl, screen: screenFromUrl, isAdmin })
    if (!id) return
    if (screenFromUrl === 'comparison' && userFromUrl) {
      setCurrentUser(userFromUrl)
      setLockedUserFromUrl(userFromUrl)
      setCurrentScreen('comparison')
      return
    }
    if (userFromUrl) {
      setCurrentUser(userFromUrl)
      setLockedUserFromUrl(userFromUrl)
      setCurrentScreen('intro')
    }
  }, [isAdmin, loadRoomId])

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
    if ((currentScreen !== 'filling' && currentScreen !== 'select') || !roomId) return
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

  useEffect(() => {
    if (!isAdmin || currentScreen !== 'select') return
    storage.getRoomsWithData().then(setRoomsWithData)
  }, [isAdmin, currentScreen])

  useEffect(() => {
    if (currentScreen === 'filling' && scrollLeftRef.current) {
      scrollLeftRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentScreen, currentPart])

  useEffect(() => {
    if (currentScreen !== 'filling' || !roomId || !currentUser) return
    storage.loadChat(roomId, currentUser).then(setSandboxMessages)
  }, [currentScreen, roomId, currentUser])

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

  const downloadMyResults = (founder, asMd = true) => {
    const data = founder === 'tanya' ? tanyaData : alenaData
    const userName = founder === 'tanya' ? 'Таня' : 'Алена'
    const content = asMd ? buildMyAnswersMd(data, userName) : JSON.stringify(data, null, 2)
    const blob = new Blob([content], { type: asMd ? 'text/markdown' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${founder}-vision-answers-${new Date().toISOString().split('T')[0]}.${asMd ? 'md' : 'json'}`
    a.click()
    URL.revokeObjectURL(url)
    logger.log('app', 'downloadMyResults', { founder, format: asMd ? 'md' : 'json' })
  }

  const uploadMyResults = (founder, file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result
        const data = typeof text === 'string' && text.trim().startsWith('{') ? JSON.parse(text) : null
        if (!data || typeof data !== 'object') {
          logger.warn('app', 'uploadMyResults invalid file', { founder })
          return
        }
        const setter = founder === 'tanya' ? setTanyaData : setAlenaData
        setter(data)
        saveData(founder, data)
        logger.log('app', 'uploadMyResults OK', { founder, keys: Object.keys(data).length })
      } catch (err) {
        logger.error('app', 'uploadMyResults failed', { founder, error: String(err) })
      }
    }
    reader.readAsText(file)
  }

  const loadBothForComparison = useCallback(async () => {
    if (!roomId) return
    setIsLoading(true)
    setAiAnalysisError(null)
    try {
      const room = await storage.loadRoom(roomId)
      setTanyaData(room.tanyaData || {})
      setAlenaData(room.alenaData || {})
      setAiAnalysis(room.aiAnalysis ?? null)
      setAiAnalysisAt(room.aiAnalysisAt ?? null)
      setRoomUpdatedAt(room.roomUpdatedAt ?? null)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  const isAiAnalysisOutdated = roomUpdatedAt && aiAnalysisAt && new Date(roomUpdatedAt) > new Date(aiAnalysisAt)

  const runAiAnalysisForRoom = useCallback(async () => {
    if (!roomId || !isAiAnalysisAvailable()) return
    setAiAnalysisLoading(true)
    setAiAnalysisError(null)
    try {
      const { score, max, details } = calculateScore(tanyaData, alenaData)
      const pct = max > 0 ? ((score / max) * 100).toFixed(1) : '0'
      const result = await runAiAnalysis({
        tanyaData,
        alenaData,
        score,
        max,
        pct,
        details,
      })
      await storage.saveAiAnalysis(roomId, result)
      setAiAnalysis(result)
      setAiAnalysisAt(new Date().toISOString())
    } catch (e) {
      const msg = e?.message || String(e)
      setAiAnalysisError(msg)
      logger.error('app', 'runAiAnalysis failed', { error: msg })
    } finally {
      setAiAnalysisLoading(false)
    }
  }, [roomId, tanyaData, alenaData])

  useEffect(() => {
    if (currentScreen === 'comparison' && roomId) {
      logger.log('app', 'screen', { screen: 'comparison', roomId })
      loadBothForComparison()
    }
  }, [currentScreen, roomId, loadBothForComparison])

  useEffect(() => {
    if (currentScreen !== 'comparison' || !roomId || aiAnalysisLoading) return
    const hasData = Object.keys(tanyaData).length > 0 || Object.keys(alenaData).length > 0
    if (!hasData || !isAiAnalysisAvailable()) return
    if (!aiAnalysis && !aiAnalysisError) {
      runAiAnalysisForRoom()
    }
  }, [currentScreen, roomId, tanyaData, alenaData, aiAnalysis, aiAnalysisLoading, aiAnalysisError, runAiAnalysisForRoom])

  const goToComparison = async () => {
    const partnerFinished = currentUser === 'tanya' ? partnerStatus.alenaFinished : partnerStatus.tanyaFinished
    if (!partnerFinished) {
      setShowComparisonConfirm(true)
      return
    }
    try {
      await loadBothForComparison()
    } catch (e) {
      logger.warn('app', 'loadBothForComparison failed', { error: String(e) })
    }
    storage.setComparisonPageUrl(roomId, currentUser)
    setCurrentScreen('comparison')
  }

  const confirmGoToComparison = async () => {
    setShowComparisonConfirm(false)
    try {
      await loadBothForComparison()
    } catch (e) {
      logger.warn('app', 'loadBothForComparison failed', { error: String(e) })
    }
    storage.setComparisonPageUrl(roomId, currentUser)
    setCurrentScreen('comparison')
  }

  const { score, max, details } = calculateScore(tanyaData, alenaData)
  const decision = getDecision(score, max)
  const pct = max > 0 ? ((score / max) * 100).toFixed(1) : '0'

  const downloadFullReport = (asMd = true) => {
    const report = {
      date: new Date().toISOString(),
      roomId,
      pct,
      score: { total: score, max, percentage: pct },
      decision: decision.type,
      tanyaData,
      alenaData,
      details,
      aiAnalysis: aiAnalysis || undefined,
    }
    const content = asMd ? buildReportMd(report) : JSON.stringify(report, null, 2)
    const blob = new Blob([content], { type: asMd ? 'text/markdown' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `founders-vision-report-${new Date().toISOString().split('T')[0]}.${asMd ? 'md' : 'json'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const showSandbox = currentScreen === 'intro' || currentScreen === 'filling'
  const currentPartMeta = PARTS.find((p) => p.id === currentPart)
  const sandboxPartTitle = currentScreen === 'filling'
    ? currentPartMeta?.title || `Часть ${currentPart}`
    : 'Старт'
  const sandboxPartNumber = currentScreen === 'filling' ? currentPart : 1
  const sandboxQuestionLabel = currentScreen === 'filling' && currentPartMeta?.blocks?.[0]?.questions?.[0]?.label
    ? String(currentPartMeta.blocks[0].questions[0].label).slice(0, 80)
    : null

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

  const showNoRoom = currentScreen === 'select' && !roomId && !isAdmin

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {isAdmin && (
        <button
          type="button"
          onClick={() => setShowLogs((v) => !v)}
          className="fixed top-4 left-4 z-40 px-3 py-2 rounded bg-neutral-800 border border-neutral-600 text-neutral-400 hover:text-white text-xs flex items-center gap-2"
          title="Показать логи"
        >
          <Bug className="w-3.5 h-3.5" />
          Логи
        </button>
      )}
      {showLogs && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-semibold">Логи приложения</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => logger.clearLogs()}
                className="px-3 py-1 text-sm border border-neutral-600 text-neutral-400 hover:text-white"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="px-3 py-1 text-sm border border-neutral-600 text-neutral-400 hover:text-white"
              >
                Закрыть
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto text-xs text-neutral-400 font-mono bg-neutral-950 p-4 rounded border border-neutral-800 whitespace-pre-wrap break-words">
            {logger.getLogEntries().length === 0
              ? 'Нет записей'
              : logger.getLogEntries().map((e, i) => (
                <div key={i} className="mb-1">
                  <span className="text-neutral-500">[{e.ts}]</span> <span className="text-lime-400/80">[{e.tag}]</span> {e.message}
                  {e.data != null && ` ${JSON.stringify(e.data)}`}
                </div>
              ))}
          </pre>
        </div>
      )}
      {showComparisonConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-950 border border-neutral-700 max-w-md w-full p-6 rounded">
            <p className="text-white text-base mb-4">
              Партнёр ещё не закончил заполнение. Сравнение будет неполным (много пустых полей и заниженный балл). Всё равно перейти к сравнению?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowComparisonConfirm(false)}
                className="px-4 py-2 border border-neutral-600 text-neutral-300 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmGoToComparison}
                className="px-4 py-2 bg-lime-400 text-black font-medium"
              >
                Перейти к сравнению
              </button>
            </div>
          </div>
        </div>
      )}
      {showSandbox ? (
        <div className="flex flex-1 min-h-0">
          <div ref={scrollLeftRef} className="flex-1 min-w-0 overflow-auto">
            {currentScreen === 'intro' && currentUser && (
              <IntroScreen
                userName={USER_LABELS[currentUser]}
                onStart={() => setCurrentScreen('filling')}
                onSwitchUser={
                  lockedUserFromUrl
                    ? null
                    : () => {
                        setCurrentUser(null)
                        setCurrentScreen('select')
                      }
                }
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
                onBackToPrevPart={() => {
                  if (currentPart > 1) setCurrentPart((p) => p - 1)
                  else setCurrentScreen('intro')
                }}
                onSelectRoom={() => setCurrentScreen('select')}
                onGoToComparison={goToComparison}
                onDownloadMyResults={(format) => downloadMyResults(currentUser, format !== 'json')}
                onUploadMyResults={(file) => uploadMyResults(currentUser, file)}
                roomId={roomId}
              />
            )}
          </div>
          <aside className="w-[400px] shrink-0 hidden lg:flex flex-col items-start justify-start pt-6 pr-4 pb-4">
            <div className="w-full rounded-2xl border-2 border-lime-400/60 bg-neutral-950 overflow-hidden shadow-[0_0_0_1px_rgba(34,197,94,0.2)]" style={{ height: '66.67vh', maxHeight: '66.67vh' }}>
              <SandboxChat
                partTitle={sandboxPartTitle}
                partNumber={sandboxPartNumber}
                currentQuestionLabel={sandboxQuestionLabel}
                messages={sandboxMessages}
                onMessagesChange={(msgs) => {
                  setSandboxMessages(msgs)
                  if (roomId && currentUser) storage.saveChat(roomId, currentUser, msgs)
                }}
              />
            </div>
          </aside>
        </div>
      ) : (
        <>
      {showNoRoom && (
        <NoRoomScreen
          onPasteRoomId={(id) => {
            if (id && id.trim()) {
              storage.setRoomIdInUrl(id.trim())
              window.location.reload()
            }
          }}
        />
      )}
      {currentScreen === 'select' && roomId && (
        <SelectUserScreen
          roomId={roomId}
          partnerStatus={partnerStatus}
          isAdmin={isAdmin}
          lockedUser={lockedUserFromUrl}
          roomsWithData={roomsWithData}
          onSelectRoom={(id) => {
            setRoomId(id)
            storage.setRoomIdInUrl(id)
          }}
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

      {currentScreen === 'comparison' && (
        <ComparisonScreen
          details={details}
          score={score}
          max={max}
          pct={pct}
          decision={decision}
          tanyaData={tanyaData}
          alenaData={alenaData}
          roomId={roomId}
          currentUser={currentUser}
          aiAnalysis={aiAnalysis}
          aiAnalysisLoading={aiAnalysisLoading}
          aiAnalysisError={aiAnalysisError}
          aiAnalysisOutdated={isAiAnalysisOutdated}
          onRefreshAiAnalysis={runAiAnalysisForRoom}
          onBackToFilling={() => {
            storage.setScreenInUrl('')
            setCurrentScreen('filling')
          }}
          onDownloadReport={downloadFullReport}
          onCopyComparisonLink={() => {
            const link = storage.getComparisonLink(roomId, currentUser)
            if (link && navigator.clipboard) navigator.clipboard.writeText(link)
          }}
        />
      )}
        </>
      )}
    </div>
  )
}

function statusLabel(started, finished) {
  if (!started) return 'не начала'
  return finished ? 'закончила' : 'заполняет'
}

function NoRoomScreen({ onPasteRoomId }) {
  const [pastedId, setPastedId] = useState('')
  return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-white mb-4">Нет комнаты</h1>
      <p className="text-neutral-400 mb-8">
        Получите ссылку на комнату у организатора (администратора). По этой ссылке вы попадёте в анкету.
      </p>
      <div className="border border-neutral-700 rounded-lg p-4 bg-neutral-950 text-left">
        <p className="text-neutral-500 text-sm mb-2">Если вам прислали только ID комнаты, вставьте его ниже:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={pastedId}
            onChange={(e) => setPastedId(e.target.value)}
            placeholder="например: a1b2c3d4-..."
            className="flex-1 px-3 py-2 bg-black border border-neutral-700 rounded text-white text-sm placeholder-neutral-600 focus:border-lime-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onPasteRoomId(pastedId)}
            className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black font-medium text-sm rounded"
          >
            Войти
          </button>
        </div>
      </div>
    </div>
  )
}

function SelectUserScreen({ roomId, partnerStatus = {}, isAdmin: admin, lockedUser, roomsWithData = [], onSelectRoom, onSelect, onCopyLinkForUser }) {
  const handleCopy = (user) => {
    const url = onCopyLinkForUser?.(user)
    if (url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
    }
  }
  const shortRoomId = roomId ? `${roomId.slice(0, 8)}${roomId.length > 8 ? '…' : ''}` : '—'
  const tanyaStatus = statusLabel(partnerStatus.tanyaStarted, partnerStatus.tanyaFinished)
  const alenaStatus = statusLabel(partnerStatus.alenaStarted, partnerStatus.alenaFinished)
  const lockedName = lockedUser ? USER_LABELS[lockedUser] : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
        Аудит видения основателей
      </h1>
      {lockedUser && (
        <p className="text-neutral-300 text-sm mb-4">
          Вы вошли по ссылке как <strong className="text-white">{lockedName}</strong>. Сменить пользователя нельзя.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-neutral-500">Комната:</span>
        <code className="text-lime-400/90 bg-neutral-900 px-2 py-1 rounded font-mono text-sm" title={roomId}>
          {shortRoomId}
        </code>
        {admin && (
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
        )}
      </div>
      {admin && roomsWithData.length > 0 && (
        <div className="border border-neutral-700 rounded-lg p-4 mb-6 bg-neutral-950">
          <p className="text-neutral-400 text-sm font-medium mb-3">Комнаты, где есть данные (переход по клику):</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {roomsWithData.map((r) => {
              const short = `${r.roomId.slice(0, 8)}…`
              const tLabel = statusLabel(r.tanyaStarted, r.tanyaFinished)
              const aLabel = statusLabel(r.alenaStarted, r.alenaFinished)
              const isCurrent = r.roomId === roomId
              return (
                <li key={r.roomId}>
                  <button
                    type="button"
                    onClick={() => onSelectRoom?.(r.roomId)}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex flex-wrap items-center gap-x-3 gap-y-1 transition-colors ${
                      isCurrent ? 'bg-lime-500/20 border border-lime-500/50' : 'hover:bg-neutral-800 border border-transparent'
                    }`}
                    title={r.roomId}
                  >
                    <code className="font-mono text-lime-400/90">{short}</code>
                    <span className="text-neutral-500">Таня: {tLabel}</span>
                    <span className="text-neutral-500">Алена: {aLabel}</span>
                    {isCurrent && <span className="text-lime-400 text-xs">текущая</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="border border-neutral-700 rounded-lg p-4 mb-8 bg-neutral-950">
        <p className="text-neutral-400 text-sm mb-3">Кто заполняет в этой комнате — нажми на себя, чтобы войти в свою анкету:</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-purple-400 font-medium">Таня</span>
          <span className="text-neutral-500">{tanyaStatus}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-cyan-400 font-medium">Алена</span>
          <span className="text-neutral-500">{alenaStatus}</span>
        </div>
      </div>
      <div className="border-l-4 border-lime-400 bg-neutral-950 pl-6 py-4 mb-10">
        <p className="text-neutral-300 text-sm">
          Каждый из вас независимо заполняет опросник. Ответы сохраняются в облаке и не видны друг другу до момента сравнения. Затем вы вместе смотрите результат и рекомендацию (GO / PIVOT / NO-GO).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <button
          type="button"
          onClick={() => !lockedUser || lockedUser === 'tanya' ? onSelect('tanya') : undefined}
          disabled={lockedUser === 'alena'}
          className={`border-2 bg-neutral-950 p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
            lockedUser === 'tanya'
              ? 'border-purple-400 hover:border-purple-300'
              : lockedUser === 'alena'
                ? 'border-neutral-800 opacity-50 cursor-not-allowed'
                : 'border-neutral-800 hover:border-purple-400'
          }`}
        >
          <span className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center text-3xl font-bold text-purple-400">
            T
          </span>
          <span className="text-xl font-semibold text-white">Таня</span>
          <span className="text-xs text-neutral-500">{tanyaStatus}</span>
        </button>
        <button
          type="button"
          onClick={() => !lockedUser || lockedUser === 'alena' ? onSelect('alena') : undefined}
          disabled={lockedUser === 'tanya'}
          className={`border-2 bg-neutral-950 p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
            lockedUser === 'alena'
              ? 'border-cyan-400 hover:border-cyan-300'
              : lockedUser === 'tanya'
                ? 'border-neutral-800 opacity-50 cursor-not-allowed'
                : 'border-neutral-800 hover:border-cyan-400'
          }`}
        >
          <span className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-3xl font-bold text-cyan-400">
            A
          </span>
          <span className="text-xl font-semibold text-white">Алена</span>
          <span className="text-xs text-neutral-500">{alenaStatus}</span>
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
      {onSwitchUser && (
        <div className="flex justify-end mb-6">
          <button
            type="button"
            onClick={onSwitchUser}
            className="text-sm text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 transition-colors"
          >
            Сменить пользователя
          </button>
        </div>
      )}
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
  onBackToPrevPart,
  onSelectRoom,
  onGoToComparison,
  onDownloadMyResults,
  onUploadMyResults,
  roomId,
}) {
  const part = PARTS.find((p) => p.id === currentPart)
  const isLastPart = currentPart === 3
  const theme = USER_COLORS[currentUser]

  const partnerName = currentUser === 'alena' ? 'Таня' : 'Алена'
  const partnerStarted = currentUser === 'alena' ? partnerStatus.tanyaStarted : partnerStatus.alenaStarted
  const partnerFinished = currentUser === 'alena' ? partnerStatus.tanyaFinished : partnerStatus.alenaFinished
  const partnerStatusText = !partnerStarted
    ? 'ещё не начала заполнение'
    : partnerFinished
      ? 'закончила заполнение'
      : 'уже начала заполнение'

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

      <div className="mb-6 p-4 border border-neutral-700 bg-neutral-950 rounded">
        <h3 className="text-base font-semibold text-white mb-3">Мои ответы</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onDownloadMyResults()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-lime-500/50 bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 rounded text-base font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Скачать в MD
          </button>
          <button
            type="button"
            onClick={() => onDownloadMyResults?.('json')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 rounded text-base font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать в JSON
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 rounded text-base font-medium cursor-pointer transition-colors">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadMyResults?.(f)
                e.target.value = ''
              }}
            />
            <Upload className="w-4 h-4" />
            Загрузить из файла (JSON)
          </label>
        </div>
      </div>

      <div className={`mb-6 p-4 rounded border text-base font-medium ${
        partnerFinished ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300' :
        partnerStarted ? 'bg-amber-950/30 border-amber-700/70 text-amber-300' :
        'bg-neutral-900 border-neutral-700 text-neutral-400'
      }`}>
        <span className="text-neutral-500 font-normal">Партнёр: </span>
        {partnerName} — {partnerStatusText}
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

      <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-black/95 py-4 px-6 flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectRoom}
            className="border border-neutral-600 text-neutral-500 hover:text-white hover:border-neutral-500 px-4 py-2 text-sm transition-colors"
          >
            Выбрать комнату
          </button>
          <button
            type="button"
            onClick={onBackToPrevPart}
            className="border border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-400 hover:text-white px-6 py-2 transition-colors"
          >
            Назад
          </button>
        </div>
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

const AI_VERDICT_LABEL = { GO: 'GO', CONDITIONAL_GO: 'GO с оговорками', PIVOT: 'PIVOT', NO_GO: 'NO-GO' }

function ComparisonScreen({
  details,
  score,
  max,
  pct,
  decision,
  onBackToFilling,
  onDownloadReport,
  roomId,
  currentUser,
  onCopyComparisonLink,
  aiAnalysis,
  aiAnalysisLoading,
  aiAnalysisError,
  aiAnalysisOutdated,
  onRefreshAiAnalysis,
}) {
  const Icon = DECISION_ICONS[decision.type] || AlertCircle
  const borderClass = DECISION_BORDER[decision.type] || 'border-neutral-600'
  const bgClass = DECISION_BG[decision.type] || 'bg-neutral-900'
  const iconColorClass = DECISION_ICON_COLOR[decision.type] || 'text-neutral-400'
  const comparisonUrl = roomId ? storage.getComparisonLink(roomId, currentUser) : ''

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-24">
      <h1 className="text-3xl font-bold tracking-tight text-white mb-4">
        Результаты сравнения
      </h1>

      <div className="mb-6 p-4 rounded border border-neutral-700 bg-neutral-950">
        <p className="text-neutral-400 text-sm mb-2">
          Отдельный адрес этой страницы — сохраните или отправьте себе, чтобы вернуться к результатам комнаты позже:
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 text-xs text-lime-400/90 break-all bg-black/30 px-2 py-1.5 rounded">
            {comparisonUrl || '—'}
          </code>
          {comparisonUrl && (
            <button
              type="button"
              onClick={() => onCopyComparisonLink?.()}
              className="shrink-0 px-4 py-2 border border-lime-500/50 bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 rounded text-sm font-medium"
            >
              Копировать ссылку
            </button>
          )}
        </div>
      </div>

      <div className={`border-2 ${borderClass} ${bgClass} p-6 mb-8`}>
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`w-8 h-8 ${iconColorClass}`} />
          <span className="text-xl font-bold text-white">{decision.type}</span>
        </div>
        <p className="text-neutral-400 text-base">
          Совместимость видения: <strong className="text-white">{pct}%</strong> ({score} / {max} баллов)
        </p>
        <div className="mt-4 h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-lime-400 transition-all duration-500"
            style={{ width: `${Math.min(100, Number(pct))}%` }}
          />
        </div>
      </div>

      {/* AI-анализ совместимости */}
      <div className="mb-8 rounded-lg border border-neutral-700 bg-neutral-950 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800 flex flex-wrap items-center gap-2">
          <span className="text-white font-semibold">AI-анализ совместимости</span>
          {aiAnalysisOutdated && (
            <span
              className="text-amber-400 text-xs px-2 py-0.5 rounded border border-amber-500/50 bg-amber-950/30"
              title="Ответы изменились после последнего анализа"
            >
              Устарело
            </span>
          )}
          {aiAnalysisOutdated && onRefreshAiAnalysis && (
            <button
              type="button"
              onClick={onRefreshAiAnalysis}
              className="text-sm border border-neutral-600 text-neutral-400 hover:text-white hover:border-neutral-500 px-3 py-1 rounded"
            >
              Обновить анализ
            </button>
          )}
        </div>
        <div className="p-4">
          {aiAnalysisLoading && (
            <p className="text-neutral-400 text-sm flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-neutral-600 border-t-lime-400 rounded-full animate-spin" />
              Анализируем… (до 1 мин)
            </p>
          )}
          {aiAnalysisError && !aiAnalysisLoading && (
            <div className="text-red-400 text-sm mb-2">
              {aiAnalysisError}
              {onRefreshAiAnalysis && (
                <button
                  type="button"
                  onClick={onRefreshAiAnalysis}
                  className="ml-2 underline hover:no-underline"
                >
                  Повторить
                </button>
              )}
            </div>
          )}
          {aiAnalysis && !aiAnalysisLoading && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white font-medium">Общая совместимость: {aiAnalysis.ai_compatibility_score}/100</span>
                <span className="text-neutral-500">Вердикт: {AI_VERDICT_LABEL[aiAnalysis.ai_verdict] || aiAnalysis.ai_verdict}</span>
              </div>
              {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                <div>
                  <h4 className="text-lime-400 font-medium mb-2">Сильные стороны</h4>
                  <ul className="list-disc list-inside space-y-1 text-neutral-300">
                    {aiAnalysis.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAnalysis.critical_conflicts && aiAnalysis.critical_conflicts.length > 0 && (
                <div>
                  <h4 className="text-amber-400 font-medium mb-2">Критические расхождения</h4>
                  <ul className="space-y-2">
                    {aiAnalysis.critical_conflicts.map((c, i) => (
                      <li key={i} className="border-l-2 border-amber-500/50 pl-3 py-1">
                        <span className="text-neutral-200">{c.title}</span>
                        {c.recommendation && (
                          <p className="text-neutral-500 text-xs mt-1">Рекомендация: {c.recommendation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAnalysis.discussion_questions && aiAnalysis.discussion_questions.length > 0 && (
                <div>
                  <h4 className="text-cyan-400 font-medium mb-2">Вопросы для обсуждения</h4>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-300">
                    {aiAnalysis.discussion_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </div>
              )}
              {aiAnalysis.summary && (
                <div>
                  <h4 className="text-neutral-400 font-medium mb-2">Резюме</h4>
                  <p className="text-neutral-300 whitespace-pre-wrap">{aiAnalysis.summary}</p>
                </div>
              )}
            </div>
          )}
          {!aiAnalysis && !aiAnalysisLoading && !aiAnalysisError && !isAiAnalysisAvailable() && (
            <p className="text-neutral-500 text-sm">AI-анализ недоступен: не задан VITE_OPENROUTER_API_KEY.</p>
          )}
        </div>
      </div>

      <div className="space-y-3 max-w-full">
        {details.map((d) => (
          <div
            key={d.id}
            className="rounded border border-neutral-800 bg-neutral-950/50 p-4 break-words overflow-hidden"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <span className="text-white font-medium">
                {d.label}
                {d.critical && ' ⭐'}
              </span>
              <span className={`shrink-0 px-2 py-1 border rounded text-sm ${MATCH_CLASS[d.match]}`}>
                {MATCH_LABEL[d.match]}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-neutral-500">Таня: </span>
                <span className="text-neutral-300 break-words">{formatCellValue(d.tVal)}</span>
              </div>
              <div>
                <span className="text-neutral-500">Алена: </span>
                <span className="text-neutral-300 break-words">{formatCellValue(d.aVal)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-l-4 border-lime-400 bg-neutral-950 pl-6 py-4 mt-8 mb-8">
        <h3 className="font-semibold text-white mb-2 text-base">Следующие шаги</h3>
        <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-base">
          <li>Обсудите параметры с пометкой «Различия» и «Частичное».</li>
          <li>Зафиксируйте компромиссы и красные линии в совместной декларации.</li>
          <li>Назначьте дату ревью видения (например, через 3–6 месяцев).</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBackToFilling}
          className="border border-neutral-800 bg-neutral-950 hover:border-neutral-700 text-neutral-400 hover:text-white px-6 py-2 transition-colors text-base"
        >
          Вернуться к ответам
        </button>
        <button
          type="button"
          onClick={() => onDownloadReport(true)}
          className="border-2 border-lime-400 bg-lime-400/10 hover:bg-lime-400/20 text-white px-6 py-2 flex items-center gap-2 transition-colors text-base"
        >
          <Download className="w-4 h-4" />
          Скачать полный отчёт (MD)
        </button>
        {onCopyComparisonLink && roomId && (
          <button
            type="button"
            onClick={onCopyComparisonLink}
            className="border border-neutral-600 text-neutral-400 hover:text-white px-6 py-2 transition-colors text-base"
          >
            Скопировать ссылку на эту страницу
          </button>
        )}
      </div>
    </div>
  )
}
