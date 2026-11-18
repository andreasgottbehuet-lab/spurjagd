import {createPlan, type GameConfig, type GamePlan, type RouteVariants} from './generator.ts';
import {codeFromPuzzles,generateCreativeRouteClue,generateStationChallenge,hashSeed,validCode,verifyCreativeRouteClue,clueRevealsDestination,type RouteClue} from './puzzles.ts';
import type {Subject} from './question-bank.ts';
import {ageLevelFor} from './age-groups.ts';
import {codeForStation,letterFromCode,solutionWordIssues} from './solution-word.ts';

export function routeClueSeed(projectId:string,targetKey:string,teamIndex:number,variants?:RouteVariants):number {
 const base=projectId+':destination:'+targetKey;
 return hashSeed(variants==='same'?base:base+':team:'+teamIndex);
}
/** Wegraetsel genau so, wie es fuer Team/Station gedruckt wird. Bei 'same' gilt der Seed fuer alle Teams; das Alter ist die Teamstufe (ohne Option: Gesamtgruppe).
 * Keine Frage kommt in einer Gruppenroute doppelt vor: Bei 'perTeam' zaehlt die bisherige Route der Gruppe, bei 'same' eine feste, fuer alle
 * Gruppen gleiche Reihenfolge aller Ziele (die Raetsel je Ziel bleiben so fuer alle Gruppen gleich). Reicht der Fragenvorrat nicht, wird fuer
 * dieses Ziel das Buchstabenraetsel gedruckt statt einer wiederholten Frage; das Paket bleibt druckbar. */
export function routeClueFor(config:GameConfig&{subjects?:readonly Subject[]},plan:GamePlan,projectId:string,teamIndex:number,stationIndex:number):RouteClue {
 const team=plan.teams[teamIndex];
 if(!team||stationIndex<0||stationIndex>=team.stations.length) throw new Error('Stationsrätsel fehlt.');
 const destinationAt=(t:GamePlan['teams'][number],i:number)=>t.stations[i+1]?.name??t.finish;
 const wanted=destinationAt(team,stationIndex);
 const repeated=config.routeVariants==='same'&&team.stations.slice(0,stationIndex).some((_,i)=>destinationAt(team,i)===wanted);
 if(repeated) return generateCreativeRouteClue(wanted,'','letters',routeClueSeed(projectId,wanted,teamIndex,'same'),'',ageLevelFor(team.profile?.age??config.age));
 const order=config.routeVariants==='same'
  ? [...new Set(plan.teams.flatMap(t=>t.stations.map((_,i)=>destinationAt(t,i))))]
  : team.stations.slice(0,stationIndex+1).map((_,i)=>destinationAt(team,i));
 const age=ageLevelFor(team.profile?.age??config.age);
 const used=new Set<string>();
 let result:RouteClue|undefined;
 for(const destination of order){
  const target=config.locations.find(location=>location.name.trim()===destination.trim());
  const mode=config.routeClueModes?.[target?.id??'']??(target?'description':'letters');
  const base=routeClueSeed(projectId,target?.id??destination,teamIndex,config.routeVariants);
  let clue:RouteClue|undefined;
  for(let attempt=0;attempt<100&&!clue;attempt++){
   const seed=attempt?hashSeed(base+':variant:'+attempt):base;
   const candidate=generateCreativeRouteClue(destination,target?.description??'',mode,seed,config.routeClueTexts?.[target?.id??'']??'',age,config.subjects);
   if(!candidate.rows?.some(row=>used.has(row.question))) clue=candidate;
  }
  clue??=generateCreativeRouteClue(destination,'','letters',base,'',age,config.subjects);
  clue.rows?.forEach(row=>used.add(row.question));
  if(destination===wanted) result=clue;
 }
 if(!result) throw new Error('Stationsrätsel fehlt.');
 return result;
}

