import { useState, useCallback, useMemo } from 'react';
import { FREQ } from '../data/freq';
import { buildAdjacencyMap, findAllValidWords } from './utils.js'

export const useBoard = (boardType, englishWords, wordStartsOrInitial, initialLettersOrNull = null) => {
  // Back-compat: old 3-arg signature was (boardType, englishWords, initialLetters)
  let wordStarts, initialLetters
  if (typeof wordStartsOrInitial === 'string' || wordStartsOrInitial === null) {
    wordStarts = null
    initialLetters = wordStartsOrInitial
  } else {
    wordStarts = wordStartsOrInitial
    initialLetters = initialLettersOrNull
  }
  const [boardLetters, setBoardLetters] = useState(initialLetters || '');

  const adjacencyMap = useMemo(() => {
    if (!boardLetters) return {};
    return buildAdjacencyMap(boardLetters);
  }, [boardLetters]);

  const setBoard = useCallback((letters) => {
    setBoardLetters(letters.toLowerCase());
  }, []);

  const generateRandomBoard = useCallback(() => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const cumulativeWeights = [];
    let sum = 0;
    for (const freq of FREQ) {
      sum += freq;
      cumulativeWeights.push(sum);
    }
    const random = () => {
      const r = Math.random() * cumulativeWeights[cumulativeWeights.length - 1];
      return cumulativeWeights.findIndex(w => r <= w);
    };
    let board = '';
    for (let i = 0; i < boardType; i++) {
      board += letters[random()];
    }
    setBoardLetters(board);
  }, [boardType]);

  const getValidWords = useCallback(() => {
    if (!boardLetters) return [];
    return findAllValidWords(boardLetters, englishWords, wordStarts);
  }, [boardLetters, englishWords, wordStarts]);

  return { boardLetters, adjacencyMap, generateRandomBoard, getValidWords, setBoard, setBoardLetters };
};
