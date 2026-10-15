import { useState, useEffect, useMemo } from 'react'
import { IoTrophy, IoPerson, IoCheckmarkCircle, IoClose, IoArrowBack, IoShare, IoCopy, IoTime, IoGameController, IoFlag, IoEye, IoEyeOff, IoDownload, IoRefresh } from 'react-icons/io5'
import List from '../List/List'
import { shareText, copyToClipboard } from '../../lib/share'
import './MultiplayerResults.css'

const MultiplayerResults = ({ 
  score, 
  foundWords, 
  allPossibleWords, 
  totalPossibleScore, 
  boardLetters, 
  boardType, 
  gameTime, 
  onPlayAgain, 
  onBack,
  opponentScore = 0,
  opponentWords = [],
  winnerId = null,
  isMultiplayer = true,
  myUserId = null,
}) => {
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('comparison') // 'comparison' | 'myWords' | 'allWords'
  const [activeTab, setActiveTab] = useState('overlap') // 'overlap' | 'uniqueMe' | 'uniqueOpp' | 'missed'

  const myWordsSet = useMemo(() => new Set(foundWords.map(w => w.word.toLowerCase())), [foundWords])
  const oppWordsSet = useMemo(() => new Set(opponentWords.map(w => w.word.toLowerCase())), [opponentWords])

  const sharedWords = useMemo(() => 
    foundWords.filter(w => oppWordsSet.has(w.word.toLowerCase()))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word)),
  [foundWords, oppWordsSet])

  const myUniqueWords = useMemo(() =>
    foundWords.filter(w => !oppWordsSet.has(w.word.toLowerCase()))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word)),
  [foundWords, oppWordsSet])

  const oppUniqueWords = useMemo(() =>
    opponentWords.filter(w => !myWordsSet.has(w.word.toLowerCase()))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word)),
  [opponentWords, myWordsSet])

  const allFoundWords = useMemo(() => {
    const set = new Set()
    foundWords.forEach(w => set.add(w.word.toLowerCase()))
    opponentWords.forEach(w => set.add(w.word.toLowerCase()))
    return Array.from(set).sort()
  }, [foundWords, opponentWords])

  const missedWords = useMemo(() =>
    allPossibleWords
      .filter(w => !allFoundWords.includes(w.word.toLowerCase()))
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word)),
  [allPossibleWords, allFoundWords])

  const myScore = score
  const myWordsCount = foundWords.length
  const oppWordsCount = opponentWords.length
  const isWinner = winnerId === myUserId
  const isTie = winnerId === null && myScore === opponentScore

  const pctScore = totalPossibleScore ? Math.round((myScore / totalPossibleScore) * 100) : 0
  const pctWords = allPossibleWords.length ? Math.round((myWordsCount / allPossibleWords.length) * 100) : 0

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  const getBoardLabel = (type) => {
    const labels = { 16: '4×4', 20: 'Donut', 21: 'X', 25: '5×5' }
    return labels[type] || String(type)
  }

  const handleShare = async () => {
    const text = `Word Hunt Multiplayer • ${getBoardLabel(boardType)} • ${myScore} pts • ${myWordsCount}/${allPossibleWords.length} words`
    try {
      await shareText(text, 'Word Hunt Multiplayer')
    } catch {
      await copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyLink = async () => {
    const link = window.location.href
    await copyToClipboard(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabData = [
    { id: 'overlap', label: 'Shared', count: sharedWords.length, icon: <IoCheckmarkCircle /> },
    { id: 'uniqueMe', label: 'Only Me', count: myUniqueWords.length, icon: <IoPerson /> },
    { id: 'uniqueOpp', label: 'Only Them', count: oppUniqueWords.length, icon: <IoPerson /> },
    { id: 'missed', label: 'Missed', count: missedWords.length, icon: <IoEyeOff /> },
  ]

  const getTabWords = (tabId) => {
    switch (tabId) {
      case 'overlap': return sharedWords.map(w => ({ ...w, shared: true }))
      case 'uniqueMe': return myUniqueWords.map(w => ({ ...w, unique: 'me' }))
      case 'uniqueOpp': return oppUniqueWords.map(w => ({ ...w, unique: 'opp' }))
      case 'missed': return missedWords.map(w => ({ ...w, missed: true }))
      default: return []
    }
  }

  const currentWords = getTabWords(activeTab)

  return (
    <section className="multiplayer-results">
      <div className="results-header">
        <button className="back-button" onClick={onBack}>
          <IoArrowBack />
        </button>
        <div className="results-title">
          <h1>
            {isWinner ? '🏆 Victory!' : isTie ? '🤝 Tie Game!' : '😔 Defeat'}
          </h1>
          <span className="results-sub">
            {getBoardLabel(boardType)} • {formatTime(gameTime)} • Multiplayer
          </span>
        </div>
        <div className="results-actions">
          <button className="icon-btn" onClick={handleShare} title="Share Result">
            <IoShare />
          </button>
          <button className="icon-btn" onClick={handleCopyLink} title={copied ? 'Copied!' : 'Copy Link'}>
            {copied ? <IoCheckmarkCircle /> : <IoCopy />}
          </button>
        </div>
      </div>

      <div className="results-content">
        {/* Score Summary */}
        <div className="score-summary">
          <div className={`score-card me ${isWinner ? 'winner' : ''} ${isTie ? 'tie' : ''}`}>
            <div className="score-header">
              <span className="player-label">You</span>
              {isWinner && <IoTrophy className="trophy" />}
              {isTie && <IoFlag className="trophy tie" />}
            </div>
            <div className="score-main">
              <span className="score-value">{myScore}</span>
              <span className="score-unit">pts</span>
            </div>
            <div className="score-details">
              <span>{myWordsCount} words</span>
              <span>{pctScore}% of max score</span>
              <span>{pctWords}% of max words</span>
            </div>
          </div>

          <div className="vs-divider">
            <span>VS</span>
          </div>

          <div className={`score-card opp ${!isWinner && !isTie ? 'winner' : ''} ${isTie ? 'tie' : ''}`}>
            <div className="score-header">
              <span className="player-label">Opponent</span>
              {!isWinner && !isTie && <IoTrophy className="trophy" />}
              {isTie && <IoFlag className="trophy tie" />}
            </div>
            <div className="score-main">
              <span className="score-value">{opponentScore}</span>
              <span className="score-unit">pts</span>
            </div>
            <div className="score-details">
              <span>{oppWordsCount} words</span>
              <span>{opponentScore > 0 ? Math.round((opponentScore / totalPossibleScore) * 100) : 0}% of max score</span>
            </div>
          </div>
        </div>

        {/* Word Comparison Tabs */}
        <div className="comparison-tabs">
          {tabData.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''} ${tab.count === 0 ? 'empty' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.count === 0}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Word List */}
        <div className="words-panel">
          <div className="words-header">
            <h3>{tabData.find(t => t.id === activeTab)?.label} Words</h3>
            <span className="words-total">{currentWords.length} words</span>
          </div>
          <div className="words-list">
            {currentWords.length > 0 ? (
              <List
                items={currentWords.map(w => ({
                  ...w,
                  word: w.word,
                  score: w.score,
                  // Add visual indicator
                  _badge: w.shared ? 'SHARED' : w.unique === 'me' ? 'ME ONLY' : w.unique === 'opp' ? 'THEM ONLY' : w.missed ? 'MISSED' : null
                }))}
                onItemHover={() => {}}
                showGradients={true}
                enableArrowNavigation={false}
                listSize={400}
                renderItem={(item, index) => (
                  <div className={`word-row ${item.shared ? 'shared' : ''} ${item.unique === 'me' ? 'unique-me' : ''} ${item.unique === 'opp' ? 'unique-opp' : ''} ${item.missed ? 'missed' : ''}`}>
                    <span className="word-rank">{index + 1}</span>
                    <span className="word-text">{item.word}</span>
                    <span className="word-score">+{item.score}</span>
                    {item._badge && <span className="word-badge">{item._badge}</span>}
                  </div>
                )}
              />
            ) : (
              <div className="empty-state">
                <IoEyeOff />
                <p>No {tabData.find(t => t.id === activeTab)?.label.toLowerCase()} words</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-box">
            <IoGameController />
            <div>
              <span className="stat-value">{getBoardLabel(boardType)}</span>
              <span className="stat-label">Board</span>
            </div>
          </div>
          <div className="stat-box">
            <IoTime />
            <div>
              <span className="stat-value">{formatTime(gameTime)}</span>
              <span className="stat-label">Time</span>
            </div>
          </div>
          <div className="stat-box">
            <IoCheckmarkCircle />
            <div>
              <span className="stat-value">{myWordsCount} / {allPossibleWords.length}</span>
              <span className="stat-label">Words Found</span>
            </div>
          </div>
          <div className="stat-box">
            <IoTrophy />
            <div>
              <span className="stat-value">{pctScore}%</span>
              <span className="stat-label">Score Efficiency</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions-bottom">
          <button className="btn-secondary" onClick={onPlayAgain}>
            <IoRefresh /> Play Again
          </button>
          <button className="btn-primary" onClick={onBack}>
            <IoArrowBack /> Back to Menu
          </button>
        </div>
      </div>
    </section>
  )
}

export default MultiplayerResults