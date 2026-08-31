import { useState } from 'react';
import Input from '../Input/Input';
import Setup from '../Setup/Setup';
import Daily from '../Daily/Daily';
import useLoad from '../../hooks/load';
import './Option.css';

function Option() {
  const [activeComponent, setActiveComponent] = useState(null);
  const { englishWords, wordStarts, loading, error } = useLoad();

  const modeOptions = [
    {
      id: 'daily',
      num: '01',
      title: 'Daily',
      desc: 'One board · 90s · streak',
      cta: 'Open',
    },
    {
      id: 'play',
      num: '02',
      title: 'Practice',
      desc: '4 boards · 10—120s',
      cta: 'Open',
    },
    {
      id: 'cheat',
      num: '03',
      title: 'Solver',
      desc: '16 / 20 / 21 / 25 · path',
      cta: 'Open',
    },
  ];

  if (loading) {
    return (
      <div className="option-state-card">
        <div className="option-spinner" aria-hidden />
        <span className="mono-hint">loading dictionary</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="option-state-card error">
        <span className="mono-hint">{error}</span>
        <button className="retry-button" onClick={() => window.location.reload()}>retry</button>
      </div>
    );
  }

  if (!activeComponent) {
    return (
      <section className="option-landing">
        <div className="hero-flat">
          <span className="hero-kicker">word hunt</span>
          <h1 className="hero-title">Word Hunt</h1>
          <span className="hero-sub">practice · solver</span>
        </div>

        <div className="option-card-grid">
          {modeOptions.map((m) => (
            <button key={m.id} className="option-card" onClick={() => setActiveComponent(m.id)}>
              <span className="mono-num">{m.num}</span>
              <h3>{m.title}</h3>
              <p className="card-desc">{m.desc}</p>
              <span className="card-cta">{m.cta} —›</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="option-active">
      <div className="option-active-panel">
        {activeComponent === 'daily' && <Daily />}
        {activeComponent === 'play' && <Setup englishWords={englishWords} wordStarts={wordStarts} />}
        {activeComponent === 'cheat' && <Input englishWords={englishWords} wordStarts={wordStarts} />}
      </div>
    </section>
  );
}

export default Option;
