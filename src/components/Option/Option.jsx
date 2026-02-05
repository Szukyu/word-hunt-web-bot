import { useState } from 'react';
import Input from '../Input/Input';
import Setup from '../Setup/Setup';
import { IoCodeSlash, IoGameController } from "react-icons/io5";
import useLoad from '../../hooks/load';
import './Option.css'

function Option() {
  const [activeComponent, setActiveComponent] = useState(null);

  const { englishWords, wordStarts } = useLoad();

  if (!activeComponent) {
    return (
      <div className="option-container">
        <button 
          className="play option"
          onClick={() => setActiveComponent('play')}
        >
          <IoGameController />
          Play
        </button>
        <button 
          className="cheat option"
          onClick={() => setActiveComponent('cheat')}
        >
          <IoCodeSlash />
          Cheat
        </button>
      </div>
    );
  }

  return (
    <div>
      {activeComponent === 'play' && <Setup englishWords={englishWords} wordStarts={wordStarts} />}
      {activeComponent === 'cheat' && <Input englishWords={englishWords} wordStarts={wordStarts} />}
    </div>
  );
}

export default Option;
