import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, type GameGoal, type Location, type StartMode, type RouteMode, type FinishMode, type TeamProfile } from './generator';
import { messages, type Language } from './i18n';
import { generateStationChallenge, codeFromPuzzles, hashSeed, validCode, generateCreativeRouteClue, type RouteClueMode, type AgeLevel } from './puzzles';
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
  const [startPoint, setStartPoint] = useState('Zuhause / Treffpunkt');
  const [sameStartFinish, setSameStartFinish] = useState(false);
  const [stationCodes, setStationCodes] = useState<Record<string,string>>({});
  const [teamProfiles, setTeamProfiles] = useState<Record<string,TeamProfile>>({});
  const [routeClueModes, setRouteClueModes] = useState<Record<string,RouteClueMode>>({});
  const [routeClueTexts, setRouteClueTexts] = useState<Record<string,string>>({});
  const [hiddenLocations, setHiddenLocations] = useState<Location[]>([]);
  const [activeStep, setActiveStep] = useState(1);
  const [nextLocationId, setNextLocationId] = useState(5);
  const [projectId, setProjectId] = useState<string>(() => newGameId());
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
  const config = { players, groupSize, durationMinutes: duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, stationCodes, routeClueModes, routeClueTexts, teamProfiles };
  const plan = useMemo(() => {
    try { return { value: createPlan(config), error: '' }; }
    catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; }
  }, [players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, stationCodes, routeClueModes, routeClueTexts]);
  const printIssues = [
    ...(plan.error ? [plan.error] : []),
    ...(goal !== 'locks' ? ['Das Druckpaket unterstützt derzeit nur Schloss-Codes.'] : []),
    ...locations.filter(l=>!l.name.trim()).map((_,i)=>'Mindestens ein Stationsname fehlt ('+(i+1)+').'),
    ...locations.filter(l=>!validCode(stationCodes[l.id]??'')).map(l=>'Ungültiger Code: '+(l.name||l.id)),
    ...(!startPoint.trim()?['Startort fehlt.']:[]),
    ...(finishMode==='meeting'&&!meetingPoint.trim()?['Zielort fehlt.']:[]),
  ];
  if (plan.value) {
    const destinations = new Set(plan.value.teams.flatMap(team => team.stations.map((station,i) => team.stations[i+1]?.name ?? team.finish)));
    for (const destination of destinations) {
      const target = locations.find(l => l.name === destination);
      const mode = routeClueModes[target?.id ?? ''] ?? 'letters';
      const description = target?.description ?? '';
      const custom = routeClueTexts[target?.id ?? ''] ?? '';
      try {
        generateCreativeRouteClue(destination,description,mode,hashSeed(projectId+':destination:'+(target?.id??destination)),custom);
      } catch(error) {
        printIssues.push('Wegrätsel für '+destination+': '+(error instanceof Error?error.message:String(error)));
      }
    }
  }
  const ageLevel: AgeLevel = age === '4–6' || age === '6–8' ? 'young' : age === '8–10' ? 'middle' : 'older';
  const challenges = useMemo(() => {
    if (goal !== 'locks') return [];
    return locations.filter(l=>validCode(stationCodes[l.id] ?? '')).map(l=>{
      const challenge=generateStationChallenge(l.id,stationCodes[l.id],ageLevel,hashSeed(projectId));
      if(codeFromPuzzles(challenge)!==stationCodes[l.id]) throw new Error('Codeprüfung fehlgeschlagen');
      return {location:l,challenge};
    });
  },[locations,stationCodes,ageLevel,projectId,goal]);
  const updateLocation = (id: string, field: 'name' | 'description', value: string) => {
    setLocations(old => old.map(location => location.id === id ? { ...location, [field]: value } : location));
  };
  const changeStationCount = (count: number) => {
    if (count < locations.length) {
      setHiddenLocations(old => [...locations.slice(count), ...old]);
      setLocations(old => old.slice(0, count));
    } else if (count > locations.length) {
      const needed = count - locations.length;
      const reused = hiddenLocations.slice(0, needed);
      const additional = Array.from({length:needed-reused.length},(_,i)=>({id:'loc-'+(nextLocationId+i),name:'',description:''}));
      setLocations(old => [...old,...reused,...additional]);
      setHiddenLocations(old => old.slice(needed));
      setNextLocationId(n=>n+additional.length);
    }
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
    setHiddenLocations([]);
    setPuzzleMinutes(c.puzzleMinutes);
    setWalkingMinutes(c.walkingMinutes);
    setStartFinishMinutes(c.startFinishMinutes);
    setStartMode(c.startMode ?? 'distributed');
    setRouteMode(c.routeMode ?? 'same');
    setFinishMode(c.finishMode ?? 'meeting');
    setMeetingPoint(c.meetingPoint ?? 'Zuhause / Treffpunkt');
    setStartPoint(c.startPoint ?? c.meetingPoint ?? 'Zuhause / Treffpunkt');
    setSameStartFinish(c.finishMode === 'origin');
    setStationCodes(c.stationCodes ?? {});
    setTeamProfiles(c.teamProfiles ?? {});
    setRouteClueModes(c.routeClueModes ?? {});
    setRouteClueTexts(c.routeClueTexts ?? {});
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
  }, [storageReady, projectId, projectTitle, players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, stationCodes, routeClueModes, routeClueTexts, teamProfiles]);
  const newProject = () => {
    const fresh: SavedGame = {
      version:1, id:newGameId(), title:'Neue Schnitzeljagd', updatedAt:new Date().toISOString(),
      config: { ...config, locations:initialLocations.map(x=>({...x})), stationCodes:{},routeClueModes:{},routeClueTexts:{},teamProfiles:{} },
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
      else { setProjectId(newGameId()); setSelectedProject(''); setProjectTitle('Meine Schnitzeljagd'); setStorageMessage(''); }
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
      const restored: SavedGame = {...imported,id:newGameId(),title:imported.title+' (Import)',updatedAt:new Date().toISOString()};
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
              tx('Spielregeln', 'Game rules'),
              tx('Standorte', 'Locations'),
              tx('Spielplan', 'Game plan'),
            ].map((label, i) => <button key={i} className={activeStep === i + 1 ? 'step-button active' : 'step-button'} onClick={() => setActiveStep(i + 1)} aria-current={activeStep === i + 1 ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{label}</button>)}
          </nav>
          <div className="panel wizard-panel">
            {activeStep === 1 && <>
              <div className="section-line"><span className="step">01</span><h2>{tx('Teilnehmer & Dauer','Participants & duration')}</h2></div>
              <p className="helper">{tx('Diese Angaben bestimmen die Anzahl der Gruppen und wie viele Stationen zeitlich passen.','These settings determine team sizes and the number of stops that fit the schedule.')}</p>
              <div className="form-grid">
                <label className="range-field"><span>{t.children}: <strong>{players}</strong></span><input min="1" max="100" type="range" value={players} onChange={e => setPlayers(Number(e.target.value))}/></label>
                <label className="range-field"><span>{t.size}: <strong>{groupSize}</strong></span><input min="1" max="10" type="range" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))}/></label>
                <label>{t.age}<select value={age} onChange={e => setAge(e.target.value)}><option>4–6</option><option>6–8</option><option>8–10</option><option>11–13</option><option>14+</option></select></label>
                <label>{t.duration}<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option><option value={180}>180 min</option></select></label>
              </div>
            </>}
            {activeStep === 3 && <>
              <div className="section-line"><span className="step">03</span><h2>{t.locations}</h2></div>
              <p className="helper">{tx('Trage die Orte ein und beschreibe, was dort zu sehen ist. Später erzeugen wir daraus passende Rätsel.','Name each stop and describe what can be seen there. This will later be used to generate puzzles.')}</p>
              <label className="range-field location-range"><span>{tx("Anzahl Rätselstationen", "Number of puzzle stations")}: <strong>{locations.length}</strong></span><input type="range" min="1" max="20" value={locations.length} onChange={e=>changeStationCount(Number(e.target.value))}/></label>
              <div className="location-card"><div className="location-title"><strong>{tx("Start", "Start")}</strong></div><label>{tx("Name des Startorts", "Start location name")}<input maxLength={80} value={startPoint} onChange={e=>setStartPoint(e.target.value)}/></label></div>
              <label className="checkbox-line"><input type="checkbox" checked={sameStartFinish} onChange={e=>{const checked=e.target.checked;setSameStartFinish(checked);setFinishMode(checked?"origin":"meeting");}}/>{tx("Start ist Ziel", "Start is finish")}</label>
              <div className="location-list">{locations.map((location, index) =>
                <div className="location-card" key={location.id}>
                  <div className="location-title"><strong>{tx('Station','Stop')} {index + 1}</strong><button type="button" className="text-button" disabled={locations.length === 1} onClick={()=>setLocations(old=>old.filter(p=>p.id !== location.id))}>{tx('Entfernen','Remove')}</button></div>
                  <label>{tx('Name des Ortes','Location name')}<input value={location.name} maxLength={80} placeholder={tx('z. B. Spielplatz','e.g. playground')} onChange={e=>updateLocation(location.id,'name',e.target.value)}/></label>
                  <label>{tx('Beschreibung (optional)','Description (optional)')}<textarea rows={2} maxLength={400} value={location.description} onChange={e=>updateLocation(location.id,'description',e.target.value)} placeholder={tx('Was gibt es hier?','What is there?')}/></label>
                  <label>{tx('Wegrätsel, das zu diesem Ort führt','Route clue leading to this place')}<select value={routeClueModes[location.id]??'letters'} onChange={e=>setRouteClueModes(old=>({...old,[location.id]:e.target.value as RouteClueMode}))}><option value="description">Ortsbeschreibung erraten</option><option value="questions">Fragen mit Lösungswort</option><option value="letters">Buchstabenspiel</option><option value="custom">Eigenes Wegrätsel</option></select></label>
                  {routeClueModes[location.id]==='custom' && <label>{tx('Eigener Rätseltext','Custom clue')}<textarea rows={3} value={routeClueTexts[location.id]??''} onChange={e=>setRouteClueTexts(old=>({...old,[location.id]:e.target.value}))}/></label>}
                  {goal==='locks' && <label>{tx('Dreistelliger Schloss-Code','Three-digit lock code')}<input inputMode="numeric" pattern="[0-9]{3}" maxLength={3} placeholder="z. B. 007" value={stationCodes[location.id] ?? ''} onChange={e=>setStationCodes(old=>({...old,[location.id]:e.target.value.replace(/[^0-9]/g,'').slice(0,3)}))}/></label>}
                </div>
              )}</div>
              {!sameStartFinish && <div className="location-card"><div className="location-title"><strong>{tx("Ziel","Finish")}</strong></div><label>{tx("Name des Zielorts","Finish location name")}<input maxLength={80} value={meetingPoint} onChange={e=>setMeetingPoint(e.target.value)}/></label></div>}
              <button type="button" className="secondary" onClick={addLocation} disabled={locations.length>=20}>+ {tx('Standort hinzufügen','Add location')}</button>
            </>}
            {activeStep === 2 && <>
              <div className="section-line"><span className="step">02</span><h2>{tx('Spielziel und Zeitansätze','Game rules and timing')}</h2></div>
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
                    <select value={finishMode} onChange={e=>{const value=e.target.value as FinishMode;setFinishMode(value);setSameStartFinish(value==='origin');}}>
                      <option value="origin">{tx("Gemeinsamer Startort", "Shared starting location")}</option>
                      <option value="meeting">{tx('Gemeinsamer Treffpunkt', 'Shared meeting point')}</option>
                      <option value="start">{tx('Zur eigenen Startstation', 'Back to own starting location')}</option>
                    </select>
                  </label>
                  {false && finishMode==='meeting' && <label>{tx('Name des Treffpunkts', 'Meeting point name')}
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
                {goal==='locks' && <section className="challenge-preview"><h3>{tx("Schlossrätsel – Vorschau für die Spielleitung","Lock puzzles – organizer preview")}</h3>{locations.some(l=>!validCode(stationCodes[l.id]??"")) && <p className="error">{tx("Bitte für jede Rätselstation einen dreistelligen Code eingeben.","Enter a three-digit code for every puzzle station.")}</p>}{challenges.map(({location,challenge})=><article className="location-card" key={location.id}><strong>{location.name}: {challenge.code}</strong>{challenge.puzzles.map((p,i)=><div key={p.id}><p><b>{i+1}. {p.instruction}</b> {p.question}</p>{p.render && <p className="symbols">{p.render.symbol.repeat(p.render.count) || "□ (leer)"}</p>}<p className="helper">{tx("Lösung","Answer")}: {p.expectedDigit} – {p.explanation}</p></div>)}</article>)}</section>}
                {printIssues.length>0 && <div className="warnings" role="status"><strong>{tx('Vor dem Drucken prüfen:','Check before printing:')}</strong>{printIssues.map((issue,i)=><p key={i}>{issue}</p>)}</div>}
                {printIssues.length===0 && <section className="print-packet" aria-label="Druckpaket">
                  <article className="print-sheet">
                    <h1>{projectTitle} – Spielleitung</h1>
                    <p><strong>Start:</strong> {startPoint} · <strong>Ziel:</strong> {finishMode==='origin'?startPoint:finishMode==='meeting'?meetingPoint:'Eigene Startstation'}</p>
                    <p>{players} Kinder · {plan.value.teams.length} Gruppen · {duration} Minuten · {plan.value.stopsPerTeam} Stationen je Gruppe</p>
                    <h2>Gruppen und Routen</h2>
                    <p>Individuelle Alters- und Schwierigkeitsprofile sind für eine spätere Bezahlversion vorgesehen. Die derzeitigen Aufgaben verwenden weiterhin die gemeinsame Altersklasse.</p>
                    {plan.value.teams.map((team,i)=><p key={i}><strong>{team.name} ({team.memberCount}):</strong> {team.stations.map(s=>s.name).join(' → ')} → {team.finish}</p>)}
                    <h2>Codes und Lösungen</h2>
                    {challenges.map(({location,challenge})=><p key={location.id}><strong>{location.name}: {challenge.code}</strong> · {challenge.puzzles.map(p=>p.explanation).join(' | ')}</p>)}
                    <h2>Wegrätsel – Lösungen</h2>
                    {Array.from(new Set(plan.value.teams.flatMap(team=>team.stations.map((station,i)=>team.stations[i+1]?.name??team.finish)))).map(destination=>{
                      const target=locations.find(l=>l.name===destination);
                      const clue=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??'letters',hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'');
                      return <div key={destination}><strong>{destination}</strong><p>{clue.mode==='questions'?clue.rows?.map((row,i)=>(i+1)+'. '+row.solution+' (Buchstabe '+(row.letterIndex+1)+')').join(' | '):'Lösung: '+clue.answer}</p></div>;
                    })}
                    <h2>Gruppenwege</h2>
                    {plan.value.teams.map(team=><p key={team.name}><strong>{team.name}:</strong> {team.stations.map((station,i)=>station.name+" → "+(team.stations[i+1]?.name??team.finish)).join(" | ")}</p>)}
                    <h2>Vorbereitung und Sicherheit</h2>
                    <p>Schlösser auf die Codes einstellen und tatsächlich testen. Rätselblätter den richtigen Stationen zuordnen. Die drei Blätter jeder Station gemeinsam ausgeben; die Reihenfolge der Bearbeitung ist frei. Schloss-Code und Wegrätsel müssen beide gelöst werden. Wege, Straßenquerungen, Gewässer, Baustellen, Wetter und Aufsicht vor Ort prüfen. Material nach Spielende einsammeln.</p>
                  </article>
                  {plan.value.teams.map((team,teamIndex)=>team.stations.map((location,stationIndex)=>{
                    const challenge=challenges.find(c=>c.location.id===location.id)?.challenge;
                    if(!challenge)return null;
                    const destination=team.stations[stationIndex+1]?.name??team.finish;
                    const target=locations.find(l=>l.name===destination);
                    let routePuzzle;
                    try {routePuzzle=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??'letters',hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'');}
                    catch {return null;}
                    return <React.Fragment key={teamIndex+'-'+location.id}>
                      <article className="print-sheet">
                        <h1>{projectTitle}</h1>
                        <p><strong>Team {team.name}</strong> · Station {stationIndex+1} von {team.stations.length} · Blatt 1/3</p>
                        <h2>Stationsaufgaben: {location.name}</h2>
                        <p>Löst die Aufgaben. Die Ergebnisse ergeben euren Schloss-Code in der richtigen Reihenfolge.</p>
                        {challenge.puzzles.map((p,i)=><div className="print-task" key={p.id}><h3>Aufgabe {i+1}</h3><p>{p.instruction}</p><p className="print-question">{p.question}</p>{p.render && <p className="symbols">{p.render.symbol.repeat(p.render.count)||'□ (leeres Feld)'}</p>}</div>)}
                      </article>
                      <article className="print-sheet">
                        <h1>Antwortblatt</h1>
                        <p><strong>Team {team.name}</strong> · {location.name} · Blatt 2/3</p>
                        <p>Hier könnt ihr rechnen, schreiben und eure Lösungen eintragen.</p>
                        {[1,2,3].map(n=><div className="answer-space" key={n}><strong>Aufgabe {n}: Ziffer ______</strong><div className="writing-lines">________________________________________________<br/>________________________________________________<br/>________________________________________________</div></div>)}
                        <p className="print-question">Unser Schloss-Code: __ __ __</p>
                      </article>
                      <article className="print-sheet">
                        <h1>Wegrätsel</h1>
                        <p><strong>Team {team.name}</strong> · {location.name} · Blatt 3/3</p>
                        <p>Löst das Wegrätsel, um euren nächsten Ort herauszufinden. Ihr dürft alle drei Blätter gleichzeitig bearbeiten.</p>
                        <p className="print-question">{routePuzzle.instruction}</p>
                        {routePuzzle.rows ? <div>{routePuzzle.rows.map((r,i)=><p key={i}>{i+1}. {r.question} (Buchstabe {r.letterIndex+1}) ______</p>)}</div> : <p className="route-letters">{routePuzzle.question}</p>}
                        <p>Unser nächster Ort: __________________________________</p>
                        <p className="helper">Tipp: {routePuzzle.hint}</p>
                      </article>
                    </React.Fragment>;
                  }))}
                  <article className="print-sheet"><h1>Stationsetiketten</h1>{plan.value.teams.flatMap((team,teamIndex)=>team.stations.map((location,stationIndex)=><p className="print-label" key={teamIndex+'-'+location.id}><strong>Team {team.name} · {location.name}</strong><span>Umschlag {stationIndex+1} von {team.stations.length} · Alle drei Blätter gleichzeitig ausgeben · Material nach Spielende einsammeln</span></p>))}</article>
                </section>}
                <div className="warnings">{plan.value.cautions.map((warning,i)=><p key={i}>• {warning}</p>)}</div>
                <button type="button" className="print" disabled={printIssues.length>0} onClick={()=>window.print()}>{t.print} ↗</button>
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
