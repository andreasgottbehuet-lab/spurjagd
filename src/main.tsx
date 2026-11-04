import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, teamSizes, type GameGoal, type Location, type StartMode, type RouteMode, type FinishMode, type TeamProfile } from './generator';
import { messages, type Language } from './i18n';
import { generateStationChallenge, codeFromPuzzles, hashSeed, validCode, generateCreativeRouteClue, type RouteClueMode, type AgeLevel } from './puzzles';
import { activeGameId, deleteGame, downloadBackup, loadGames, newGameId, importedProjectTitle, parseGameBackup, projectListChanged, replaceLastGame, saveGame, setActiveGameId, type SavedGame } from './project-storage';
import { auditPrintPacket } from './print-audit';
import { createPrintManifest, LABELS_PER_A5_SHEET, ROUTE_QUESTIONS_PER_A5_SHEET, routeSheetCount, ORGANIZER_ITEMS_PER_A5_SHEET, ORGANIZER_ENVELOPES_PER_A5_SHEET, ORGANIZER_CAUTIONS_PER_A5_SHEET } from './print-manifest';
import { auditPrintManifest } from './print-manifest-audit';
import { auditRenderedPrintCategories, auditRenderedEnvelopes, auditRenderedLabels } from './print-dom-audit';
import { createDefaultGameConfig, DEFAULT_LOCATIONS } from './default-game';
import {allocateLocationIds,nextLocationId as findNextLocationId} from './location-ids';
import './style.css';

const initialLocations: Location[] = DEFAULT_LOCATIONS.map(location=>({...location}));

