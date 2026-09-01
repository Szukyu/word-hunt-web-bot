import './DailyHistory.css'

function formatDateUTC(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const BOARD_LABEL = {
  16: '4×4',
  20: 'Donut',
  21: 'X',
  25: '5×5',
}

const DailyHistory = ({ history = [], onSelectDate }) => {
  const sorted = [...history].sort((a, b) => (b.puzzle_date || '').localeCompare(a.puzzle_date || ''))

  const totalPlayed = sorted.length
  const avgScore = totalPlayed ? Math.round(sorted.reduce((s, x) => s + (x.score || 0), 0) / totalPlayed) : 0
  const best = totalPlayed ? Math.max(...sorted.map(x => x.score || 0)) : 0

  return (
    <section className="daily-history-card">
      <div className="hist-header">
        <div>
          <span className="eyebrow">Archive</span>
          <h2 className="hist-title">Daily History</h2>
          <span className="hist-subtitle">View-only · past dailies are not replayable</span>
        </div>
        <div className="hist-summary">
          <div className="hist-stat">
            <span className="hist-stat-label">Played</span>
            <span className="hist-stat-value">{totalPlayed}</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-label">Avg</span>
            <span className="hist-stat-value">{totalPlayed ? `${avgScore}` : '—'}</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-label">Best</span>
            <span className="hist-stat-value">{totalPlayed ? `${best}` : '—'}</span>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="hist-empty">
          <span className="hist-empty-title">No daily history yet</span>
          <span className="hist-empty-hint">Complete today’s puzzle to start your archive. Past puzzles appear here automatically (view-only).</span>
        </div>
      ) : (
        <div className="hist-list">
          <div className="hist-list-head">
            <span>Date</span>
            <span>Board</span>
            <span>Score</span>
            <span>Words</span>
            <span className="hist-col-longest">Longest</span>
            <span></span>
          </div>
          {sorted.map((h) => {
            const wordsCount = h.words_count ?? h.words_found?.length ?? 0
            const totalWords = h.total_possible_words ?? h.totalPossibleWords ?? null
            const pct = h.percent_score != null ? Math.round(h.percent_score) : null
            const longest = h.longest_word ? String(h.longest_word).toUpperCase() : '—'
            const boardLabel = BOARD_LABEL[h.board_type] || `${h.board_type}`
            return (
              <div key={`${h.puzzle_date}:${h.board_type}`} className="hist-row">
                <span className="hist-date">{formatDateUTC(h.puzzle_date)}</span>
                <span className="hist-board">
                  <span className="hist-board-pill">{boardLabel}</span>
                </span>
                <span className="hist-score">
                  {h.score ?? 0} <span className="hist-pct">{pct != null ? `${pct}%` : ''}</span>
                </span>
                <span className="hist-words">{wordsCount}{totalWords ? `/${totalWords}` : ''}</span>
                <span className="hist-longest" title={longest}>{longest}</span>
                <button
                  className="hist-view-btn"
                  onClick={() => onSelectDate?.(h.puzzle_date)}
                  aria-label={`View ${h.puzzle_date}`}
                  title="View in calendar"
                >
                  View
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="hist-foot-hint">
        History is stored per-profile (local + Supabase when signed in). Past puzzles are view-only and do not count toward streak. Replay will be enabled later.
      </div>
    </section>
  )
}

export default DailyHistory
