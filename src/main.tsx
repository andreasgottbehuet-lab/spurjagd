import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, type GameGoal, type Location, type StartMode, type RouteMode, type FinishMode } from './generator';
import { messages, type Language } from './i18n';
import { generateStationChallenge, hashSeed, validCode, type AgeLevel, type StationChallenge } from './puzzles';
import { createPrintKit, clueDestinations, destinationClueKey, expectedClueTarget, routeClueKey, type DestinationClues, type RouteClues } from './print-kit';
import { PrintView } from './print-view';
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
  const [projectId, setProjectId] = useState<string>(() => newGameId());
  const [stationCodes, setStationCodes] = useState<Record<string, string>>({});
  const [routeClues, setRouteClues] = useState<RouteClues>({});
  const [destinationClues, setDestinationClues] = useState<DestinationClues>({});
  const [showTeamClues, setShowTeamClues] = useState(false);
  const [printMode, setPrintMode] = useState<'children' | 'clues' | 'leader'>('children');
  const [puzzleSeed, setPuzzleSeed] = useState<number>(() => hashSeed(projectId));
  const [projectTitle, setProjectTitle] = useState('Meine Schnitzeljagd');
  const [projects, setProjects] = useState<SavedGame[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const currentProject = useRef<SavedGame | null>(null);
  const unsavedChanges = useRef(false);
  const [selectedProject, setSelectedProject] = useState('');

  const t = messages[lang];
  const en = lang === 'en';
  const tx = (de: string, english: string) => en ? english : de;
  const config = { players, groupSize, durationMinutes: duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, stationCodes, puzzleSeed, routeClues, ...(Object.keys(destinationClues).length ? { destinationClues } : {}) };
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
  const printKit = useMemo(() => plan.value && goal === 'locks' ? createPrintKit(plan.value, stationCodes, routeClues, ageLevel, puzzleSeed, destinationClues) : null,
    [plan.value, goal, stationCodes, routeClues, ageLevel, puzzleSeed, destinationClues]);
  const updateRouteClue = (teamIndex: number, stopIndex: number, target: string, text: string) => {
    setRouteClues(old => ({ ...old, [routeClueKey(teamIndex, stopIndex)]: { to: target, text } }));
  };
  const useSharedClue = (key: string) => {
    setRouteClues(old => { const next = { ...old }; delete next[key]; return next; });
  };
  const printPacket = (mode: 'children' | 'clues' | 'leader') => {
    if (!printKit || printKit.issues.length > 0) return;
    setPrintMode(mode);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };
  const updateStationCode = (id: string, value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    setStationCodes(old => ({ ...old, [id]: digits }));
  };
  const updateLocation = (id: string, field: 'name' | 'description', value: string) => {
    setLocations(old => old.map(location => location.id === id ? { ...location, [field]: value } : location));
  };
  const addLocation = () => {
    let id = 'loc-' + newGameId();
    while (locations.some(location => location.id === id)) id = 'loc-' + newGameId();
    setLocations(old => [...old, { id, name: '', description: '' }]);
  };
  const applyGame = (project: SavedGame) => {
    const c = project.config;
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
    setRouteClues({ ...(c.routeClues ?? {}) });
    setDestinationClues({ ...(c.destinationClues ?? {}) });
    setShowTeamClues(Object.keys(c.routeClues ?? {}).length > 0);
    setPuzzleSeed(c.puzzleSeed ?? hashSeed(project.id));
    setPuzzleMinutes(c.puzzleMinutes);
    setWalkingMinutes(c.walkingMinutes);
    setStartFinishMinutes(c.startFinishMinutes);
    setStartMode(c.startMode ?? 'distributed');
    setRouteMode(c.routeMode ?? 'same');
    setFinishMode(c.finishMode ?? 'meeting');
    setMeetingPoint(c.meetingPoint ?? 'Zuhause / Treffpunkt');
    setStorageMessage('');
  };
  // Also called before navigation. Read the latest committed form state, including
  // edits made while an imported file was being read asynchronously.
  const saveCurrentProject = (): boolean => {
    if (!storageReady || !currentProject.current) {
      setStorageMessage('Lokale Projekte konnten nicht geladen werden. Ein Projektwechsel ist nicht möglich.');
      return false;
    }
    try {
      const snapshot = currentProject.current;
      setProjects(saveGame(snapshot));
      setSelectedProject(snapshot.id);
      unsavedChanges.current = false;
      setStorageMessage(message => message.startsWith('Aktuelle Änderungen sind nicht gespeichert.') ? '' : message);
      return true;
    } catch (e) {
      unsavedChanges.current = true;
      setStorageMessage('Aktuelle Änderungen sind nicht gespeichert. Bitte Eingaben prüfen; bei Speicherproblemen eine JSON-Sicherung herunterladen. ' + String(e));
      return false;
    }
  };
  useEffect(() => {
    try {
      const saved = loadGames();
      setProjects(saved);
      const current = saved.find(p=>p.id===activeGameId()) ?? saved[0];
      if (current) {
        applyGame(current);
      }
      setStorageReady(true);
    } catch(e) { setStorageMessage('Lokale Speicherung: ' + String(e)); }
  }, []);
  useLayoutEffect(() => {
    currentProject.current = {
      version:1, id:projectId, title:projectTitle.trim()||'Unbenanntes Projekt',
      updatedAt:new Date().toISOString(),
      config: { ...config, locations:config.locations.map(x=>({...x})) },
    };
    if (!storageReady) return;
    // Synchronous storage before the browser can navigate or reload.
    saveCurrentProject();
  }, [storageReady, projectId, projectTitle, players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, stationCodes, puzzleSeed, routeClues, destinationClues]);
  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!unsavedChanges.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, []);
  const newProject = () => {
    if (!saveCurrentProject()) return;
    const id = newGameId();
    const fresh: SavedGame = {
      version:1, id, title:'Neue Schnitzeljagd', updatedAt:new Date().toISOString(),
      config: { ...config, locations:initialLocations.map(x=>({...x})), stationCodes: {}, routeClues: {}, destinationClues: undefined, puzzleSeed: hashSeed(id) },
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
      else { const id = newGameId(); setProjectId(id); setPuzzleSeed(hashSeed(id)); setStationCodes({}); setRouteClues({}); setDestinationClues({}); setSelectedProject(''); setProjectTitle('Meine Schnitzeljagd'); setLocations(initialLocations.map(x=>({...x}))); setStorageMessage(''); }
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
      if (!saveCurrentProject()) return;
      const restored: SavedGame = {...imported,id:newGameId(),title:imported.title.slice(0,91)+' (Import)',updatedAt:new Date().toISOString(),config:{...imported.config,puzzleSeed: imported.config.puzzleSeed ?? hashSeed(imported.id)}};
      const updated = saveGame(restored);
      setProjects(updated);
      applyGame(restored);
      setStorageMessage(tx('Projekt aus Sicherung wiederhergestellt.', 'Project restored from backup.'));
    } catch(e){ setStorageMessage('Import fehlgeschlagen: '+String(e)); }
    finally { if (importRef.current) importRef.current.value=''; }
  };
  return (
    <div className={goal === 'locks' && printKit && printKit.issues.length === 0 ? 'app print-ready' : 'app'}>
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
              if (!project || project.id === projectId || !saveCurrentProject()) return;
              try { setActiveGameId(project.id); applyGame(project); setActiveStep(1); }
              catch (e) { setStorageMessage('Projektwechsel fehlgeschlagen: ' + String(e)); }
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
                {goal === 'locks' ? <>
                  <section className="clue-editor">
                    <h3>{tx('Rätsel für den nächsten Ort', 'Clues for the next location')}</h3>
                    <p className="helper">{tx('Schreibe jeden Hinweis einmal für den Zielort. Alle Teams auf dem Weg dorthin verwenden ihn, sofern kein eigener Teamhinweis eingetragen ist. Beschreibe nur, was vor Ort tatsächlich vorhanden ist, und nenne den Zielort nicht direkt.', 'Write each destination clue once. All teams heading there use it unless they have an individual clue. Describe actual surroundings without directly naming the destination.')}</p>
                    <p className="helper">{tx('Gemeinsame Hinweise müssen aus allen Anlaufrichtungen passen. Für eine besondere Wegbeschreibung verwende einen individuellen Teamhinweis.', 'Shared clues must work from every approach. Use an individual team clue for directions specific to one route.')}</p>
                    <div className="destination-clues">
                      <h4>{tx('Gemeinsame Hinweise', 'Shared destination clues')}</h4>
                      {clueDestinations(plan.value).map(destination => <label className="destination-clue" key={destination.key}>
                        {destination.isFinal ? tx('Zum Finale: ', 'To the finish: ') : tx('Zum Ort: ', 'To the location: ')}{destination.name}
                        <textarea rows={2} maxLength={240} value={destinationClues[destination.key] ?? ''}
                          placeholder={tx('Ortsrätsel für alle Teams eingeben', 'Enter a shared destination riddle')}
                          onChange={e=>setDestinationClues(old=>({...old,[destination.key]:e.target.value}))}/>
                        <small>{destination.visits} {tx('Teamwege führen hierher. Eigene Teamhinweise haben Vorrang.', 'team visits lead here. Individual team clues take precedence.')}</small>
                      </label>)}
                    </div>
                    <details className="team-clue-options" open={showTeamClues} onToggle={e=>setShowTeamClues(e.currentTarget.open)}>
                      <summary>{tx('Individuelle Teamhinweise (optional)', 'Individual team clues (optional)')}</summary>
                      <p className="helper">{tx('Vorhandene Teamhinweise bleiben erhalten. Entferne das Häkchen, um stattdessen den gemeinsamen Hinweis zu verwenden.', 'Existing team clues are preserved. Uncheck a custom clue to use the shared clue instead.')}</p>
                      {plan.value.teams.map((team, teamIndex) => <div className="clue-team" key={teamIndex}>
                      <h4>{tx('Team', 'Team')} {team.name}</h4>
                      {team.stations.map((station, stopIndex) => {
                        const key = routeClueKey(teamIndex, stopIndex);
                        const target = expectedClueTarget(team.stations, stopIndex, team.finish);
                        const own = routeClues[key];
                        const shared = destinationClues[destinationClueKey(team.stations, stopIndex, team.finish)] ?? '';
                        const next = team.stations[stopIndex + 1]?.name ?? team.finish;
                        return <div className="clue-row" key={key}>
                          <p>{tx('Nach', 'After')} {station.name} → {tx('Hinweis für', 'Clue for')} {next}</p>
                          <label className="override-toggle">
                            <input type="checkbox" checked={Boolean(own)} onChange={e=>e.target.checked
                              ? updateRouteClue(teamIndex,stopIndex,target,shared)
                              : useSharedClue(key)}/>
                            {tx('Eigenen Hinweis verwenden', 'Use an individual clue')}
                          </label>
                          {own ? <>
                            {own.to !== target && <p className="error" role="alert">{tx('Ziel geändert: Diesen Hinweis prüfen und für das neue Ziel bestätigen oder auf den gemeinsamen Hinweis zurückstellen.', 'Destination changed: review and confirm this clue for the new target, or switch back to the shared clue.')}</p>}
                            <label>{tx('Eigener Hinweis', 'Individual clue')}
                              <textarea rows={2} maxLength={240} value={own.text} onChange={e=>updateRouteClue(teamIndex,stopIndex,target,e.target.value)}/>
                            </label>
                            {own.to !== target && <button type="button" className="secondary" onClick={()=>updateRouteClue(teamIndex,stopIndex,target,own.text)}>{tx('Für dieses Ziel bestätigen', 'Confirm for this destination')}</button>}
                          </> : <p className="inherited-clue">{shared || tx('Gemeinsamen Hinweis oben ergänzen.', 'Enter the shared clue above.')}</p>}
                        </div>;
                      })}
                      </div>)}
                    </details>
                  </section>
                  <section className="print-packet-controls">
                    <h3>{tx('Druckpaket', 'Print packet')}</h3>
                    {printKit && printKit.issues.length > 0 && <div className="print-preflight" role="alert">
                      <strong>{tx('Vor dem Druck noch erledigen:', 'Before printing:')}</strong>
                      <ul>{printKit.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul>
                    </div>}
                    {printKit && printKit.issues.length === 0 && <p className="helper">{tx('Fertig:','Ready:')} {printKit.cards.length} {tx('Kinderkarten auf','child cards on')} {printKit.sheetCount} {tx('A4-Blättern. Die Spielleitung bekommt ein getrenntes Lösungsblatt.', 'A4 sheets. The leader receives a separate answer sheet.')}</p>}
                    <div className="print-buttons">
                      <button type="button" className="print" disabled={!printKit || printKit.issues.length>0} onClick={()=>printPacket('children')}>{tx('Rätselkarten drucken (2 × A5 auf A4)', 'Print puzzle cards (2 × A5 on A4)')}</button>
                      <button type="button" className="secondary" disabled={!printKit || printKit.issues.length>0} onClick={()=>printPacket('clues')}>{tx('Geheime Hinweiskarten drucken', 'Print secret clue cards')}</button>
                      <button type="button" className="secondary" disabled={!printKit || printKit.issues.length>0} onClick={()=>printPacket('leader')}>{tx('Spielleitung: Lösungen drucken', 'Print leader answers')}</button>
                    </div>
                    <p className="helper">{tx('Rätselkarten und geheime Hinweiskarten getrennt ausdrucken und ausschneiden. Hinweise vor Spielbeginn am angegebenen Ort hinter dem Schloss oder in einem Umschlag bereitlegen und erst nach gelöstem Rätsel freigeben. Papierformat A4, Querformat und Skalierung 100 % wählen. Druckvorschau und echte Schlösser prüfen.', 'Print and cut puzzle cards and secret clue cards separately. Place clues at their labelled stop behind the lock or in an envelope; release only after the puzzle is solved. Use A4 landscape at 100% scale. Check the preview and physical locks.')}</p>
                  </section>
                </> : <button type="button" className="print" onClick={()=>window.print()}>{t.print} ↗</button>}
              </>}
              <p className="disclaimer">{t.note}</p>
            </>}
            <div className="wizard-actions">
              <button type="button" className="secondary" disabled={activeStep===1} onClick={()=>setActiveStep(s=>Math.max(1,s-1))}>← {tx('Zurück','Back')}</button>
              {activeStep<4 && <button type="button" className="next" onClick={()=>setActiveStep(s=>Math.min(4,s+1))}>{tx('Weiter','Continue')} →</button>}
            </div>
          </div>
        </section>
        {goal === 'locks' && printKit && printKit.issues.length === 0 && <PrintView projectTitle={projectTitle} kit={printKit} mode={printMode}/>}
        <footer><span>SPURJAGD · 2026</span><span>{t.privacy}</span></footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
