import { useState, useEffect, useMemo } from 'react'
import { IoPersonCircle, IoStatsChart, IoPeople, IoArrowBack, IoDownload, IoLockClosed, IoGlobe } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import FriendsPanel from '../Friends/FriendsPanel'
import { fetchStatsSummary, fetchProfile, updateProfilePrivacy, exportStatsJSON } from '../../lib/stats'
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

      {/* Privacy + export */}
      <div className="stats-actions-row">
        <div className="stats-privacy-row">
          <span className="stats-privacy-label">{profile?.is_public ? <><IoGlobe/> Public</> : <><IoLockClosed/> Private</>} </span>
          <button className="stats-privacy-btn" onClick={handlePrivacyToggle} disabled={privacySaving || !profile}>{privacySaving ? '…' : profile?.is_public ? 'Make private' : 'Make public'}</button>
        </div>
        <button className="stats-export-btn" onClick={handleExport}><IoDownload/> Export JSON</button>
      </div>

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

      {/* Word-length distribution */}
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
      </div>

      {/* History log */}
      <div className="stats-section">
        <h3 className="stats-section-title">History — recent {summary.recentGames.length}</h3>
        <div className="stats-history">
          {summary.recentGames.map(g => {
            const pct = g.total_possible_words ? Math.round((g.words_count / g.total_possible_words)*100) : null
            const date = new Date(g.created_at).toLocaleDateString()
            return (
              <div key={g.id} className="stats-history-row">
                <div className="stats-history-board">
                  <MiniBoard letters={g.board_letters} boardType={g.board_type} />
                  <span className="stats-history-board-label">{getBoardLabel(g.board_type)}</span>
                </div>
                <div className="stats-history-main">
                  <span className="stats-history-score">{g.score} pts</span>
                  <span className="stats-history-meta">{g.words_count}/{g.total_possible_words ?? '?'} words {pct!=null ? `· ${pct}%` : ''} · {date} {g.is_daily ? '· Daily' : ''}</span>
                  {g.longest_word && <span className="stats-history-longest">{g.longest_word.toUpperCase()} ({g.longest_word_length})</span>}
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
