import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { POINTS } from '../../data/points'
import Board from '../Boards/Board'
import Boarder from '../Boards/Boarder'
import Donut from '../Boards/Donut'
import X from '../Boards/X'
import List from '../List/List'
import { IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh, IoClose, IoFlag, IoPerson, IoTrophy, IoEye, IoEyeOff } from 'react-icons/io5'
import useTimer from '../../hooks/timer'
import { useBoard } from '../../hooks/board'
import { useKeyboardInput } from '../../hooks/keyboardInput'
import { submitMatchWord, finishMatch, subscribeToMatch, subscribeToMatchWords, fetchMatchWithWords, MATCH_STATUS } from '../../lib/multiplayer'
import { useAuth } from '../../context/AuthContext'
import './MultiplayerPlay.css'

const BOARD_CONFIG = {
  16: { name: '4×4 Grid', component: Board },
  20: { name: 'Donut Ring', component: Donut },
  21: { name: 'X Shape', component: X },
  25: { name: '5×5 Grid', component: Boarder },
}

const MultiplayerPlay = ({ matchId, onBack, onGameEnd }) => {
  const { user } = useAuth()
  const myUserId = user?.id

  const { secondsLeft, elapsed, isUntimed, isRunning, start, pause } = useTimer()
  const isZen = false // Multiplayer is never zen
  const isRunningRef = useRef(isRunning)
  const hasStartedRef = useRef(false)
  const [selectedTiles, setSelectedTiles] = useState([])
  const [foundWords, setFoundWords] = useState([])
  const [currentWord, setCurrentWord] = useState('')
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const [allPossibleWords, setAllPossibleWords] = useState([])
  const [totalPossibleScore, setTotalPossibleScore] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Opponent state
  const [opponentScore, setOpponentScore] = useState(0)
  const [opponentWordsCount, setOpponentWordsCount] = useState(0)
  const [opponentWords, setOpponentWords] = useState([])
  const [opponentConnected, setOpponentConnected] = useState(true)
  const [matchStatus, setMatchStatus] = useState(MATCH_STATUS.PLAYING)
  const [matchData, setMatchData] = useState(null)

  // Refs for touch handlers
  const isDraggingRef = useRef(isDragging)
  const selectedTilesRef = useRef(selectedTiles)
  const currentWordRef = useRef(currentWord)
  const foundWordsRef = useRef(foundWords)
  const gameOverRef = useRef(gameOver)
  const opponentWordsRef = useRef(opponentWords)
  const submittingRef = useRef(false)
  const matchDataRef = useRef(matchData)
  const unsubscribeMatchRef = useRef(null)
  const unsubscribeWordsRef = useRef(null)

  useEffect(() => { isDraggingRef.current = isDragging }, [isDragging])
  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])
  useEffect(() => { selectedTilesRef.current = selectedTiles }, [selectedTiles])
  useEffect(() => { currentWordRef.current = currentWord }, [currentWord])
  useEffect(() => { foundWordsRef.current = foundWords }, [foundWords])
  useEffect(() => { gameOverRef.current = gameOver }, [gameOver])
  useEffect(() => { opponentWordsRef.current = opponentWords }, [opponentWords])
  useEffect(() => { matchDataRef.current = matchData }, [matchData])

  // Board setup from match data
  const [boardLetters, setBoardLetters] = useState('')
  const [boardType, setBoardType] = useState(16)
  const [gameTime, setGameTime] = useState(60)

  const { adjacencyMap, generateRandomBoard, getValidWords, setBoard } = useBoard(boardType, null, null, boardLetters)

  const adjacencyMapRef = useRef(adjacencyMap)
  const boardLettersRef = useRef(boardLetters)

  useEffect(() => { adjacencyMapRef.current = adjacencyMap }, [adjacencyMap])
  useEffect(() => { boardLettersRef.current = boardLetters }, [boardLetters])

  // Load match and subscribe
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await fetchMatchWithWords(matchId)
        if (!mounted) return
        setMatchData(data)
        setBoardLetters(data.board_letters)
        setBoardType(data.board_type)
        setGameTime(data.game_time)
        setMatchStatus(data.status)

        // Find my slot and opponent
        const me = data.match_players?.find(p => p.user_id === myUserId)
        const opp = data.match_players?.find(p => p.user_id !== myUserId)
        if (me) {
          setScore(me.score || 0)
          setFoundWords(me.words_list || [])
        }
        if (opp) {
          setOpponentScore(opp.live_score || opp.score || 0)
          setOpponentWordsCount(opp.live_words_count || opp.words_found || 0)
          setOpponentWords(opp.words_list || [])
        }

        // Subscribe to live updates
        unsubscribeMatchRef.current = subscribeToMatch(matchId, {
          onMatchUpdate: (m) => {
            setMatchStatus(m.status)
            if (m.status === 'finished' && !gameOverRef.current) {
              handleGameFinish()
            }
          },
          onPlayerUpdate: (p) => {
            if (p.user_id !== myUserId) {
              setOpponentScore(p.live_score || 0)
              setOpponentWordsCount(p.live_words_count || 0)
              setOpponentWords(p.words_list || [])
            }
          },
        })

        unsubscribeWordsRef.current = subscribeToMatchWords(matchId, (word) => {
          if (word.user_id !== myUserId) {
            // Opponent found a word - add to their list (for ghost display)
            setOpponentWords(prev => [...prev, { word: word.word, score: word.score, pos: word.pos, found_at: word.found_at }])
          }
        })

        // Start timer
        start(data.game_time)
      } catch (e) {
        console.error('Failed to load match:', e)
      }
    }
    load()
    return () => {
      mounted = false
      if (unsubscribeMatchRef.current) unsubscribeMatchRef.current()
      if (unsubscribeWordsRef.current) unsubscribeWordsRef.current()
      pause()
    }
  }, [matchId])

  useEffect(() => {
    if (isRunning) hasStartedRef.current = true
  }, [isRunning])

  const calculateScore = (length) => {
    if (length < 3 || length > 10) return 0
    return POINTS[length - 3]
  }

  const completeGame = useCallback(async (finalScore, finalFoundWords, effectiveTime) => {
    const allWords = getValidWords()
    const wordsWithScores = allWords
      .map(word => ({ word, score: calculateScore(word.length) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.word.localeCompare(b.word)
      })

    const total = wordsWithScores.reduce((sum, w) => sum + w.score, 0)
    setAllPossibleWords(wordsWithScores)
    setTotalPossibleScore(total)

    // Call finishMatch on server
    try {
      await finishMatch(matchId)
    } catch (e) {
      console.warn('finishMatch failed:', e)
    }

    onGameEnd?.({
      score: finalScore,
      foundWords: finalFoundWords,
      allPossibleWords: wordsWithScores,
      totalPossibleScore: total,
      boardLetters,
      boardType,
      gameTime: effectiveTime,
      isMultiplayer: true,
      opponentScore,
      opponentWords: opponentWordsRef.current,
    })
  }, [matchId, boardLetters, boardType, getValidWords, onGameEnd, opponentScore])

  // Game Over - timer hit zero
  useEffect(() => {
    if (secondsLeft === 0 && boardLetters && !gameOver && hasStartedRef.current) {
      setGameOver(true)
      pause()
      const t = setTimeout(() => {
        completeGame(score, foundWords, gameTime)
      }, 50)
      return () => clearTimeout(t)
    }
  }, [secondsLeft, boardLetters, gameOver, gameTime, completeGame, score, foundWords])

  // Handle opponent finish / match finish from server
  const handleGameFinish = useCallback(async () => {
    if (gameOverRef.current) return
    setGameOver(true)
    pause()

    // Fetch final results
    try {
      const data = await fetchMatchWithWords(matchId)
      const me = data.match_players?.find(p => p.user_id === myUserId)
      const opp = data.match_players?.find(p => p.user_id !== myUserId)

      const allWords = getValidWords()
      const wordsWithScores = allWords
        .map(word => ({ word, score: calculateScore(word.length) }))
        .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
      const total = wordsWithScores.reduce((sum, w) => sum + w.score, 0)

      setAllPossibleWords(wordsWithScores)
      setTotalPossibleScore(total)

      onGameEnd?.({
        score: me?.score || 0,
        foundWords: me?.words_list || [],
        allPossibleWords: wordsWithScores,
        totalPossibleScore: total,
        boardLetters,
        boardType,
        gameTime,
        isMultiplayer: true,
        opponentScore: opp?.score || 0,
        opponentWords: opp?.words_list || [],
        winnerId: data.winner_id,
      })
    } catch (e) {
      console.error('Failed to fetch final results:', e)
      completeGame(score, foundWords, gameTime)
    }
  }, [matchId, myUserId, boardLetters, boardType, gameTime, getValidWords, onGameEnd, completeGame, score, foundWords])

  // Clear Message on New Word
  useEffect(() => {
    if (currentWord.length > 0 && message) {
      setMessage(null)
    }
  }, [currentWord, message])

  const handleClear = useCallback(() => {
    selectedTilesRef.current = []
    currentWordRef.current = ''
    setSelectedTiles([])
    setCurrentWord('')
    setMessage(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    const word = currentWordRef.current
    const tiles = selectedTilesRef.current

    if (submittingRef.current) return
    if (!word || word.length === 0) return
    if (gameOverRef.current || !isRunningRef.current) return

    if (word.length < 3) {
      setMessage({ type: 'error', text: 'Too Short' })
      handleClear()
      setTimeout(() => setMessage(null), 1200)
      return
    }

    const wordLower = word.toLowerCase()
    if (foundWordsRef.current.some(w => w.word.toLowerCase() === wordLower)) {
      setMessage({ type: 'error', text: 'Already Found' })
      handleClear()
      setTimeout(() => setMessage(null), 1200)
      return
    }

    submittingRef.current = true
    setIsValidating(true)

    setTimeout(async () => {
      try {
        const result = await submitMatchWord(matchId, word, tiles)

        if (result.ok) {
          const wordScore = result.score
          setFoundWords(prev => [...prev, { word: result.word, pos: [...tiles], score: wordScore }])
          setScore(prev => prev + wordScore)
          setMessage({ type: 'success', text: `+${wordScore} points!` })
        } else {
          setMessage({ type: 'error', text: result.error || 'Invalid word' })
        }
      } catch (e) {
        setMessage({ type: 'error', text: e.message || 'Submission failed' })
      } finally {
        handleClear()
        setIsValidating(false)
        submittingRef.current = false
        setTimeout(() => setMessage(null), 1200)
      }
    }, 100)
  }, [matchId, handleClear])

  const isAdjacent = useCallback(
    (lastTile, newTile) => adjacencyMapRef.current[lastTile]?.includes(newTile) ?? false,
    []
  )

  const handleTileClick = useCallback((index) => {
    if (gameOverRef.current || !isRunningRef.current) return
    const letters = boardLettersRef.current
    if (!letters) return
    const letter = letters[index]?.toUpperCase()
    if (!letter) return
    const currentSelected = selectedTilesRef.current

    if (currentSelected.includes(index)) {
      if (currentSelected[currentSelected.length - 1] === index) {
        const nextTiles = currentSelected.slice(0, -1)
        const nextWord = currentWordRef.current.slice(0, -1)
        selectedTilesRef.current = nextTiles
        currentWordRef.current = nextWord
        setSelectedTiles(nextTiles)
        setCurrentWord(nextWord)
      }
      return
    }
    if (currentSelected.length > 0 && !isAdjacent(currentSelected[currentSelected.length - 1], index)) return
    const nextTiles = [...currentSelected, index]
    const nextWord = currentWordRef.current + letter
    selectedTilesRef.current = nextTiles
    currentWordRef.current = nextWord
    setSelectedTiles(nextTiles)
    setCurrentWord(nextWord)
    setMessage(null)
  }, [isAdjacent])

  const processTileMove = useCallback((tileIndex) => {
    const currentSelected = selectedTilesRef.current
    const currentWordStr = currentWordRef.current
    const adjMap = adjacencyMapRef.current
    const letters = boardLettersRef.current
    if (!letters || tileIndex < 0 || tileIndex >= letters.length) return

    if (currentSelected.includes(tileIndex)) {
      const idx = currentSelected.indexOf(tileIndex)
      if (idx !== currentSelected.length - 1) {
        const nextTiles = currentSelected.slice(0, idx + 1)
        const nextWord = currentWordStr.slice(0, idx + 1)
        selectedTilesRef.current = nextTiles
        currentWordRef.current = nextWord
        setSelectedTiles(nextTiles)
        setCurrentWord(nextWord)
      }
      return
    }

    const lastTile = currentSelected[currentSelected.length - 1]
    if (currentSelected.length > 0 && !adjMap[lastTile]?.includes(tileIndex)) return

    const nextTiles = [...currentSelected, tileIndex]
    const nextWord = currentWordStr + letters[tileIndex].toUpperCase()
    selectedTilesRef.current = nextTiles
    currentWordRef.current = nextWord
    setSelectedTiles(nextTiles)
    setCurrentWord(nextWord)
  }, [])

  const startDrag = useCallback((index, e) => {
    if (e) {
      e.preventDefault?.()
      try { e.currentTarget?.setPointerCapture?.(e.pointerId) } catch (_e) { void _e }
    }
    if (gameOverRef.current || !isRunningRef.current) return
    const letters = boardLettersRef.current
    if (!letters || index < 0 || index >= letters.length) return
    const letter = letters[index].toUpperCase()
    const nextTiles = [index]
    const nextWord = letter
    isDraggingRef.current = true
    selectedTilesRef.current = nextTiles
    currentWordRef.current = nextWord
    setIsDragging(true)
    setSelectedTiles(nextTiles)
    setCurrentWord(nextWord)
    setMessage(null)
  }, [])

  const handleTileMouseDown = useCallback((index, e) => startDrag(index, e), [startDrag])
  const handleTilePointerDown = useCallback((index, e) => startDrag(index, e), [startDrag])
  const handleTileTouchStart = useCallback((index, e) => startDrag(index, e), [startDrag])

  const handleTileMouseEnter = useCallback((index) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return
    processTileMove(index)
  }, [processTileMove])

  const handleGlobalMove = useCallback((clientX, clientY) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return
    const element = document.elementFromPoint(clientX, clientY)
    if (!element) return
    const tileEl = element.closest('[data-index]')
    if (!tileEl) return
    const idx = parseInt(tileEl.dataset.index, 10)
    if (Number.isNaN(idx)) return
    processTileMove(idx)
  }, [processTileMove])

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    if (e.buttons === 0) return
    handleGlobalMove(e.clientX, e.clientY)
  }, [handleGlobalMove])

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    handleGlobalMove(e.clientX, e.clientY)
  }, [handleGlobalMove])

  const handleTouchMove = useCallback((e) => {
    if (!isDraggingRef.current || gameOverRef.current || !isRunningRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    handleGlobalMove(touch.clientX, touch.clientY)
  }, [handleGlobalMove])

  const handleDragEnd = useCallback((e) => {
    if (e) e.preventDefault?.()
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    if (currentWordRef.current.length >= 3) {
      handleSubmit()
    } else {
      handleClear()
    }
  }, [handleSubmit, handleClear])

  const handleMouseUp = useCallback((e) => handleDragEnd(e), [handleDragEnd])
  const handleTouchEnd = useCallback((e) => handleDragEnd(e), [handleDragEnd])
  const handlePointerUp = useCallback((e) => handleDragEnd(e), [handleDragEnd])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [handleMouseMove, handlePointerMove])

  useEffect(() => {
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false })
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [handleTouchMove, handleTouchEnd])

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [handleMouseUp, handlePointerUp])

  useKeyboardInput({
    boardLetters,
    adjacencyMap,
    selectedTiles,
    currentWord,
    setSelectedTiles,
    setCurrentWord,
    setMessage,
    gameOver,
    isRunning,
    onSubmit: handleSubmit,
    onClear: handleClear,
    submittingRef
  })

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  const renderInteractiveBoard = () => {
    if (!boardLetters) return null
    const BoardComponent = BOARD_CONFIG[boardLetters.length]?.component

    if (!BoardComponent) {
      const letters = boardLetters.split('').map(l => l.toUpperCase())
      const size = Math.sqrt(letters.length)
      const rows = []
      for (let i = 0; i < size; i++) {
        const rowTiles = []
        for (let j = 0; j < size; j++) {
          const index = i * size + j
          const isSelected = selectedTiles.includes(index)
          rowTiles.push(
            <button
              key={index}
              className={`play-tile ${isSelected ? 'selected' : ''}`}
              onClick={() => handleTileClick(index)}
              onPointerDown={(e) => handleTilePointerDown(index, e)}
              onMouseDown={(e) => { e.preventDefault(); handleTileMouseDown(index, e) }}
              onPointerEnter={() => handleTileMouseEnter(index)}
              onMouseEnter={() => handleTileMouseEnter(index)}
              onTouchStart={(e) => handleTileTouchStart(index, e)}
              onDragStart={(e) => e.preventDefault()}
              draggable={false}
              data-index={index}
              disabled={gameOver || !isRunning}
              style={{ touchAction: 'none' }}
            >
              {letters[index]}
            </button>
          )
        }
        rows.push(<div key={i} className="board-row">{rowTiles}</div>)
      }
      return <div className="board-container">{rows}</div>
    }

    return (
      <BoardComponent
        letters={boardLetters}
        positions={selectedTiles}
        onTileClick={handleTileClick}
        onTileMouseDown={handleTileMouseDown}
        onTileMouseEnter={handleTileMouseEnter}
        onTileTouchStart={handleTileTouchStart}
        onTilePointerDown={handleTilePointerDown}
      />
    )
  }

  const sortedFoundWords = useMemo(() => {
    return [...foundWords].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.word.localeCompare(b.word)
    })
  }, [foundWords])

  const sortedOpponentWords = useMemo(() => {
    return [...opponentWords].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.word.localeCompare(b.word)
    })
  }, [opponentWords])

  const isWinner = matchDataRef.current?.winner_id === myUserId
  const isTie = matchDataRef.current?.winner_id === null && matchStatus === MATCH_STATUS.FINISHED

  return (
    <section className="multiplayer-play">
      <div className="play-header">
        <button className="back-button" onClick={onBack} disabled={!gameOver}>
          <IoArrowBack />
        </button>
        <div className="play-stats">
          <div className="stat">
            <IoTimeOutline className="stat-icon" />
            <span className={secondsLeft <= 10 && !gameOver ? 'urgent' : ''}>{formatTime(secondsLeft)}</span>
          </div>
          <div className="stat">
            <IoCheckmarkCircle className="stat-icon" />
            <span>{score} pts</span>
          </div>
        </div>
        <div className="opponent-stats">
          <div className="opponent-score">
            <IoPerson className="stat-icon" />
            <span>{opponentScore} pts</span>
          </div>
          <div className="opponent-words">
            <IoCheckmarkCircle className="stat-icon" />
            <span>{opponentWordsCount} words</span>
          </div>
        </div>
      </div>

      <div className="play-content">
        <div className="play-main">
          <div className="current-word-display">
            <div className={`current-word ${message?.type || ''}`}>
              {message ? message.text : currentWord}
            </div>
          </div>

          <div className="play-board" onDragStart={(e) => e.preventDefault()}>
            {renderInteractiveBoard()}
          </div>

          <div className="play-controls">
            <button
              className="control-button clear"
              onClick={handleClear}
              disabled={selectedTiles.length === 0 || gameOver}
            >
              <IoClose /> Clear
            </button>
            <button
              className="control-button submit"
              onClick={handleSubmit}
              disabled={currentWord.length < 3 || gameOver || isValidating}
            >
              Submit
            </button>
          </div>
        </div>

        <div className="play-sidebar">
          {/* My Words */}
          <div className="found-words-section mine">
            <div className="found-words-header">
              <h3>
                <IoPerson /> My Words
                <span className="word-count">{foundWords.length}</span>
              </h3>
            </div>
            <div className="found-words-list">
              {sortedFoundWords.length > 0 ? (
                <List
                  items={sortedFoundWords}
                  onItemHover={() => {}}
                  showGradients={false}
                  enableArrowNavigation={false}
                  listSize={300}
                />
              ) : (
                <div className="empty-words">
                  <p>No words found yet</p>
                  <span>Find words with 3+ letters</span>
                </div>
              )}
            </div>
          </div>

          {/* Opponent Words (Ghost) */}
          <div className="found-words-section opponent">
            <div className="found-words-header">
              <h3>
                <IoEye /> Opponent ({opponentWordsCount})
                <span className="word-count">{opponentWords.length}</span>
              </h3>
            </div>
            <div className="found-words-list ghost">
              {sortedOpponentWords.length > 0 ? (
                <List
                  items={sortedOpponentWords}
                  onItemHover={() => {}}
                  showGradients={false}
                  enableArrowNavigation={false}
                  listSize={300}
                />
              ) : (
                <div className="empty-words ghost">
                  <p>Opponent hasn't found words yet</p>
                  <span>Their words appear here live</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>
              {isWinner ? '🏆 Victory!' : isTie ? '🤝 Tie Game!' : '😔 Defeat'}
            </h2>
            <div className="final-scores">
              <div className="final-score me">
                <span className="label">You</span>
                <span className="value">{score} pts</span>
                <span className="words">{foundWords.length} words</span>
              </div>
              <div className="final-score opponent">
                <span className="label">Opponent</span>
                <span className="value">{opponentScore} pts</span>
                <span className="words">{opponentWordsCount} words</span>
              </div>
            </div>
            <button className="btn-primary" onClick={onBack}>
              <IoArrowBack /> Back to Menu
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default MultiplayerPlay