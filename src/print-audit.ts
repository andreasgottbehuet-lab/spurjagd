import {createPlan, type GameConfig, type GamePlan} from './generator.ts';
import {codeFromPuzzles,generateCreativeRouteClue,generateStationChallenge,hashSeed,validCode,verifyCreativeRouteClue} from './puzzles.ts';

/** Validates the complete printable packet before any sheet is shown or printed. */
export function auditPrintPacket(config:GameConfig,plan:GamePlan,projectId:string):string[] {
 const issues:string[]=[];
 if(config.goal!=='locks') issues.push('Das Druckpaket unterstützt derzeit nur Schloss-Codes.');
 if(!config.startPoint?.trim()) issues.push('Startort fehlt.');
 if(config.finishMode==='meeting'&&!config.meetingPoint?.trim()) issues.push('Gemeinsamer Zielort fehlt.');
 if(new Set(config.locations.map(location=>location.id)).size!==config.locations.length) issues.push('Stations-IDs sind nicht eindeutig.');
 try {
  const expected=createPlan(config);
  if(plan.teams.length!==expected.teams.length || plan.stopsPerTeam!==expected.stopsPerTeam || plan.estimatedMinutes!==expected.estimatedMinutes || plan.remainderMinutes!==expected.remainderMinutes) issues.push('Gruppenplan oder Zeitberechnung stimmt nicht mit den Eingaben überein.');
  else for(let i=0;i<expected.teams.length;i++){
   const actual=plan.teams[i], correct=expected.teams[i];
   if(actual.name!==correct.name || actual.memberCount!==correct.memberCount || actual.finish!==correct.finish || JSON.stringify(actual.profile??null)!==JSON.stringify(correct.profile??null) || actual.stations.length!==correct.stations.length || actual.stations.some((station,j)=>station.id!==correct.stations[j]?.id || station.name!==correct.stations[j]?.name || station.description!==correct.stations[j]?.description)) issues.push('Gruppenroute '+correct.name+' weicht von der Planung ab.');
  }
 } catch(error) { issues.push('Gruppenplanung konnte nicht geprüft werden: '+(error instanceof Error?error.message:String(error))); }
 const locations=new Map(config.locations.map(location=>[location.id,location]));
 const visitedStationIds=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id)));
 const codeByStation=new Map<string,string>();
 for(const location of config.locations.filter(location=>visitedStationIds.has(location.id))){
  const code=config.stationCodes?.[location.id]??'';
  if(!validCode(code)){
   issues.push('Ungültiger dreistelliger Code: '+(location.name||location.id));
   continue;
  }
  try{
   const age=config.age==='4–6'||config.age==='6–8'?'young':config.age==='8–10'?'middle':'older';
   const challenge=generateStationChallenge(location.id,code,age,hashSeed(projectId));
   if(codeFromPuzzles(challenge)!==code) throw new Error('Code stimmt nicht überein');
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
   if(!locations.has(station.id)||!codeByStation.has(station.id)) issues.push(team.name+': Stationscode fehlt für '+station.name);
   const destination=team.stations[i+1]?.name??team.finish;
   if(!destination.trim()) {issues.push(team.name+': Nächster Zielort fehlt.');continue;}
   const target=config.locations.find(location=>location.name.trim()===destination.trim());
   const mode=config.routeClueModes?.[target?.id??'']??'letters';
   try{
    const clue=generateCreativeRouteClue(destination,target?.description??'',mode,hashSeed(projectId+':destination:'+(target?.id??destination)),config.routeClueTexts?.[target?.id??'']??'');
    if(clue.answer!==destination) throw new Error('Zielort stimmt nicht überein');
    if(mode==='custom' && clue.question.toLowerCase().includes(destination.toLowerCase())) throw new Error('Das Rätsel nennt bereits den Zielort.');
    if(!verifyCreativeRouteClue(clue)) throw new Error('Wegrätsel ist nicht eindeutig prüfbar oder verrät den Zielort.');
   }catch(error){
    issues.push(team.name+' / '+station.name+' → '+destination+': '+(error instanceof Error?error.message:String(error)));
   }
  }
 }
 return [...new Set(issues)];
}
