import { useState } from 'react'
import { IoPersonCircle, IoStatsChart, IoPeople, IoArrowBack } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import FriendsPanel from '../Friends/FriendsPanel'
import './Stats.css'

function StatTile({ label, value, hint }) {
  return (
    <div className="stats-tile">
      <span className="stats-tile-label">{label}</span>
      <span className="stats-tile-value">{value}</span>
      {hint && <span className="stats-tile-hint">{hint}</span>}
    </div>
  )
}

const Stats = ({ onBack }) => {
  const { user } = useAuth()
  const username = (user?.user_metadata?.username || user?.email?.split('@')[0] || 'guest').toLowerCase()
  const [tab, setTab] = useState('friends') // default to friends so sharing is discoverable

  return (
    <section className="stats-area">
      <div className="stats-header">
        <div className="stats-profile">
          <span className="stats-avatar" aria-hidden><IoPersonCircle /></span>
          <div className="stats-profile-meta">
            <span className="eyebrow">Profile</span>
            <h1 className="stats-username">@{username}</h1>
            <span className="stats-sub">{user ? 'signed in' : 'guest — sign in to save friends'}</span>
          </div>
        </div>
        {onBack && <button className="stats-back" onClick={onBack} aria-label="Back"><IoArrowBack /></button>}
      </div>

      <div className="stats-tabs" role="tablist">
        <button role="tab" aria-selected={tab==='overview'} className={`stats-tab ${tab==='overview'?'active':''}`} onClick={()=>setTab('overview')}>
          <IoStatsChart /> Stats
        </button>
        <button role="tab" aria-selected={tab==='friends'} className={`stats-tab ${tab==='friends'?'active':''}`} onClick={()=>setTab('friends')}>
          <IoPeople /> Friends <span className="stats-tab-badge">UI preview</span>
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="stats-overview">
          <div className="stats-grid">
            <StatTile label="Games" value="—" hint="WIP" />
            <StatTile label="Total pts" value="—" />
            <StatTile label="Avg pts" value="—" />
            <StatTile label="Best game" value="—" />
          </div>
          <div className="stats-wip-card">
            <span className="stats-wip-title">Stats dashboard — WIP</span>
            <span className="stats-wip-hint">Per-profile stats, per-board breakdown, history log, and export will live here. For now use Friends to invite/share. UI only — no Supabase yet.</span>
          </div>

          <div className="stats-section">
            <h3 className="stats-section-title">Recent games</h3>
            <div className="stats-empty">No history yet — play a daily or practice game.</div>
          </div>
        </div>
      ) : (
        <FriendsPanel />
      )}
    </section>
  )
}

export default Stats
