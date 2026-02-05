import { useState } from 'react';
import { IoCodeSlash, IoGameController, IoArrowBack, IoSparkles } from 'react-icons/io5';
import Input from '../Input/Input';
import Setup from '../Setup/Setup';
import useLoad from '../../hooks/load';
import './Option.css';

function Option() {
  const [activeComponent, setActiveComponent] = useState(null);
  const { englishWords, wordStarts, loading, error } = useLoad();

  const renderModeCard = (mode) => (
    <button
      key={mode.id}
      className={`option-card ${mode.id}`}
      onClick={() => setActiveComponent(mode.id)}
    >
      <div className="option-card-header">
        <div className="option-card-icon">{mode.icon}</div>
      </div>
      <div className="option-card-content">
        <h3>{mode.title}</h3>
        <p>{mode.description}</p>
        <ul className="option-features">
          {mode.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
      </div>
      <div className="option-card-footer">
        <span className="option-card-cta">{mode.cta}</span>
      </div>
    </button>
  );

  const modeOptions = [
    {
      id: 'play',
      title: 'Practice',
      description: 'Practice with Different Board Sizes and Time',
      cta: 'Launch Setup',
      icon: <IoGameController />,
      features: [
        'Support Different Boards',
        'Adjustable Timers',
        'Live Word Validation',
        'Low Stakes. Pure Fun',
      ]
    },
    {
      id: 'cheat',
      title: 'Solver',
      description: 'Find All Possible Words for any Letter Grid',
      cta: 'Open Solver',
      icon: <IoCodeSlash />,
      features: [
        'Support Different Boards',
        'Complete Sorted Word List',
        'Highlight Word Paths',
        'Embrace the Dark Side',
      ]
    },
  ];

  if (loading) {
    return (
      <div className="option-state-card">
        <div className="option-loading-content">
          <div className="option-spinner" />
          <div className="loading-text">
            <p>Loading 200k+ words...</p>
            <span className="state-subtext">Hang tight, almost ready</span>
          </div>
        </div>
        <div className="loading-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="option-state-card error">
        <p>We couldn't load the dictionary</p>
        <span className="state-subtext">{error}</span>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!activeComponent) {
    return (
      <section className="option-landing">
        <div className="option-header">
          <div className="option-welcome">
            <h1>Word Hunt Companion</h1>
          </div>
        </div>
        
        <div className="option-card-grid">
          {modeOptions.map(renderModeCard)}
        </div>
      </section>
    );
  }

  return (
    <section className="option-active">
      <div className="option-active-panel">
        {activeComponent === 'play' && (
          <Setup englishWords={englishWords} wordStarts={wordStarts} />
        )}
        {activeComponent === 'cheat' && (
          <Input englishWords={englishWords} wordStarts={wordStarts} />
        )}
      </div>
    </section>
  );
}

export default Option;
