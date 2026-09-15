import { useState, useEffect, useRef } from 'react'
import { IoPersonCircle, IoStatsChart, IoPeople, IoArrowBack, IoDownload, IoCloudUpload, IoLockClosed, IoGlobe } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import FriendsPanel from '../Friends/FriendsPanel'
import { fetchStatsSummary, fetchProfile, updateProfilePrivacy, exportStatsJSON, parseStatsImport, importStatsGames } from '../../lib/stats'
import { getBoardLabel, getPreviewMetrics } from '../../utils/boardPreview'
import Board from '../Boards/Board'
import Boarder from '../Boards/Boarder'
import Donut from '../Boards/Donut'
import X from '../Boards/X'
import './Stats.css'

const BOARD_COMPONENT = { 16: Board, 25: Boarder, 20: Donut, 21: X }

function StatTile({ label, value, hint }) {
  return (
    <div className="stats-tile">
      <span className="stats-tile-label">{label}</span>
      <span className="stats-tile-value">{value}</span>
      {hint && <span className="stats-tile-hint">{hint}</span>}
    </div>
  )
}

function MiniBoard({ letters, boardType }) {
  if (!letters || !boardType) return null
  const Comp = BOARD_COMPONENT[boardType]
  if (!Comp) return null
  const m = getPreviewMetrics(boardType)
  const tileSize = Math.max(14, Math.min(18, m.tileSize - 18))
  return (
    <div className="stats-mini-board" style={{ '--tile-size': `${tileSize}px`, '--tile-gap': '3px' }}>
      <Comp letters={letters} positions={[]} />
    </div>
  )
}

