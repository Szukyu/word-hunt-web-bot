import { useEffect, useState } from 'react';

const timer = () => {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(()=> {
    if (seconds <= 0) return;

    const timeout = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [secondsLeft])

  function start(seconds) {
    setSecondsLeft(seconds);
  }

  return { secondsLeft, start };
}

export default timer;


// TO USE
// const {secondsL;eft, start} = timer()
// start(60);
