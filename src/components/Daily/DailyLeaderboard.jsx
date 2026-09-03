import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  fetchDailyLeaderboard,
  fetchFriendsDailyLeaderboard,
  fetchMyDailyRank,
  fetchMyDailyEntry,
} from '../../lib/daily'
import { fetchFriendIdsWithSelf, fetchFriendIds } from '../../lib/friends'
import './DailyLeaderboard.css'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="lb-rank-badge" title="1st">🥇</span>
  if (rank === 2) return <span className="lb-rank-badge" title="2nd">🥈</span>
  if (rank === 3) return <span className="lb-rank-badge" title="3rd">🥉</span>
  return <span className="lb-rank-num">#{rank}</span>
}

const DailyLeaderboard = ({ puzzleDate, boardType }) => {
  const { user } = useAuth()
  const [tab, setTab] = useState('global')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [myRank, setMyRank] = useState(null)
  const [myEntry, setMyEntry] = useState(null)
  const [friendCount, setFriendCount] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let rows = []
      let rank = null
      let me = null

      if (tab === 'global') {
        rows = await fetchDailyLeaderboard(puzzleDate, boardType, 50)
        setEntries(rows)
        if (user?.id) {
          try {
            me = await fetchMyDailyEntry(puzzleDate, boardType)
            setMyEntry(me)
            if (me) {
              const inList = rows.some((r) => r.user_id === user.id)
              rank = inList ? rows.find((r) => r.user_id === user.id)?.rank : await fetchMyDailyRank(puzzleDate, boardType, me.score, null)
            }
          } catch { /* ignore */ }
        } else setMyEntry(null)
        setMyRank(rank)
        setFriendCount(null)
      } else {
        if (!user?.id) {
          setEntries([])
          setMyRank(null)
          setMyEntry(null)
          setFriendCount(0)
          setLoading(false)
          return
        }
        const idsWithSelf = await fetchFriendIdsWithSelf()
        const friendOnly = await fetchFriendIds()
        setFriendCount(friendOnly.length)
        if (idsWithSelf.length === 0) {
          setEntries([])
          setMyRank(null)
          setMyEntry(null)
          setLoading(false)
          return
        }
        rows = await fetchFriendsDailyLeaderboard(puzzleDate, boardType, idsWithSelf, 50)
        setEntries(rows)
        try {
          me = await fetchMyDailyEntry(puzzleDate, boardType)
          setMyEntry(me)
          if (me) {
            const inList = rows.some((r) => r.user_id === user.id)
            rank = inList ? rows.find((r) => r.user_id === user.id)?.rank : await fetchMyDailyRank(puzzleDate, boardType, me.score, idsWithSelf)
          }
        } catch { /* ignore */ }
        setMyRank(rank)
      }
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [puzzleDate, boardType, tab, user?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { setTab('global') }, [puzzleDate, boardType])

  const currentUserId = user?.id || null
  const showMyFooter = myEntry && myRank != null && !entries.some((r) => r.user_id === currentUserId)
  const isEmpty = !loading && !error && entries.length === 0

  return (
    <section className="lb-card" aria-label="Leaderboard">
      <div className="lb-tabs-row">
        <div className="lb-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'global'} className={`lb-tab ${tab === 'global' ? 'active' : ''}`} onClick={() => setTab('global')}>Global</button>
          <button role="tab" aria-selected={tab === 'friends'} className={`lb-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>Friends</button>
        </div>
        <button className="lb-refresh" onClick={load} disabled={loading} aria-label="Refresh">↻</button>
      </div>

      {tab === 'friends' && !user && <div className="lb-empty"><p>Sign in to view friends</p></div>}
      {tab === 'friends' && user && friendCount === 0 && !loading && !error && <div className="lb-empty"><p>No friends yet</p></div>}

      {loading && <div className="lb-loading"><span className="lb-spinner" aria-hidden /><span className="mono-hint">loading</span></div>}
      {error && !loading && <div className="lb-error"><span className="mono-hint">{error}</span><button className="retry-button" onClick={load}>retry</button></div>}

      {!loading && !error && !(tab === 'friends' && !user) && !(tab === 'friends' && friendCount === 0) && (
        <>
          {isEmpty ? (
            <div className="lb-empty"><p>No scores yet</p></div>
          ) : (
            <ol className="lb-list">
              {entries.map((row) => {
                const isMe = currentUserId && row.user_id === currentUserId
                return (
                  <li key={row.user_id} className={`lb-row ${isMe ? 'is-me' : ''}`}>
                    <span className="lb-rank"><RankBadge rank={row.rank} /></span>
                    <span className="lb-user">
                      <span className="lb-username">{row.username}</span>
                      {isMe && <span className="lb-you-badge">you</span>}
                    </span>
                    <span className="lb-score">{row.score}</span>
                  </li>
                )
              })}
            </ol>
          )}
          {showMyFooter && myEntry && (
            <div className="lb-my-rank"><span>#{myRank}</span><span>{myEntry.score} pts</span></div>
          )}
        </>
      )}
    </section>
  )
}

export default DailyLeaderboard
