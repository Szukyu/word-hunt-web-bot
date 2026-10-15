import { useState, useEffect, useCallback, useRef } from 'react'
import { IoPersonAdd, IoClose, IoTimer, IoGameController, IoRefresh, IoArrowBack, IoLockClosed, IoShare, IoCopy, IoCheckmarkCircle, IoTime, IoPerson, IoTrophy, IoInformationCircle } from 'react-icons/io5'
import { subscribeToMatch, createMatch, joinMatch, setMatchReady, startMatch, abandonMatch, findQuickMatch, createFriendInvite, acceptFriendInvite, getBoardLabel, formatMatchTime, MATCH_STATUS } from '../../lib/multiplayer'
import { useAuth } from '../../context/AuthContext'
import './MultiplayerLobby.css'

const MultiplayerLobby = ({ onBack, matchId: initialMatchId, inviteCode: initialInviteCode, boardType: initialBoardType, gameTime: initialGameTime, mode: initialMode = 'casual' }) => {
  const { user } = useAuth()
  const [match, setMatch] = useState(null)
  const [players, setPlayers] = useState([])
  const [mySlot, setMySlot] = useState(null)
  const [status, setStatus] = useState('connecting')
  const [countdown, setCountdown] = useState(null)
  const [error, setError] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [inviteCodeInput, setInviteCodeInput] = useState('')

  const countdownRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const myUserIdRef = useRef(user?.id)

  // Initialize: create or join match
  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        let matchId = initialMatchId
        let inviteCode = initialInviteCode

        // If invite code in URL, use it
        if (!matchId && !inviteCode) {
          const params = new URLSearchParams(window.location.search)
          if (params.get('invite')) inviteCode = params.get('invite')
          if (params.get('match')) matchId = params.get('match')
        }

        if (inviteCode) {
          setIsJoining(true)
          matchId = await joinMatch({ inviteCode })
        } else if (matchId) {
          setIsJoining(true)
          await joinMatch({ matchId })
        } else if (initialMode === 'friend') {
          setIsCreating(true)
          const { matchId: newMatchId, inviteCode: newCode } = await createFriendInvite({
            boardType: initialBoardType || 16,
            gameTime: initialGameTime || 90,
          })
          matchId = newMatchId
          inviteCode = newCode
          if (mounted) setShowInvite(true)
        } else if (initialMode === 'quick') {
          setIsCreating(true)
          matchId = await findQuickMatch({ boardType: initialBoardType, gameTime: initialGameTime })
        } else {
          // Default: create casual match
          setIsCreating(true)
          const boardLetters = generateRandomBoard(initialBoardType || 16)
          matchId = await createMatch({
            boardType: initialBoardType || 16,
            boardLetters,
            gameTime: initialGameTime || 60,
            mode: initialMode,
          })
        }

        if (!mounted) return
        await loadMatch(matchId)
        subscribe(matchId)
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to join match')
      } finally {
        if (mounted) {
          setIsCreating(false)
          setIsJoining(false)
        }
      }
    }
    init()
    return () => {
      mounted = false
      if (unsubscribeRef.current) unsubscribeRef.current()
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [initialMatchId, initialInviteCode, initialBoardType, initialGameTime, initialMode])

  const loadMatch = async (matchId) => {
    const { fetchMatch } = await import('../../lib/multiplayer')
    const data = await fetchMatch(matchId)
    if (!data) throw new Error('Match not found')
    setMatch(data)
    setPlayers(data.match_players || [])
    const me = data.match_players?.find(p => p.user_id === myUserIdRef.current)
    if (me) setMySlot(me.slot)
    setStatus(data.status)
    if (data.status === 'countdown') startCountdown(data.started_at)
  }

  const subscribe = (matchId) => {
    unsubscribeRef.current = subscribeToMatch(matchId, {
      onMatchUpdate: (newMatch) => {
        setMatch(newMatch)
        setStatus(newMatch.status)
        if (newMatch.status === 'countdown') startCountdown(newMatch.started_at)
        if (newMatch.status === 'playing') navigateToGame()
      },
      onPlayerUpdate: (player) => {
        setPlayers(prev => prev.map(p => p.id === player.id ? player : p))
        if (player.user_id === myUserIdRef.current) setMySlot(player.slot)
      },
      onPlayerJoin: (player) => {
        setPlayers(prev => [...prev, player])
      },
      onPlayerLeave: (userId) => {
        setPlayers(prev => prev.filter(p => p.user_id !== userId))
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus)
        if (newStatus === 'countdown') startCountdown(match?.started_at)
        if (newStatus === 'playing') navigateToGame()
      },
    })
  }

  const startCountdown = (startedAt) => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    const start = new Date(startedAt).getTime()
    const duration = 3000 // 3 seconds countdown
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000))
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownRef.current)
        setCountdown(null)
      }
    }, 100)
  }

  const navigateToGame = () => {
    if (unsubscribeRef.current) unsubscribeRef.current()
    if (countdownRef.current) clearInterval(countdownRef.current)
    // Navigate to game view - parent will handle routing
    window.dispatchEvent(new CustomEvent('multiplayer:start', { detail: { matchId: match.id } }))
  }

  const handleReady = async () => {
    if (!match) return
    try {
      await setMatchReady(match.id, true)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleUnready = async () => {
    if (!match) return
    try {
      await setMatchReady(match.id, false)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleLeave = async () => {
    if (!match) return onBack()
    if (match.status === 'playing') {
      await abandonMatch(match.id)
    } else {
      // Just leave lobby
      // TODO: call abandonMatch or delete match_players row
    }
    onBack()
  }

  const copyInviteLink = async () => {
    if (!match?.invite_code) return
    const link = `${window.location.origin}?invite=${match.invite_code}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getOpponent = () => players.find(p => p.user_id !== myUserIdRef.current)
  const getMe = () => players.find(p => p.user_id === myUserIdRef.current)
  const isCreator = mySlot === 0
  const bothReady = players.length === 2 && players.every(p => p.is_ready)
  const opponent = getOpponent()
  const me = getMe()

  // Status display helpers
  const statusLabels = {
    waiting: 'Waiting for opponent...',
    ready: bothReady ? 'Both ready! Starting...' : 'Waiting for both players to ready up',
    countdown: `Game starts in ${countdown}...`,
    playing: 'Game in progress...',
    finished: 'Game finished',
    cancelled: 'Match cancelled',
    abandoned: 'Match abandoned',
  }

  if (isCreating || isJoining) {
    return (
      <div className="multiplayer-lobby loading">
        <div className="lobby-spinner" aria-hidden />
        <p>{isCreating ? 'Creating match...' : 'Joining match...'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="multiplayer-lobby error">
        <IoClose className="error-icon" />
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn-primary" onClick={onBack}>Back to Menu</button>
      </div>
    )
  }

  if (!match) return null

  const isFinished = ['finished', 'cancelled', 'abandoned'].includes(status)

  return (
    <section className="multiplayer-lobby">
      <div className="lobby-header">
        <button className="back-button" onClick={handleLeave}>
          <IoArrowBack />
        </button>
        <div className="lobby-title">
          <h2>{mode === 'friend' ? 'Friend Match' : mode === 'quick' ? 'Quick Play' : 'Multiplayer'}</h2>
          <span className="mode-badge">{mode}</span>
        </div>
        <div className="lobby-meta">
          <span className="board-badge">{getBoardLabel(match.board_type)}</span>
          <span className="time-badge"><IoTimer /> {formatMatchTime(match.game_time)}</span>
        </div>
      </div>

      <div className="lobby-content">
        {/* Invite Code Panel */}
        {(mode === 'friend' || status === 'waiting') && match.invite_code && (
          <div className={`invite-panel ${showInvite ? 'open' : ''}`}>
            <div className="invite-header" onClick={() => setShowInvite(!showInvite)}>
              <span>{showInvite ? 'Hide' : 'Share'} Invite Code</span>
              <IoShare />
            </div>
            {showInvite && (
              <div className="invite-body">
                <div className="invite-code-display">
                  <span className="code">{match.invite_code}</span>
                  <button className="copy-btn" onClick={copyInviteLink} title={copied ? 'Copied!' : 'Copy link'}>
                    {copied ? <IoCheckmarkCircle /> : <IoCopy />}
                  </button>
                </div>
                <p className="invite-hint">Send this code to a friend or share the link:</p>
                <div className="invite-link">
                  <input readOnly value={`${window.location.origin}?invite=${match.invite_code}`} />
                  <button onClick={copyInviteLink}>{copied ? 'Copied!' : 'Copy'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Player Slots */}
        <div className="players-area">
          {/* Slot 0 (Creator) */}
          <div className={`player-slot slot-0 ${me?.slot === 0 ? 'me' : ''} ${players.find(p => p.slot === 0) ? 'filled' : 'empty'}`}>
            <div className="slot-label">Host</div>
            {players.find(p => p.slot === 0) ? (
              <div className="player-card">
                <div className="player-avatar">
                  {players[0]?.profiles?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="player-info">
                  <div className="player-name">
                    {players[0]?.profiles?.username || 'Unknown'}
                    {players[0].user_id === myUserIdRef.current && <span className="you-badge">You</span>}
                  </div>
                  <div className="player-status">
                    {status === 'waiting' || status === 'ready' ? (
                      <>
                        <span className={`ready-indicator ${players[0].is_ready ? 'ready' : ''}`} />
                        {players[0].is_ready ? 'Ready' : 'Not ready'}
                      </>
                    ) : (
                      status
                    )}
                  </div>
                </div>
                {me?.slot === 0 && status !== 'playing' && status !== 'finished' && (
                  <button className="ready-btn" onClick={players[0].is_ready ? handleUnready : handleReady}>
                    {players[0].is_ready ? 'Unready' : 'Ready'}
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-slot">
                <IoPersonAdd />
                <span>Waiting for opponent...</span>
              </div>
            )}
          </div>

          {/* Slot 1 (Opponent) */}
          <div className={`player-slot slot-1 ${me?.slot === 1 ? 'me' : ''} ${players.find(p => p.slot === 1) ? 'filled' : 'empty'}`}>
            <div className="slot-label">Opponent</div>
            {players.find(p => p.slot === 1) ? (
              <div className="player-card">
                <div className="player-avatar">
                  {players[1]?.profiles?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="player-info">
                  <div className="player-name">
                    {players[1]?.profiles?.username || 'Unknown'}
                    {players[1].user_id === myUserIdRef.current && <span className="you-badge">You</span>}
                  </div>
                  <div className="player-status">
                    {status === 'waiting' || status === 'ready' ? (
                      <>
                        <span className={`ready-indicator ${players[1].is_ready ? 'ready' : ''}`} />
                        {players[1].is_ready ? 'Ready' : 'Not ready'}
                      </>
                    ) : (
                      status
                    )}
                  </div>
                </div>
                {me?.slot === 1 && status !== 'playing' && status !== 'finished' && (
                  <button className="ready-btn" onClick={players[1].is_ready ? handleUnready : handleReady}>
                    {players[1].is_ready ? 'Unready' : 'Ready'}
                  </button>
                )}
              </div>
            ) : (
              <div className="empty-slot">
                <IoPersonAdd />
                <span>Waiting for opponent...</span>
              </div>
            )}
          </div>
        </div>

        {/* Countdown Overlay */}
        {status === 'countdown' && countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-circle">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="status-message" data-status={status}>
          {statusLabels[status] || status}
        </div>

        {/* Game Info */}
        <div className="game-info">
          <div className="info-row">
            <IoGameController />
            <span>Board: {getBoardLabel(match.board_type)} ({match.board_type} letters)</span>
          </div>
          <div className="info-row">
            <IoTimer />
            <span>Time: {formatMatchTime(match.game_time)}</span>
          </div>
          {match.mode === 'ranked' && (
            <div className="info-row">
              <IoTrophy />
              <span>Ranked Match — ELO changes apply</span>
            </div>
          )}
          {match.mode === 'friend' && (
            <div className="info-row">
              <IoLockClosed />
              <span>Private Match — Invite only</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {status === 'waiting' && isCreator && (
            <button className="btn-secondary" onClick={() => setShowInvite(true)}>
              <IoShare /> Share Invite
            </button>
          )}
          {status === 'waiting' && !isCreator && (
            <button className="btn-secondary" onClick={handleLeave}>
              <IoClose /> Leave Match
            </button>
          )}
          {status === 'ready' && me && !me.is_ready && (
            <button className="btn-primary" onClick={handleReady}>
              <IoCheckmarkCircle /> I'm Ready
            </button>
          )}
          {isFinished && (
            <button className="btn-primary" onClick={onBack}>
              <IoArrowBack /> Back to Menu
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

// Helper (mirror of server)
function generateRandomBoard(boardType) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const FREQ = [0.08167,0.01492,0.02782,0.04253,0.12702,0.02228,0.02015,0.06094,0.06966,0.00153,0.00772,0.04025,0.02406,0.06749,0.07507,0.01929,0.00095,0.05987,0.06327,0.09056,0.02758,0.00978,0.02360,0.00150,0.01974,0.00074]
  const cumulative = []
  let sum = 0
  for (const f of FREQ) { sum += f; cumulative.push(sum) }
  const total = cumulative[cumulative.length - 1]
  let board = ''
  for (let i = 0; i < boardType; i++) {
    const r = Math.random() * total
    const idx = cumulative.findIndex((w) => r <= w)
    board += letters[idx]
  }
  return board
}

export default MultiplayerLobby