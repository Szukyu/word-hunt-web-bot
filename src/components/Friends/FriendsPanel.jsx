import { useState, useEffect, useCallback } from 'react'
import { IoPersonAdd, IoCheckmark, IoClose, IoTrash, IoShareSocial, IoCopy, IoRefresh } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import {
  fetchFriendsDetailed,
  fetchIncomingDetailed,
  fetchOutgoingDetailed,
  sendFriendRequestByUsername,
  acceptFriendRequest,
  declineFriendRequest,
  cancelOutgoingRequest,
  removeFriend,
  buildInviteLink,
} from '../../lib/friends'
import { copyToClipboard, shareText } from '../../lib/share'
import './FriendsPanel.css'

function normalize(u) { return String(u ?? '').trim().toLowerCase() }

export default function FriendsPanel() {
  const { user } = useAuth()
  const myUsername = normalize(user?.user_metadata?.username || user?.email?.split('@')[0] || '')

  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [add, setAdd] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [shareState, setShareState] = useState(null)
  const [actionId, setActionId] = useState(null) // which row is busy

  const load = useCallback(async () => {
    if (!user) { setFriends([]); setIncoming([]); setOutgoing([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const [f, inc, out] = await Promise.all([
        fetchFriendsDetailed(),
        fetchIncomingDetailed(),
        fetchOutgoingDetailed(),
      ])
      setFriends(f); setIncoming(inc); setOutgoing(out)
    } catch (e) {
      setError(e.message || 'Failed to load friends')
    } finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  // deep-link ?add=username
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefill = params.get('add')
    if (prefill) setAdd(normalize(prefill))
  }, [])

  // realtime-ish: reload when window regains focus
  useEffect(() => {
    const onFocus = () => { if (user) load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user, load])

  const handleAdd = async (e) => {
    e.preventDefault()
    const u = normalize(add)
    if (!u) return
    if (!user) { setMsg({ type:'err', text:'Sign in to add friends' }); return }
    setAddLoading(true); setMsg(null)
    try {
      await sendFriendRequestByUsername(u)
      setMsg({ type:'ok', text:`Invite sent to ${u}` })
      setAdd('')
      await load()
    } catch (err) {
      setMsg({ type:'err', text: err.message })
    } finally {
      setAddLoading(false)
      setTimeout(()=>setMsg(null), 2800)
    }
  }

  const handleCopyInvite = async () => {
    const link = buildInviteLink(myUsername || 'yourname')
    const ok = await copyToClipboard(link)
    setShareState(ok ? 'Copied!' : 'Failed'); setTimeout(()=>setShareState(null), 1600)
  }
  const handleShareInvite = async () => {
    const link = buildInviteLink(myUsername || 'yourname')
    const text = myUsername ? `Add me on Word Hunt — @${myUsername} — ${link}` : `Join me on Word Hunt — ${link}`
    const res = await shareText(text, 'Word Hunt — Add friend')
    if (res === 'shared' || res === 'copied') { setShareState(res==='copied' ? 'Copied!' : 'Shared!'); setTimeout(()=>setShareState(null), 1600) }
  }

  const withAction = async (id, fn) => {
    setActionId(id); setMsg(null)
    try { await fn(); await load() } catch (e) { setMsg({ type:'err', text:e.message }); setTimeout(()=>setMsg(null), 2500) }
    finally { setActionId(null) }
  }

  return (
    <section className="friends-panel" aria-label="Friends">
      {/* Invite / share card */}
      <div className="friends-invite-card">
        <div className="friends-invite-head">
          <span className="eyebrow">Share</span>
          <h3>Invite friends</h3>
          <p className="friends-hint">Share your username or link. They paste it in <em>Add friend</em>. Supabase-backed — appears in Friends leaderboards.</p>
        </div>
        <div className="friends-invite-body">
          <div className="friends-invite-field">
            <span className="friends-invite-label">Your username</span>
            <span className="friends-invite-value">{myUsername || '— sign in —'}</span>
          </div>
          <div className="friends-invite-field">
            <span className="friends-invite-label">Invite link</span>
            <span className="friends-invite-value mono" title={buildInviteLink(myUsername || 'demo')}>{buildInviteLink(myUsername || 'demo')}</span>
          </div>
          <div className="friends-invite-actions">
            <button className="friends-btn ghost" onClick={handleCopyInvite}><IoCopy /> Copy link</button>
            <button className="friends-btn primary" onClick={handleShareInvite}><IoShareSocial /> {shareState || 'Share'}</button>
          </div>
        </div>
      </div>

      {/* Add friend */}
      <form className="friends-add-row" onSubmit={handleAdd}>
        <div className="friends-add-input-wrap">
          <IoPersonAdd className="friends-add-icon" aria-hidden />
          <input
            className="friends-add-input"
            placeholder="username — e.g. alex_92"
            value={add}
            onChange={(e)=>setAdd(e.target.value)}
            maxLength={20}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            disabled={!user}
          />
        </div>
        <button className="friends-btn primary" type="submit" disabled={!normalize(add) || addLoading || !user}>{addLoading ? '…' : 'Add'}</button>
        <button type="button" className="friends-btn ghost" onClick={load} aria-label="Refresh" title="Refresh"><IoRefresh /></button>
      </form>
      {msg && <div className={`friends-msg ${msg.type}`}>{msg.text}</div>}
      {!user && <div className="friends-notice">Sign in to add friends — invites are stored in Supabase <code>friendships</code>.</div>}
      {error && <div className="friends-notice" style={{borderColor:'var(--danger)', color:'var(--danger)'}}>{error}</div>}

      {user && loading ? (
        <div className="friends-loading"><span className="friends-spinner" aria-hidden /><span className="mono-hint">loading friends</span></div>
      ) : (
        <>
          {/* Friends list */}
          <div className="friends-section">
            <div className="friends-section-head">
              <h4>Friends <span className="friends-count">{friends.length}</span></h4>
              <span className="friends-meta">Supabase · {friends.length ? 'leaderboard-ready' : 'add above'}</span>
            </div>
            {friends.length === 0 ? (
              <div className="friends-empty">
                <span className="friends-empty-title">No friends yet</span>
                <span className="friends-empty-hint">Add by username above. Once accepted, they appear in Daily + Global Friends leaderboards.</span>
              </div>
            ) : (
              <ul className="friends-list">
                {friends.map(f => (
                  <li key={f.id} className="friends-row">
                    <span className="friends-avatar" aria-hidden>{(f.username||'?').slice(0,2).toUpperCase()}</span>
                    <span className="friends-name" title={f.username}>{f.username}</span>
                    {f.display_name && <span className="friends-sub">{f.display_name}</span>}
                    <span className="friends-pill ok">friend</span>
                    <button className="friends-icon-btn danger" onClick={()=>withAction(f.id, ()=>removeFriend(f.id))} disabled={actionId===f.id} aria-label={`Remove ${f.username}`} title="Remove"><IoTrash /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Incoming */}
          {incoming.length > 0 && (
            <div className="friends-section">
              <div className="friends-section-head"><h4>Requests <span className="friends-count">{incoming.length}</span></h4><span className="friends-meta">tap ✓ to accept</span></div>
              <ul className="friends-list">
                {incoming.map(f => (
                  <li key={f.id} className="friends-row pending">
                    <span className="friends-avatar incoming">{(f.username||'?').slice(0,2).toUpperCase()}</span>
                    <span className="friends-name">{f.username}</span>
                    <span className="friends-pill pending">incoming</span>
                    <button className="friends-icon-btn ok" onClick={()=>withAction(f.id, ()=>acceptFriendRequest(f.id))} disabled={actionId===f.id} aria-label={`Accept ${f.username}`}><IoCheckmark /></button>
                    <button className="friends-icon-btn" onClick={()=>withAction(f.id, ()=>declineFriendRequest(f.id))} disabled={actionId===f.id} aria-label={`Decline ${f.username}`}><IoClose /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Outgoing */}
          {outgoing.length > 0 && (
            <div className="friends-section">
              <div className="friends-section-head"><h4>Sent <span className="friends-count">{outgoing.length}</span></h4></div>
              <ul className="friends-list">
                {outgoing.map(f => (
                  <li key={f.id} className="friends-row pending">
                    <span className="friends-avatar outgoing">{(f.username||'?').slice(0,2).toUpperCase()}</span>
                    <span className="friends-name">{f.username}</span>
                    <span className="friends-pill pending">pending</span>
                    <button className="friends-btn small ghost" onClick={()=>withAction(f.id, ()=>cancelOutgoingRequest(f.id))} disabled={actionId===f.id}>Cancel</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="friends-foot-hint">Backed by <code>public.friendships</code> + <code>profiles</code> (RLS). Friends power the Friends tabs in Daily & Global leaderboards (<code>src/lib/friends.js:29</code>).</div>
    </section>
  )
}
