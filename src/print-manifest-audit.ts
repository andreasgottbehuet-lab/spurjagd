import type {GamePlan} from './generator.ts';
import {LABELS_PER_A5_SHEET, ORGANIZER_A5_SHEETS, type PrintManifest} from './print-manifest.ts';

export function auditPrintManifest(plan:GamePlan,manifest:PrintManifest):string[] {
 const errors:string[]=[];
 const expected=plan.teams.reduce((sum,team)=>sum+team.stations.length,0);
 if(manifest.envelopes.length!==expected) errors.push('Umschlaganzahl ist falsch.');
 if(manifest.taskSheets!==expected*3) errors.push('Anzahl der A5-Aufgabenblätter ist falsch.');
 if(manifest.organizerSheets!==ORGANIZER_A5_SHEETS) errors.push('Anzahl der A5-Spielleitungsseiten ist falsch.');
 if(manifest.labelSheets!==Math.ceil(expected/LABELS_PER_A5_SHEET)) errors.push('Anzahl der A5-Etikettenseiten ist falsch.');
 if(manifest.minimumSheets!==manifest.taskSheets+manifest.organizerSheets+manifest.labelSheets) errors.push('Mindestumfang der Druckseiten ist falsch.');
 if(new Set(manifest.envelopes.map(e=>e.id)).size!==manifest.envelopes.length) errors.push('Umschlagkennungen sind nicht eindeutig.');
 plan.teams.forEach((team,teamIndex)=>team.stations.forEach((station,index)=>{
  const found=manifest.envelopes.filter(e=>e.teamIndex===teamIndex&&e.stationNumber===index+1);
  if(found.length!==1){errors.push(team.name+': Umschlag fehlt oder ist doppelt.');return;}
  const e=found[0];
  if(e.stationId!==station.id||e.stationName!==station.name) errors.push(team.name+': falsche Station auf dem Umschlag.');
  if(e.id!==teamIndex+'-'+station.id) errors.push(team.name+': Umschlagkennung stimmt nicht mit der Station überein.');
  if(e.destination!==(team.stations[index+1]?.name??team.finish)) errors.push(team.name+': falscher nächster Zielort.');
  if(e.sheetCount!==3) errors.push(team.name+': Umschlag muss drei A5-Blätter enthalten.');
  if(e.team!==team.name||e.stationTotal!==team.stations.length) errors.push(team.name+': Umschlagbeschriftung stimmt nicht.');
 }));
 return [...new Set(errors)];
}
