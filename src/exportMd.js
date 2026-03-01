import { PARTS, SCORING_PARAMS } from './questions'
import { formatCellValue } from './scoring'

function formatVal(val) {
  if (val == null) return '—'
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.join(', ')
    return Object.entries(val)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
  }
  return String(val)
}

/** Markdown для моих ответов (для обсуждения с нейросетью) */
export function buildMyAnswersMd(data, userName) {
  const lines = [
    `# Мои ответы: ${userName}`,
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
    '',
  ]
  for (const part of PARTS) {
    lines.push(`## ${part.title}`)
    lines.push('')
    for (const block of part.blocks) {
      lines.push(`### ${block.title}`)
      lines.push('')
      for (const q of block.questions) {
        const v = data[q.id]
        const text = formatVal(v)
        if (q.type === 'compound' && q.fields) {
          for (const f of q.fields) {
            const fv = v && v[f.key] != null ? String(v[f.key]).trim() : ''
            if (fv) lines.push(`- **${f.label}:** ${fv}`)
          }
        } else {
          lines.push(`- **${q.label}**\n  ${text}`)
        }
        lines.push('')
      }
    }
  }
  return lines.join('\n')
}

const AI_VERDICT_LABEL = { GO: 'GO', CONDITIONAL_GO: 'GO с оговорками', PIVOT: 'PIVOT', NO_GO: 'NO-GO' }

/** Markdown для полного отчёта сравнения */
export function buildReportMd(report) {
  const { date, roomId, score, decision, tanyaData, alenaData, details, aiAnalysis } = report
  const lines = [
    `# Отчёт сравнения видения основателей`,
    `Дата: ${date}`,
    `Комната: ${roomId}`,
    '',
    `## Результат`,
    `**${decision}** — совместимость ${report.pct}% (${score.total} / ${score.max} баллов)`,
    '',
  ]
  if (aiAnalysis) {
    lines.push('## AI-анализ совместимости')
    lines.push('')
    lines.push(`- Совместимость (AI): ${aiAnalysis.ai_compatibility_score}/100`)
    lines.push(`- Вердикт (AI): ${AI_VERDICT_LABEL[aiAnalysis.ai_verdict] || aiAnalysis.ai_verdict}`)
    lines.push('')
    if (aiAnalysis.strengths && aiAnalysis.strengths.length > 0) {
      lines.push('### Сильные стороны')
      lines.push('')
      aiAnalysis.strengths.forEach((s) => lines.push(`- ${s}`))
      lines.push('')
    }
    if (aiAnalysis.critical_conflicts && aiAnalysis.critical_conflicts.length > 0) {
      lines.push('### Критические расхождения')
      lines.push('')
      aiAnalysis.critical_conflicts.forEach((c) => {
        lines.push(`- **${c.title}**`)
        if (c.recommendation) lines.push(`  Рекомендация: ${c.recommendation}`)
      })
      lines.push('')
    }
    if (aiAnalysis.discussion_questions && aiAnalysis.discussion_questions.length > 0) {
      lines.push('### Вопросы для обсуждения')
      lines.push('')
      aiAnalysis.discussion_questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`))
      lines.push('')
    }
    if (aiAnalysis.summary) {
      lines.push('### Резюме')
      lines.push('')
      lines.push(aiAnalysis.summary)
      lines.push('')
    }
  }
  lines.push('## Таблица сравнения')
  lines.push('')
  lines.push('| Параметр | Таня | Алена | Совпадение |')
  lines.push('|----------|------|-------|------------|')
  const matchLabel = { full: '✓ Полное', partial: '~ Частичное', none: '✗ Различия', empty: '—' }
  for (const d of details) {
    const t = formatCellValue(d.tVal).replace(/\|/g, ' ').replace(/\n/g, ' ')
    const a = formatCellValue(d.aVal).replace(/\|/g, ' ').replace(/\n/g, ' ')
    const m = matchLabel[d.match] || '—'
    const label = d.label + (d.critical ? ' ⭐' : '')
    lines.push(`| ${label} | ${t} | ${a} | ${m} |`)
  }
  lines.push('')
  lines.push('## Ответы Тани (кратко)')
  lines.push('')
  for (const p of SCORING_PARAMS.slice(0, 15)) {
    const v = formatVal(tanyaData[p.id])
    if (v !== '—') lines.push(`- **${p.label}:** ${v}`)
  }
  lines.push('')
  lines.push('## Ответы Алены (кратко)')
  lines.push('')
  for (const p of SCORING_PARAMS.slice(0, 15)) {
    const v = formatVal(alenaData[p.id])
    if (v !== '—') lines.push(`- **${p.label}:** ${v}`)
  }
  return lines.join('\n')
}
