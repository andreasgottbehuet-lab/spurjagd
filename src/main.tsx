import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, type GameGoal, type Location, type StartMode, type RouteMode, type FinishMode } from './generator';
import { messages, type Language } from './i18n';
import { generateStationChallenge, hashSeed, validCode, type AgeLevel, type StationChallenge } from './puzzles';
import { activeGameId, deleteGame, downloadBackup, loadGames, newGameId, parseGameBackup, saveGame, setActiveGameId, type SavedGame } from './project-storage';
import './style.css';

const initialLocations: Location[] = [
  { id: 'loc-1', name: 'Spielplatz', description: 'Schaukeln, Rutsche, Klettergerüst' },
  { id: 'loc-2', name: 'Wiese', description: 'Offene Wiese mit Bäumen' },
  { id: 'loc-3', name: 'Feuerwehrplatz', description: 'Öffentlicher Platz neben der Feuerwehr' },
  { id: 'loc-4', name: 'Sportplatz', description: 'Sportfläche mit Fußballtoren' },
];

function App() {
  const [lang, setLang] = useState<Language>('de');
  const [players, setPlayers] = useState(12);
  const [groupSize, setGroupSize] = useState(3);
  const [duration, setDuration] = useState(60);
  const [age, setAge] = useState('8–10');
  const [goal, setGoal] = useState<GameGoal>('locks');
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [puzzleMinutes, setPuzzleMinutes] = useState(10);
  const [walkingMinutes, setWalkingMinutes] = useState(5);
  const [startFinishMinutes, setStartFinishMinutes] = useState(10);
  const [startMode, setStartMode] = useState<StartMode>('distributed');
  const [routeMode, setRouteMode] = useState<RouteMode>('same');
  const [finishMode, setFinishMode] = useState<FinishMode>('meeting');
  const [meetingPoint, setMeetingPoint] = useState('Zuhause / Treffpunkt');
  const [activeStep, setActiveStep] = useState(1);
  const [nextLocationId, setNextLocationId] = useState(5);
  const [projectId, setProjectId] = useState<string>(() => newGameId());
  const [stationCodes, setStationCodes] = useState<Record<string, string>>({});
  const [puzzleSeed, setPuzzleSeed] = useState<number>(() => hashSeed(projectId));
  const [projectTitle, setProjectTitle] = useState('Meine Schnitzeljagd');
  const [projects, setProjects] = useState<SavedGame[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const skipSave = useRef(false);
  const [selectedProject, setSelectedProject] = useState('');

  const t = messages[lang];
  const en = lang === 'en';
  const tx = (de: string, english: string) => en ? english : de;
  const config = { players, groupSize, durationMinutes: duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, stationCodes, puzzleSeed };
  const ageLevel: AgeLevel = age === '4–6' || age === '6–8' ? 'young' : age === '8–10' ? 'middle' : 'older';
  const lockPreview = useMemo(() => {
    const challenges: { location: Location; challenge: StationChallenge }[] = [];
    const errors: string[] = [];
    if (goal !== 'locks') return { challenges, errors };
    for (const location of locations) {
      const code = stationCodes[location.id] ?? '';
      if (!validCode(code, code.length)) {
        errors.push(location.name.trim() || location.id);
        continue;
      }
      try {
        challenges.push({ location, challenge: generateStationChallenge(location.id, code, ageLevel, puzzleSeed) });
      } catch {
        errors.push(location.name.trim() || location.id);
      }
    }
    return { challenges, errors };
  }, [goal, locations, stationCodes, ageLevel, puzzleSeed]);
  const plan = useMemo(() => {
    try { return { value: createPlan(config), error: '' }; }
    catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; }
  }, [players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint]);
  const updateStationCode = (id: string, value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    setStationCodes(old => ({ ...old, [id]: digits }));
  };
  const updateLocation = (id: string, field: 'name' | 'description', value: string) => {
    setLocations(old => old.map(location => location.id === id ? { ...location, [field]: value } : location));
  };
  const addLocation = () => {
    setLocations(old => [...old, { id: 'loc-' + nextLocationId, name: '', description: '' }]);
    setNextLocationId(n => n + 1);
  };
  const applyGame = (project: SavedGame) => {
    const c = project.config;
    skipSave.current = true;
    setProjectId(project.id);
    setSelectedProject(project.id);
    setProjectTitle(project.title);
    setPlayers(c.players);
    setGroupSize(c.groupSize);
    setDuration(c.durationMinutes);
    setAge(c.age);
    setGoal(c.goal);
    setLocations(c.locations.map(x => ({...x})));
    setStationCodes({ ...(c.stationCodes ?? {}) });
    setPuzzleSeed(c.puzzleSeed ?? hashSeed(project.id));
    setPuzzleMinutes(c.puzzleMinutes);
    setWalkingMinutes(c.walkingMinutes);
    setStartFinishMinutes(c.startFinishMinutes);
    setStartMode(c.startMode ?? 'distributed');
    setRouteMode(c.routeMode ?? 'same');
    setFinishMode(c.finishMode ?? 'meeting');
    setMeetingPoint(c.meetingPoint ?? 'Zuhause / Treffpunkt');
    setNextLocationId(Math.max(5, c.locations.length + 10));
    setStorageMessage('');
  };
  useEffect(() => {
    try {
      const saved = loadGames();
      setProjects(saved);
      const current = saved.find(p=>p.id===activeGameId()) ?? saved[0];
      if (current) {
        // Apply asynchronously only as a reaction to initial loading; save is gated until initialization is complete.
        applyGame(current);
      }
    } catch(e) { setStorageMessage('Lokale Speicherung: ' + String(e)); }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    if (skipSave.current) { skipSave.current = false; return; }
    const timeout = window.setTimeout(() => {
      try {
        const project: SavedGame = { version:1, id:projectId, title:projectTitle.trim()||'Unbenanntes Projekt', updatedAt:new Date().toISOString(), config: { ...config, locations:config.locations.map(x=>({...x})) } };
        const saved = saveGame(project);
        setProjects(saved);
        setSelectedProject(projectId);
        setStorageMessage('');
      } catch(e) { setStorageMessage('Automatisches Speichern fehlgeschlagen: ' + String(e)); }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [storageReady, projectId, projectTitle, players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, stationCodes, puzzleSeed]);
  const newProject = () => {
    const id = newGameId();
    const fresh: SavedGame = {
      version:1, id, title:'Neue Schnitzeljagd', updatedAt:new Date().toISOString(),
      config: { ...config, locations:initialLocations.map(x=>({...x})), stationCodes: {}, puzzleSeed: hashSeed(id) },
    };
    try { const updated=saveGame(fresh); setProjects(updated); applyGame(fresh); setStorageReady(true); setActiveStep(1); }
    catch(e){ setStorageMessage('Neues Projekt: '+String(e)); }
  };
  const removeProject = () => {
    if (!window.confirm(tx('Dieses Projekt wirklich löschen?', 'Delete this project?'))) return;
    try {
      const remaining = deleteGame(projectId);
      setProjects(remaining);
      if (remaining[0]) { setActiveGameId(remaining[0].id); applyGame(remaining[0]); }
      else { const id = newGameId(); setProjectId(id); setPuzzleSeed(hashSeed(id)); setStationCodes({}); setSelectedProject(''); setProjectTitle('Meine Schnitzeljagd'); setLocations(initialLocations.map(x=>({...x}))); setStorageMessage(''); }
    } catch(e){ setStorageMessage('Löschen fehlgeschlagen: '+String(e)); }
  };
  const exportProject = () => {
    try {
      const project: SavedGame = {version:1,id:projectId,title:projectTitle.trim()||'Unbenanntes Projekt',updatedAt:new Date().toISOString(),config:{...config,locations:config.locations.map(x=>({...x}))}};
      downloadBackup(project);
      setStorageMessage(tx('Projektdatei wurde zum Download vorbereitet.', 'Project backup prepared for download.'));
    } catch(e){ setStorageMessage('Export fehlgeschlagen: '+String(e)); }
  };
  const importProject = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 200_000) throw new Error('Datei zu groß.');
      const imported = parseGameBackup(await file.text());
      const restored: SavedGame = {...imported,id:newGameId(),title:imported.title+' (Import)',updatedAt:new Date().toISOString(),config:{...imported.config,puzzleSeed: imported.config.puzzleSeed ?? hashSeed(imported.id)}};
      const updated = saveGame(restored);
      setProjects(updated);
      applyGame(restored);
      setStorageMessage(tx('Projekt aus Sicherung wiederhergestellt.', 'Project restored from backup.'));
    } catch(e){ setStorageMessage('Import fehlgeschlagen: '+String(e)); }
    finally { if (importRef.current) importRef.current.value=''; }
  };
  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Spurjagd Startseite"><span className="mark">↗</span> SPURJAGD</a>
        <div className="header-actions"><span className="prototype">PROTOTYP 0.3</span>
          <label className="visually-hidden" htmlFor="language">Sprache</label>
          <select id="language" value={lang} onChange={e => setLang(e.target.value as Language)}><option value="de">DE</option><option value="en">EN</option></select>
        </div>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">{tx('DEIN SPIEL. DEINE REGELN.', 'YOUR GAME. YOUR RULES.')}</p>
          <h1>{t.tagline}</h1>
          <p className="intro">{t.intro}</p>
          <a href="#planer" className="hero-link">{t.plan} <span aria-hidden="true">↘</span></a>
        </section>
        <section className="project-bar" aria-label={tx('Projektverwaltung','Project management')}>
          <div className="project-title">
            <label htmlFor="projectTitle">{tx('Projektname','Project name')}</label>
            <input id="projectTitle" value={projectTitle} maxLength={100} onChange={e=>setProjectTitle(e.target.value)}/>
          </div>
          <div className="project-select">
            <label htmlFor="savedProjects">{tx('Gespeicherte Projekte','Saved projects')}</label>
            <select id="savedProjects" value={selectedProject} onChange={e=>{
              const project=projects.find(p=>p.id===e.target.value);
              if(project){setActiveGameId(project.id);applyGame(project);setActiveStep(1);}
            }}>
              {!selectedProject && <option value="">{tx('Aktuelles Projekt','Current project')}</option>}
              {projects.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="project-actions">
            <button type="button" className="secondary" onClick={newProject}>{tx('Neu','New')}</button>
            <button type="button" className="secondary" onClick={exportProject}>{tx('Sichern','Export')}</button>
            <button type="button" className="secondary" onClick={()=>importRef.current?.click()}>{tx('Laden','Import')}</button>
            <button type="button" className="text-button" onClick={removeProject}>{tx('Löschen','Delete')}</button>
            <input ref={importRef} type="file" accept=".json,application/json" className="visually-hidden" onChange={e=>void importProject(e.target.files?.[0])}/>
          </div>
          {storageMessage && <p className="storage-message" role="status">{storageMessage}</p>}
          <p className="storage-note">{tx('Automatische Speicherung in diesem Browser. Für andere Geräte die JSON-Sicherung verwenden.', 'Automatically saved in this browser. Export a JSON backup to use another device.')}</p>
        </section>
        <section id="planer" className="wizard">
          <nav className="steps" aria-label={tx('Planungsschritte','Planning steps')}>
            {[
              tx('Gruppe & Zeit', 'Group & time'),
              tx('Standorte', 'Locations'),
              tx('Spielregeln', 'Game rules'),
              tx('Spielplan', 'Game plan'),
            ].map((label, i) => <button key={i} className={activeStep === i + 1 ? 'step-button active' : 'step-button'} onClick={() => setActiveStep(i + 1)} aria-current={activeStep === i + 1 ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{label}</button>)}
          </nav>
          <div className="panel wizard-panel">
            {activeStep === 1 && <>
              <div className="section-line"><span className="step">01</span><h2>{tx('Teilnehmer & Dauer','Participants & duration')}</h2></div>
              <p className="helper">{tx('Diese Angaben bestimmen die Anzahl der Gruppen und wie viele Stationen zeitlich passen.','These settings determine team sizes and the number of stops that fit the schedule.')}</p>
              <div className="form-grid">
                <label>{t.children}<input min="1" max="100" type="number" value={players} onChange={e => setPlayers(Number(e.target.value))}/></label>
                <label>{t.size}<input min="1" max="10" type="number" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))}/></label>
                <label>{t.age}<select value={age} onChange={e => setAge(e.target.value)}><option>4–6</option><option>6–8</option><option>8–10</option><option>11–13</option><option>14+</option></select></label>
                <label>{t.duration}<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option><option value={180}>180 min</option></select></label>
              </div>
            </>}
            {activeStep === 2 && <>
              <div className="section-line"><span className="step">02</span><h2>{t.locations}</h2></div>
              <p className="helper">{tx('Trage die Orte ein und beschreibe, was dort zu sehen ist. Später erzeugen wir daraus passende Rätsel.','Name each stop and describe what can be seen there. This will later be used to generate puzzles.')}</p>
              <div className="location-list">{locations.map((location, index) =>
                <div className="location-card" key={location.id}>
                  <div className="location-title"><strong>{tx('Station','Stop')} {index + 1}</strong><button type="button" className="text-button" disabled={locations.length === 1} onClick={()=>{setLocations(old=>old.filter(p=>p.id !== location.id));setStationCodes(old=>{const updated={...old};delete updated[location.id];return updated;});}}>{tx('Entfernen','Remove')}</button></div>
                  <label>{tx('Name des Ortes','Location name')}<input value={location.name} maxLength={80} placeholder={tx('z. B. Spielplatz','e.g. playground')} onChange={e=>updateLocation(location.id,'name',e.target.value)}/></label>
                  <label>{tx('Beschreibung (optional)','Description (optional)')}<textarea rows={2} maxLength={400} value={location.description} onChange={e=>updateLocation(location.id,'description',e.target.value)} placeholder={tx('Was gibt es hier?','What is there?')}/></label>
                  {goal === 'locks' && <label>{tx('Vorhandener Schloss-Code (3 oder 4 Ziffern)','Lock code (3 or 4 digits)')}
                    <input type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={stationCodes[location.id] ?? ''} onChange={e=>updateStationCode(location.id,e.target.value)} placeholder="007 oder 0007" aria-invalid={Boolean(stationCodes[location.id]) && !validCode(stationCodes[location.id],stationCodes[location.id].length)}/>
                    <small>{tx('Den tatsächlich eingestellten Code eingeben. Führende Nullen bleiben erhalten.','Enter the actual lock code. Leading zeros are preserved.')}</small>
                  </label>}
                </div>
              )}</div>
              <button type="button" className="secondary" onClick={addLocation} disabled={locations.length>=20}>+ {tx('Standort hinzufügen','Add location')}</button>
            </>}
            {activeStep === 3 && <>
              <div className="section-line"><span className="step">03</span><h2>{tx('Spielziel und Zeitansätze','Game rules and timing')}</h2></div>
              <fieldset><legend>{t.outcome}</legend>
                <label className="radio"><input type="radio" checked={goal==='locks'} onChange={()=>setGoal('locks')}/>{t.locks}</label>
                <label className="radio"><input type="radio" checked={goal==='word'} onChange={()=>setGoal('word')}/>{t.word}</label>
                <label className="radio"><input type="radio" checked={goal==='cards'} onChange={()=>setGoal('cards')}/>{t.cards}</label>
              </fieldset>
              <div className="route-options">
                <h3>{tx('Start, Strecke und Ziel festlegen', 'Configure start, route and finish')}</h3>
                <div className="form-grid">
                  <label>{tx('Startpunkte', 'Starting points')}
                    <select value={startMode} onChange={e=>setStartMode(e.target.value as StartMode)}>
                      <option value="shared">{tx('Alle am selben Ort', 'Same for all teams')}</option>
                      <option value="distributed">{tx('Auf verschiedene Orte verteilen', 'Distributed across locations')}</option>
                    </select>
                  </label>
                  <label>{tx('Routenführung', 'Route direction')}
                    <select value={routeMode} onChange={e=>setRouteMode(e.target.value as RouteMode)}>
                      <option value="same">{tx('Gleiche Umlaufrichtung', 'Same circuit direction')}</option>
                      <option value="varied">{tx('Wechselnde Umlaufrichtung', 'Alternating circuit direction')}</option>
                    </select>
                  </label>
                  <label>{tx('Zielpunkt', 'Finish location')}
                    <select value={finishMode} onChange={e=>setFinishMode(e.target.value as FinishMode)}>
                      <option value="meeting">{tx('Gemeinsamer Treffpunkt', 'Shared meeting point')}</option>
                      <option value="start">{tx('Zur eigenen Startstation', 'Back to own starting location')}</option>
                    </select>
                  </label>
                  {finishMode==='meeting' && <label>{tx('Name des Treffpunkts', 'Meeting point name')}
                    <input value={meetingPoint} maxLength={80} onChange={e=>setMeetingPoint(e.target.value)}/>
                  </label>}
                </div>
                <p className="helper">{tx('Bei gleicher Umlaufrichtung und verteilten Startpunkten beginnt jedes Team an einer anderen Stelle derselben Runde. Wechselnde Umlaufrichtung kehrt die Folge für jedes zweite Team um. Entfernungen werden noch nicht berechnet.', 'With the same circuit direction and distributed starts, teams enter the same circuit at different locations. Alternating direction reverses the order for every second team. Distances are not calculated yet.')}</p>
              </div>
              <p className="helper">{tx('Zeitannahmen für die Planung. Sie ersetzen keine Prüfung der Wege vor Ort.','Planning assumptions only. Check actual routes before the event.')}</p>
              <div className="form-grid">
                <label>{tx('Rätselzeit je Station (Min.)','Puzzle time per stop (min)')}<input type="number" min="1" max="60" value={puzzleMinutes} onChange={e=>setPuzzleMinutes(Number(e.target.value))}/></label>
                <label>{tx('Gehzeit je Abschnitt (Min.)','Walking time per leg (min)')}<input type="number" min="0" max="60" value={walkingMinutes} onChange={e=>setWalkingMinutes(Number(e.target.value))}/></label>
                <label>{tx('Start und Finale zusammen (Min.)','Start and finish together (min)')}<input type="number" min="0" max="120" value={startFinishMinutes} onChange={e=>setStartFinishMinutes(Number(e.target.value))}/></label>
              </div>
            </>}
            {activeStep === 4 && <>
              <div className="section-line"><span className="step">04</span><h2>{t.route}</h2></div>
              {plan.error ? <p className="error" role="alert">{plan.error}</p> : plan.value && <>
                <div className="stats">
                  <div className="stat"><strong>{plan.value.teams.length}</strong><span>{t.teams}</span></div>
                  <div className="stat"><strong>{plan.value.stopsPerTeam}</strong><span>{tx('Stationen je Team','Stops per team')}</span></div>
                  <div className="stat"><strong>{plan.value.estimatedMinutes}</strong><span>{tx('Geschätzte Minuten','Estimated minutes')}</span></div>
                </div>
                <p className="helper">{tx('Noch frei im Zeitbudget','Remaining time buffer')}: {plan.value.remainderMinutes} min</p>
                <div className="team-list">{plan.value.teams.map((team,i)=>
                  <article className="team" key={i}>
                    <h3>{en ? 'Team ' + (i+1) : 'Team '+team.name}<span>{team.memberCount} {en?'participants':'Kinder'}</span></h3>
                    <p>{team.stations.map(s => s.name).join(' → ')} → {team.finish}</p>
                  </article>
                )}</div>
                <div className="warnings">{plan.value.cautions.map((warning,i)=><p key={i}>• {warning}</p>)}</div>
                {goal === 'locks' && <section className="challenge-preview" aria-label={tx('Rätsel je Station','Puzzles per station')}>
                  <h3>{tx('Schloss-Rätsel für die Stationen','Lock puzzles for each station')}</h3>
                  {lockPreview.errors.length > 0 && <p className="error" role="alert">{tx('Bitte bei folgenden Stationen einen vollständigen drei- oder vierstelligen Code eintragen: ', 'Please enter a complete 3- or 4-digit code for: ')}{lockPreview.errors.join(', ')}</p>}
                  {lockPreview.errors.length === 0 && <>
                    <p className="helper">{tx('Die Aufgaben liefern die Codeziffern in der richtigen Reihenfolge. Die Lösungen erscheinen nur für die Spielleitung und werden beim normalen Drucken ausgeblendet.','Each puzzle supplies one lock digit in order. Leader answers are hidden when printing.')}</p>
                    {lockPreview.challenges.map(({location,challenge})=><article className="station-worksheet" key={location.id}>
                      <h4>{tx('Station','Station')}: {location.name}</h4>
                      <p className="worksheet-intro">{tx('Löst die Aufgaben nacheinander. Jede Lösung ergibt eine Ziffer für euer Schloss.','Solve the puzzles in order. Each answer gives a digit for your lock.')}</p>
                      <div className="worksheet-puzzles">{challenge.puzzles.map((puzzle,i)=><section className="worksheet-puzzle" key={puzzle.id}>
                        <strong>{tx('Aufgabe','Puzzle')} {i+1}</strong>
                        <p>{puzzle.instruction}</p>
                        {puzzle.render ? <div className="worksheet-symbols" aria-label={tx('Zeichen zum Zählen','Countable symbols')}>{Array.from({length:puzzle.render.count},(_,j)=><span key={j}>{puzzle.render?.symbol}</span>)}</div> : null}
                        <p className="worksheet-question">{puzzle.question}</p>
                        <p className="worksheet-answer">{tx('Meine Ziffer:','My digit:')} ______</p>
                      </section>)}</div>
                      <p className="worksheet-answer">{tx('Schloss-Code:','Lock code:')} {'_ '.repeat(challenge.puzzles.length)}</p>
                      <div className="leader-only"><strong>{tx('Nur Spielleitung – nicht auf dem Kinderblatt:','Leader only – not on the child worksheet:')}</strong> {challenge.code}
                        <p>{challenge.puzzles.map((puzzle,i)=>`${i+1}. ${puzzle.explanation}`).join(' | ')}</p>
                      </div>
                    </article>)}
                  </>}
                </section>}
                <button type="button" className="print" disabled={goal==='locks' && lockPreview.errors.length>0} onClick={()=>window.print()}>{t.print} ↗</button>
              </>}
              <p className="disclaimer">{t.note}</p>
            </>}
            <div className="wizard-actions">
              <button type="button" className="secondary" disabled={activeStep===1} onClick={()=>setActiveStep(s=>Math.max(1,s-1))}>← {tx('Zurück','Back')}</button>
              {activeStep<4 && <button type="button" className="next" onClick={()=>setActiveStep(s=>Math.min(4,s+1))}>{tx('Weiter','Continue')} →</button>}
            </div>
          </div>
        </section>
        <footer><span>SPURJAGD · 2026</span><span>{t.privacy}</span></footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
