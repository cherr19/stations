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

/** Markdown для полного отчёта сравнения */
export function buildReportMd(report) {
  const { date, roomId, score, decision, tanyaData, alenaData, details } = report
  const lines = [
    `# Отчёт сравнения видения основателей`,
    `Дата: ${date}`,
    `Комната: ${roomId}`,
    '',
    `## Результат`,
    `**${decision}** — совместимость ${report.pct}% (${score.total} / ${score.max} баллов)`,
    '',
    '## Таблица сравнения',
    '',
    '| Параметр | Таня | Алена | Совпадение |',
    '|----------|------|-------|------------|',
  ]
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
