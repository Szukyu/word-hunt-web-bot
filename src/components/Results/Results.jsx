import { useState, useMemo } from 'react';
import List from '../List/List';
import Board from '../Boards/Board';
import Boarder from '../Boards/Boarder';
import Donut from '../Boards/Donut';
import X from '../Boards/X';
import { IoArrowBack, IoRefresh, IoShareSocial } from 'react-icons/io5';
import { formatDailyShareText, shareText } from '../../lib/share';
import { buildAdjacencyMap, findPath } from '../../hooks/utils.js';
import './Results.css';

const REVIEW_BOARD_COMPONENT = { 16: Board, 25: Boarder, 20: Donut, 21: X };

// Same list heights as the solver (Input.jsx) so the board + list cards match
const REVIEW_LIST_SIZE = { 16: 320, 20: 402, 21: 402, 25: 402 };

const Results = ({
  score,
  foundWords,
  allPossibleWords,
  totalPossibleScore,
  onPlayAgain,
  onBack,
  puzzleDate = null,
  boardName = null,
  shareText: shareTextProp = null,
  boardLetters = null,
  boardType = null,
}) => {
  const foundSet = new Set(foundWords.map(f => f.word));
  
  const allWordsWithStatus = allPossibleWords.map(item => ({
    ...item,
    found: foundSet.has(item.word)
  }));

  const sortedByFound = [...allWordsWithStatus].sort((a, b) => {
    if (a.found !== b.found) return b.found ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  const computedShareText = shareTextProp || formatDailyShareText({
    puzzleDate,
    score,
    wordsFoundCount: foundWords.length,
    totalPossibleWords: allPossibleWords.length,
    boardName,
  });
  const [shareState, setShareState] = useState(null); // 'copied' | 'shared' | null

  // --- Solver-style review: hovering a word highlights its path on the board ---
  // Found words carry their exact `pos` from play; missed words are solved live.
  const reviewLetters = boardLetters || null;
  const reviewType = boardType ?? (reviewLetters ? reviewLetters.length : null);
  const adjacencyMap = useMemo(() => {
    if (!reviewLetters) return null;
    try {
      return buildAdjacencyMap(reviewLetters);
    } catch {
      return null;
    }
  }, [reviewLetters]);
  const ReviewBoard = reviewType ? REVIEW_BOARD_COMPONENT[reviewType] : null;
  const canReview = !!(reviewLetters && adjacencyMap && ReviewBoard);
  const [boardPositions, setBoardPositions] = useState([]);

  const handleItemHover = (item) => {
    if (!canReview || !item?.word) return;
    if (Array.isArray(item.pos) && item.pos.length === item.word.length) {
      setBoardPositions(item.pos);
    } else {
      setBoardPositions(findPath(item.word, adjacencyMap, reviewLetters) || []);
    }
  };

  const handleShare = async () => {
    const res = await shareText(computedShareText, puzzleDate ? `Word Hunt ${puzzleDate}` : 'Word Hunt');
    if (res === 'copied') {
      setShareState('copied');
      setTimeout(() => setShareState(null), 1600);
    } else if (res === 'shared') {
      setShareState('shared');
      setTimeout(() => setShareState(null), 1600);
    }
  };

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

        <div className="results-share-card">
          <div className="share-text-preview" aria-live="polite">
            <span className="share-label">Spoiler-free share</span>
            <span className="share-text">{computedShareText}</span>
          </div>
          <button className="share-button" onClick={handleShare} aria-label="Share result">
            <IoShareSocial /> {shareState === 'copied' ? 'Copied!' : shareState === 'shared' ? 'Shared!' : 'Share'}
          </button>
        </div>

        {canReview ? (
          <div className="review-container">
            <div className="review-board-section">
              <ReviewBoard letters={reviewLetters} positions={boardPositions} />
            </div>
            <div className="review-words-section">
              <div className="review-words-header">
                <span className="eyebrow">{allPossibleWords.length} words</span>
              </div>
              <div className="review-words-list">
                <List
                  items={sortedByFound}
                  onItemHover={handleItemHover}
                  showGradients={true}
                  enableArrowNavigation={false}
                  listSize={REVIEW_LIST_SIZE[reviewType] || 360}
                  className="results-list-component"
                  showPoints={true}
                  highlightFound={true}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="results-list-section">
            <div className="results-list-header">
              <h2>All Possible Words</h2>
            </div>
            <div className="results-list">
              <List
                items={sortedByFound}
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
        )}
      </div>
    </section>
  );
};

export default Results;
