import { generateThreeDigitWordGrid } from './three-word-grid';
import { nextProjectRevision } from './project-revision';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, teamSizes, type GameGoal, type Location, type StartMode, type RouteMode, type FinishMode, type TeamProfile, type Environment } from './generator';
import { messages, applyDocumentLanguage, type Language } from './i18n';
import { generateStationChallenge, codeFromPuzzles, hashSeed, validCode, generateCreativeRouteClue, type RouteClueMode } from './puzzles';
import { AGE_GROUPS, ageLevelFor } from './age-groups';
import { activeGameId, deleteGame, downloadBackup, loadGames, newGameId, normalizeGameConfig, importedProjectTitle, parseGameBackup, projectListChanged, replaceLastGame, saveGame, setActiveGameId, type SavedGame } from './project-storage';
import { storageErrorText } from './storage-messages';
import { auditPrintPacket } from './print-audit';
import { measureA5Elements, packA5Blocks, A5_USABLE_HEIGHT_MM, buildPackedA5PrintCopy } from './a5-page-packing';
import { createPrintManifest, LABELS_PER_A5_SHEET, ROUTE_QUESTIONS_PER_A5_SHEET, routeSheetCount, ORGANIZER_ITEMS_PER_A5_SHEET, ORGANIZER_CODES_PER_A5_SHEET, ORGANIZER_ROUTES_PER_A5_SHEET, ORGANIZER_ENVELOPES_PER_A5_SHEET, ORGANIZER_CAUTIONS_PER_A5_SHEET, organizerGroupPageRanges, nonEmptyOrganizerGroups } from './print-manifest';
import { auditPrintManifest } from './print-manifest-audit';
import { auditRenderedPrintCategories, auditRenderedEnvelopes, auditRenderedLabels, auditRenderedPackingItems, auditRenderedOrganizerSecrets } from './print-dom-audit';
import { createDefaultGameConfig, DEFAULT_LOCATIONS } from './default-game';
import {allocateLocationIds,nextLocationId as findNextLocationId} from './location-ids';
import {issueStep} from './issue-navigation';
import {generateMissingCodes,groupPrintIssues} from './station-codes';
import {applyEnvironmentPreset,siteSafetyCheck} from './environment';
import './style.css';

const initialLocations: Location[] = DEFAULT_LOCATIONS.map(location=>({...location}));

