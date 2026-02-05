import { useState, useCallback } from 'react';
import { MAX_LENGTH, DIRECTIONS, Letter, Board, Boarder, Donut, X} from '../utils/Board.jsx';

const search = (englishWords, wordStarts) => {
  const [foundWords, setFoundWords] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const validWordsOnly = new Set();
  const valids = new Set();

  const wordCompare = useCallback((a, b) => {
    if (a.word.length < b.word.length) return 1;
    if (a.word.length > b.word.length) return -1;
    return a.word.localeCompare(b.word);
  }, []);

  const findValidFrom = useCallback((board, word, letter, length, startPos, positions) => {
    if (!englishWords || !wordStarts) {
      console.warn("Word List Not Loaded");
      return;
    }

    if (length >= 3 && !wordStarts.has(word)) {
      return;
    }

    if (englishWords.has(word) && !validWordsOnly.has(word)) {
      validWordsOnly.add(word.toUpperCase());
      valids.add({ pos: positions, word });
    }

    if (length >= MAX_LENGTH) {
      return;
    }
    
    positions.push(letter.pos);

    for (const dir of DIRECTIONS) {
      const copyBoard = board.copyBoard();
      const neighborLetter = copyBoard.visitDirection(letter.pos, dir);
      if (neighborLetter !== -1) {
        findValidFrom(copyBoard, word + neighborLetter.char, neighborLetter, length + 1, startPos, [...positions]);
      }
    }
  }, [englishWords, wordStarts]);

  const findValidWords = useCallback((board) => {
    validWordsOnly.clear();
    valids.clear();

    board.lb.forEach(letter => {
      letter.markVisited();
      findValidFrom(board, letter.char, letter, 1, letter.pos, [letter.pos]);
      letter.visited = false;
    });

    setFoundWords(Array.from(valids).sort(wordCompare));
  }, [findValidFrom, wordCompare]);

  const searchWords = useCallback((letters) => {
    setIsSearching(true);
    setSearchError(null);
    setFoundWords([]);

    let board;

    try {
      const inputLetters = letters.split('');

      if (inputLetters.length === 16) {
        const lettersObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new Board(lettersObjs);
      } else if (inputLetters.length === 25) {
        const lettersObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new Boarder(lettersObjs);
      } else if (inputLetters.length === 20) {
        const letterObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new Donut(letterObjs);
      } else if (inputLetters.length === 21) {
        const lettersObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new X(lettersObjs);
      } else {
        throw new Error("Please Enter 16, 20, 21 or 25 letters For Their Corresponding Board");
      }

      if (board) {
        findValidWords(board);
      }
    } catch (err) {
      console.error("Error during word search:", err);
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  }, [findValidWords]);

  return { foundWords, isSearching, searchError, searchWords };
};

export default search;
