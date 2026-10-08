import { useState, useEffect, useCallback } from 'react'
import MultiplayerLobby from './MultiplayerLobby'
import MultiplayerPlay from './MultiplayerPlay'
import MultiplayerResults from './MultiplayerResults'
import { fetchMatchWithWords } from '../../lib/multiplayer'
import { useAuth } from '../../context/AuthContext'
import './Multiplayer.css'

const Multiplayer = ({ onBack, initialMode = 'casual', initialBoardType, initialGameTime, matchId: urlMatchId, inviteCode: urlInviteCode }) => {
  const { user } = useAuth()
  const [phase, setPhase] = useState('lobby') // 'lobby' | 'playing' | 'results'
  const [matchId, setMatchId] = useState(urlMatchId || null)
  const [inviteCode, setInviteCode] = useState(urlInviteCode || null)
  const [gameResult, setGameResult] = useState(null)
  const [error, setError] = useState(null)

  // Listen for game start event from lobby
  useEffect(() => {
    const handler = (e) => {
      const { matchId: newMatchId } = e.detail
      setMatchId(newMatchId)
      setPhase('playing')
    }
    window.addEventListener('multiplayer:start', handler)
    return () => window.removeEventListener('multiplayer:start', handler)
  }, [])

  const handleLobbyBack = useCallback(() => {
    setPhase('lobby')
    setMatchId(null)
    setInviteCode(null)
    onBack()
  }, [onBack])

  const handleGameEnd = useCallback(async (result) => {
    setGameResult(result)
    setPhase('results')
  }, [])

  const handlePlayAgain = useCallback(() => {
    // For play again, create a new match with same settings
    setPhase('lobby')
    setMatchId(null)
    setGameResult(null)
  }, [])

  const handleResultsBack = useCallback(() => {
    setPhase('lobby')
    setMatchId(null)
    setGameResult(null)
    onBack()
  }, [onBack])

  // If we have a matchId but no phase change happened, we might be rejoining
  useEffect(() => {
    if (matchId && phase === 'lobby') {
      // Check if match is already playing/finished
      const check = async () => {
        try {
          const data = await fetchMatchWithWords(matchId)
          if (data.status === 'playing') {
            setPhase('playing')
          } else if (data.status === 'finished') {
            // Build result from match data
            const me = data.match_players?.find(p => p.user_id === user?.id)
            const opp = data.match_players?.find(p => p.user_id !== user?.id)
            setGameResult({
              score: me?.score || 0,
              foundWords: me?.words_list || [],
              allPossibleWords: [], // Would need solver
              totalPossibleScore: 0,
              boardLetters: data.board_letters,
              boardType: data.board_type,
              gameTime: data.game_time,
              isMultiplayer: true,
              opponentScore: opp?.score || 0,
              opponentWords: opp?.words_list || [],
              winnerId: data.winner_id,
            })
            setPhase('results')
          }
        } catch (e) {
          console.error('Failed to check match status:', e)
        }
      }
      check()
    }
  }, [matchId, phase, user?.id])

  if (error) {
    return (
      <div className="multiplayer-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn-primary" onClick={onBack}>Back to Menu</button>
      </div>
    )
  }

  if (phase === 'lobby') {
    return (
      <MultiplayerLobby
        onBack={handleLobbyBack}
        matchId={matchId}
        inviteCode={inviteCode}
        boardType={initialBoardType}
        gameTime={initialGameTime}
        mode={initialMode}
      />
    )
  }

  if (phase === 'playing') {
    return (
      <MultiplayerPlay
        matchId={matchId}
        onBack={handleLobbyBack}
        onGameEnd={handleGameEnd}
      />
    )
  }

  if (phase === 'results' && gameResult) {
    return (
      <MultiplayerResults
        {...gameResult}
        onPlayAgain={handlePlayAgain}
        onBack={handleResultsBack}
        myUserId={user?.id}
      />
    )
  }

  return null
}

export default Multiplayer