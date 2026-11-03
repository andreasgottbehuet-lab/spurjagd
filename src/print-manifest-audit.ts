import type {GameConfig,GamePlan} from './generator.ts';
import {LABELS_PER_A5_SHEET, routeSheetCount, organizerSheetCount, type PrintManifest} from './print-manifest.ts';

export function auditPrintManifest(plan:GamePlan,manifest:PrintManifest,config?:GameConfig):string[] {
 const errors:string[]=[];
 const expected=plan.teams.reduce((sum,team)=>sum+team.stations.length,0);
 const expectedTasks=plan.teams.flatMap(team=>team.stations.map((_,i)=>2+routeSheetCount(team.stations[i+1]?.name??team.finish,config))).reduce((sum,count)=>sum+count,0);
 if(manifest.envelopes.length!==expected) errors.push('Umschlaganzahl ist falsch.');
 if(manifest.taskSheets!==expectedTasks) errors.push('Anzahl der A5-Aufgabenblätter ist falsch.');
 if(manifest.envelopes.reduce((sum,envelope)=>sum+envelope.sheetCount,0)!==manifest.taskSheets) errors.push('Umschlag-Blattzahlen stimmen nicht mit der Gesamtzahl der Kinderblätter überein.');
 if(manifest.organizerSheets!==organizerSheetCount(plan,config)) errors.push('Anzahl der A5-Spielleitungsseiten ist falsch.');
 if(manifest.labelSheets!==Math.ceil(expected/LABELS_PER_A5_SHEET)) errors.push('Anzahl der A5-Etikettenseiten ist falsch.');
 if(manifest.minimumSheets!==expectedTasks+organizerSheetCount(plan,config)+Math.ceil(expected/LABELS_PER_A5_SHEET)) errors.push('Mindestumfang der Druckseiten ist falsch.');
 if(manifest.minimumSheets!==manifest.taskSheets+manifest.organizerSheets+manifest.labelSheets) errors.push('Die angezeigte Gesamtblattzahl stimmt nicht mit den ausgewiesenen Teilmengen überein.');
 if(new Set(manifest.envelopes.map(e=>e.id)).size!==manifest.envelopes.length) errors.push('Umschlagkennungen sind nicht eindeutig.');
 const expectedIds=plan.teams.flatMap((team,teamIndex)=>team.stations.map(station=>teamIndex+'-'+station.id));
 if(manifest.envelopes.some((envelope,index)=>envelope.id!==expectedIds[index])) errors.push('Umschlagreihenfolge weicht vom Gruppenplan ab.');
 if(manifest.envelopes.some(envelope=>envelope.teamIndex!==plan.teams.findIndex(team=>team.name===envelope.team) || envelope.stationNumber<1 || !Number.isInteger(envelope.stationNumber))) errors.push('Umschlagreihenfolge oder Gruppenzuordnung ist ungültig.');
 plan.teams.forEach((team,teamIndex)=>team.stations.forEach((station,index)=>{
  const found=manifest.envelopes.filter(e=>e.teamIndex===teamIndex&&e.stationNumber===index+1);
  if(found.length!==1){errors.push(team.name+': Umschlag fehlt oder ist doppelt.');return;}
  const e=found[0];
  if(e.stationId!==station.id||e.stationName!==station.name) errors.push(team.name+': falsche Station auf dem Umschlag.');
  if(e.id!==teamIndex+'-'+station.id) errors.push(team.name+': Umschlagkennung stimmt nicht mit der Station überein.');
  if(e.destination!==(team.stations[index+1]?.name??team.finish)) errors.push(team.name+': falscher nächster Zielort.');
  if(e.sheetCount!==2+routeSheetCount(team.stations[index+1]?.name??team.finish,config)) errors.push(team.name+': Umschlag enthält eine falsche Anzahl A5-Blätter.');
  if(e.team!==team.name||e.teamIndex!==teamIndex||e.stationNumber!==index+1||e.stationTotal!==team.stations.length) errors.push(team.name+': Umschlagbeschriftung stimmt nicht.');
 }));
 return [...new Set(errors)];
}
