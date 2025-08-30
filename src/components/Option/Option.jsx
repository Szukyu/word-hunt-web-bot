import { useState } from 'react';
import Input from '../Input/Input';
import Keymap from '../Keymap/Keymap'

function Option() {
  const [activeComponent, setActiveComponent] = useState(null);

  if (!activeComponent) {
    return (
      <div>
        <button onClick={() => setActiveComponent('input')}>
          Cheat
        </button>
        <button onClick={() => setActiveComponent('keymap')}>
          Play
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
