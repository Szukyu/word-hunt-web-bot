import { useEffect, useCallback } from 'react';
import { findPath } from './utils.js'

export const useKeyboardInput = ({ boardLetters, adjacencyMap, selectedTiles, currentWord, setSelectedTiles, setCurrentWord, setMessage, gameOver, isRunning, onSubmit, onClear }) => {
  const handleKeyDown = useCallback(
    (event) => {
      if (gameOver || !isRunning) return;
      const key = event.key.toLowerCase();

      if (key === 'enter') {
        event.preventDefault();
        onSubmit();
        return;
      }
      if (key === 'backspace') {
        event.preventDefault();
        if (selectedTiles.length > 0) {
          setSelectedTiles(prev => prev.slice(0, -1));
          setCurrentWord(prev => prev.slice(0, -1));
        }
        return;
      }
      if (key === 'escape') {
        onClear();
        return;
      }
      if (!/^[a-z]$/.test(key)) return;

      const newLetter = key.toUpperCase();

      // First Letter of a new Word
      if (selectedTiles.length === 0) {
        const path = findPath(key, adjacencyMap, boardLetters);
        if (path) {
          setSelectedTiles(path);
          setCurrentWord(newLetter);
          setMessage(null);
        }
        return;
      }

      // Try to extend the Current Selection
      const lastTile = selectedTiles[selectedTiles.length - 1];
      for (const neighbor of adjacencyMap[lastTile] || []) {
        if (
          !selectedTiles.includes(neighbor) &&
          boardLetters[neighbor].toLowerCase() === key
        ) {
          setSelectedTiles(prev => [...prev, neighbor]);
          setCurrentWord(prev => prev + newLetter);
          setMessage(null);
          return;
        }
      }

			// Failure: Look for new Path.
      // If no Path Exists, the Keypress is Ignored
      const attemptedWord = currentWord + newLetter;
      const newPath = findPath(attemptedWord.toLowerCase(), adjacencyMap, boardLetters);
      if (newPath) {
        setSelectedTiles(newPath);
        setCurrentWord(attemptedWord);
        setMessage(null);
      }
    },
    [ gameOver, isRunning, selectedTiles, currentWord, adjacencyMap, boardLetters, setSelectedTiles, setCurrentWord, setMessage, onSubmit, onClear ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
