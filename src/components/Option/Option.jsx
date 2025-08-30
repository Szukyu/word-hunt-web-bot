import { useState } from 'react';
import Input from '../Input/Input';
import Keymap from '../Keymap/Keymap'
import { IoCodeSlash, IoGameController } from "react-icons/io5";
import './Option.css'

function Option() {
  const [activeComponent, setActiveComponent] = useState(null);

  if (!activeComponent) {
    return (
      <div className="option-container">
        <button 
          className="play"
          onClick={() => setActiveComponent('keymap')}
        >
          <IoGameController />
          Play
        </button>
        <button 
          className="cheat"
          onClick={() => setActiveComponent('input')}
        >
          <IoCodeSlash />
          Cheat
        </button>
      </div>
    );
  }

  return (
    <div>
      {activeComponent === 'input' && <Input />}
      {activeComponent === 'keymap' && <Keymap />}
    </div>
  );
}

export default Option;
