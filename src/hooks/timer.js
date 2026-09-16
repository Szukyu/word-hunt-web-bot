import { useEffect, useState, useRef, useCallback } from 'react';

const useTimer = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isUntimed, setIsUntimed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback((seconds) => {
    // Zen / untimed practice: gameTime of 0, null, or undefined counts up instead of down
    if (!seconds || seconds <= 0) {
      setIsUntimed(true);
      setElapsed(0);
      setSecondsLeft(0);
      setIsRunning(true);
      return;
    }
    setIsUntimed(false);
    setElapsed(0);
    setSecondsLeft(seconds);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
  }, []);

  const reset = useCallback(() => {
    setSecondsLeft(0);
    setElapsed(0);
    setIsUntimed(false);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    // Untimed: count up until paused (Play finishes manually via Finish button)
    if (isUntimed) {
      intervalRef.current = setTimeout(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
      return () => {
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
        }
      };
    }

    if (secondsLeft <= 0) {
      setIsRunning(false);
      return;
    }

    intervalRef.current = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [secondsLeft, isRunning, isUntimed]);

  return { secondsLeft, elapsed, isUntimed, isRunning, start, pause, resume, reset };
};

export default useTimer;
