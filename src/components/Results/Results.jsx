import { useState } from 'react';
import List from '../List/List';
import { IoArrowBack, IoRefresh } from 'react-icons/io5';
import './Results.css';

const Results = ({ 
  score, 
  foundWords, 
  allPossibleWords, 
  totalPossibleScore, 
  onPlayAgain, 
  onBack 
}) => {
  const foundSet = new Set(foundWords.map(f => f.word));
  
  const allWordsWithStatus = allPossibleWords.map(item => ({
    ...item,
    found: foundSet.has(item.word)
  }));

  const sortedByScore = [...allWordsWithStatus].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  const sortedByFound = [...allWordsWithStatus].sort((a, b) => {
    if (a.found !== b.found) return b.found ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  const [sortMode, setSortMode] = useState('found');

  return (
    <section className="results-area">
      <div className="results-header">
        <button className="back-button" onClick={onBack}>
          <IoArrowBack />
        </button>
        <h1>Game Over</h1>
        <button className="refresh-button" onClick={onPlayAgain}>
          <IoRefresh />
        </button>
      </div>

      <div className="results-content">
        <div className="results-stats">
          <div className="stat-card primary">
            <span className="stat-label">Final Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Words Found</span>
            <span className="stat-value">{foundWords.length} / {allPossibleWords.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Max Possible</span>
            <span className="stat-value">{totalPossibleScore}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">
              {allPossibleWords.length > 0 
                ? Math.round((foundWords.length / allPossibleWords.length) * 100) 
                : 0}%
            </span>
          </div>
        </div>

        <div className="results-list-section">
          <div className="results-list-header">
            <h2>All Possible Words</h2>
            <div className="sort-toggle">
              <button 
                className={`sort-btn ${sortMode === 'found' ? 'active' : ''}`}
                onClick={() => setSortMode('found')}
              >
                Found First
              </button>
              <button 
                className={`sort-btn ${sortMode === 'score' ? 'active' : ''}`}
                onClick={() => setSortMode('score')}
              >
                By Score
              </button>
            </div>
          </div>
          <div className="results-list">
            <List
              items={sortMode === 'found' ? sortedByFound : sortedByScore}
              onItemHover={() => {}}
              showGradients={true}
              enableArrowNavigation={false}
              listSize={500}
              className="results-list-component"
              showPoints={true}
              highlightFound={true}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Results;
