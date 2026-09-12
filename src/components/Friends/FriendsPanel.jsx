import { useState, useEffect } from 'react'
import { IoPersonAdd, IoCheckmark, IoClose, IoTrash, IoShareSocial, IoCopy } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import { loadFriendsUi, addOutgoing, cancelOutgoing, acceptIncoming, declineIncoming, removeFriend, buildInviteLink } from '../../lib/friendsUi'
import { copyToClipboard, shareText } from '../../lib/share'
import './FriendsPanel.css'

function normalize(u) { return String(u ?? '').trim().toLowerCase() }

export default function FriendsPanel() {
  const { user } = useAuth()
  const myUsername = normalize(user?.user_metadata?.username || user?.email?.split('@')[0] || '')
  const [data, setData] = useState(() => loadFriendsUi())
  const [add, setAdd] = useState('')
  const [msg, setMsg] = useState(null) // {type:'ok'|'err', text}
  const [shareState, setShareState] = useState(null)

  // reload if another tab changed storage
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'wh:friends_ui:v1') setData(loadFriendsUi()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // handle ?add=username deep-link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const prefill = params.get('add')
    if (prefill) setAdd(normalize(prefill))
  }, [])

  const refresh = () => setData(loadFriendsUi())

  const handleAdd = (e) => {
    e.preventDefault()
    const u = normalize(add)
    if (!u) return
    if (!user) { setMsg({ type:'err', text:'Sign in to add friends' }); return }
    if (u.length < 3 || u.length > 20) { setMsg({ type:'err', text:'Username 3–20 chars' }); return }
    if (!/^[a-z0-9_]+$/.test(u)) { setMsg({ type:'err', text:'Only letters, numbers, _' }); return }
    if (u === myUsername) { setMsg({ type:'err', text:"Can't add yourself" }); return }
    const all = new Set([...data.friends.map(f=>f.username), ...data.incoming.map(f=>f.username), ...data.outgoing.map(f=>f.username)])
    if (all.has(u)) { setMsg({ type:'err', text:'Already in list' }); return }
    addOutgoing(u); refresh()
    setMsg({ type:'ok', text:`Invite sent to ${u}` }); setAdd('')
    setTimeout(()=>setMsg(null), 2200)
  }

  const handleCopyInvite = async () => {
    const link = buildInviteLink(myUsername || 'yourname')
    const ok = await copyToClipboard(link)
    setShareState(ok ? 'Copied!' : 'Failed')
    setTimeout(()=>setShareState(null), 1500)
  }
  const handleShareInvite = async () => {
    const link = buildInviteLink(myUsername || 'yourname')
    const text = myUsername ? `Add me on Word Hunt — ${myUsername} — ${link}` : `Join me on Word Hunt — ${link}`
    const res = await shareText(text, 'Word Hunt — Add friend')
    if (res === 'shared' || res === 'copied') { setShareState(res==='copied' ? 'Copied!' : 'Shared!'); setTimeout(()=>setShareState(null), 1500) }
  }

  const handleAccept = (id) => { acceptIncoming(id); refresh() }
  const handleDecline = (id) => { declineIncoming(id); refresh() }
  const handleCancel = (id) => { cancelOutgoing(id); refresh() }
  const handleRemove = (id) => { removeFriend(id); refresh() }

  return (
    <section className="friends-panel" aria-label="Friends">
      {/* Invite / share card */}
      <div className="friends-invite-card">
        <div className="friends-invite-head">
          <span className="eyebrow">Share</span>
          <h3>Invite friends</h3>
          <p className="friends-hint">Share your username or link. They paste it in <em>Add friend</em>. No Supabase — UI preview only.</p>
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
          />
        </div>
        <button className="friends-btn primary" type="submit" disabled={!normalize(add)}>Add</button>
      </form>
      {msg && <div className={`friends-msg ${msg.type}`}>{msg.text}</div>}
      {!user && <div className="friends-notice">Sign in to add friends. Adds are stored locally (mock) — no Supabase call.</div>}

      {/* Friends list */}
      <div className="friends-section">
        <div className="friends-section-head">
          <h4>Friends <span className="friends-count">{data.friends.length}</span></h4>
          <span className="friends-meta">mock · localStorage only</span>
        </div>
        {data.friends.length === 0 ? (
          <div className="friends-empty">
            <span className="friends-empty-title">No friends yet</span>
            <span className="friends-empty-hint">Add by username above. Friend leaderboard and daily compare will appear here.</span>
          </div>
        ) : (
          <ul className="friends-list">
            {data.friends.map(f => (
              <li key={f.id} className="friends-row">
                <span className="friends-avatar" aria-hidden>{f.username.slice(0,2).toUpperCase()}</span>
                <span className="friends-name">{f.username}</span>
                <span className="friends-pill ok">friend</span>
                <button className="friends-icon-btn danger" onClick={()=>handleRemove(f.id)} aria-label={`Remove ${f.username}`} title="Remove"><IoTrash /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Incoming */}
      {data.incoming.length > 0 && (
        <div className="friends-section">
          <div className="friends-section-head"><h4>Requests <span className="friends-count">{data.incoming.length}</span></h4></div>
          <ul className="friends-list">
            {data.incoming.map(f => (
              <li key={f.id} className="friends-row pending">
                <span className="friends-avatar incoming">{f.username.slice(0,2).toUpperCase()}</span>
                <span className="friends-name">{f.username}</span>
                <span className="friends-pill pending">incoming</span>
                <button className="friends-icon-btn ok" onClick={()=>handleAccept(f.id)} aria-label={`Accept ${f.username}`}><IoCheckmark /></button>
                <button className="friends-icon-btn" onClick={()=>handleDecline(f.id)} aria-label={`Decline ${f.username}`}><IoClose /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Outgoing */}
      {data.outgoing.length > 0 && (
        <div className="friends-section">
          <div className="friends-section-head"><h4>Sent <span className="friends-count">{data.outgoing.length}</span></h4></div>
          <ul className="friends-list">
            {data.outgoing.map(f => (
              <li key={f.id} className="friends-row pending">
                <span className="friends-avatar outgoing">{f.username.slice(0,2).toUpperCase()}</span>
                <span className="friends-name">{f.username}</span>
                <span className="friends-pill pending">pending</span>
                <button className="friends-btn small ghost" onClick={()=>handleCancel(f.id)}>Cancel</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="friends-foot-hint">UI preview only — invites don’t hit Supabase. When backend is wired, this list will sync to <code>friendships</code> and power the Friends leaderboards.</div>
    </section>
  )
}