function App() {
  const [lang, setLang] = useState<Language>('de');
  const [players, setPlayers] = useState(12);
  const [groupSize, setGroupSize] = useState(3);
  const groupDistribution = useMemo(()=>teamSizes(players,groupSize),[players,groupSize]);
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
  const [meetingPoint, setMeetingPoint] = useState('Treffpunkt');
  const [startPoint, setStartPoint] = useState('Treffpunkt');
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
  const storageConflict = useRef(false);
  const [selectedProject, setSelectedProject] = useState('');

  const t = messages[lang];
  const en = lang === 'en';
  const tx = (de: string, english: string) => en ? english : de;
  const config = { players, groupSize, durationMinutes: duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, stationCodes, routeClueModes, routeClueTexts, teamProfiles };
  const plan = useMemo(() => {
    try { return { value: createPlan(config), error: '' }; }
    catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; }
  }, [players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, stationCodes, routeClueModes, routeClueTexts, teamProfiles]);
  const visitedStationIds = new Set(plan.value?.teams.flatMap(team=>team.stations.map(station=>station.id)) ?? []);
  const printIssues = [
    ...(plan.error ? [plan.error] : []),
    ...(goal !== 'locks' ? ['Das Druckpaket unterstützt derzeit nur Schloss-Codes.'] : []),
    ...locations.filter(l=>!l.name.trim()).map((_,i)=>'Mindestens ein Stationsname fehlt ('+(i+1)+').'),
    ...locations.filter(l=>visitedStationIds.has(l.id)&&!validCode(stationCodes[l.id]??'')).map(l=>'Ungültiger Code: '+(l.name||l.id)),
    ...(!startPoint.trim()?['Startort fehlt.']:[]),
    ...(finishMode==='meeting'&&!meetingPoint.trim()?['Zielort fehlt.']:[]),
  ];
  if (plan.value) printIssues.push(...auditPrintPacket(config,plan.value,projectId));
  const printManifest = plan.value ? createPrintManifest(plan.value,config) : null;
  if (plan.value && printManifest) printIssues.push(...auditPrintManifest(plan.value,printManifest,config));
  const ageLevel: AgeLevel = age === '4–6' || age === '6–8' ? 'young' : age === '8–10' ? 'middle' : 'older';
  const challenges = useMemo(() => {
    if (goal !== 'locks' || printIssues.length) return [];
    return locations.filter(l=>visitedStationIds.has(l.id)&&validCode(stationCodes[l.id] ?? '')).map(l=>{
      const challenge=generateStationChallenge(l.id,stationCodes[l.id],ageLevel,hashSeed(projectId));
      if(codeFromPuzzles(challenge)!==stationCodes[l.id]) throw new Error('Codeprüfung fehlgeschlagen');
      return {location:l,challenge};
    });
  },[locations,stationCodes,ageLevel,projectId,goal,printIssues.length,plan.value]);
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
      const additional = allocateLocationIds(locations,hiddenLocations,needed-reused.length,nextLocationId).map(id=>({id,name:'',description:''}));
      setLocations(old => [...old,...reused,...additional]);
      setHiddenLocations(old => old.slice(needed));
      setNextLocationId(findNextLocationId([...locations,...reused,...additional],hiddenLocations,nextLocationId));
    }
  };
  const addLocation = () => {
    const id=allocateLocationIds(locations,hiddenLocations,1,nextLocationId)[0];
    setLocations(old => [...old, { id, name: '', description: '' }]);
    setNextLocationId(findNextLocationId([...locations,{id,name:'',description:''}],hiddenLocations,nextLocationId));
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
    setMeetingPoint(c.meetingPoint ?? 'Treffpunkt');
    setStartPoint(c.startPoint ?? c.meetingPoint ?? 'Treffpunkt');
    setSameStartFinish(c.finishMode === 'origin');
    setStationCodes(c.stationCodes ?? {});
    setTeamProfiles(c.teamProfiles ?? {});
    setRouteClueModes(c.routeClueModes ?? {});
    setRouteClueTexts(c.routeClueTexts ?? {});
    setNextLocationId(findNextLocationId(c.locations,[],5));
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
      setStorageReady(true);
    } catch(e) { setStorageMessage('Lokale Speicherung beschädigt oder nicht verfügbar. Automatisches Speichern bleibt zum Schutz der vorhandenen Daten deaktiviert: ' + String(e));
      setStorageReady(false);
    }
  }, []);
  useEffect(() => {
    const onStorageChange=(event:StorageEvent)=>{
      if(event.storageArea!==window.localStorage) return;
      if(projectListChanged(event.key)){
        storageConflict.current=true;
        setStorageReady(false);
        setStorageMessage('Die Projekte wurden in einem anderen Tab verändert. Diese Ansicht speichert nicht mehr automatisch. Bitte dort eine JSON-Sicherung erstellen und die Seite neu laden.');
      }
    };
    window.addEventListener('storage',onStorageChange);
    return ()=>window.removeEventListener('storage',onStorageChange);
  },[]);
  useEffect(() => {
    if (!storageReady || storageConflict.current) return;
    if (skipSave.current) { skipSave.current = false; return; }
    const timeout = window.setTimeout(() => {
      if (storageConflict.current) return;
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
  // Page lifecycle flush protects the last edits when the tab closes before debounce expires.
  useEffect(() => {
    if(!storageReady || storageConflict.current) return;
    const flushOnExit=()=>{
      if(storageConflict.current) return;
      try{
        const current:SavedGame={version:1,id:projectId,title:projectTitle.trim()||'Unbenanntes Projekt',updatedAt:new Date().toISOString(),config:{...config,locations:config.locations.map(x=>({...x}))}};
        saveGame(current);
      }catch(error){
        // Browsers may discard UI updates during pagehide; preserve data where possible.
        setStorageMessage('Speichern beim Verlassen fehlgeschlagen: '+String(error));
      }
    };
    const onVisibilityChange=()=>{if(document.visibilityState==='hidden')flushOnExit();};
    window.addEventListener('pagehide',flushOnExit);
    document.addEventListener('visibilitychange',onVisibilityChange);
    return ()=>{
      window.removeEventListener('pagehide',flushOnExit);
      document.removeEventListener('visibilitychange',onVisibilityChange);
    };
  },[storageReady,projectId,projectTitle,config]);
  // Flush the currently edited draft before changing projects; debounce alone can lose edits.
  const saveCurrentBeforeSwitch = (): boolean => {
    if(storageConflict.current){setStorageMessage('Projektwechsel gesperrt: Die Projektliste wurde in einem anderen Tab verändert.');return false;}
    if (!storageReady){setStorageMessage('Projektwechsel gesperrt: Lokale Speicherung ist nicht verfügbar. Bitte zuerst eine JSON-Sicherung exportieren.');return false;}
    try {
      const current:SavedGame={version:1,id:projectId,title:projectTitle.trim()||'Unbenanntes Projekt',updatedAt:new Date().toISOString(),config:{...config,locations:config.locations.map(x=>({...x}))}};
      setProjects(saveGame(current));
      return true;
    } catch(error) {
      setStorageMessage('Projektwechsel abgebrochen: Aktuelle Änderungen konnten nicht gespeichert werden. '+String(error));
      return false;
    }
  };
  const newProject = () => {
    if(!saveCurrentBeforeSwitch()) return;
    const fresh: SavedGame = {
      version:1, id:newGameId(), title:'Neue Schnitzeljagd', updatedAt:new Date().toISOString(),
      config:createDefaultGameConfig(),
    };
    try { const updated=saveGame(fresh); setProjects(updated); applyGame(fresh); setStorageReady(true); setActiveStep(1); }
    catch(e){ setStorageMessage('Neues Projekt: '+String(e)); }
  };
  const removeProject = () => {
    if(storageConflict.current || !storageReady){
      setStorageMessage('Löschen gesperrt: Die lokale Projektliste ist nicht sicher verfügbar.');
      return;
    }
    if (!window.confirm(tx('Dieses Projekt wirklich löschen? Vorher bei Bedarf über Sichern eine JSON-Datei herunterladen. Die Löschung kann nicht rückgängig gemacht werden.', 'Delete this project? Export a JSON backup first if needed. This cannot be undone.'))) return;
    try {
      const stored=loadGames();
      if(stored.length===1 && stored[0].id===projectId){
        const fresh:SavedGame={version:1,id:newGameId(),title:'Meine Schnitzeljagd',updatedAt:new Date().toISOString(),config:createDefaultGameConfig()};
        const saved=replaceLastGame(projectId,fresh);
        setProjects(saved);
        applyGame(fresh);
        setActiveStep(1);
      }else{
        const remaining=deleteGame(projectId);
        setProjects(remaining);
        if(remaining[0]) { applyGame(remaining[0]); setActiveStep(1); }
      }
    }catch(e){setStorageMessage('Löschen fehlgeschlagen: '+String(e));}
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
      if(!saveCurrentBeforeSwitch()) return;
      const restored: SavedGame = {...imported,id:newGameId(),title:importedProjectTitle(imported.title),updatedAt:new Date().toISOString()};
      const updated = saveGame(restored);
      setProjects(updated);
      applyGame(restored);
      setActiveStep(1);
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
              if(project && project.id!==projectId && saveCurrentBeforeSwitch()){
                try { setActiveGameId(project.id); applyGame(project); setActiveStep(1); }
                catch(error) { setStorageMessage('Projektwechsel fehlgeschlagen: '+String(error)); }
              }
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
              <p className="helper" role="status">{tx("Geplante Gruppen", "Planned teams")}: {groupDistribution.length}. {tx("Gruppengrößen", "Team sizes")}: {groupDistribution.length <= 12 ? groupDistribution.join(" / ") : `${Math.min(...groupDistribution)}–${Math.max(...groupDistribution)} (${groupDistribution.length})`}.</p>
              {groupDistribution.includes(1) && players>1 && <p className="warnings" role="status">{tx("Mindestens eine Gruppe hätte nur ein Kind. Bitte Gruppengröße oder Kinderzahl prüfen und die Einteilung vor Ort anpassen.", "At least one team would contain only one child. Review team size or participant count and adjust the grouping before the event.")}</p>}
              <p className="helper">{tx("Die maximale Gruppengröße ist eine Obergrenze. Die Kinder werden möglichst gleichmäßig verteilt.", "Maximum team size is a limit. Participants are distributed as evenly as possible.")}</p>
              <div className="form-grid">
                <label className="range-field"><span>{t.children}: <strong>{players}</strong></span><input min="1" max="100" type="range" value={players} onChange={e => setPlayers(Number(e.target.value))}/></label>
                <label className="range-field"><span>{t.size}: <strong>{groupSize}</strong></span><input min="1" max="10" type="range" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))}/></label>
                <label>{t.age}<select value={age} onChange={e => setAge(e.target.value)}><option>4–6</option><option>6–8</option><option>8–10</option><option>11–13</option><option>14+</option></select></label>
                <label>{t.duration}<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option><option value={180}>180 min</option></select></label>
              </div>
              <button type="button" className="secondary" onClick={()=>setActiveStep(2)}>{tx("Weiter zu den Spielregeln", "Continue to game rules")}</button>
            </>}
            {activeStep === 3 && <>
              <div className="section-line"><span className="step">03</span><h2>{t.locations}</h2></div>
              <p className="helper">{tx('Trage die Orte ein und beschreibe, was dort zu sehen ist. Später erzeugen wir daraus passende Rätsel.','Name each stop and describe what can be seen there. This will later be used to generate puzzles.')}</p>
              <p className="helper">{tx("Prüfe jeden Standort vor Ort: sichere Wege, erlaubter Zugang und eine geeignete Aufsicht. Die App kennt keine tatsächlichen Wegstrecken.", "Check every stop on site: safe routes, permitted access and suitable supervision. The app does not know actual walking distances.")}</p>
              <label className="range-field location-range"><span>{tx("Anzahl Rätselstationen", "Number of puzzle stations")}: <strong>{locations.length}</strong></span><input type="range" min="1" max="20" value={locations.length} onChange={e=>changeStationCount(Number(e.target.value))}/></label>
              <div className="location-card"><div className="location-title"><strong>{tx("Start", "Start")}</strong></div><label>{tx("Name des Startorts", "Start location name")}<input maxLength={80} value={startPoint} onChange={e=>setStartPoint(e.target.value)}/></label></div>
              <label className="checkbox-line"><input type="checkbox" checked={sameStartFinish} onChange={e=>{const checked=e.target.checked;setSameStartFinish(checked);setFinishMode(checked?"origin":"meeting");}}/>{tx("Start ist Ziel", "Start is finish")}</label>
              {goal==='locks' && <p className="helper" role="status">{locations.filter(l=>visitedStationIds.has(l.id)&&validCode(stationCodes[l.id]??'')).length} von {locations.filter(l=>visitedStationIds.has(l.id)).length} {tx('benötigten Schloss-Codes vollständig','required lock codes complete')}.</p>}
              <div className="location-list">{locations.map((location, index) =>
                <div className="location-card" key={location.id}>
                  <div className="location-title"><strong>{tx('Station','Stop')} {index + 1}</strong><button type="button" className="text-button" disabled={locations.length === 1} onClick={()=>setLocations(old=>old.filter(p=>p.id !== location.id))}>{tx('Entfernen','Remove')}</button></div>
                  <label>{tx('Name des Ortes','Location name')}<input value={location.name} maxLength={80} placeholder={tx('z. B. Spielplatz','e.g. playground')} onChange={e=>updateLocation(location.id,'name',e.target.value)}/></label>
                  <label>{tx('Beschreibung (optional)','Description (optional)')}<textarea rows={2} maxLength={400} value={location.description} onChange={e=>updateLocation(location.id,'description',e.target.value)} placeholder={tx('Was gibt es hier?','What is there?')}/></label>
                  <p className="helper">{tx("Der Ortsname ist die Lösung des Wegrätsels und darf nicht bereits im Aufgabentext stehen.", "The location name is the route-clue answer and must not already appear in the question.")}</p>
                  <label>{tx('Wegrätsel, das zu diesem Ort führt','Route clue leading to this place')}<select value={routeClueModes[location.id]??'letters'} onChange={e=>setRouteClueModes(old=>({...old,[location.id]:e.target.value as RouteClueMode}))}><option value="description">Ortsbeschreibung erraten</option><option value="questions">Fragen mit Lösungswort</option><option value="letters">Buchstabenspiel</option><option value="custom">Eigenes Wegrätsel</option></select></label>
                  {routeClueModes[location.id]==='custom' && <label>{tx('Eigener Rätseltext','Custom clue')}<textarea rows={3} maxLength={400} value={routeClueTexts[location.id]??''} onChange={e=>setRouteClueTexts(old=>({...old,[location.id]:e.target.value}))}/></label>}
                  {goal==='locks' && <label>{tx('Dreistelliger Schloss-Code','Three-digit lock code')}{plan.value && !visitedStationIds.has(location.id) && <span className="helper">{tx('Diese Station wird nach aktuellem Plan nicht besucht – Code optional.','No team visits this station in the current plan – code optional.')}</span>}<input inputMode="numeric" pattern="[0-9]{3}" maxLength={3} placeholder="z. B. 007" aria-invalid={visitedStationIds.has(location.id) && !validCode(stationCodes[location.id]??'')} aria-describedby={'code-help-'+location.id} value={stationCodes[location.id] ?? ''} onChange={e=>setStationCodes(old=>({...old,[location.id]:e.target.value.replace(/[^0-9]/g,'').slice(0,3)}))}/><span className="helper" id={'code-help-'+location.id}>{visitedStationIds.has(location.id) && !validCode(stationCodes[location.id]??'') ? tx('Bitte genau drei Ziffern eingeben; 000 und führende Nullen sind erlaubt.','Enter exactly three digits; 000 and leading zeroes are allowed.') : tx('Drei Ziffern, wie auf dem echten Schloss eingestellt.','Three digits, matching the physical lock.')}</span></label>}
                </div>
              )}</div>
              {!sameStartFinish && <div className="location-card"><div className="location-title"><strong>{tx("Ziel","Finish")}</strong></div><label>{tx("Name des Zielorts","Finish location name")}<input maxLength={80} value={meetingPoint} onChange={e=>setMeetingPoint(e.target.value)}/></label></div>}
              <button type="button" className="secondary" onClick={addLocation} disabled={locations.length>=20}>+ {tx('Standort hinzufügen','Add location')}</button>
              <button type="button" className="secondary" onClick={()=>setActiveStep(4)}>{tx("Spielplan ansehen", "View game plan")}</button>
              {printIssues.length>0 && <div className="warnings" role="status"><strong>{tx('Noch zu erledigen, bevor das A5-Paket gedruckt werden kann:','To resolve before printing the A5 packet:')}</strong>{[...new Set(printIssues)].map((issue,i)=><p key={i}>{issue}</p>)}</div>}
              {printIssues.length===0 && <p className="helper" role="status">{tx('Alle Angaben für das A5-Druckpaket sind vollständig.','All A5 print packet inputs are complete.')}</p>}
            </>}
            {activeStep === 2 && <>
              <div className="section-line"><span className="step">02</span><h2>{tx('Spielziel und Zeitansätze','Game rules and timing')}</h2></div>
              <fieldset><legend>{t.outcome}</legend>
                <label className="radio"><input type="radio" checked={goal==='locks'} onChange={()=>setGoal('locks')}/>{t.locks}</label>
                <label className="radio"><input type="radio" checked={goal==='word'} disabled onChange={()=>setGoal('word')}/>{t.word} ({tx('in Vorbereitung','coming later')})</label>
                <label className="radio"><input type="radio" checked={goal==='cards'} disabled onChange={()=>setGoal('cards')}/>{t.cards} ({tx('in Vorbereitung','coming later')})</label>
                <p className="helper">{tx('Aktuell lassen sich vollständige A5-Druckpakete nur für dreistellige Schlösser erstellen. Weitere Spielziele sind noch nicht freigegeben.','Currently, complete A5 print packets are available only for three-digit locks. Other game goals are not yet available.')}</p>
                {goal!=='locks' && <button type="button" className="secondary" onClick={()=>setGoal('locks')}>{tx('Auf unterstütztes Spielziel wechseln','Switch to supported game goal')}</button>}
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
              <button type="button" className="secondary" onClick={()=>setActiveStep(3)}>{tx("Weiter zu den Standorten", "Continue to locations")}</button>
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
                {plan.value.cautions.length>0 && <div className="warnings" role="status"><strong>{tx("Hinweise für die Spielleitung", "Organizer notes")}</strong>{plan.value.cautions.map((warning,i)=><p key={i}>{warning}</p>)}</div>}
                <div className="team-list">{plan.value.teams.map((team,i)=>
                  <article className="team" key={i}>
                    <h3>{en ? 'Team ' + (i+1) : 'Team '+team.name}<span>{team.memberCount} {en?'participants':'Kinder'}</span></h3>
                    <p>{team.stations.map(s => s.name).join(' → ')} → {team.finish}</p>
                  </article>
                )}</div>
                {plan.value && <section className="challenge-preview"><h3>{tx("Wegrätsel – Vorschau nach Zielort", "Route clues – preview by destination")}</h3><p className="helper">{tx("Jedes Ziel erhält genau ein Wegrätsel. Die Gruppen bekommen unabhängig von ihrer Route dieselbe Version.", "Each destination has one route clue. Teams receive the same version regardless of their route.")}</p>{Array.from(new Set(plan.value.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)))).map(destination=>{
                  const target=locations.find(l=>l.name.trim()===destination.trim());
                  try {
                    const clue=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??'letters',hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'');
                    return <article className="location-card" key={destination}><strong>{tx("Ziel", "Destination")}: {destination}</strong><p>{clue.instruction}</p>{clue.rows?clue.rows.map((row,i)=><p key={i}>{i+1}. {row.question} (Buchstabe {row.letterIndex+1})</p>):<p>{clue.question}</p>}<p className="helper">{tx("Lösung für die Spielleitung", "Organizer answer")}: {clue.answer}</p></article>;
                  } catch(error) {
                    return <article className="location-card" key={destination}><strong>Ziel: {destination}</strong><p className="error">{error instanceof Error?error.message:String(error)}</p></article>;
                  }
                })}</section>}
                {goal==='locks' && <section className="challenge-preview"><h3>{tx("Schlossrätsel – Vorschau für die Spielleitung","Lock puzzles – organizer preview")}</h3>{locations.some(l=>visitedStationIds.has(l.id)&&!validCode(stationCodes[l.id]??"")) && <p className="error">{tx("Bitte für jede besuchte Rätselstation einen dreistelligen Code eingeben.","Enter a three-digit code for every visited puzzle station.")}</p>}{challenges.map(({location,challenge})=><article className="location-card" key={location.id}><strong>{location.name}: {challenge.code}</strong>{challenge.puzzles.map((p,i)=><div key={p.id}><p><b>{i+1}. {p.instruction}</b> {p.question}</p>{p.render && <p className="symbols">{p.render.symbol.repeat(p.render.count) || "□ (leer)"}</p>}<p className="helper">{tx("Lösung","Answer")}: {p.expectedDigit} – {p.explanation}</p></div>)}</article>)}</section>}
                {printManifest && <div className="warnings"><strong>{tx("Druckumfang A5", "A5 print volume")}</strong><p>{printManifest.envelopes.length} Umschläge mit je mindestens 3 Blättern; zusammen {printManifest.taskSheets} Kinderblätter, dazu {printManifest.organizerSheets} Spielleitungsblätter und {printManifest.labelSheets} Etikettenblätter. Insgesamt mindestens {printManifest.minimumSheets} A5-Seiten. Bei langen Texten kann der tatsächliche Druckumfang größer sein.</p></div>}
                {printIssues.length>0 && <div className="warnings" role="status"><strong>{tx('Vor dem Drucken prüfen:','Check before printing:')}</strong>{[...new Set(printIssues)].map((issue,i)=><p key={i}>{issue}</p>)}<button type="button" className="secondary" onClick={()=>setActiveStep(3)}>{tx('Stationsangaben und Codes korrigieren','Correct stations and lock codes')}</button></div>}
                {printIssues.length===0 && <section className="print-packet" aria-label="Druckpaket">
                  {Array.from({length:Math.ceil(plan.value.teams.length/ORGANIZER_ITEMS_PER_A5_SHEET)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'routes-'+page}>
                    <h1>{projectTitle} – Gruppenrouten {page+1}</h1>
                    <p><strong>Start:</strong> {startPoint} · <strong>Ziel:</strong> {finishMode==='origin'?startPoint:finishMode==='meeting'?meetingPoint:'Eigene Startstation'}</p>
                    <p>{players} Kinder · {plan.value.teams.length} Gruppen · {duration} Minuten · {plan.value.stopsPerTeam} Stationen je Gruppe</p>
                    <h2>Gruppen und Routen</h2>
                    <p>Alle Gruppen erhalten Aufgaben für die gemeinsam ausgewählte Altersklasse.</p>
                    {plan.value.teams.slice(page*ORGANIZER_ITEMS_PER_A5_SHEET,(page+1)*ORGANIZER_ITEMS_PER_A5_SHEET).map((team,i)=><p key={i}><strong>{team.name} ({team.memberCount}):</strong> {team.stations.map(s=>s.name).join(' → ')} → {team.finish}</p>)}
                  </article>)}
                  {Array.from({length:Math.ceil(challenges.filter(c=>plan.value.teams.some(team=>team.stations.some(station=>station.id===c.location.id))).length/ORGANIZER_ITEMS_PER_A5_SHEET)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'codes-'+page}>
                    <h1>Spielleitung – Codes {page+1}</h1>
                    <h2>Codes und Lösungen</h2>
                    {challenges.filter(c=>plan.value.teams.some(team=>team.stations.some(station=>station.id===c.location.id))).slice(page*ORGANIZER_ITEMS_PER_A5_SHEET,(page+1)*ORGANIZER_ITEMS_PER_A5_SHEET).map(({location,challenge})=><p key={location.id}><strong>{location.name}: {challenge.code}</strong> · {challenge.puzzles.map(p=>p.explanation).join(' | ')}</p>)}
                  </article>)}
                  {Array.from(new Set(plan.value.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)))).flatMap(destination=>{
                    const target=locations.find(l=>l.name.trim()===destination.trim());
                    const clue=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??'letters',hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'');
                    return Array.from({length:routeSheetCount(destination,config)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'clue-'+destination+'-'+page}>
                      <h1>Spielleitung – Wegrätsel {page+1}/{routeSheetCount(destination,config)}</h1>
                      <h2>Lösung: {destination}</h2>
                      {clue.mode==='questions'?clue.rows?.slice(page*ROUTE_QUESTIONS_PER_A5_SHEET,(page+1)*ROUTE_QUESTIONS_PER_A5_SHEET).map((row,i)=><p key={i}>{page*ROUTE_QUESTIONS_PER_A5_SHEET+i+1}. {row.solution} (Buchstabe {row.letterIndex+1})</p>):<p>Lösung: {clue.answer}</p>}
                    </article>);
                  })}
                  <article className="print-sheet print-organizer-sheet" key="safety-check">
                    <h1>Spielleitung – Start und Sicherheit</h1>
                    <h2>Vor der Ausgabe</h2>
                    <p>Pro Umschlag: ein A5-Aufgabenblatt, ein Antwortblatt und die zugehörigen Wegrätselblätter. Teamname, Station, Umschlagnummer und Blattzahl gegen die Gruppenroute prüfen.</p>
                    <p>Schlösser auf die Codes einstellen und an den tatsächlichen Schlössern testen. Schloss-Code und Wegrätsel müssen beide gelöst werden.</p>
                    <h2>Vor Ort kontrollieren</h2>
                    <p>Strecken, Straßenquerungen, Gewässer, Baustellen, Wetter, Zugänglichkeit und Aufsicht prüfen. Keine Aufgaben an gefährlichen oder unzugänglichen Orten platzieren. Den Kindern den nächsten Zielort nicht vor dem Rätsel verraten.</p>
                    <h2>Hinweise aus der Routenplanung</h2>
                    {plan.value.cautions.length===0?<p>Keine zusätzlichen Planungshinweise ermittelt. Örtliche Gefahren trotzdem prüfen.</p>:<p>Die vollständigen Planungshinweise auf den nachfolgenden A5-Blättern vor dem Start durchgehen und die örtlichen Bedingungen kontrollieren.</p>}
                    <h2>Zum Spielende</h2>
                    <p>Alle Kinder zählen, sämtliche Schlösser und das Material einsammeln.</p>
                  </article>
                  {Array.from({length:Math.ceil(plan.value.cautions.length/ORGANIZER_CAUTIONS_PER_A5_SHEET)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'cautions-'+page}>
                    <h1>Spielleitung – Planungshinweise {page+1}</h1>
                    <p>Diese Hinweise sind Annahmen aus der Routenplanung und müssen vor Ort überprüft werden.</p>
                    {plan.value.cautions.slice(page*ORGANIZER_CAUTIONS_PER_A5_SHEET,(page+1)*ORGANIZER_CAUTIONS_PER_A5_SHEET).map((warning,i)=><p className="print-caution" key={i}>{page*ORGANIZER_CAUTIONS_PER_A5_SHEET+i+1}. {warning}</p>)}
                  </article>)}
                  {Array.from({length:Math.max(1,Math.ceil((printManifest?.envelopes.length??0)/ORGANIZER_ENVELOPES_PER_A5_SHEET))},(_,page)=><article className="print-sheet print-organizer-sheet" key={'control-'+page}>
                    <h1>Spielleitung – Umschlagkontrolle {page+1}</h1>
                    <p>Umschläge je Team nach Stationsnummer sortieren und jeweils nach dem Packen abhaken.</p>
                    {printManifest?.envelopes.slice(page*ORGANIZER_ENVELOPES_PER_A5_SHEET,(page+1)*ORGANIZER_ENVELOPES_PER_A5_SHEET).map(envelope=><p className="print-checklist-row" key={envelope.id}>□ <strong>Team {envelope.team} · Station {envelope.stationNumber}: {envelope.stationName}</strong><span>{envelope.sheetCount} Kinderblätter (1 Aufgabe, 1 Antwort, {envelope.sheetCount-2} Wegrätsel) · Schloss-Code: <strong>{stationCodes[envelope.stationId]}</strong> · Danach: <strong>{envelope.destination}</strong></span></p>)}
                  </article>)}
                  {plan.value.teams.map((team,teamIndex)=>team.stations.map((location,stationIndex)=>{
                    const challenge=challenges.find(c=>c.location.id===location.id)?.challenge;
                    if(!challenge)return null;
                    const destination=team.stations[stationIndex+1]?.name??team.finish;
                    const target=locations.find(l=>l.name.trim()===destination.trim());
                    let routePuzzle;
                    try {routePuzzle=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??'letters',hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'');}
                    catch {return null;}
                    return <React.Fragment key={teamIndex+'-'+location.id}>
                      <article className="print-sheet print-child-sheet" data-envelope-id={teamIndex+'-'+location.id} data-sheet-kind="task">
                        <h1>{projectTitle}</h1>
                        <p><strong>Team {team.name}</strong> · Station {stationIndex+1} von {team.stations.length} · Blatt 1/{2+routeSheetCount(destination,config)}</p>
                        <h2>Stationsaufgaben: {location.name}</h2>
                        <p>Löst die Aufgaben. Die Ergebnisse ergeben euren Schloss-Code in der richtigen Reihenfolge.</p>
                        {challenge.puzzles.map((p,i)=><div className="print-task" key={p.id}><h3>Aufgabe {i+1}</h3><p>{p.instruction}</p><p className="print-question">{p.question}</p><p className="print-hint">Tipp: {p.hint}</p>{p.render && <p className="symbols">{p.render.symbol.repeat(p.render.count)||'□ (leeres Feld)'}</p>}</div>)}
                      </article>
                      <article className="print-sheet print-child-sheet" data-envelope-id={teamIndex+'-'+location.id} data-sheet-kind="answer">
                        <h1>Antwortblatt</h1>
                        <p><strong>Team {team.name}</strong> · {location.name} · Blatt 2/{2+routeSheetCount(destination,config)}</p>
                        <p>Hier könnt ihr rechnen, schreiben und eure Lösungen eintragen.</p>
                        {[1,2,3].map(n=><div className="answer-space" key={n}><strong>Aufgabe {n}: Ziffer ______</strong><div className="writing-lines">________________________________________________<br/>________________________________________________<br/>________________________________________________</div></div>)}
                        <p className="print-question">Unser Schloss-Code: __ __ __</p>
                      </article>
                      {Array.from({length:routeSheetCount(destination,config)},(_,routePage)=><article className="print-sheet print-child-sheet" data-envelope-id={teamIndex+'-'+location.id} data-sheet-kind="route" data-route-page={routePage+1} key={'route-'+routePage}>
                        <h1>Wegrätsel {routeSheetCount(destination,config)>1?'– Teil '+(routePage+1):''}</h1>
                        <p><strong>Team {team.name}</strong> · {location.name} · Blatt {3+routePage}/{2+routeSheetCount(destination,config)}</p>
                        <p>Löst das Wegrätsel, um euren nächsten Ort herauszufinden. Ihr dürft die Blätter gleichzeitig bearbeiten.</p>
                        <p className="print-question">{routePuzzle.instruction}</p>
                        {routePuzzle.rows ? <div>{routePuzzle.rows.slice(routePage*ROUTE_QUESTIONS_PER_A5_SHEET,(routePage+1)*ROUTE_QUESTIONS_PER_A5_SHEET).map((r,i)=><p className="print-route-question" key={i}>{routePage*ROUTE_QUESTIONS_PER_A5_SHEET+i+1}. {r.question} (Buchstabe {r.letterIndex+1}) ______</p>)}</div> : <p className="route-letters">{routePuzzle.question}</p>}
                        {routePage===routeSheetCount(destination,config)-1 && <p>Unser nächster Ort: __________________________________</p>}
                        <p className="helper">Tipp: {routePuzzle.hint}</p>
                      </article>)}
                    </React.Fragment>;
                  }))}
                  {printManifest && Array.from({length:printManifest.labelSheets},(_,page)=>(
                    <article className="print-sheet print-label-sheet" key={'labels-'+page}>
                      <h1>Stationsetiketten – Blatt {page+1}/{printManifest.labelSheets}</h1>
                      <div className="print-label-grid">{printManifest.envelopes.slice(page*LABELS_PER_A5_SHEET,(page+1)*LABELS_PER_A5_SHEET).map(envelope=><p className="print-label" data-envelope-id={envelope.id} key={envelope.id}><strong>Team {envelope.team} · {envelope.stationName}</strong><span>Umschlag {envelope.stationNumber} von {envelope.stationTotal} · {envelope.sheetCount} Blätter: Aufgaben, Antworten, Wegrätsel</span></p>)}</div>
                    </article>
                  ))}
                </section>}
                <div className="warnings">{plan.value.cautions.map((warning,i)=><p key={i}>• {warning}</p>)}</div>
                <button type="button" className="print" disabled={printIssues.length>0} onClick={()=>{const packet=document.querySelector('.print-packet');const actual={total:packet?.querySelectorAll('.print-sheet').length??0,organizer:packet?.querySelectorAll('.print-organizer-sheet').length??0,children:packet?.querySelectorAll('.print-child-sheet').length??0,labels:packet?.querySelectorAll('.print-label-sheet').length??0};const issues=auditRenderedPrintCategories({minimumSheets:printManifest?.minimumSheets??0,organizerSheets:printManifest?.organizerSheets??0,taskSheets:printManifest?.taskSheets??0,labelSheets:printManifest?.labelSheets??0},actual);const renderedEnvelopes=Array.from(packet?.querySelectorAll<HTMLElement>('.print-child-sheet')??[]).map(sheet=>({envelopeId:sheet.dataset.envelopeId??'',kind:sheet.dataset.sheetKind??'',routePage:sheet.dataset.routePage?Number(sheet.dataset.routePage):undefined}));issues.push(...auditRenderedEnvelopes(printManifest?.envelopes??[],renderedEnvelopes));const labelIds=Array.from(packet?.querySelectorAll<HTMLElement>('.print-label')??[]).map(label=>label.dataset.envelopeId??'');issues.push(...auditRenderedLabels(printManifest?.envelopes??[],labelIds));if(issues.length){window.alert(issues.join('\n'));return;}window.print();}}>{t.print} ↗</button>
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
