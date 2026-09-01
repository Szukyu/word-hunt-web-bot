import { useState, useEffect, useMemo } from 'react'
import useLoad from '../../hooks/load'
import Play from '../Play/Play'
import Results from '../Results/Results'
import Board from '../Boards/Board'
import Boarder from '../Boards/Boarder'
import Donut from '../Boards/Donut'
import X from '../Boards/X'
import {
  createDailyBoard,
  todayUTC,
  daysUntilNextUTC,
  getLocalDailyAttempt,
  saveLocalDailyAttempt,
  getDailyAttempt,
  submitDailyScore,
  fetchUserDailyHistory,
  getAllLocalDailyAttempts,
  mergeDailyHistory,
} from '../../lib/daily'
import { getPreviewMetrics } from '../../utils/boardPreview'
import { useAuth } from '../../context/AuthContext'
import DailyCalendar from './DailyCalendar'
import DailyHistory from './DailyHistory'
import './Daily.css'

const DAILY_TIME = 90

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDateUTC(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const Daily = () => {
  const { englishWords, wordStarts, loading, error } = useLoad()
  const { user } = useAuth()
  const daily = useMemo(() => createDailyBoard(todayUTC()), [])
  const previewMetrics = useMemo(() => getPreviewMetrics(daily.board_type), [daily.board_type])

  const [countdown, setCountdown] = useState(() => daysUntilNextUTC())
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [checkingAttempt, setCheckingAttempt] = useState(true)
  const [viewAttemptResult, setViewAttemptResult] = useState(false)

  // Daily history & calendar (view-only; past not replayable)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [calendarSelected, setCalendarSelected] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setCountdown(daysUntilNextUTC()), 1000)
    return () => clearInterval(id)
  }, [])

  // If attempt becomes known while playing (race on initial check), kick out of Play
  useEffect(() => {
    if (attempt && isPlaying) setIsPlaying(false)
  }, [attempt, isPlaying])

  // Load daily history (remote + local merge) — powers calendar & history list (view-only)
  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      setHistoryLoading(true)
      try {
        let remote = []
        if (user?.id) {
          try {
            remote = await fetchUserDailyHistory(user.id, 100)
          } catch (e) {
            void e
            remote = []
          }
        }
        const local = getAllLocalDailyAttempts(user?.id || null)
        const merged = mergeDailyHistory(remote, local)
        if (!cancelled) setHistoryList(merged)
      } catch {
        if (!cancelled) setHistoryList(getAllLocalDailyAttempts(user?.id || null))
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    loadHistory()
    return () => { cancelled = true }
  }, [user?.id, attempt, gameResult])

  // One-attempt enforcement: per profile local + Supabase sync
  useEffect(() => {
    let cancelled = false
    async function check() {
      setCheckingAttempt(true)
      try {
        // Try fast local first for immediate UI, then sync with Supabase if authenticated
        const local = getLocalDailyAttempt(daily.puzzle_date, daily.board_type, user?.id)
        if (user?.id) {
          const remote = await getDailyAttempt(daily.puzzle_date, daily.board_type, user.id)
          if (!cancelled) setAttempt(remote || local || null)
        } else {
          // guest: local only (also checks generic guest keys)
          if (!cancelled) setAttempt(local || null)
        }
      } catch {
        const local = getLocalDailyAttempt(daily.puzzle_date, daily.board_type, user?.id)
        if (!cancelled) setAttempt(local || null)
      } finally {
        if (!cancelled) setCheckingAttempt(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [daily.puzzle_date, daily.board_type, user?.id])

  const renderBoard = () => {
    const props = { letters: daily.board_letters, positions: [] }
    switch (daily.board_type) {
      case 16: return <Board {...props} />
      case 25: return <Boarder {...props} />
      case 20: return <Donut {...props} />
      case 21: return <X {...props} />
      default: return null
    }
  }

  const handleGameEnd = async (result) => {
    setGameResult(result)
    setIsPlaying(false)

    // Build canonical attempt payload for local storage
    const longestWord = result.foundWords.length
      ? result.foundWords.reduce((a, b) => (a.word.length >= b.word.length ? a : b)).word
      : null

    const attemptData = {
      puzzle_date: daily.puzzle_date,
      board_type: daily.board_type,
      score: result.score,
      words_count: result.foundWords.length,
      words_found: result.foundWords,
      // keep both naming conventions for compat
      total_possible_score: result.totalPossibleScore,
      totalPossibleScore: result.totalPossibleScore,
      total_possible_words: result.allPossibleWords.length,
      totalPossibleWords: result.allPossibleWords.length,
      allPossibleWords: result.allPossibleWords,
      all_possible_words: result.allPossibleWords,
      longest_word: longestWord,
      created_at: new Date().toISOString(),
    }

    // Always persist locally per-profile (enforces one attempt even offline / guest)
    saveLocalDailyAttempt(attemptData, user?.id)
    setAttempt(attemptData)

    // If authenticated, also sync to Supabase (unique constraint enforces server-side)
    if (user?.id) {
      try {
        await submitDailyScore({
          puzzleDate: daily.puzzle_date,
          boardType: daily.board_type,
          score: result.score,
          wordsFound: result.foundWords,
          totalPossibleScore: result.totalPossibleScore,
          totalPossibleWords: result.allPossibleWords.length,
          longestWord,
        })
      } catch (e) {
        // 23505 = already submitted — treat as success (attempt already recorded)
        if (e?.message && !e.message.includes('Already submitted')) {
          console.warn('[daily] submitDailyScore failed', e.message)
        }
      }
    }
  }

  const handlePlayClick = () => {
    if (attempt) return
    setIsPlaying(true)
  }

  if (loading || checkingAttempt) {
    return (
      <div className="option-state-card">
        <div className="option-spinner" aria-hidden />
        <span className="mono-hint">{checkingAttempt && !loading ? 'checking daily status' : 'loading dictionary'}</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="option-state-card error">
        <span className="mono-hint">{error}</span>
        <button className="retry-button" onClick={() => window.location.reload()}>retry</button>
      </div>
    )
  }

  // Just-finished game takes precedence over locked view for this session
  if (gameResult) {
    return (
      <Results
        score={gameResult.score}
        foundWords={gameResult.foundWords}
        allPossibleWords={gameResult.allPossibleWords}
        totalPossibleScore={gameResult.totalPossibleScore}
        // One attempt: replay is blocked — send user to locked completed view
        onPlayAgain={() => setGameResult(null)}
        onBack={() => setGameResult(null)}
      />
    )
  }

  if (viewAttemptResult && attempt) {
    const words = attempt.words_found || attempt.wordsFound || []
    const allWords = attempt.allPossibleWords || attempt.all_possible_words || []
    const totalScore = attempt.total_possible_score ?? attempt.totalPossibleScore ?? 0
    return (
      <Results
        score={attempt.score}
        foundWords={words}
        allPossibleWords={allWords}
        totalPossibleScore={totalScore}
        onPlayAgain={() => setViewAttemptResult(false)}
        onBack={() => setViewAttemptResult(false)}
      />
    )
  }

  if (isPlaying) {
    return (
      <Play
        boardType={daily.board_type}
        gameTime={DAILY_TIME}
        initialLetters={daily.board_letters}
        disableRegenerate={true}
        onBack={() => setIsPlaying(false)}
        onGameEnd={handleGameEnd}
        englishWords={englishWords}
        wordStarts={wordStarts}
      />
    )
  }

  // Locked completed state — one attempt per day per profile
  if (attempt) {
    const wordsCount = attempt.words_count ?? attempt.words_found?.length ?? attempt.wordsFound?.length ?? 0
    const hasFullResult = !!(attempt.allPossibleWords || attempt.all_possible_words)
    const handleHistorySelect = (dateStr) => {
      setCalendarSelected(dateStr)
      // scroll to calendar card for context
      setTimeout(() => {
        document.getElementById('daily-calendar-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
    return (
      <section className="daily-area">
        <div className="daily-header">
          <div className="daily-title">
            <span className="eyebrow">Daily Puzzle</span>
            <h1>{formatDateUTC(daily.puzzle_date)} — {daily.board_name}</h1>
            <span className="daily-subtitle">{DAILY_TIME}s • Completed</span>
          </div>
        </div>

        <div className="daily-content">
          <div className="daily-preview-card daily-completed">
            <div className="preview-header">
              <div>
                <span className="preview-label">Today</span>
                <h2>{daily.board_name}</h2>
              </div>
              <div className="preview-meta">
                <span>{daily.board_letters.length} letters</span>
                <span>{DAILY_TIME}s</span>
              </div>
            </div>
            <div
              className="board-preview"
              data-size={daily.board_type}
              style={{
                '--tile-size': `${previewMetrics.tileSize}px`,
                '--tile-gap': `${previewMetrics.gap}px`,
              }}
            >
              {renderBoard()}
            </div>
            <div className="daily-completed-banner">
              <span className="completed-badge">Completed</span>
              <span className="completed-score">{attempt.score} pts • {wordsCount} words</span>
              {attempt.percent_score != null && (
                <span className="completed-percent">{Math.round(attempt.percent_score)}% of max</span>
              )}
            </div>
            <div className="daily-countdown-inline">
              <span className="preview-label">Next puzzle in</span>
              <span className="countdown-value">{formatCountdown(countdown)}</span>
              <span className="countdown-hint">Resets 00:00 UTC</span>
            </div>
            <button className="daily-play-button disabled" disabled>
              Already played today
            </button>
            <button className="daily-view-result-button" onClick={() => setViewAttemptResult(true)}>
              {hasFullResult ? 'View Results' : 'View Score'}
            </button>
            <span className="daily-one-attempt-hint">One attempt per day per profile. Come back tomorrow.</span>
          </div>
        </div>

        <div className="daily-extra" id="daily-calendar-anchor">
          <DailyCalendar history={historyList} selectedDate={calendarSelected} onSelectDate={setCalendarSelected} />
          <DailyHistory history={historyList} onSelectDate={handleHistorySelect} />
          {historyLoading && <div className="daily-history-loading mono-hint">loading history…</div>}
        </div>
      </section>
    )
  }

  const handleHistorySelectFallback = (dateStr) => {
    setCalendarSelected(dateStr)
    setTimeout(() => {
      document.getElementById('daily-calendar-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <section className="daily-area">
      <div className="daily-header">
        <div className="daily-title">
          <span className="eyebrow">Daily Puzzle</span>
          <h1>{formatDateUTC(daily.puzzle_date)} — {daily.board_name}</h1>
          <span className="daily-subtitle">{DAILY_TIME}s</span>
        </div>
      </div>

      <div className="daily-content">
        <div className="daily-preview-card">
          <div className="preview-header">
            <div>
              <span className="preview-label">Today</span>
              <h2>{daily.board_name}</h2>
            </div>
            <div className="preview-meta">
              <span>{daily.board_letters.length} letters</span>
              <span>{DAILY_TIME}s</span>
            </div>
          </div>
          <div
            className="board-preview"
            data-size={daily.board_type}
            style={{
              '--tile-size': `${previewMetrics.tileSize}px`,
              '--tile-gap': `${previewMetrics.gap}px`,
            }}
          >
            {renderBoard()}
          </div>
          <div className="daily-countdown-inline">
            <span className="preview-label">Next puzzle in</span>
            <span className="countdown-value">{formatCountdown(countdown)}</span>
            <span className="countdown-hint">Resets 00:00 UTC</span>
          </div>
          <button className="daily-play-button" onClick={handlePlayClick}>
            Play Daily
          </button>
        </div>
      </div>

      <div className="daily-extra" id="daily-calendar-anchor">
        <DailyCalendar history={historyList} selectedDate={calendarSelected} onSelectDate={setCalendarSelected} />
        <DailyHistory history={historyList} onSelectDate={handleHistorySelectFallback} />
        {historyLoading && <div className="daily-history-loading mono-hint">loading history…</div>}
      </div>
    </section>
  )
}

export default Daily
