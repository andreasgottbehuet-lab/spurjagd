import { generateThreeDigitWordGrid } from './three-word-grid';
import { nextProjectRevision } from './project-revision';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPlan, teamSizes, type GameGoal, type Location, type StartMode, type RouteMode, type FinishMode, type TeamProfile } from './generator';
import { messages, type Language } from './i18n';
import { generateStationChallenge, codeFromPuzzles, hashSeed, validCode, generateCreativeRouteClue, type RouteClueMode } from './puzzles';
import { AGE_GROUPS, ageLevelFor } from './age-groups';
import { activeGameId, deleteGame, downloadBackup, loadGames, newGameId, importedProjectTitle, parseGameBackup, projectListChanged, replaceLastGame, saveGame, setActiveGameId, type SavedGame } from './project-storage';
import { auditPrintPacket } from './print-audit';
import { measureA5Elements, packA5Blocks, A5_USABLE_HEIGHT_MM, buildPackedA5PrintCopy } from './a5-page-packing';
import { createPrintManifest, LABELS_PER_A5_SHEET, ROUTE_QUESTIONS_PER_A5_SHEET, routeSheetCount, ORGANIZER_ITEMS_PER_A5_SHEET, ORGANIZER_CODES_PER_A5_SHEET, ORGANIZER_ROUTES_PER_A5_SHEET, ORGANIZER_ENVELOPES_PER_A5_SHEET, ORGANIZER_CAUTIONS_PER_A5_SHEET, organizerGroupPageRanges, nonEmptyOrganizerGroups } from './print-manifest';
import { auditPrintManifest } from './print-manifest-audit';
import { auditRenderedPrintCategories, auditRenderedEnvelopes, auditRenderedLabels, auditRenderedPackingItems, auditRenderedOrganizerSecrets } from './print-dom-audit';
import { createDefaultGameConfig, DEFAULT_LOCATIONS } from './default-game';
import {allocateLocationIds,nextLocationId as findNextLocationId} from './location-ids';
import {issueStep} from './issue-navigation';
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
  const savedRevision = useRef<{id:string;updatedAt:string|null}|null>(null);
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
  co