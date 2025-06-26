import { useState, useEffect } from 'react';
import { MAX_LENGTH } from '../utils/Board.jsx';

export const englishWords = new Set();
export const wordStarts = new Set();

const load = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('wordlist.txt')
      .then(response => response.text())
      .then(words => {
        words.split("\n").forEach(word => {
          const strippedWord = word.trim();
          if (strippedWord.length > MAX_LENGTH) {
            return;
          }
          englishWords.add(strippedWord);
          for (let i = 3; i <= strippedWord.length; i++) {
            wordStarts.add(strippedWord.substring(0, i));
          }
        });
        setLoading(false);
        // console.log(englishWords);
      })
      .catch(err => {
        console.error("Failed to Load words:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { englishWords, wordStarts, loading, error };
};

export default load;
