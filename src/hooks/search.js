import { useState, useCallback } from 'react';
import { MAX_LENGTH, DIRECTIONS, Letter, Board, Boarder, Donut } from '../utils/Board.jsx';
import { englishWords, wordStarts } from './load';

const validWordsOnly = new Set();
const valids = new Set();

const search = () => {
  const [foundWords, setFoundWords] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const wordCompare = useCallback((a, b) => {
    if (a.word.length < b.word.length) return 1;
    if (a.word.length > b.word.length) return -1;
    return a.word.localeCompare(b.word);
  }, []);

  const findValidFrom = useCallback((board, word, letter, length, startPos) => {
    if (length >= 3 && !wordStarts.has(word)) {
      return;
    }

    if (englishWords.has(word) && !validWordsOnly.has(word)) {
      validWordsOnly.add(word);
      valids.add({ pos: startPos, word });
    }

    if (length >= MAX_LENGTH) {
      return;
    }

    for (const dir of DIRECTIONS) {
      const copyBoard = board.copyBoard();
      const neighborLetter = copyBoard.visitDirection(letter.pos, dir);
      if (neighborLetter !== -1) {
        findValidFrom(copyBoard, word + neighborLetter.char, neighborLetter, length + 1, startPos);
      }
    }
  }, []);

  const findValidWords = useCallback((board) => {
    validWordsOnly.clear();
    valids.clear();

    board.lb.forEach(letter => {
      letter.markVisited();
      findValidFrom(board, letter.char, letter, 1, letter.pos);
      letter.visited = false;
    });

    setFoundWords(Array.from(valids).sort(wordCompare));
  }, [findValidFrom, wordCompare]);

  const searchWords = useCallback((letters) => {
    setIsSearching(true);
    setSearchError(null);
    setFoundWords([]);

    const inputLetters = [];
    let board;

    try {
      if (letters.length === 16) {
        for (let i = 0; i < 16; i++) {
          inputLetters.push(letters[i]);
        }
        const lettersObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new Board(lettersObjs);
      } else if (letters.length === 25) {
        for (let i = 0; i < 25; i++) {
          inputLetters.push(letters[i]);
        }
        const lettersObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new Boarder(lettersObjs);
      } else if (letters.length === 20) {
        for (let i = 0; i < 20; i++) {
          inputLetters.push(letters[i]);
        }
        const letterObjs = inputLetters.map((char, i) => new Letter(char, i));
        board = new Donut(letterObjs);
      } else {
        throw new Error("Invalid number of letters. Please enter 16, 20, or 25 letters.");
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