/** Validates the complete printable packet before any sheet is shown or printed. */
export function auditPrintPacket(config:GameConfig,plan:GamePlan,projectId:string):string[] {
 const issues:string[]=[];
 issues.push(...solutionWordIssues(config,plan));
 if(!config.startPoint?.trim()) issues.push('Startort fehlt.');
 if(config.finishMode==='meeting'&&!config.meetingPoint?.trim()) issues.push('Gemeinsamer Zielort fehlt.');
 if(new Set(config.locations.map(location=>location.id.trim())).size!==config.locations.length) issues.push('Stations-IDs sind nicht eindeutig.');
 try {
  const expected=createPlan(config);
  if(plan.teams.length!==expected.teams.length || plan.stopsPerTeam!==expected.stopsPerTeam || plan.estimatedMinutes!==expected.estimatedMinutes || plan.remainderMinutes!==expected.remainderMinutes) issues.push('Gruppenplan oder Zeitberechnung stimmt nicht mit den Eingaben überein.');
  if(JSON.stringify(plan.cautions)!==JSON.stringify(expected.cautions)) issues.push('Planungshinweise stimmen nicht mit den berechneten Gruppenrouten überein.');
  if(plan.teams.length===expected.teams.length) for(let i=0;i<expected.teams.length;i++){
   const actual=plan.teams[i], correct=expected.teams[i];
   if(actual.name!==correct.name || actual.memberCount!==correct.memberCount || actual.finish!==correct.finish || JSON.stringify(actual.profile??null)!==JSON.stringify(correct.profile??null) || actual.stations.length!==correct.stations.length || actual.stations.some((station,j)=>station.id!==correct.stations[j]?.id || station.name!==correct.stations[j]?.name || station.description!==correct.stations[j]?.description)) issues.push('Gruppenroute '+correct.name+' weicht von der Planung ab.');
  }
 } catch(error) { issues.push('Gruppenplanung konnte nicht geprüft werden: '+(error instanceof Error?error.message:String(error))); }
 const locations=new Map(config.locations.map(location=>[location.id,location]));
 const visitedStationIds=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id)));
 const codeByStation=new Map<string,string>();
 for(const location of config.locations.filter(location=>(config.goal==='locks'||config.goal==='cards')&&visitedStationIds.has(location.id))){
  const code=config.stationCodes?.[location.id]??'';
  if(!validCode(code)){
   issues.push('Ungültiger dreistelliger Code: '+(location.name||location.id));
   continue;
  }
  try{
   const ages=new Set(plan.teams.filter(team=>team.stations.some(station=>station.id===location.id)).map(team=>ageLevelFor(team.profile?.age??config.age)));
   for(const age of ages) if(codeFromPuzzles(generateStationChallenge(location.id,code,age,hashSeed(projectId)))!==code) throw new Error('Code stimmt nicht überein');
   codeByStation.set(location.id,code);
  }catch(error){
   issues.push('Stationsrätsel '+location.name+': '+(error instanceof Error?error.message:String(error)));
  }
 }
 for(const team of plan.teams){
  if(team.stations.length!==plan.stopsPerTeam) issues.push(team.name+': Stationszahl stimmt nicht.');
  if(new Set(team.stations.map(location=>location.id)).size!==team.stations.length) issues.push(team.name+': Station doppelt in Route.');
  for(let i=0;i<team.stations.length;i++){
   const station=team.stations[i];
   if(config.goal==='word'){
    const code=codeForStation(config,plan,plan.teams.indexOf(team),i);
    let ok=false;
    try{ok=locations.has(station.id)&&Boolean(letterFromCode(code))&&codeFromPuzzles(generateStationChallenge(station.id,code,ageLevelFor(team.profile?.age??config.age),hashSeed(projectId)))===code;}catch{ok=false;}
    if(!ok) issues.push(team.name+': Stationscode fehlt für '+station.name);
   } else if(!locations.has(station.id)||!codeByStation.has(station.id)) issues.push(team.name+': Stationscode fehlt für '+station.name);
   const destination=team.stations[i+1]?.name??team.finish;
   if(!destination.trim()) {issues.push(team.name+': Nächster Zielort fehlt.');continue;}
   try{
    const clue=routeClueFor(config,plan,projectId,plan.teams.indexOf(team),i);
    if(clue.answer!==destination) throw new Error('Zielort stimmt nicht überein');
    if(clue.mode==='custom' && clueRevealsDestination(clue.question,destination)) throw new Error('Das Rätsel nennt bereits den Zielort.');
    if(!verifyCreativeRouteClue(clue)) throw new Error('Wegrätsel ist nicht eindeutig prüfbar oder verrät den Zielort.');
   }catch(error){
    issues.push(team.name+' / '+station.name+' → '+destination+': '+(error instanceof Error?error.message:String(error)));
   }
  }
 }
 return [...new Set(issues)];
}
