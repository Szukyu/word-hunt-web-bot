import { useMemo, useState, useEffect } from 'react'
import { createDailyBoard, todayUTC, DAILY_BOARD_META } from '../../lib/daily'
import Board from '../Boards/Board'
import Boarder from '../Boards/Boarder'
import Donut from '../Boards/Donut'
import X from '../Boards/X'
import { getPreviewMetrics } from '../../utils/boardPreview'
import './DailyCalendar.css'

function formatDateUTC(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function daysInMonthUTC(year, month) {
  // month 0-11
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

function toDateStrUTC(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function addMonths(year, month, delta) {
  let m = month + delta
  let y = year
  while (m < 0) { m += 12; y -= 1 }
  while (m > 11) { m -= 12; y += 1 }
  return { year: y, month: m }
}

function weekdayUTC(year, month, day) {
  return new Date(Date.UTC(year, month, day)).getUTCDay() // 0 Sun
}

const BOARD_COMPONENT = {
  16: Board,
  25: Boarder,
  20: Donut,
  21: X,
}

const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const DailyCalendar = ({ history = [], selectedDate, onSelectDate }) => {
  const todayStr = todayUTC()
  const todayDate = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number)
    return { y, m: m - 1, d }
  }, [todayStr])

  const [cursor, setCursor] = useState({ year: todayDate.y, month: todayDate.m })
  const [internalSelected, setInternalSelected] = useState(todayStr)
  const selected = selectedDate ?? internalSelected
  const setSelected = (v) => {
    if (onSelectDate) onSelectDate(v)
    else setInternalSelected(v)
  }

  const historyMap = useMemo(() => {
    const map = new Map()
    for (const h of history) {
      if (!h?.puzzle_date) continue
      // if multiple entries same date (different board_type shouldn't happen due to chooseDailyBoardType, but handle)
      const key = h.puzzle_date
      if (!map.has(key)) map.set(key, h)
      else {
        // keep latest
        const existing = map.get(key)
        const tA = h.created_at || h._saved_at || ''
        const tB = existing.created_at || existing._saved_at || ''
        if (tA > tB) map.set(key, h)
      }
    }
    return map
  }, [history])

  const monthDays = useMemo(() => {
    const { year, month } = cursor
    const dim = daysInMonthUTC(year, month)
    const firstDow = weekdayUTC(year, month, 1) // 0 Sun
    // We render Mon start: shift so Mon=0 ... Sun=6
    const monOffset = (firstDow + 6) % 7
    const cells = []
    for (let i = 0; i < monOffset; i++) cells.push(null)
    for (let d = 1; d <= dim; d++) cells.push(d)
    // pad to complete weeks
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [cursor])

  // for selected date, compute board and attempt
  const selectedBoard = useMemo(() => {
    if (!selected) return null
    if (selected > todayStr) return null
    try { return createDailyBoard(selected) } catch { return null }
  }, [selected, todayStr])

  const selectedAttempt = selected ? historyMap.get(selected) || null : null
  const selectedMetrics = useMemo(() => {
    if (!selectedBoard) return null
    return getPreviewMetrics(selectedBoard.board_type)
  }, [selectedBoard])

  const renderMiniBoard = () => {
    if (!selectedBoard || !selectedMetrics) return null
    const Comp = BOARD_COMPONENT[selectedBoard.board_type]
    if (!Comp) return null
    return (
      <div
        className="cal-mini-board"
        data-size={selectedBoard.board_type}
        style={{
          '--tile-size': `${Math.max(18, Math.min(28, selectedMetrics.tileSize - 10))}px`,
          '--tile-gap': '4px',
        }}
      >
        <Comp letters={selectedBoard.board_letters} positions={[]} />
      </div>
    )
  }

  const isPrevDisabled = false // allow browsing far back
  const nextCursor = addMonths(cursor.year, cursor.month, 1)
  const isNextDisabled = nextCursor.year > todayDate.y || (nextCursor.year === todayDate.y && nextCursor.month > todayDate.m)

  const goPrev = () => setCursor(addMonths(cursor.year, cursor.month, -1))
  const goNext = () => { if (!isNextDisabled) setCursor(addMonths(cursor.year, cursor.month, 1)) }

  // When History picks a date outside current month, jump cursor so detail stays visible
  useEffect(() => {
    if (selected && onSelectDate && selectedDate) {
      const [sy, sm] = selected.split('-').map(Number)
      if (sy !== cursor.year || sm - 1 !== cursor.month) {
        setCursor({ year: sy, month: sm - 1 })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <section className="daily-calendar-card">
      <div className="cal-header">
        <div>
          <span className="eyebrow">History</span>
          <h2 className="cal-title">Daily Calendar</h2>
          <span className="cal-subtitle">View-only · past dailies are not replayable</span>
        </div>
        <div className="cal-month-nav">
          <button className="cal-nav-btn" onClick={goPrev} aria-label="Previous month" disabled={isPrevDisabled}>‹</button>
          <span className="cal-month-label">{MONTH_LABELS[cursor.month]} {cursor.year}</span>
          <button className="cal-nav-btn" onClick={goNext} aria-label="Next month" disabled={isNextDisabled}>›</button>
        </div>
      </div>

      <div className="cal-grid-wrap">
        <div className="cal-weekday-row">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => (
            <span key={w} className="cal-weekday">{w}</span>
          ))}
        </div>
        <div className="cal-grid">
          {monthDays.map((day, idx) => {
            if (day === null) return <div key={idx} className="cal-cell empty" />
            const dateStr = toDateStrUTC(cursor.year, cursor.month, day)
            const isToday = dateStr === todayStr
            const isFuture = dateStr > todayStr
            const isSelected = dateStr === selected
            const attempt = historyMap.get(dateStr) || null
            const board = !isFuture ? createDailyBoard(dateStr) : null
            const status = isFuture ? 'future' : attempt ? 'completed' : dateStr < todayStr ? 'missed' : 'playable'
            return (
              <button
                key={idx}
                className={`cal-cell ${status} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => !isFuture && setSelected(dateStr)}
                disabled={isFuture}
                aria-label={`${dateStr} ${status}`}
                title={`${dateStr} — ${board?.board_name || ''} ${attempt ? `· ${attempt.score} pts` : ''}`}
              >
                <span className="cal-day-num">{day}</span>
                {!isFuture && <span className="cal-day-meta">{DAILY_BOARD_META[board.board_type]?.name.split(' ')[0] || board.board_type}</span>}
                {attempt && <span className="cal-dot completed" aria-hidden />}
                {!attempt && !isFuture && dateStr < todayStr && <span className="cal-dot missed" aria-hidden />}
                {isToday && !attempt && <span className="cal-dot today-dot" aria-hidden />}
              </button>
            )
          })}
        </div>
        <div className="cal-legend">
          <span className="legend-item"><span className="legend-dot completed" /> Completed</span>
          <span className="legend-item"><span className="legend-dot missed" /> Missed</span>
          <span className="legend-item"><span className="legend-dot today-dot" /> Today</span>
          <span className="legend-item"><span className="legend-dot future" /> Future</span>
        </div>
      </div>

      {/* Selected day detail — only for completed past dailies (view-only) */}
      {selected && selected > todayStr ? (
        <div className="cal-detail">
          <div className="cal-detail-empty">Future puzzle — not yet available.</div>
        </div>
      ) : selectedAttempt && selectedBoard ? (
        <div className="cal-detail">
          <div className="cal-detail-head">
            <div>
              <span className="preview-label">Selected</span>
              <h3>{formatDateUTC(selected)} — {selectedBoard.board_name}</h3>
              <span className="cal-detail-meta">{selectedBoard.board_letters.length} letters · Completed · view-only</span>
            </div>
            <span className="cal-status-badge done">Completed</span>
          </div>

          <div className="cal-detail-body">
            <div className="cal-detail-board">
              {renderMiniBoard()}
            </div>
            <div className="cal-detail-stats">
              <div className="cal-stat-row">
                <span className="cal-stat-label">Score</span>
                <span className="cal-stat-value">{selectedAttempt.score} pts</span>
              </div>
              <div className="cal-stat-row">
                <span className="cal-stat-label">Words</span>
                <span className="cal-stat-value">{selectedAttempt.words_count ?? selectedAttempt.words_found?.length ?? 0}{selectedAttempt.total_possible_words ? ` / ${selectedAttempt.total_possible_words}` : ''}</span>
              </div>
              {selectedAttempt.percent_score != null && (
                <div className="cal-stat-row">
                  <span className="cal-stat-label">Accuracy</span>
                  <span className="cal-stat-value">{Math.round(selectedAttempt.percent_score)}% of max</span>
                </div>
              )}
              {selectedAttempt.longest_word && (
                <div className="cal-stat-row">
                  <span className="cal-stat-label">Longest</span>
                  <span className="cal-stat-value longest">{String(selectedAttempt.longest_word).toUpperCase()}</span>
                </div>
              )}
              <div className="cal-detail-hint">Past dailies are view-only and do not affect streak. Replay will be enabled in a future update.</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default DailyCalendar
