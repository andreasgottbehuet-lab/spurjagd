import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, type GameGoal } from './generator';
import { messages, type Language } from './i18n';
import './style.css';

function App() {
  const [lang, setLang] = useState<Language>('de');
  const [players, setPlayers] = useState(12);
  const [groupSize, setGroupSize] = useState(3);
  const [duration, setDuration] = useState(60);
  const [age, setAge] = useState('8–10');
  const [goal, setGoal] = useState<GameGoal>('locks');
  const [locations, setLocations] = useState('Spielplatz\nWiese\nFeuerwehrplatz\nSportplatz');
  const t = messages[lang];
  const config = { players, groupSize, durationMinutes: duration, age, goal, locations: locations.split('\n') };
  const plan = useMemo(() => {
    try { return { teams: createPlan(config), error: '' }; }
    catch (e) { return { teams: [], error: e instanceof Error ? e.message : String(e) }; }
  }, [players, groupSize, duration, age, goal, locations]);

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Spurjagd Startseite"><span className="mark">↗</span> SPURJAGD</a>
        <div className="header-actions"><span className="prototype">PROTOTYP 0.1</span><label className="visually-hidden" htmlFor="language">Sprache</label>
          <select id="language" value={lang} onChange={e => setLang(e.target.value as Language)}><option value="de">DE</option><option value="en">EN</option></select>
        </div>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">INDIVIDUELLE ABENTEUER PLANEN</p>
          <h1>{t.tagline}</h1>
          <p className="intro">{t.intro}</p>
          <a href="#planer" className="hero-link">{t.plan} <span aria-hidden="true">↘</span></a>
        </section>
        <section className="workspace" id="planer">
          <div className="panel form-panel">
            <div className="section-line"><span className="step">01</span><h2>{t.plan}</h2></div>
            <div className="form-grid">
              <label>{t.children}<input min="1" max="100" type="number" value={players} onChange={e => setPlayers(Number(e.target.value))}/></label>
              <label>{t.size}<input min="1" max="10" type="number" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))}/></label>
              <label>{t.age}<select value={age} onChange={e => setAge(e.target.value)}><option>4–6</option><option>6–8</option><option>8–10</option><option>11–13</option><option>14+</option></select></label>
              <label>{t.duration}<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option></select></label>
            </div>
            <label className="wide-label">{t.locations}<textarea value={locations} onChange={e => setLocations(e.target.value)} rows={5}/><small>Ein Standort pro Zeile / One location per line</small></label>
            <fieldset><legend>{t.outcome}</legend>
              <label className="radio"><input type="radio" checked={goal==='locks'} onChange={()=>setGoal('locks')}/>{t.locks}</label>
              <label className="radio"><input type="radio" checked={goal==='word'} onChange={()=>setGoal('word')}/>{t.word}</label>
              <label className="radio"><input type="radio" checked={goal==='cards'} onChange={()=>setGoal('cards')}/>{t.cards}</label>
            </fieldset>
          </div>
          <div className="panel result-panel">
            <div className="section-line"><span className="step">02</span><h2>{t.route}</h2></div>
            {plan.error ? <p role="alert" className="error">{plan.error}</p> : <>
              <div className="stat"><strong>{plan.teams.length}</strong><span>{t.teams}</span></div>
              <div className="team-list">{plan.teams.map((team,i)=><article className="team" key={i}><h3>{lang==='en' ? 'Team ' + (i+1) : 'Team '+team.name} <span>{team.memberCount} {lang==='en'?'players':'Kinder'}</span></h3><p>{team.stations.join(' → ')} → {lang==='en'?'Finish':'Ziel'}</p></article>)}</div>
              <button className="print" onClick={()=>window.print()}>{t.print} ↗</button>
            </>}
            <p className="disclaimer">{t.note}</p>
          </div>
        </section>
        <footer><span>SPURJAGD · 2026</span><span>{t.privacy}</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
