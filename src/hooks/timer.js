import { useEffect, useState, useRef, useCallback } from 'react';

const useTimer = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback((seconds) => {
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
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      if (secondsLeft <= 0) {
        setIsRunning(false);
      }
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
  }, [secondsLeft, isRunning]);

  return { secondsLeft, isRunning, start, pause, resume, reset };
};

export default useTimer;