function OverviewTab() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [privacySaving, setPrivacySaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) { setSummary(null); setProfile(null); setLoading(false); return }
      setLoading(true); setError(null)
      try {
        const [s, p] = await Promise.all([
          fetchStatsSummary(user.id),
          fetchProfile(user.id).catch(() => null),
        ])
        if (!cancelled) { setSummary(s); setProfile(p) }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load stats')
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const handlePrivacyToggle = async () => {
    if (!profile) return
    setPrivacySaving(true)
    try {
      const updated = await updateProfilePrivacy(!profile.is_public)
      setProfile(updated)
    } catch (e) { setError(e.message) }
    finally { setPrivacySaving(false) }
  }

  const handleExport = () => {
    const json = exportStatsJSON(summary)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `wordhunt-stats-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const fileRef = useRef(null)
  const [importState, setImportState] = useState(null) // string feedback
  const handleImportClick = () => fileRef.current?.click()
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportState('Parsing…')
    try {
      const text = await file.text()
      const { games } = parseStatsImport(text)
      if (!games.length) throw new Error('No games in file')
      setImportState(`Found ${games.length} games — importing…`)
      const inserted = await importStatsGames(games)
      setImportState(`Imported ${inserted.length}/${games.length} games`)
      // reload summary
      const s = await fetchStatsSummary(user.id)
      setSummary(s)
      setTimeout(()=>setImportState(null), 2500)
    } catch (err) {
      setImportState(err.message || 'Import failed')
      setTimeout(()=>setImportState(null), 3000)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!user) {
    return (
      <div className="stats-overview">
        <div className="stats-empty">
          <span className="stats-empty-title">Sign in to see stats</span>
          <span className="stats-empty-hint">Games, totals, per-board breakdown, and history are saved per-profile in Supabase (<code>games</code> + <code>profiles</code>).</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="stats-overview">
        <div className="stats-loading"><span className="stats-spinner" aria-hidden /><span className="mono-hint">loading stats</span></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stats-overview">
        <div className="stats-empty" style={{ borderColor:'var(--danger)', color:'var(--danger)' }}>{error}</div>
      </div>
    )
  }

  if (!summary || summary.gamesPlayed === 0) {
    return (
      <div className="stats-overview">
        <div className="stats-grid">
          <StatTile label="Games" value="0" />
          <StatTile label="Total pts" value="0" />
          <StatTile label="Avg pts" value="—" />
          <StatTile label="Best" value="—" />
        </div>
        <div className="stats-empty">
          <span className="stats-empty-title">No games yet</span>
          <span className="stats-empty-hint">Play a Practice or Daily game — it will be saved to <code>games</code> and appear here.</span>
        </div>
        {profile && (
          <div className="stats-privacy-row">
            <span className="stats-privacy-label">{profile.is_public ? <><IoGlobe/> Public</> : <><IoLockClosed/> Private</>} — {profile.is_public ? 'visible on leaderboards' : 'hidden'}</span>
            <button className="stats-privacy-btn" onClick={handlePrivacyToggle} disabled={privacySaving}>{privacySaving ? '…' : profile.is_public ? 'Make private' : 'Make public'}</button>
          </div>
        )}
      </div>
    )
  }

  const dist = summary.scoreDistribution || {}
  const maxDist = Math.max(1, ...Object.values(dist))
  const boardKeys = Object.keys(summary.perBoard).sort((a,b)=>Number(a)-Number(b))

  return (
    <div className="stats-overview">
      {/* Core stats */}
      <div className="stats-grid">
        <StatTile label="Games" value={summary.gamesPlayed} />
        <StatTile label="Total pts" value={summary.totalPoints.toLocaleString()} />
        <StatTile label="Avg pts" value={Math.round(summary.avgPoints)} hint={`${summary.avgWords.toFixed(1)} words/g`} />
        <StatTile label="Best" value={summary.bestGame ? `${summary.bestGame.score}` : '—'} hint={summary.bestGame ? `${getBoardLabel(summary.bestGame.board_type)} · ${summary.bestGame.words_count}w` : ''} />
      </div>

      <div className="stats-grid secondary">
        <StatTile label="Words found" value={summary.totalWords} hint={`avg ${summary.avgWords.toFixed(1)}/g`} />
        <StatTile label="Longest" value={summary.longestWord ? summary.longestWord.toUpperCase() : '—'} hint={summary.longestWord ? `${summary.longestWord.length} letters` : ''} />
        <StatTile label="Streak" value={profile?.current_streak ?? '—'} hint={profile ? `best ${profile.longest_streak || 0}` : 'from profiles'} />
        <StatTile label="Playtime" value={profile?.total_playtime_seconds ? `${Math.round(profile.total_playtime_seconds/60)}m` : '—'} hint="tracked" />
      </div>

      {/* Privacy + export/import */}
      <div className="stats-actions-row">
        <div className="stats-privacy-row">
          <span className="stats-privacy-label">{profile?.is_public ? <><IoGlobe/> Public</> : <><IoLockClosed/> Private</>} </span>
          <button className="stats-privacy-btn" onClick={handlePrivacyToggle} disabled={privacySaving || !profile}>{privacySaving ? '…' : profile?.is_public ? 'Make private' : 'Make public'}</button>
        </div>
        <div className="stats-actions-row" style={{ gap: '8px' }}>
          <button className="stats-export-btn" onClick={handleExport}><IoDownload/> Export JSON</button>
          <button className="stats-export-btn" onClick={handleImportClick}><IoCloudUpload/> Import</button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display:'none' }} />
        </div>
      </div>
      {importState && <div className="stats-import-msg">{importState}</div>}

      {/* Per-board breakdown */}
      <div className="stats-section">
        <h3 className="stats-section-title">Per board</h3>
        {boardKeys.length === 0 ? <div className="stats-empty">No board data</div> : (
          <div className="stats-board-grid">
            {boardKeys.map(k => {
              const b = summary.perBoard[k]
              return (
                <div key={k} className="stats-board-card">
                  <span className="stats-board-label">{getBoardLabel(Number(k))}</span>
                  <div className="stats-board-stats">
                    <span><b>{b.games}</b> games</span>
                    <span><b>{Math.round(b.avgPoints)}</b> avg</span>
                    <span><b>{b.bestScore}</b> best</span>
                  </div>
                  <span className="stats-board-hint">{b.totalWords} words · {b.totalPoints.toLocaleString()} pts</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* High-score per board + time control */}
      <div className="stats-section">
        <h3 className="stats-section-title">High-score per board + time</h3>
        {(() => {
          const perTime = summary.perBoardTime || {}
          const keys = Object.keys(perTime).sort((a,b)=>{
            const [ba,ta]=a.split(':').map(Number); const [bb,tb]=b.split(':').map(Number)
            if (ba!==bb) return ba-bb; return ta-tb
          })
          if (!keys.length) return <div className="stats-empty">No time data</div>
          return (
            <div className="stats-board-grid">
              {keys.map(k=>{
                const v = perTime[k]
                return (
                  <div key={k} className="stats-board-card">
                    <span className="stats-board-label">{getBoardLabel(v.board_type)} · {v.game_time}s</span>
                    <div className="stats-board-stats"><span><b>{v.bestScore}</b> best</span><span><b>{v.games}</b> games</span></div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Word-length & score distribution */}
      <div className="stats-section">
        <h3 className="stats-section-title">Word-length distribution</h3>
        <div className="stats-dist">
          {[3,4,5,6,7,8,9,10].map(len => {
            const cnt = dist[String(len)] || 0
            const pct = Math.round((cnt / maxDist) * 100)
            return (
              <div key={len} className="stats-dist-row">
                <span className="stats-dist-label">{len}</span>
                <div className="stats-dist-bar-wrap"><div className="stats-dist-bar" style={{ width: `${pct}%` }} /></div>
                <span className="stats-dist-count">{cnt}</span>
              </div>
            )
          })}
        </div>
        {summary.scoreBuckets && (
          <div className="stats-dist" style={{ marginTop:'8px' }}>
            <span className="stats-dist-title">Score buckets</span>
            {Object.entries(summary.scoreBuckets).map(([bucket,cnt])=> (
              <div key={bucket} className="stats-dist-row">
                <span className="stats-dist-label" style={{ fontSize:'0.58rem' }}>{bucket}</span>
                <div className="stats-dist-bar-wrap"><div className="stats-dist-bar alt" style={{ width: `${Math.round((cnt/Math.max(...Object.values(summary.scoreBuckets)))*100)}%` }} /></div>
                <span className="stats-dist-count">{cnt}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History log — 50 with percentile vs perfect */}
      <div className="stats-section">
        <h3 className="stats-section-title">History — recent {summary.recentGames.length} of {summary.gamesPlayed}</h3>
        <div className="stats-history">
          {summary.recentGames.map(g => {
            const pctWords = g.total_possible_words ? Math.round((g.words_count / g.total_possible_words)*100) : null
            const pctScore = g.total_possible_score ? Math.round((g.score / g.total_possible_score)*100) : null
            const date = new Date(g.created_at).toLocaleDateString()
            return (
              <div key={g.id} className="stats-history-row">
                <div className="stats-history-board">
                  <MiniBoard letters={g.board_letters} boardType={g.board_type} />
                  <span className="stats-history-board-label">{getBoardLabel(g.board_type)}</span>
                </div>
                <div className="stats-history-main">
                  <span className="stats-history-score">{g.score} pts {pctScore!=null && <span className="stats-pct">· {pctScore}% of max</span>}</span>
                  <span className="stats-history-meta">{g.words_count}/{g.total_possible_words ?? '?'} words {pctWords!=null ? `· ${pctWords}%` : ''} · {date} {g.is_daily ? '· Daily' : ''}</span>
                  {g.longest_word && <span className="stats-history-longest">{g.longest_word.toUpperCase()} ({g.longest_word_length}) · {g.words_count}w</span>}
                </div>
                <span className="stats-history-time">{g.game_time}s</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const Stats = ({ onBack }) => {
  const { user } = useAuth()
  const username = (user?.user_metadata?.username || user?.email?.split('@')[0] || 'guest').toLowerCase()
  const [tab, setTab] = useState('overview')

  return (
    <section className="stats-area">
      <div className="stats-header">
        <div className="stats-profile">
          <span className="stats-avatar" aria-hidden><IoPersonCircle /></span>
          <div className="stats-profile-meta">
            <span className="eyebrow">Profile</span>
            <h1 className="stats-username">@{username}</h1>
            <span className="stats-sub">{user ? 'signed in · Supabase' : 'guest — sign in to save stats & friends'}</span>
          </div>
        </div>
        {onBack && <button className="stats-back" onClick={onBack} aria-label="Back"><IoArrowBack /></button>}
      </div>

      <div className="stats-tabs" role="tablist">
        <button role="tab" aria-selected={tab==='overview'} className={`stats-tab ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>
          <IoStatsChart /> Stats
        </button>
        <button role="tab" aria-selected={tab==='friends'} className={`stats-tab ${tab==='friends'?'active':''}`} onClick={()=>setTab('friends')}>
          <IoPeople /> Friends
        </button>
      </div>

      {tab === 'overview' ? <OverviewTab /> : <FriendsPanel />}
    </section>
  )
}

export default Stats
