import { useState, useEffect } from 'react';
import { MAX_LENGTH } from '../utils/Board.jsx';
import { WORDS } from '../data/words.js';

const load = () => {
  const [englishWords, setEnglishWords] = useState(new Set());
  const [wordStarts, setWordStarts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const newEnglishWords = new Set();
      const newWordStarts = new Set();
      
      WORDS.forEach(word => {
        const strippedWord = word.trim().toLowerCase();
        if (strippedWord.length === 0 || strippedWord.length > MAX_LENGTH) {
          return;
        }
        newEnglishWords.add(strippedWord);
        for (let i = 3; i <= strippedWord.length; i++) {
          newWordStarts.add(strippedWord.substring(0, i));
        }
      });
      
      setEnglishWords(newEnglishWords);
      setWordStarts(newWordStarts);
      setLoading(false);
      setError(null);
      
      console.log(`Loaded ${newEnglishWords.size} Words`);
      
    } catch (err) {
      console.error("Fail to Load Word List:", err);
      setError(err.message || 'Unknown error');
      setLoading(false);
    }
  }, []);

  return { englishWords, wordStarts, loading, error };
};

export default load;