function App() {
  const [lang, setLang] = useState<Language>('de');
  useEffect(()=>{ applyDocumentLanguage(document.documentElement, lang); },[lang]);
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
  const [environment, setEnvironment] = useState<Environment>('outdoor');
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
  const savedRevision = useRef<{id:string;updatedAt:string|null}|null>(null);
  const [selectedProject, setSelectedProject] = useState('');

  const t = messages[lang];
  const en = lang === 'en';
  const tx = (de: string, english: string) => en ? english : de;
  const teamColors: Record<string,string> = {Rot:'Red',Blau:'Blue','Grün':'Green',Gelb:'Yellow',Orange:'Orange',Lila:'Purple','Türkis':'Turquoise',Silber:'Silver',Gold:'Gold',Pink:'Pink'};
  const teamLabel = (name: string) => en ? (teamColors[name] ?? name) : name;
  const storageError = (error: unknown) => storageErrorText(error, en);
  const planText = (text: string) => {
    if (!en) return text;
    const fixed: Record<string,string> = {
      'Ungültige Routenoption':'Invalid route option',
      'Ungültige Umgebung':'Invalid setting',
      'Start- und Abschlusszeit überschreitet die Spieldauer':'Start and wrap-up time is longer than the whole game',
      'Bitte 1 bis 20 Standorte angeben':'Please enter 1 to 20 locations',
      'Jeder Standort benötigt einen Namen':'Every location needs a name',
      'Standortnamen müssen eindeutig sein':'Location names must all be different',
      'Standortnamen dürfen maximal 80 Zeichen enthalten':'Location names can have at most 80 characters',
      'Standortbeschreibungen dürfen maximal 400 Zeichen enthalten':'Location descriptions can have at most 400 characters',
      'Stations-IDs müssen eindeutig und ausgefüllt sein':'Station IDs must be filled in and all different',
      'Stations-IDs enthalten Leerzeichen am Rand':'Station IDs have spaces at the start or end',
      'Die Zeit reicht nicht für eine Station. Dauer erhöhen oder Zeitansätze reduzieren.':'There is not enough time for even one stop. Make the game longer or shorten the time per step.',
      'Mindestens eine Gruppe besteht aus nur einem Kind. Gruppeneinteilung und Aufsicht vor Ort prüfen.':'At least one team has only one child. Check the teams and supervision on site.',
      'Mehr Teams als Standorte: Mehrere Gruppen starten am selben Ort.':'More teams than locations: several teams start at the same place.',
      'Alle Teams starten an derselben Station. Bei gleichzeitigem Beginn mögliche Wartezeiten einplanen.':'All teams start at the same stop. If they begin together, plan for some waiting time.',
      'Für unterschiedliche Umlaufrichtungen werden mindestens drei Standorte benötigt.':'Different route directions need at least three locations.',
      'Bei nur einer Station pro Team entstehen trotz unterschiedlicher Umlaufrichtung keine unterschiedlichen Stationsfolgen.':'With only one stop per team, different route directions do not change the order of stops.',
      'Die Teams starten verteilt an Rätselstationen und kehren zum gemeinsamen Startort zurück.':'Teams start at different puzzle stops and return to the shared start location.',
      'Jedes Team kehrt zur ersten eigenen Station zurück. Ein gemeinsames Finale ist nicht eingeplant.':'Each team returns to its own first stop. There is no shared finale.',
      'Bei nur einer Station ist das Ziel identisch mit der einzigen Rätselstation. Für einen echten Rückweg ein anderes Ziel wählen oder mehr Stationen einplanen.':'With only one stop, the finish is the same as the only puzzle stop. For a real way back, choose a different finish or add more stops.',
      'Zeitbudget: Nicht alle Standorte werden pro Team besucht.':'Time budget: not every team visits every location.',
      'Gehzeiten und Aufenthaltszeiten sind Schätzwerte. Wege, Querungen, Zugänglichkeit und Aufsicht vor Ort prüfen.':'Walking and stop times are estimates. Check paths, road crossings, access and supervision on site.',
      'Gehzeiten und Aufenthaltszeiten sind Schätzwerte. Räume, Zugänglichkeit und Aufsicht vor Ort prüfen.':'Walking and stop times are estimates. Check rooms, access and supervision on site.',
      'Im Haus: Treppen und Türen sichern, Zerbrechliches und Heißes wegschließen, verbotene Zimmer klar benennen, Aufsicht festlegen und auf Lautstärke und Nachbarn Rücksicht nehmen.':'Indoors: secure stairs and doors, put away fragile and hot things, clearly name off-limits rooms, agree on supervision and keep noise down for the neighbours.',
    };
    if (fixed[text]) return fixed[text];
    const fields: Record<string,string> = {'Teilnehmerzahl':'Number of players','Gruppengröße':'Team size','Spieldauer':'Game length','Rätselzeit':'Puzzle time','Gehzeit':'Walking time','Start- und Abschlusszeit':'Start and wrap-up time'};
    const invalidValue = text.match(/^(.*): ungültiger Wert$/);
    if (invalidValue && fields[invalidValue[1]]) return fields[invalidValue[1]]+': invalid value';
    const crowd = text.match(/^Möglicher Andrang an Station (\d+) \((.*)\): (\d+) Teams bei gleichzeitigem Start\. Startzeiten oder Stationskapazität prüfen\.$/s);
    if (crowd) return 'Possible crowding at stop '+crowd[1]+' ('+crowd[2]+'): '+crowd[3]+' teams if everyone starts together. Check start times or how many teams the stop can hold.';
    const advice = text.match(/^Empfehlung gegen Andrang: Startzeiten um (\d+) Minuten versetzen \(bis zu (\d+) Minuten für (\d+) Teams\) oder mindestens (\d+) Stationen für (\d+) Teams nutzen\. Der Plan bleibt druckbar\.$/);
    if (advice) return 'Tip against crowding: stagger start times by '+advice[1]+' minutes (up to '+advice[2]+' minutes for '+advice[3]+' teams) or use at least '+advice[4]+' stops for '+advice[5]+' teams. The plan can still be printed.';
    return text;
  };
  const issueText = (issue: string) => {
    if (!en) return issue;
    const fixed: Record<string,string> = {
      'Das Druckpaket unterstützt derzeit nur Schloss-Codes.':'The print packet currently supports lock codes only.',
      'Startort fehlt.':'Start location is missing.',
      'Zielort fehlt.':'Finish location is missing.',
    };
    if (fixed[issue]) return fixed[issue];
    const missing = issue.match(/^Mindestens ein Stationsname fehlt \((\d+)\)\.$/);
    if (missing) return 'At least one station name is missing ('+missing[1]+').';
    const noCode = issue.match(/^(\d+) Stationen? ohne Code\./);
    if (noCode) return noCode[1]+(noCode[1]==='1'?' stop':' stops')+" without a code. Fix with 'Generate codes'.";
    const invalid = issue.match(/^Ungültiger Code: (.*)$/);
    if (invalid) return 'Invalid code: '+invalid[1];
    const audit: Record<string,string> = {
      'Gemeinsamer Zielort fehlt.':'The shared finish location is missing.',
      'Stations-IDs sind nicht eindeutig.':'Station IDs are not all different.',
      'Gruppenplan oder Zeitberechnung stimmt nicht mit den Eingaben überein.':'The team plan or time calculation does not match your inputs.',
      'Planungshinweise stimmen nicht mit den berechneten Gruppenrouten überein.':'The planning notes do not match the calculated team routes.',
      'Umschlaganzahl ist falsch.':'The number of envelopes is wrong.',
      'Anzahl der A5-Aufgabenblätter ist falsch.':'The number of A5 task sheets is wrong.',
      'Umschlag-Blattzahlen stimmen nicht mit der Gesamtzahl der Kinderblätter überein.':'The sheets per envelope do not add up to the total number of children\'s sheets.',
      'Anzahl der A5-Spielleitungsseiten ist falsch.':'The number of A5 organizer pages is wrong.',
      'Anzahl der A5-Etikettenseiten ist falsch.':'The number of A5 label pages is wrong.',
      'Mindestumfang der Druckseiten ist falsch.':'The minimum number of print pages is wrong.',
      'Die angezeigte Gesamtblattzahl stimmt nicht mit den ausgewiesenen Teilmengen überein.':'The total number of sheets shown does not match the parts it is made of.',
      'Umschlagkennungen sind nicht eindeutig.':'Envelope IDs are not all different.',
      'Leere Umschlagkennung ist nicht zulässig.':'An envelope ID must not be empty.',
      'Umschlag enthält eine ungültige Blattzahl.':'An envelope has an invalid number of sheets.',
      'Druckumfang enthält ungültige Seitenzahlen.':'The print size contains invalid page counts.',
      'Umschlag hat eine Stationsnummer außerhalb der Gruppenroute.':'An envelope has a stop number outside the team route.',
      'Umschlag hat keine gültige Stationsgesamtzahl.':'An envelope has no valid total number of stops.',
      'Umschlag enthält eine leere Gruppen-, Stations- oder Zielangabe.':'An envelope has an empty team, stop or destination entry.',
      'Umschlag enthält führende oder nachgestellte Leerzeichen in einer Kennzeichnung.':'An envelope label has spaces at the start or end.',
      'Umschlagkennung passt nicht zur Gruppe und Station.':'An envelope ID does not fit its team and stop.',
      'Umschlag hat einen ungültigen Gruppenindex.':'An envelope has an invalid team number.',
      'Umschlagreihenfolge weicht vom Gruppenplan ab.':'The envelope order differs from the team plan.',
      'Umschlagreihenfolge oder Gruppenzuordnung ist ungültig.':'The envelope order or team assignment is invalid.',
    };
    if (audit[issue]) return audit[issue];
    const tails: Record<string,string> = {
      'Stationszahl stimmt nicht.':'The number of stops is wrong.',
      'Station doppelt in Route.':'A stop appears twice on the route.',
      'Nächster Zielort fehlt.':'The next destination is missing.',
      'Umschlag fehlt oder ist doppelt.':'An envelope is missing or appears twice.',
      'falsche Station auf dem Umschlag.':'wrong stop on the envelope.',
      'Umschlagkennung stimmt nicht mit der Station überein.':'The envelope ID does not match the stop.',
      'falscher nächster Zielort.':'wrong next destination.',
      'Umschlag enthält eine falsche Anzahl A5-Blätter.':'The envelope has the wrong number of A5 sheets.',
      'Umschlagbeschriftung stimmt nicht.':'The envelope label is wrong.',
    };
    const puzzleErrors: Record<string,string> = {
      'Code stimmt nicht überein':'The code does not match',
      'Zielort stimmt nicht überein':'The destination does not match',
      'Das Rätsel nennt bereits den Zielort.':'The puzzle already names the destination.',
      'Wegrätsel ist nicht eindeutig prüfbar oder verrät den Zielort.':'The route puzzle cannot be checked clearly or gives away the destination.',
      'Ziffer muss zwischen 0 und 9 liegen':'The digit must be between 0 and 9',
      'Unbekannte Rätselart':'Unknown puzzle type',
      'Kein vollständiger Pfeilpfad erzeugbar':'No complete arrow path could be made',
      'Kein eindeutiges Zahlwort-Suchgitter erzeugbar':'No clear number-word search grid could be made',
      'Keine nichttriviale Rechnung erzeugbar':'No suitable sum could be made',
      'Der Schloss-Code muss genau drei Ziffern enthalten, auch 000 ist erlaubt.':'The lock code must have exactly three digits; 000 is allowed.',
      'Stations-ID fehlt':'Station ID is missing',
      'Rätselkonsistenz fehlgeschlagen':'Puzzle consistency check failed',
      'Rätselprüfung fehlgeschlagen':'Puzzle check failed',
      'Schloss-Code stimmt nicht mit den Rätseln überein':'The lock code does not match the puzzles',
      'Ungültiger Zielort':'Invalid destination',
      'Für diesen Zielnamen bitte ein anderes Wegrätsel wählen.':'Please choose a different route puzzle for this destination name.',
      'Ein eigenes Wegrätsel fehlt':'A custom route puzzle is missing',
      'Eigenes Wegrätsel ist zu lang (maximal 400 Zeichen).':'The custom route puzzle is too long (at most 400 characters).',
      'Für ein Beschreibungsrätsel bitte mindestens 12 Zeichen Ortsbeschreibung eingeben.':'For a description puzzle, please enter a location description of at least 12 characters.',
      'Die Ortsbeschreibung verrät den Zielnamen auch nach dem Ausblenden. Bitte den Text umformulieren.':'The location description still gives away the destination name even after hiding it. Please reword the text.',
      'Fragenrätsel mit Lösungswort unterstützen keine Ziffern im Ortsnamen. Bitte eine andere Rätselart wählen.':'Question puzzles with a solution word do not work with digits in the location name. Please choose another puzzle type.',
      'Für diesen Ortsnamen fehlen noch passende Fragen. Bitte eine andere Rätselart wählen.':'There are no suitable questions for this location name yet. Please choose another puzzle type.',
      'Fragenrätsel ist nicht konsistent.':'The question puzzle is not consistent.',
    };
    const planCheck = issue.match(/^Gruppenplanung konnte nicht geprüft werden: (.*)$/s);
    if (planCheck) return 'The team planning could not be checked: '+planText(planCheck[1]);
    const route = issue.match(/^Gruppenroute (.*) weicht von der Planung ab\.$/s);
    if (route) return 'Team route '+teamLabel(route[1])+' differs from the plan.';
    const validCodeIssue = issue.match(/^Ungültiger dreistelliger Code: (.*)$/s);
    if (validCodeIssue) return 'Invalid three-digit code: '+validCodeIssue[1];
    const challenge = issue.match(/^Stationsrätsel (.*?): ([^:]*)$/s);
    if (challenge && puzzleErrors[challenge[2]]) return 'Station puzzle '+challenge[1]+': '+puzzleErrors[challenge[2]];
    const routeClue = issue.match(/^(.*?) \/ (.*) → (.*): ([^:]*)$/s);
    if (routeClue && puzzleErrors[routeClue[4]]) return teamLabel(routeClue[1])+' / '+routeClue[2]+' → '+routeClue[3]+': '+puzzleErrors[routeClue[4]];
    const missingCode = issue.match(/^(.*?): Stationscode fehlt für (.*)$/s);
    if (missingCode) return teamLabel(missingCode[1])+': station code missing for '+missingCode[2];
    const teamTail = issue.match(/^(.*?): (.*)$/s);
    if (teamTail && tails[teamTail[2]]) return teamLabel(teamTail[1])+': '+tails[teamTail[2]];
    return planText(issue);
  };
  const config = { players, groupSize, durationMinutes: duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, environment, stationCodes, routeClueModes, routeClueTexts, teamProfiles };
  const plan = useMemo(() => {
    try { return { value: createPlan(config), error: '' }; }
    catch (e) { return { value: null, error: e instanceof Error ? e.message : String(e) }; }
  }, [players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, environment, stationCodes, routeClueModes, routeClueTexts, teamProfiles]);
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
  const missingCodeIds = locations.filter(l=>visitedStationIds.has(l.id)&&!validCode(stationCodes[l.id]??'')).map(l=>l.id);
  const printManifest = plan.value ? createPrintManifest(plan.value,config) : null;
  if (plan.value && printManifest) printIssues.push(...auditPrintManifest(plan.value,printManifest,config));
  const ageLevel=ageLevelFor(age);
  const challenges = useMemo(() => {
    if (goal !== 'locks' || printIssues.length || !plan.value) return [];
    return plan.value.teams.flatMap((team,teamIndex)=>{
      const used=new Set<string>();
      return team.stations.filter(location=>validCode(stationCodes[location.id] ?? '')).map(location=>{
        const ageGroup=team.profile?.age??age;
        let seed=hashSeed(projectId+':team:'+teamIndex+':'+location.id);
        let challenge=generateStationChallenge(location.id,stationCodes[location.id],ageLevelFor(ageGroup),seed);
        const fingerprint=(p:{kind:string;question:string;render?:{items?:string[]};wordGrid?:{rows:string[]};arrowGrid?:{rows:string[];arrows:string}})=>JSON.stringify([p.kind,p.question,p.render?.items??[],p.wordGrid?.rows??[],p.arrowGrid?.rows??[],p.arrowGrid?.arrows??'']);
        for(let attempt=0;attempt<256;attempt++){
          const keys=challenge.puzzles.map(fingerprint);
          if(new Set(keys).size===keys.length&&keys.every(key=>!used.has(key))){keys.forEach(key=>used.add(key));break;}
          seed=(seed+1)>>>0;
          challenge=generateStationChallenge(location.id,stationCodes[location.id],ageLevelFor(ageGroup),seed);
          if(attempt===255)throw new Error('Für Team '+team.name+' konnten keine unterschiedlichen Rätsel erzeugt werden.');
        }
        if(codeFromPuzzles(challenge)!==stationCodes[location.id]) throw new Error('Codeprüfung fehlgeschlagen');
        return {location,challenge,teamName:team.name,teamIndex,ageGroup};
      });
    });
  },[stationCodes,age,projectId,goal,printIssues.length,plan.value,teamProfiles]);
  const organizerChallengePages=useMemo(()=>{
    const bundles=nonEmptyOrganizerGroups((plan.value?.teams??[]).map((_,teamIndex)=>challenges.filter(item=>item.teamIndex===teamIndex)),bundle=>bundle.length);
    return organizerGroupPageRanges(bundles.map(bundle=>bundle.length),ORGANIZER_CODES_PER_A5_SHEET).map(range=>bundles.slice(range.start,range.end).flat());
  },[challenges,plan.value]);
  const [measuredPrintSummary,setMeasuredPrintSummary] = useState<{total:number;organizer:number;children:number;labels:number;error:string}|null>(null);
  useEffect(()=>{
    if(activeStep!==4 || !printManifest || printIssues.length){if(measuredPrintSummary!==null)setMeasuredPrintSummary(null);return;}
    const packet=document.querySelector<HTMLElement>('.print-packet');
    if(!packet)return;
    let next:{total:number;organizer:number;children:number;labels:number;error:string};
    try{
      const {manifest:physical}=buildPackedA5PrintCopy(packet);
      next={total:physical.totalSheets,organizer:physical.organizerSheets,children:physical.childSheets,labels:physical.labelSheets,error:''};
    }catch(error){next={total:0,organizer:0,children:0,labels:0,error:String(error)};}
    setMeasuredPrintSummary(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  });
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
  const changeEnvironment = (next: Environment) => {
    const preset = applyEnvironmentPreset(next, {locations, walkingMinutes}, en);
    setEnvironment(next);
    setLocations(preset.locations);
    setWalkingMinutes(preset.walkingMinutes);
  };
  const applyGame = (project: SavedGame) => {
    const c = normalizeGameConfig(project.config);
    skipSave.current = true;
    savedRevision.current={id:project.id,updatedAt:project.updatedAt};
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
    setEnvironment(c.environment);
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
    } catch(e) { setStorageMessage(tx('Lokale Speicherung beschädigt oder nicht verfügbar. Automatisches Speichern bleibt zum Schutz der vorhandenen Daten deaktiviert: ', 'Local storage is damaged or unavailable. Automatic saving stays off to protect your existing data: ') + storageError(e));
      setStorageReady(false);
    }
  }, []);
  useEffect(() => {
    const onStorageChange=(event:StorageEvent)=>{
      if(event.storageArea!==window.localStorage) return;
      if(projectListChanged(event.key)){
        storageConflict.current=true;
        setStorageReady(false);
        setStorageMessage(tx('Die Projekte wurden in einem anderen Tab verändert. Diese Ansicht speichert nicht mehr automatisch. Bitte hier zunächst eine JSON-Sicherung der offenen Eingaben herunterladen. Danach die Seite neu laden und die aktuelle Projektfassung prüfen.', 'The projects were changed in another tab. This view no longer saves automatically. Please download a JSON backup of your open entries here first, then reload the page and check the current version of the project.'));
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
        const project: SavedGame = { version:1, id:projectId, title:projectTitle.trim()||'Unbenanntes Projekt', updatedAt:nextProjectRevision(savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null), config: { ...config, locations:config.locations.map(x=>({...x})) } };
        const expected=savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null;
        const saved = saveGame(project,expected);
        savedRevision.current={id:projectId,updatedAt:project.updatedAt};
        setProjects(saved);
        setSelectedProject(projectId);
        setStorageMessage('');
      } catch(e) { storageConflict.current=true;setStorageReady(false);setStorageMessage(tx('Automatisches Speichern gestoppt: ', 'Automatic saving stopped: ') + storageError(e) + tx(' Bitte JSON-Sicherung exportieren und die Seite erst danach neu laden.', ' Please export a JSON backup and only then reload the page.')); }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [storageReady, projectId, projectTitle, players, groupSize, duration, age, goal, locations, puzzleMinutes, walkingMinutes, startFinishMinutes, startMode, routeMode, finishMode, meetingPoint, startPoint, environment, stationCodes, routeClueModes, routeClueTexts, teamProfiles]);
  // Page lifecycle flush protects the last edits when the tab closes before debounce expires.
  useEffect(() => {
    if(!storageReady || storageConflict.current) return;
    const flushOnExit=()=>{
      if(storageConflict.current) return;
      try{
        const current:SavedGame={version:1,id:projectId,title:projectTitle.trim()||'Unbenanntes Projekt',updatedAt:nextProjectRevision(savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null),config:{...config,locations:config.locations.map(x=>({...x}))}};
        const expected=savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null;
        saveGame(current,expected);
        savedRevision.current={id:projectId,updatedAt:current.updatedAt};
      }catch(error){
        // Browsers may discard UI updates during pagehide; preserve data where possible.
        setStorageMessage(tx('Speichern beim Verlassen fehlgeschlagen: ', 'Saving when leaving the page failed: ')+storageError(error));
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
    if(storageConflict.current){setStorageMessage(tx('Projektwechsel gesperrt: Die Projektliste wurde in einem anderen Tab verändert.', 'Project switch blocked: the project list was changed in another tab.'));return false;}
    if (!storageReady){setStorageMessage(tx('Projektwechsel gesperrt: Lokale Speicherung ist nicht verfügbar. Bitte zuerst eine JSON-Sicherung exportieren.', 'Project switch blocked: local storage is unavailable. Please export a JSON backup first.'));return false;}
    try {
      const current:SavedGame={version:1,id:projectId,title:projectTitle.trim()||'Unbenanntes Projekt',updatedAt:nextProjectRevision(savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null),config:{...config,locations:config.locations.map(x=>({...x}))}};
      const expected=savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null;
      setProjects(saveGame(current,expected));
      savedRevision.current={id:projectId,updatedAt:current.updatedAt};
      return true;
    } catch(error) {
      if(String(error).includes('zwischenzeitlich verändert')) { storageConflict.current=true;setStorageReady(false); }
      setStorageMessage(tx('Projektwechsel abgebrochen: Aktuelle Änderungen konnten nicht gespeichert werden. ', 'Project switch cancelled: your current changes could not be saved. ')+storageError(error)+tx(' Bitte bei Versionskonflikten zuerst eine JSON-Sicherung exportieren.', ' If versions conflict, please export a JSON backup first.'));
      return false;
    }
  };
  const newProject = () => {
    if(!saveCurrentBeforeSwitch()) return;
    const fresh: SavedGame = {
      version:1, id:newGameId(), title:'Neue Schnitzeljagd', updatedAt:nextProjectRevision(),
      config:createDefaultGameConfig(),
    };
    try { const updated=saveGame(fresh); setProjects(updated); applyGame(fresh); setStorageReady(true); setActiveStep(1); }
    catch(e){ setStorageMessage(tx('Neues Projekt: ', 'New project: ')+storageError(e)); }
  };
  const removeProject = () => {
    if(storageConflict.current || !storageReady){
      setStorageMessage(tx('Löschen gesperrt: Die lokale Projektliste ist nicht sicher verfügbar.', 'Delete blocked: the local project list is not safely available.'));
      return;
    }
    if (!window.confirm(tx('Dieses Projekt wirklich löschen? Vorher bei Bedarf über Sichern eine JSON-Datei herunterladen. Die Löschung kann nicht rückgängig gemacht werden.', 'Delete this project? Export a JSON backup first if needed. This cannot be undone.'))) return;
    try {
      const stored=loadGames();
      const expected=savedRevision.current?.id===projectId?savedRevision.current.updatedAt:undefined;
      if(expected===undefined) throw new Error(tx('Projektversion unbekannt. Löschen zum Schutz der Daten abgebrochen.', 'Project version unknown. Delete cancelled to protect your data.'));
      if(stored.length===1 && stored[0].id===projectId){
        const fresh:SavedGame={version:1,id:newGameId(),title:'Meine Schnitzeljagd',updatedAt:nextProjectRevision(),config:createDefaultGameConfig()};
        const saved=replaceLastGame(projectId,fresh,expected??undefined);
        setProjects(saved);
        applyGame(fresh);
        setActiveStep(1);
      }else{
        const remaining=deleteGame(projectId,expected??undefined);
        setProjects(remaining);
        if(remaining[0]) { applyGame(remaining[0]); setActiveStep(1); }
      }
    }catch(e){
      if(String(e).includes('zwischenzeitlich verändert')) { storageConflict.current=true;setStorageReady(false); }
      setStorageMessage(tx('Löschen fehlgeschlagen: ', 'Delete failed: ')+storageError(e));
    }
  };
  const exportProject = () => {
    try {
      const project: SavedGame = {version:1,id:projectId,title:projectTitle.trim()||'Unbenanntes Projekt',updatedAt:nextProjectRevision(savedRevision.current?.id===projectId?savedRevision.current.updatedAt:null),config:{...config,locations:config.locations.map(x=>({...x}))}};
      downloadBackup(project);
      setStorageMessage(tx('Projektdatei wurde zum Download vorbereitet.', 'Project backup prepared for download.'));
    } catch(e){ setStorageMessage(tx('Export fehlgeschlagen: ', 'Export failed: ')+storageError(e)); }
  };
  const importProject = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 200_000) throw new Error(tx('Datei zu groß.', 'File too large.'));
      const imported = parseGameBackup(await file.text());
      if(!saveCurrentBeforeSwitch()) return;
      const restored: SavedGame = {...imported,id:newGameId(),title:importedProjectTitle(imported.title),updatedAt:nextProjectRevision()};
      const updated = saveGame(restored);
      setProjects(updated);
      applyGame(restored);
      setActiveStep(1);
      setStorageMessage(tx('Projekt aus Sicherung wiederhergestellt.', 'Project restored from backup.'));
    } catch(e){ setStorageMessage(tx('Import fehlgeschlagen: ', 'Import failed: ')+storageError(e)); }
    finally { if (importRef.current) importRef.current.value=''; }
  };
  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/" aria-label={tx('Spurjagd Startseite','Spurjagd home page')}><span className="mark">↗</span> SPURJAGD</a>
        <div className="header-actions"><span className="prototype">{tx('PROTOTYP 0.3','PROTOTYPE 0.3')}</span>
          <label className="visually-hidden" htmlFor="language">{tx('Sprache','Language')}</label>
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
                catch(error) { setStorageMessage(tx('Projektwechsel fehlgeschlagen: ', 'Project switch failed: ')+storageError(error)); }
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
          {storageMessage && <p className="storage-message" role="status" aria-live="polite">{storageMessage}</p>}
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
              <p className="helper" role="status" aria-live="polite">{tx("Geplante Gruppen", "Planned teams")}: {groupDistribution.length}. {tx("Gruppengrößen", "Team sizes")}: {groupDistribution.length <= 12 ? groupDistribution.join(" / ") : `${Math.min(...groupDistribution)}–${Math.max(...groupDistribution)} (${groupDistribution.length})`}. {tx('Jede Gruppe erhält Rätsel passend zur Altersstufe.','Each team receives puzzles for its age group.')}</p>
              <div className="team-age-assignments" aria-label={tx('Altersgruppen je Team','Age groups per team')}>{groupDistribution.map((_,i)=>{const teamName=['Rot','Blau','Grün','Gelb','Orange','Lila','Türkis','Silber','Gold','Pink'][i]??String(i+1);const key=String(i);return <label key={key}>{tx('Team '+teamName+' – Altersgruppe','Team '+(i+1)+' – age group')}<select value={teamProfiles[key]?.age??age} onChange={event=>setTeamProfiles(old=>({...old,[key]:{age:event.target.value,difficulty:old[key]?.difficulty??'normal'}}))}>{AGE_GROUPS.map(group=><option key={group}>{group}</option>)}</select></label>;})}</div>
               {groupDistribution.includes(1) && players>1 && <p className="warnings" role="status" aria-live="polite">{tx("Mindestens eine Gruppe hätte nur ein Kind. Bitte Gruppengröße oder Kinderzahl prüfen und die Einteilung vor Ort anpassen.", "At least one team would contain only one child. Review team size or participant count and adjust the grouping before the event.")}</p>}
              <p className="helper">{tx("Die maximale Gruppengröße ist eine Obergrenze. Die Kinder werden möglichst gleichmäßig verteilt.", "Maximum team size is a limit. Participants are distributed as evenly as possible.")}</p>
              <div className="form-grid">
                <label className="range-field"><span>{t.children}: <strong>{players}</strong></span><input min="1" max="100" type="range" value={players} onChange={e => setPlayers(Number(e.target.value))}/></label>
                <label className="range-field"><span>{t.size}: <strong>{groupSize}</strong></span><input min="1" max="10" type="range" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))}/></label>
                <label>{t.age}<select value={age} onChange={e => setAge(e.target.value)}>{AGE_GROUPS.map(group=><option key={group}>{group}</option>)}</select></label>
                <label>{t.duration}<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option><option value={180}>180 min</option></select></label>
                <label>{tx('Umgebung','Setting')}<select value={environment} onChange={e => changeEnvironment(e.target.value as Environment)}><option value="outdoor">{tx('Draußen','Outdoors')}</option><option value="indoor">{tx('Im Haus','Indoors')}</option><option value="mixed">{tx('Gemischt','Mixed')}</option></select></label>
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
              {goal==='locks' && <p className="helper" role="status" aria-live="polite">{locations.filter(l=>visitedStationIds.has(l.id)&&validCode(stationCodes[l.id]??'')).length} {tx('von','of')} {locations.filter(l=>visitedStationIds.has(l.id)).length} {tx('benötigten Schloss-Codes vollständig','required lock codes complete')}.</p>}
              <div className="location-list">{locations.map((location, index) =>
                <div className="location-card" key={location.id}>
                  <div className="location-title"><strong>{tx('Station','Stop')} {index + 1}</strong><button type="button" className="text-button" disabled={locations.length === 1} onClick={()=>setLocations(old=>old.filter(p=>p.id !== location.id))}>{tx('Entfernen','Remove')}</button></div>
                  <label>{tx('Name des Ortes','Location name')}<input value={location.name} maxLength={80} placeholder={tx('z. B. Spielplatz','e.g. playground')} onChange={e=>updateLocation(location.id,'name',e.target.value)}/></label>
                  <label>{tx('Beschreibung (optional)','Description (optional)')}<textarea rows={2} maxLength={400} value={location.description} onChange={e=>updateLocation(location.id,'description',e.target.value)} placeholder={tx('Was gibt es hier?','What is there?')}/></label>
                  <p className="helper">{tx("Der Ortsname ist die Lösung des Wegrätsels und darf nicht bereits im Aufgabentext stehen.", "The location name is the route-clue answer and must not already appear in the question.")}</p>
                  <label>{tx('Wegrätsel, das zu diesem Ort führt','Route clue leading to this place')}<select value={routeClueModes[location.id]??'letters'} onChange={e=>setRouteClueModes(old=>({...old,[location.id]:e.target.value as RouteClueMode}))}><option value="description">{tx('Ortsbeschreibung erraten','Guess the place from its description')}</option><option value="questions">{tx('Fragen mit Lösungswort','Questions with a solution word')}</option><option value="letters">{tx('Buchstabenspiel','Letter game')}</option><option value="custom">{tx('Eigenes Wegrätsel','Custom route clue')}</option></select></label>
                  {routeClueModes[location.id]==='custom' && <label>{tx('Eigener Rätseltext','Custom clue')}<textarea rows={3} maxLength={400} value={routeClueTexts[location.id]??''} onChange={e=>setRouteClueTexts(old=>({...old,[location.id]:e.target.value}))}/></label>}
                  {goal==='locks' && <label>{tx('Dreistelliger Schloss-Code','Three-digit lock code')}{plan.value && !visitedStationIds.has(location.id) && <span className="helper">{tx('Diese Station wird nach aktuellem Plan nicht besucht – Code optional.','No team visits this station in the current plan – code optional.')}</span>}<input inputMode="numeric" pattern="[0-9]{3}" maxLength={3} placeholder={tx('z. B. 007','e.g. 007')} aria-invalid={visitedStationIds.has(location.id) && !validCode(stationCodes[location.id]??'')} aria-describedby={'code-help-'+location.id} value={stationCodes[location.id] ?? ''} onChange={e=>setStationCodes(old=>({...old,[location.id]:e.target.value.replace(/[^0-9]/g,'').slice(0,3)}))}/><span className="helper" id={'code-help-'+location.id}>{visitedStationIds.has(location.id) && !validCode(stationCodes[location.id]??'') ? tx('Bitte genau drei Ziffern eingeben; 000 und führende Nullen sind erlaubt.','Enter exactly three digits; 000 and leading zeroes are allowed.') : tx('Drei Ziffern, wie auf dem echten Schloss eingestellt.','Three digits, matching the physical lock.')}</span></label>}
                </div>
              )}</div>
              {!sameStartFinish && <div className="location-card"><div className="location-title"><strong>{tx("Ziel","Finish")}</strong></div><label>{tx("Name des Zielorts","Finish location name")}<input maxLength={80} value={meetingPoint} onChange={e=>setMeetingPoint(e.target.value)}/></label></div>}
              {goal==='locks' && <button type="button" className="secondary" onClick={()=>setStationCodes(old=>generateMissingCodes(locations.filter(l=>visitedStationIds.has(l.id)).map(l=>l.id),old,projectId))}>{tx('Codes erzeugen','Generate codes')}</button>}
              <button type="button" className="secondary" onClick={addLocation} disabled={locations.length>=20}>+ {tx('Standort hinzufügen','Add location')}</button>
              <button type="button" className="secondary" onClick={()=>setActiveStep(4)}>{tx("Spielplan ansehen", "View game plan")}</button>
              {printIssues.length>0 && <div className="warnings" role="status" aria-live="polite" aria-atomic="true"><strong>{tx('Noch zu erledigen, bevor das A5-Paket gedruckt werden kann:','To resolve before printing the A5 packet:')}</strong>{groupPrintIssues(printIssues,missingCodeIds).map((issue,i)=><div className="preflight-issue" key={i}><span>{issueText(issue)}</span><button type="button" className="secondary" onClick={()=>setActiveStep(issueStep(issue))}>{tx('Eingabe bearbeiten','Edit input')}</button></div>)}</div>}
              {printIssues.length===0 && <p className="helper" role="status" aria-live="polite">{tx('Alle Angaben für das A5-Druckpaket sind vollständig.','All A5 print packet inputs are complete.')}</p>}
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
              <div className={printIssues.length ? 'preflight-status preflight-blocked' : 'preflight-status preflight-ready'} role="status" aria-live="polite">
                <strong>{printIssues.length ? tx('Druck noch gesperrt', 'Printing not ready') : tx('Druckpaket bereit', 'Print packet ready')}</strong>
                <span>{printIssues.length
                  ? tx('Bitte die unten genannten Eingaben korrigieren. Das Druckpaket wird danach automatisch aktualisiert.', 'Correct the inputs listed below. The print packet updates automatically.')
                  : tx('Alle automatischen Plausibilitätsprüfungen sind bestanden. Vor der Ausgabe die Druckvorschau und die echten Schlösser prüfen.', 'All automated consistency checks passed. Check the print preview and physical locks before use.')}</span>
              </div>
              {plan.error ? <p className="error" role="alert">{planText(plan.error)}</p> : plan.value && <>
                <div className="stats">
                  <div className="stat"><strong>{plan.value.teams.length}</strong><span>{t.teams}</span></div>
                  <div className="stat"><strong>{plan.value.stopsPerTeam}</strong><span>{tx('Stationen je Team','Stops per team')}</span></div>
                  <div className="stat"><strong>{plan.value.estimatedMinutes}</strong><span>{tx('Geschätzte Minuten','Estimated minutes')}</span></div>
                </div>
                <p className="helper">{tx('Noch frei im Zeitbudget','Remaining time buffer')}: {plan.value.remainderMinutes} min</p>
                {plan.value.cautions.length>0 && <div className="warnings" role="status" aria-live="polite"><strong>{tx("Hinweise für die Spielleitung", "Organizer notes")}</strong>{plan.value.cautions.map((warning,i)=><p key={i}>{planText(warning)}</p>)}</div>}
                <div className="team-list">{plan.value.teams.map((team,i)=>
                  <article className="team" key={i}>
                    <h3>{en ? 'Team ' + (i+1) : 'Team '+team.name}<span>{team.memberCount} {en?'participants':'Kinder'}</span></h3>
                    <p>{team.stations.map(s => s.name).join(' → ')} → {team.finish}</p>
                  </article>
                )}</div>
                {plan.value && <section className="challenge-preview"><h3>{tx("Wegrätsel – Vorschau nach Zielort", "Route clues – preview by destination")}</h3><p className="helper">{tx("Jedes Ziel erhält genau ein Wegrätsel. Die Gruppen bekommen unabhängig von ihrer Route dieselbe Version.", "Each destination has one route clue. Teams receive the same version regardless of their route.")}</p>{Array.from(new Set(plan.value.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)))).map(destination=>{
                  const target=locations.find(l=>l.name.trim()===destination.trim());
                  try {
                    const clue=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??(target?'description':'letters'),hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'',ageLevel);
                    return <article className="location-card" key={destination}><strong>{tx("Ziel", "Destination")}: {destination}</strong><p>{clue.instruction}</p>{clue.rows?clue.rows.map((row,i)=><p key={i}>{i+1}. {row.question} ({tx('Buchstabe','letter')} {row.letterIndex+1})</p>):<p>{clue.question}</p>}<p className="helper">{tx("Lösung für die Spielleitung", "Organizer answer")}: {clue.answer}</p></article>;
                  } catch(error) {
                    return <article className="location-card" key={destination}><strong>{tx('Ziel','Destination')}: {destination}</strong><p className="error">{error instanceof Error?error.message:String(error)}</p></article>;
                  }
                })}</section>}
                {goal==='locks' && <section className="challenge-preview"><h3>{tx("Schlossrätsel – Vorschau für die Spielleitung","Lock puzzles – organizer preview")}</h3>{locations.some(l=>visitedStationIds.has(l.id)&&!validCode(stationCodes[l.id]??"")) && <p className="error">{tx("Bitte für jede besuchte Rätselstation einen dreistelligen Code eingeben.","Enter a three-digit code for every visited puzzle station.")}</p>}{challenges.map(({location,challenge,teamName,teamIndex,ageGroup})=><article className="location-card" key={teamIndex+'-'+location.id}><strong>{tx('Team '+teamName+' · '+ageGroup+' Jahre','Team '+teamLabel(teamName)+' · ages '+ageGroup)} · {location.name}: {challenge.code}</strong>{challenge.puzzles.map((p,i)=><div key={p.id}><p><b>{i+1}. {p.instruction}</b> {p.question}</p>{p.render && <p className="symbols">{p.render.symbol.repeat(p.render.count) || tx("□ (leer)","□ (empty)")}</p>}{p.wordGrid && <div className="wordsearch-grid" aria-label={tx("Buchstabengitter","Letter grid")}>{p.wordGrid.rows.map((row,r)=><div className="wordsearch-row" key={r}>{[...row].map((letter,c)=><span className="wordsearch-cell" key={c}>{letter}</span>)}</div>)}</div>}{p.arrowGrid && <div className="wordsearch-grid arrow-grid" data-grid-size={p.arrowGrid.rows.length} aria-label={tx("Pfeilpfad-Zahlengitter","Arrow path number grid")}>{p.arrowGrid.rows.map((row,r)=><div className="wordsearch-row" key={r}>{[...row].map((digit,c)=><span className={r===p.arrowGrid!.startRow&&c===p.arrowGrid!.startCol?'wordsearch-cell arrow-start-cell':'wordsearch-cell'} key={c}>{r===p.arrowGrid!.startRow&&c===p.arrowGrid!.startCol?<><small>S</small><strong>{p.arrowGrid!.arrows[0]}</strong></>:digit}</span>)}</div>)}</div>}<p className="helper">{tx("Lösung","Answer")}: {p.expectedDigit} – {p.explanation}</p></div>)}</article>)}</section>}
                {printManifest && <div className="warnings"><strong>{tx("Druckumfang A5", "A5 print volume")}</strong><p>{en ? <>{printManifest.envelopes.length} envelopes with at least 2 sheets each; {printManifest.taskSheets} child sheets in total, plus {printManifest.organizerSheets} organizer sheets and {printManifest.labelSheets} label sheets. Before automatic A5 packing: {printManifest.minimumSheets} A5 pages. {measuredPrintSummary?.error ? 'A5 measurement: '+measuredPrintSummary.error : measuredPrintSummary ? 'After browser measurement: '+measuredPrintSummary.total+' A5 pages ('+measuredPrintSummary.children+' children, '+measuredPrintSummary.organizer+' organizer, '+measuredPrintSummary.labels+' labels).' : 'The actual page count is measured in the browser on the print page.'}</> : <>{printManifest.envelopes.length} Umschläge mit je mindestens 2 Blättern; zusammen {printManifest.taskSheets} Kinderblätter, dazu {printManifest.organizerSheets} Spielleitungsblätter und {printManifest.labelSheets} Etikettenblätter. Vor der automatischen A5-Verdichtung: {printManifest.minimumSheets} A5-Seiten. {measuredPrintSummary?.error ? 'A5-Messung: '+measuredPrintSummary.error : measuredPrintSummary ? 'Nach der Browsermessung: '+measuredPrintSummary.total+' A5-Seiten ('+measuredPrintSummary.children+' Kinder, '+measuredPrintSummary.organizer+' Spielleitung, '+measuredPrintSummary.labels+' Etiketten).' : 'Die tatsächliche Seitenzahl wird auf der Druckseite im Browser gemessen.'}</>}</p></div>}
                {printManifest && <div className="print-guidance" aria-label={tx('A5-Druckanleitung','A5 print instructions')}>
                  <strong>{tx('Druckeinstellungen und Packen','Print settings and packing')}</strong>
                  <p>{tx('A5 Hochformat · Maßstab 100 % · Browser-Kopf- und Fußzeilen ausschalten. Prüfe die Druckvorschau auf abgeschnittene Texte und zusätzliche Seiten.','A5 portrait · 100% scale · disable browser headers and footers. Check the preview for clipped text and extra pages.')}</p>
                  <p>{tx('Nach dem Druck: zuerst die Spielleitungsblätter beiseitelegen. Dann je Umschlag Aufgabenblatt und alle Wegrätselblätter in der gedruckten Reihenfolge zusammenlegen. Die Etiketten zuletzt zuordnen und die Umschlagkontrolle abhaken.','After printing, set organizer pages aside. Pack task and route sheets in printed order per envelope. Match labels last and tick the packing checklist.')}</p>
                  <p><strong>{tx('Packübersicht nach Team:','Packing totals by team:')}</strong> {plan.value.teams.map(team=>{const items=printManifest.envelopes.filter(envelope=>envelope.team===team.name);return teamLabel(team.name)+': '+items.length+' '+tx('Umschläge','envelopes')+', '+items.reduce((sum,envelope)=>sum+envelope.sheetCount,0)+' '+tx('Kinderblätter','child sheets');}).join(' · ')}</p>
                  <details className="packing-preview">
                    <summary>{tx('Umschläge vor dem Drucken einzeln kontrollieren','Review envelopes before printing')} ({printManifest.envelopes.length})</summary>
                    <p className="helper">{tx('Nur für die Spielleitung: Schloss-Codes und nächste Zielorte nicht an Kinder weitergeben.','Organizer only: do not share lock codes or next destinations with children.')}</p>
                    {plan.value.teams.map(team=><section className="packing-preview-team" key={team.name}>
                      <h4>{tx('Team','Team')} {teamLabel(team.name)}</h4>
                      <ol>{printManifest.envelopes.filter(envelope=>envelope.team===team.name).map(envelope=><li key={envelope.id}>
                        <strong>{tx('Station','Station')} {envelope.stationNumber}: {envelope.stationName}</strong>
                        <span>{envelope.sheetCount} {tx('A5-Kinderblätter','A5 child sheets')} · {tx('Schloss','Lock')}: <strong>{stationCodes[envelope.stationId]??'—'}</strong> · {tx('Danach','Next')}: <strong>{envelope.destination}</strong></span>
                      </li>)}</ol>
                    </section>)}
                  </details>
                  <p>{tx('Papierbedarf: Die angezeigte Seitenzahl bezieht sich auf A5-Einzelseiten. Bei zwei A5-Seiten pro A4-Bogen oder Duplexdruck hängt die benötigte Bogenanzahl von der gewählten Druckeinstellung ab.','Paper estimate: the displayed count refers to individual A5 pages. Sheets needed for two A5 pages per A4 sheet or duplex printing depend on printer settings.')}</p>
                  <p>{tx('Schloss-Codes am echten Schloss prüfen. Die automatische Prüfung ersetzt keinen A5-Probedruck.','Check each code on the actual lock. Automated checks do not replace a physical A5 test print.')}</p>
                </div>}
                {printIssues.length>0 && <div className="warnings" role="status" aria-live="polite" aria-atomic="true"><strong>{tx('Vor dem Drucken prüfen:','Check before printing:')}</strong>{groupPrintIssues(printIssues,missingCodeIds).map((issue,i)=><p key={i}>{issueText(issue)}</p>)}<div className="preflight-actions"><button type="button" className="secondary" onClick={()=>setActiveStep(2)}>{tx('Spielregeln und Zeit prüfen','Review rules and timing')}</button><button type="button" className="secondary" onClick={()=>setActiveStep(3)}>{tx('Standorte und Codes prüfen','Review locations and codes')}</button></div></div>}
                {printIssues.length===0 && <section className="print-packet" aria-label="Druckpaket">
                  <article className="print-sheet print-organizer-sheet" key="safety-check">
                    <h1>Spielleitung – Start und Sicherheit</h1>
                    <h2>Vor der Ausgabe</h2>
                    <p>Pro Umschlag: ein A5-Aufgabenblatt mit Antwortfeldern und die zugehörigen Wegrätselblätter. Teamname, Station, Umschlagnummer und Blattzahl gegen die Gruppenroute prüfen.</p>
                    <p>Schlösser auf die Codes einstellen und an den tatsächlichen Schlössern testen. Schloss-Code und Wegrätsel müssen beide gelöst werden.</p>
                    <h2>Vor Ort kontrollieren</h2>
                    <p>{siteSafetyCheck(environment,en)}</p>
                    <h2>Hinweise aus der Routenplanung</h2>
                    {plan.value.cautions.length===0?<p>Keine zusätzlichen Planungshinweise ermittelt. Örtliche Gefahren trotzdem prüfen.</p>:<p>Die vollständigen Planungshinweise auf den nachfolgenden A5-Blättern vor dem Start durchgehen und die örtlichen Bedingungen kontrollieren.</p>}
                    <h2>Zum Spielende</h2>
                    <p>Alle Kinder zählen, sämtliche Schlösser und das Material einsammeln.</p>
                  </article>
                  {Array.from({length:Math.ceil(plan.value.teams.length/ORGANIZER_ROUTES_PER_A5_SHEET)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'routes-'+page}>
                    <h1>{projectTitle} – Gruppenrouten {page+1}</h1>
                    <p><strong>Start:</strong> {startPoint} · <strong>Ziel:</strong> {finishMode==='origin'?startPoint:finishMode==='meeting'?meetingPoint:'Eigene Startstation'}</p>
                    <p>{players} Kinder · {plan.value.teams.length} Gruppen · {duration} Minuten · {plan.value.stopsPerTeam} Stationen je Gruppe</p>
                    <h2>Gruppen und Routen</h2>
                    <p>Jede Gruppe erhält Aufgaben und Wegrätsel für die neben ihrer Teamfarbe angegebene Altersstufe.</p>
                    {plan.value.teams.slice(page*ORGANIZER_ROUTES_PER_A5_SHEET,(page+1)*ORGANIZER_ROUTES_PER_A5_SHEET).map((team,i)=><p className="team-route-line" data-team-color={team.name.toLowerCase()} key={i}><strong>{team.name} · {team.profile?.age??age} Jahre ({team.memberCount}):</strong> {team.stations.map(s=>s.name).join(' → ')} → {team.finish}</p>)}
                  </article>)}
                  {organizerChallengePages.map((challengePage,page)=><article className="print-sheet print-organizer-sheet" key={'codes-'+page}>
                    <h1>Spielleitung – Codes {page+1}</h1>
                    <h2>Codes und Lösungen</h2>
                    {challengePage.map(({location,challenge,teamName,teamIndex,ageGroup})=><div className="print-code-line" data-team-color={teamName.toLowerCase()} data-age-group={ageGroup} key={teamIndex+'-'+location.id}><strong>Team {teamName} · {ageGroup} Jahre · {location.name}: {challenge.code}</strong><p>{challenge.puzzles.some(p=>p.kind==='wordsearch')?'Drei Zahlwörter im gemeinsamen Suchgitter: '+generateThreeDigitWordGrid(challenge.code,hashSeed(projectId+':'+teamIndex+':'+location.id)).words.join(' → '):challenge.puzzles.map(p=>p.explanation).join(' | ')}</p></div>)}
                  </article>)}
                  {Array.from({length:Math.ceil(Array.from(new Set(plan.value.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)))).length/ORGANIZER_ITEMS_PER_A5_SHEET)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'clue-solutions-'+page}>
                    <h1>Spielleitung – Wegrätsel-Lösungen {page+1}</h1>
                    {Array.from(new Set(plan.value.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)))).slice(page*ORGANIZER_ITEMS_PER_A5_SHEET,(page+1)*ORGANIZER_ITEMS_PER_A5_SHEET).map(destination=>{
                      const target=locations.find(l=>l.name.trim()===destination.trim());
                      const clue=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??(target?'description':'letters'),hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'',ageLevel);
                      return <div className="print-solution-entry" key={destination}><strong>Ziel: {destination}</strong>{clue.mode==='questions'?<p>{clue.rows?.map(row=>row.solution+' ('+(row.letterIndex+1)+')').join(' · ')}</p>:<p>{clue.mode==='letters'?'Buchstabenspiel':clue.mode==='description'?'Text-Rätsel':'Eigener Rätseltext'}</p>}</div>;
                    })}
                  </article>)}
                  {Array.from({length:Math.ceil(plan.value.cautions.length/ORGANIZER_CAUTIONS_PER_A5_SHEET)},(_,page)=><article className="print-sheet print-organizer-sheet" key={'cautions-'+page}>
                    <h1>Spielleitung – Planungshinweise {page+1}</h1>
                    <p>Diese Hinweise sind Annahmen aus der Routenplanung und müssen vor Ort überprüft werden.</p>
                    {plan.value.cautions.slice(page*ORGANIZER_CAUTIONS_PER_A5_SHEET,(page+1)*ORGANIZER_CAUTIONS_PER_A5_SHEET).map((warning,i)=><p className="print-caution" key={i}>{page*ORGANIZER_CAUTIONS_PER_A5_SHEET+i+1}. {warning}</p>)}
                  </article>)}
                  {Array.from({length:Math.max(1,Math.ceil((printManifest?.envelopes.length??0)/ORGANIZER_ENVELOPES_PER_A5_SHEET))},(_,page)=><article className="print-sheet print-organizer-sheet" key={'control-'+page}>
                    <h1>Spielleitung – Umschlagkontrolle {page+1}</h1>
                    <p>Umschläge je Team nach Stationsnummer sortieren und jeweils nach dem Packen abhaken.</p>
                    {printManifest?.envelopes.slice(page*ORGANIZER_ENVELOPES_PER_A5_SHEET,(page+1)*ORGANIZER_ENVELOPES_PER_A5_SHEET).map(envelope=><p className="print-checklist-row" data-team-color={envelope.team.toLowerCase()} key={envelope.id} data-envelope-id={envelope.id} data-team={envelope.team} data-station={envelope.stationName} data-number={envelope.stationNumber} data-count={envelope.sheetCount} data-code={stationCodes[envelope.stationId]??''} data-destination={envelope.destination} data-age-group={plan.value.teams.find(team=>team.name===envelope.team)?.profile?.age??age}>□ <strong>Team {envelope.team} · {plan.value.teams.find(team=>team.name===envelope.team)?.profile?.age??age} · Station {envelope.stationNumber}: {envelope.stationName}</strong><span>{envelope.sheetCount} Kinderblätter (1 Aufgabe, {envelope.sheetCount-1} Wegrätsel) · Schloss-Code: <strong>{stationCodes[envelope.stationId]}</strong> · Danach: <strong>{envelope.destination}</strong></span></p>)}
                  </article>)}
                  {plan.value.teams.map((team,teamIndex)=>team.stations.map((location,stationIndex)=>{
                    const challenge=challenges.find(c=>c.teamIndex===teamIndex&&c.location.id===location.id)?.challenge;
                    if(!challenge)return null;
                    const destination=team.stations[stationIndex+1]?.name??team.finish;
                    const target=locations.find(l=>l.name.trim()===destination.trim());
                    let routePuzzle;
                    try {routePuzzle=generateCreativeRouteClue(destination,target?.description??'',routeClueModes[target?.id??'']??(target?'description':'letters'),hashSeed(projectId+':destination:'+(target?.id??destination)),routeClueTexts[target?.id??'']??'',ageLevelFor(team.profile?.age??age));}
                    catch {return null;}
                    return <React.Fragment key={teamIndex+'-'+location.id}>
                      <article className="print-sheet print-child-sheet" data-team-color={team.name.toLowerCase()} data-age-group={team.profile?.age??age} data-envelope-id={teamIndex+'-'+location.id} data-sheet-kind="task">
                        <h1>{projectTitle}</h1>
                        <p><strong>Team {team.name} · {team.profile?.age??age} Jahre</strong> · Station {stationIndex+1} von {team.stations.length} · Blatt 1/{1+routeSheetCount(destination,config)}</p>
                        <h2>Stationsaufgaben: {location.name}</h2>
                        <p><strong>Schloss-Code:</strong> {challenge.puzzles.some(p=>p.kind==='wordsearch')?'Findet die drei Zahlwörter im Gitter. Ihre Reihenfolge von oben nach unten ergibt den dreistelligen Code.':'Aufgabe 1 = erste Ziffer · Aufgabe 2 = zweite Ziffer · Aufgabe 3 = dritte Ziffer. Tragt die Ergebnisse von links nach rechts ein.'}</p>
                        {challenge.puzzles.some(p=>p.kind==='wordsearch') && <div className="print-task print-three-word-grid"><h3>Geheimcode im Buchstabengitter</h3><p>Im Gitter sind genau drei ausgeschriebene Zahlen versteckt. Sucht waagerecht, senkrecht und diagonal. Kreist alle drei Zahlwörter ein.</p><p className="print-question"><strong>Reihenfolge:</strong> Das Zahlwort, das am weitesten oben beginnt, ist die erste Ziffer. Danach folgt das mittlere und zuletzt das unterste Zahlwort.</p><div className="wordsearch-grid" aria-label="Drei Zahlwörter für den Schloss-Code">{generateThreeDigitWordGrid(challenge.code,hashSeed(projectId+':'+location.id)).rows.map((row,r)=><div className="wordsearch-row" key={r}>{[...row].map((letter,c)=><span className="wordsearch-cell" key={c}>{letter}</span>)}</div>)}</div><p className="print-question">Unser Code von oben nach unten: □ □ □</p></div>}
                        {!challenge.puzzles.some(p=>p.kind==='wordsearch') && challenge.puzzles.map((p,i)=><div className="print-task" key={p.id}><h3>Aufgabe {i+1}</h3><p>{p.instruction}</p><p className="print-question">{p.question}</p><p className="print-hint">Tipp: {p.hint}</p>{p.kind==='cipher' && !p.workedExample && <div className="print-alphabet-guide" aria-label="Zwei ausgerichtete Alphabete"><div><span>Alphabet</span><code>ABCDEFGHIJKLMNOPQRSTUVWXYZ</code></div><div><span>Zurück um {Number(p.instruction.match(/um (\d+) Stelle/)?.[1]??1)}</span><code>{[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((_,index)=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(index-Number(p.instruction.match(/um (\d+) Stelle/)?.[1]??1)+26)%26]).join('')}</code></div></div>}{p.workedExample && <p className="print-worked-example">{p.workedExample}</p>}{p.render && (p.render.items ? <div className="symbol-grid" style={{gridTemplateColumns:'repeat('+(p.render.columns??4)+', 7mm)'}} aria-label={p.render.items.length+' Zeichen; gesucht: '+p.render.symbol}>{p.render.items.map((symbol,index)=><span className="symbol-cell" style={{width:'auto',height:'auto'}} key={index}>{symbol}</span>)}</div> : <p className="symbols">{p.render.symbol.repeat(p.render.count)}</p>)}{p.wordGrid && <div className="wordsearch-grid" aria-label="Buchstabengitter">{p.wordGrid.rows.map((row,r)=><div className="wordsearch-row" key={r}>{[...row].map((letter,c)=><span className="wordsearch-cell" key={c}>{letter}</span>)}</div>)}</div>}{p.arrowGrid && <div className="wordsearch-grid arrow-grid" data-grid-size={p.arrowGrid.rows.length} aria-label="Pfeilpfad-Zahlengitter">{p.arrowGrid.rows.map((row,r)=><div className="wordsearch-row" key={r}>{[...row].map((digit,c)=><span className={r===p.arrowGrid!.startRow&&c===p.arrowGrid!.startCol?'wordsearch-cell arrow-start-cell':'wordsearch-cell'} key={c}>{r===p.arrowGrid!.startRow&&c===p.arrowGrid!.startCol?<><small>S</small><strong>{p.arrowGrid!.arrows[0]}</strong></>:digit}</span>)}</div>)}</div>}</div>)}
                        {!challenge.puzzles.some(p=>p.kind==='wordsearch') && <p className="print-code-entry"><strong>Unser Schloss-Code:</strong> □ □ □</p>}
                      </article>
                      {Array.from({length:routeSheetCount(destination,config)},(_,routePage)=><article className="print-sheet print-child-sheet" data-envelope-id={teamIndex+'-'+location.id} data-sheet-kind="route" data-team-color={team.name.toLowerCase()} data-age-group={team.profile?.age??age} data-route-page={routePage+1} key={'route-'+routePage}>
                        <h1>Wegrätsel {routeSheetCount(destination,config)>1?'– Teil '+(routePage+1):''}</h1>
                        <p><strong>Team {team.name} · {team.profile?.age??age} Jahre</strong> · {location.name} · Blatt {2+routePage}/{1+routeSheetCount(destination,config)}</p>
                        <p>Löst das Wegrätsel, um euren nächsten Ort herauszufinden. Ihr dürft die Blätter gleichzeitig bearbeiten.</p>
                        <p className="print-question">{routePuzzle.instruction}</p>
                        {routePuzzle.rows ? <div>{routePuzzle.rows.slice(routePage*ROUTE_QUESTIONS_PER_A5_SHEET,(routePage+1)*ROUTE_QUESTIONS_PER_A5_SHEET).map((r,i)=><div className="print-route-question" key={i}><p>{routePage*ROUTE_QUESTIONS_PER_A5_SHEET+i+1}. {r.question}</p><div className="route-answer-grid" aria-label={"Antwort mit "+r.solution.length+" Buchstaben"}>{[...r.solution].map((_,index)=><span key={index} className={index===r.letterIndex?"route-answer-cell route-answer-highlight":"route-answer-cell"}></span>)}</div></div>)}</div> : <p className="route-letters">{routePuzzle.question}</p>}
                        {routePage===routeSheetCount(destination,config)-1 && <p>Unser nächster Ort: __________________________________</p>}
                        <p className="helper">Tipp: {routePuzzle.hint}</p>
                      </article>)}
                    </React.Fragment>;
                  }))}
                  {printManifest && Array.from({length:printManifest.labelSheets},(_,page)=>(
                    <article className="print-sheet print-label-sheet" key={'labels-'+page}>
                      <h1>Stationsetiketten – Blatt {page+1}/{printManifest.labelSheets}</h1>
                      <div className="print-label-grid">{printManifest.envelopes.slice(page*LABELS_PER_A5_SHEET,(page+1)*LABELS_PER_A5_SHEET).map(envelope=><p className="print-label" data-team-color={envelope.team.toLowerCase()} data-age-group={plan.value.teams.find(team=>team.name===envelope.team)?.profile?.age??age} data-envelope-id={envelope.id} data-team={envelope.team} data-station={envelope.stationName} data-number={envelope.stationNumber} data-count={envelope.sheetCount} key={envelope.id}><strong>Team {envelope.team} · {plan.value.teams.find(team=>team.name===envelope.team)?.profile?.age??age} · {envelope.stationName}</strong><span>Umschlag {envelope.stationNumber} von {envelope.stationTotal} · {envelope.sheetCount} Blätter: Aufgaben, Wegrätsel</span></p>)}</div>
                    </article>
                  ))}
                </section>}
                <div className="warnings">{plan.value.cautions.map((warning,i)=><p key={i}>• {planText(warning)}</p>)}</div>
                <button type="button" className="print" disabled={printIssues.length>0} onClick={()=>{const packet=document.querySelector('.print-packet');const actual={total:packet?.querySelectorAll('.print-sheet').length??0,organizer:packet?.querySelectorAll('.print-organizer-sheet').length??0,children:packet?.querySelectorAll('.print-child-sheet').length??0,labels:packet?.querySelectorAll('.print-label-sheet').length??0};const issues=auditRenderedPrintCategories({minimumSheets:printManifest?.minimumSheets??0,organizerSheets:printManifest?.organizerSheets??0,taskSheets:printManifest?.taskSheets??0,labelSheets:printManifest?.labelSheets??0},actual);const renderedEnvelopes=Array.from(packet?.querySelectorAll<HTMLElement>('.print-child-sheet')??[]).map(sheet=>({envelopeId:sheet.dataset.envelopeId??'',kind:sheet.dataset.sheetKind??'',routePage:sheet.dataset.routePage?Number(sheet.dataset.routePage):undefined}));issues.push(...auditRenderedEnvelopes(printManifest?.envelopes??[],renderedEnvelopes));const labelIds=Array.from(packet?.querySelectorAll<HTMLElement>('.print-label')??[]).map(label=>label.dataset.envelopeId??'');issues.push(...auditRenderedLabels(printManifest?.envelopes??[],labelIds));const readPacking=(selector:string)=>Array.from(packet?.querySelectorAll<HTMLElement>(selector)??[]).map(el=>({envelopeId:el.dataset.envelopeId??'',team:el.dataset.team??'',stationName:el.dataset.station??'',stationNumber:Number(el.dataset.number),sheetCount:Number(el.dataset.count)}));issues.push(...auditRenderedPackingItems((printManifest?.envelopes??[]).map(e=>({envelopeId:e.id,team:e.team,stationName:e.stationName,stationNumber:e.stationNumber,sheetCount:e.sheetCount})),readPacking('.print-label'),readPacking('.print-checklist-row')));issues.push(...auditRenderedOrganizerSecrets((printManifest?.envelopes??[]).map(e=>({envelopeId:e.id,code:stationCodes[e.stationId]??'',destination:e.destination})),Array.from(packet?.querySelectorAll<HTMLElement>('.print-checklist-row')??[]).map(row=>({envelopeId:row.dataset.envelopeId??'',code:row.dataset.code??'',destination:row.dataset.destination??''}))));const physicalSheets=Array.from(packet?.querySelectorAll<HTMLElement>('.print-sheet')??[]);try{const blocks=measureA5Elements(physicalSheets);if(blocks.length!==physicalSheets.length)issues.push(tx('A5-DOM-Messung ist unvollständig. Druck gesperrt.','A5 DOM measurement is incomplete. Printing blocked.'));else if(blocks.some(block=>block.heightMm>A5_USABLE_HEIGHT_MM)){issues.push(tx('A5-Seiten über 190 mm: ','A5 pages over 190 mm: ')+blocks.filter(block=>block.heightMm>A5_USABLE_HEIGHT_MM).map(block=>block.id+' ('+block.owner+'/'+block.section+': '+block.heightMm.toFixed(1)+' mm)').join(', ')+tx('. Druck gesperrt.','. Printing blocked.'));}else{const packed=packA5Blocks(blocks);if(packed.some(page=>page.usedMm>A5_USABLE_HEIGHT_MM))issues.push(tx('A5-Seitenaufteilung überschreitet 190 mm. Druck gesperrt.','A5 page layout exceeds 190 mm. Printing blocked.'));}}catch(error){issues.push(tx('A5-Höhenprüfung fehlgeschlagen: ','A5 height check failed: ')+String(error));}if(issues.length){window.alert(issues.join('\\n'));return;}if(!(packet instanceof HTMLElement)){window.alert(tx('A5-Druckpaket fehlt','A5 print packet is missing'));return;}let packedCopy:HTMLElement|null=null;try{let prepared=buildPackedA5PrintCopy(packet);let physical=prepared.manifest;const expectedIds=new Set((printManifest?.envelopes??[]).map(envelope=>envelope.id));if(physical.totalSheets!==physical.organizerSheets+physical.childSheets+physical.labelSheets)throw new Error(tx('A5-Manifest: Gesamtseitenzahl stimmt nicht','A5 manifest: total page count does not match'));if(physical.childSheets!==(printManifest?.taskSheets??0))throw new Error(tx('A5-Manifest: Kinderblattzahl stimmt nicht','A5 manifest: child sheet count does not match'));if(Object.keys(physical.envelopeSheets).length!==expectedIds.size||Object.keys(physical.envelopeSheets).some(id=>!expectedIds.has(id)))throw new Error(tx('A5-Manifest: Umschläge fehlen oder sind unbekannt','A5 manifest: envelopes are missing or unknown'));for(const envelope of printManifest?.envelopes??[]){if(physical.envelopeSheets[envelope.id]!==envelope.sheetCount)throw new Error(tx('A5-Manifest: Blattzahl für Umschlag ','A5 manifest: sheet count for envelope ')+envelope.id+tx(' stimmt nicht',' does not match'));}const setPackedMetadata=()=>{packedCopy!.dataset.physicalSheets=String(physical.totalSheets);packedCopy!.dataset.organizerSheets=String(physical.organizerSheets);packedCopy!.dataset.childSheets=String(physical.childSheets);packedCopy!.dataset.labelSheets=String(physical.labelSheets);};packedCopy=prepared.copy;setPackedMetadata();packet.parentElement?.appendChild(packedCopy);let packedPages=Array.from(packedCopy.querySelectorAll<HTMLElement>(':scope > .print-packed-page'));const getOverflow=(pages:HTMLElement[])=>pages.flatMap((sheet,index)=>{const height=sheet.getBoundingClientRect().height*25.4/96;const content=sheet.scrollHeight*25.4/96;return Math.max(height,content)>A5_USABLE_HEIGHT_MM+0.01?[(index+1)+': '+Math.max(height,content).toFixed(1)+' mm']:[];});let overflow=getOverflow(packedPages);if(overflow.length){const noCompactBlockIds=packedPages.filter(sheet=>Math.max(sheet.getBoundingClientRect().height,sheet.scrollHeight)*25.4/96>A5_USABLE_HEIGHT_MM+0.01).flatMap(sheet=>(sheet.dataset.packedBlockIds??'').split(',').filter(Boolean));if(!noCompactBlockIds.length)throw new Error(tx('A5-Überlaufseite ohne zugeordnete Inhaltsblöcke','A5 overflow page without assigned content blocks'));packedCopy.remove();prepared=buildPackedA5PrintCopy(packet,{noCompactBlockIds});physical=prepared.manifest;packedCopy=prepared.copy;setPackedMetadata();packet.parentElement?.appendChild(packedCopy);packedPages=Array.from(packedCopy.querySelectorAll<HTMLElement>(':scope > .print-packed-page'));overflow=getOverflow(packedPages);}if(overflow.length)throw new Error(tx('Verdichtete A5-Seiten überschreiten 190 mm: ','Packed A5 pages exceed 190 mm: ')+overflow.join(', '));const tooWide=packedPages.flatMap((sheet,index)=>{const width=Math.max(sheet.getBoundingClientRect().width,sheet.scrollWidth)*25.4/96;return width>128.01?[(index+1)+': '+width.toFixed(1)+' mm']:[];});if(tooWide.length)throw new Error(tx('Verdichtete A5-Seiten überschreiten 128 mm Breite: ','Packed A5 pages exceed 128 mm width: ')+tooWide.join(', '));packet.classList.add('print-packet-source');window.print();}catch(error){window.alert(tx('A5-Druckaufbereitung fehlgeschlagen: ','A5 print preparation failed: ')+String(error));}finally{packedCopy?.remove();packet.classList.remove('print-packet-source');}}}>{t.print} ↗</button>
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
