import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchGlobalLeaderboard, fetchMyGlobalRank, fetchMyBestGame, BOARD_LABELS } from '../../lib/leaderboard'
import { fetchFriendIdsWithSelf, fetchFriendIds, sendFriendRequest, lookupUserByUsername, fetchPendingRequests } from '../../lib/friends'
import './Leaderboard.css'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="gb-rank-badge">🥇</span>
  if (rank === 2) return <span className="gb-rank-badge">🥈</span>
  if (rank === 3) return <span className="gb-rank-badge">🥉</span>
  return <span className="gb-rank-num">#{rank}</span>
}

const PERIODS = [
  { id: 'all', label: 'All-time' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'daily', label: 'Daily' },
]

const BOARDS = [
  { id: null, label: 'All' },
  { id: 16, label: '4×4' },
  { id: 20, label: 'Donut' },
  { id: 21, label: 'X' },
  { id: 25, label: '5×5' },
]

const Leaderboard = ({ onBack }) => {
  const { user } = useAuth()
  const [period, setPeriod] = useState('all')
  const [scope, setScope] = useState('global')
  const [board, setBoard] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [myRank, setMyRank] = useState(null)
  const [myBest, setMyBest] = useState(null)
  const [friendCount, setFriendCount] = useState(null)

  // friends add
  const [addInput, setAddInput] = useState('')
  const [addMsg, setAddMsg] = useState(null)
  const [addLoading, setAddLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let friendIds = null
      if (scope === 'friends') {
        if (!user?.id) {
          setEntries([])
          setFriendCount(0)
          setMyRank(null)
          setMyBest(null)
          setLoading(false)
          return
        }
        friendIds = await fetchFriendIdsWithSelf()
        const onlyFriends = await fetchFriendIds()
        setFriendCount(onlyFriends.length)
      } else {
        setFriendCount(null)
      }

      const rows = await fetchGlobalLeaderboard({ boardType: board, period, limit: 50, friendIds })
      setEntries(rows)

      if (user?.id) {
        try {
          const best = await fetchMyBestGame({ boardType: board, period })
          setMyBest(best)
          if (best) {
            const inList = rows.some((r) => r.user_id === user.id)
            if (inList) setMyRank(rows.find((r) => r.user_id === user.id)?.rank ?? null)
            else setMyRank(await fetchMyGlobalRank({ boardType: board, period, myScore: best.score, friendIds }))
          } else {
            setMyRank(null)
          }
        } catch { /* ignore */ }
      } else {
        setMyBest(null)
        setMyRank(null)
      }
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period, scope, board, user?.id])

  useEffect(() => { load() }, [load])

  const handleAddFriend = async (e) => {
    e.preventDefault()
    const u = addInput.trim().toLowerCase()
    if (!u) return
    setAddLoading(true)
    setAddMsg(null)
    try {
      if (!user) throw new Error('Sign in first')
      if (u === user.email?.split('@')[0]) throw new Error("Can't add yourself")
      const profile = await lookupUserByUsername(u)
      if (!profile) throw new Error('User not found')
      await sendFriendRequest(profile.id)
      setAddMsg({ type: 'ok', text: `Request sent to ${profile.username}` })
      setAddInput('')
    } catch (err) {
      setAddMsg({ type: 'err', text: err.message })
    } finally {
      setAddLoading(false)
    }
  }

  const isFriendsEmpty = scope === 'friends' && user && friendCount === 0
  const isFriendsAnon = scope === 'friends' && !user
  const currentUserId = user?.id || null
  const showMyFooter = myBest && myRank != null && !entries.some((r) => r.user_id === currentUserId)
  const isEmpty = !loading && !error && entries.length === 0 && !isFriendsAnon && !isFriendsEmpty

  return (
    <section className="gb-area">
      <div className="gb-header">
        <div>
          <span className="eyebrow">Leaderboards</span>
          <h1>Leaderboards</h1>
        </div>
        {onBack && <button className="gb-back" onClick={onBack}>←</button>}
      </div>

      <div className="gb-controls">
        <div className="gb-tabs" role="tablist">
          {PERIODS.map((p) => (
            <button key={p.id} role="tab" aria-selected={period === p.id} className={`gb-tab ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
        <div className="gb-tabs" role="tablist">
          <button role="tab" aria-selected={scope === 'global'} className={`gb-tab ${scope === 'global' ? 'active' : ''}`} onClick={() => setScope('global')}>Global</button>
          <button role="tab" aria-selected={scope === 'friends'} className={`gb-tab ${scope === 'friends' ? 'active' : ''}`} onClick={() => setScope('friends')}>Friends</button>
        </div>
        <div className="gb-board-filter">
          {BOARDS.map((b) => (
            <button key={String(b.id)} className={`gb-board-pill ${board === b.id ? 'active' : ''}`} onClick={() => setBoard(b.id)}>{b.label}</button>
          ))}
        </div>
      </div>

      {scope === 'friends' && (
        <form className="gb-add-row" onSubmit={handleAddFriend}>
          <input className="gb-add-input" placeholder="username" value={addInput} onChange={(e) => setAddInput(e.target.value)} maxLength={20} spellCheck={false} />
          <button className="gb-add-btn" type="submit" disabled={addLoading || !addInput.trim()}>{addLoading ? '…' : 'Add'}</button>
          {addMsg && <span className={`gb-add-msg ${addMsg.type}`}>{addMsg.text}</span>}
        </form>
      )}

      {loading && <div className="gb-state"><span className="gb-spinner" /><span className="mono-hint">loading</span></div>}
      {error && !loading && <div className="gb-state"><span className="mono-hint">{error}</span><button className="retry-button" onClick={load}>retry</button></div>}
      {isFriendsAnon && !loading && <div className="gb-state"><p>Sign in to view friends</p></div>}
      {isFriendsEmpty && !loading && !error && <div className="gb-state"><p>No friends yet</p><span className="mono-hint">Add by username above</span></div>}

      {!loading && !error && !isFriendsAnon && !isFriendsEmpty && (
        <>
          {isEmpty ? (
            <div className="gb-state"><p>No scores yet</p></div>
          ) : (
            <ol className="gb-list">
              {entries.map((row) => {
                const isMe = currentUserId && row.user_id === currentUserId
                return (
                  <li key={row.id || row.user_id} className={`gb-row ${isMe ? 'is-me' : ''}`}>
                    <span className="gb-rank"><RankBadge rank={row.rank} /></span>
                    <span className="gb-user">
                      <span className="gb-username">{row.username}</span>
                      {isMe && <span className="gb-you-badge">you</span>}
                    </span>
                    <span className="gb-meta">{row.board_type ? BOARD_LABELS[row.board_type] ?? row.board_type : ''}</span>
                    <span className="gb-score">{row.score}</span>
                  </li>
                )
              })}
            </ol>
          )}
          {showMyFooter && myBest && (
            <div className="gb-my-rank"><span>#{myRank}</span><span>{myBest.score} pts · {BOARD_LABELS[myBest.board_type] ?? ''}</span></div>
          )}
        </>
      )}
    </section>
  )
}

export default Leaderboard
