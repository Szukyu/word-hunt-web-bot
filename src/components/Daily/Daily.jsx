import { useState, useEffect, useMemo } from 'react'
import useLoad from '../../hooks/load'
import Play from '../Play/Play'
import Results from '../Results/Results'
import Board from '../Boards/Board'
import Boarder from '../Boards/Boarder'
import Donut from '../Boards/Donut'
import X from '../Boards/X'
import { createDailyBoard, todayUTC, daysUntilNextUTC } from '../../lib/daily'
import { getPreviewMetrics } from '../../utils/boardPreview'
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
  const daily = useMemo(() => createDailyBoard(todayUTC()), [])
  const previewMetrics = useMemo(() => getPreviewMetrics(daily.board_type), [daily.board_type])

  const [countdown, setCountdown] = useState(() => daysUntilNextUTC())
  const [isPlaying, setIsPlaying] = useState(false)
  const [gameResult, setGameResult] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setCountdown(daysUntilNextUTC()), 1000)
    return () => clearInterval(id)
  }, [])

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

  const handleGameEnd = (result) => {
    setGameResult(result)
    setIsPlaying(false)
  }

  if (loading) {
    return (
      <div className="option-state-card">
        <div className="option-spinner" aria-hidden />
        <span className="mono-hint">loading dictionary</span>
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

  if (gameResult) {
    return (
      <Results
        score={gameResult.score}
        foundWords={gameResult.foundWords}
        allPossibleWords={gameResult.allPossibleWords}
        totalPossibleScore={gameResult.totalPossibleScore}
        onPlayAgain={() => { setGameResult(null); setIsPlaying(true) }}
        onBack={() => setGameResult(null)}
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
          <button className="daily-play-button" onClick={() => setIsPlaying(true)}>
            Play Daily
          </button>
        </div>
      </div>
    </section>
  )
}

export default Daily
