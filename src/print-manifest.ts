import type {GameConfig,GamePlan} from './generator.ts';
import {normalizeSolutionWord} from './puzzles.ts';

export const LABELS_PER_A5_SHEET = 4;
export const ROUTE_QUESTIONS_PER_A5_SHEET = 5;
/** Returns the exact number of route-clue question pages, or one page for other modes. */
export function routeSheetCount(destination:string,config?:GameConfig):number {
 const target=config?.locations.find(location=>location.name.trim()===destination.trim());
 if(!target || config?.routeClueModes?.[target.id]!=='questions') return 1;
 return Math.max(1,Math.ceil(normalizeSolutionWord(destination).length/ROUTE_QUESTIONS_PER_A5_SHEET));
}
export const ORGANIZER_ITEMS_PER_A5_SHEET = 2;
export const ORGANIZER_ENVELOPES_PER_A5_SHEET = 4;
export function organizerSheetCount(plan:GamePlan,config?:GameConfig):number {
 const routes=Math.ceil(plan.teams.length/ORGANIZER_ITEMS_PER_A5_SHEET);
 const stations=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id))).size;
 const codes=Math.ceil(stations/ORGANIZER_ITEMS_PER_A5_SHEET);
 const destinations=new Set(plan.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)));
 const solutionSheets=[...destinations].reduce((sum,destination)=>sum+routeSheetCount(destination,config),0);
 const envelopeCount=plan.teams.reduce((sum,team)=>sum+team.stations.length,0);
 const controlSheets=Math.max(1,Math.ceil(envelopeCount/ORGANIZER_ENVELOPES_PER_A5_SHEET));
 return routes+codes+solutionSheets+controlSheets;
}

export interface PrintEnvelope {
 id:string;
 team:string;
 teamIndex:number;
 stationId:string;
 stationName:string;
 stationNumber:number;
 stationTotal:number;
 destination:string;
 sheetCount:number;
}
export interface PrintManifest {
 envelopes:PrintEnvelope[];
 organizerSheets:number;
 labelSheets:number;
 taskSheets:number;
 minimumSheets:number;
}

/** Two fixed child sheets plus one or more route-clue sheets per visit. */
export function createPrintManifest(plan:GamePlan,config?:GameConfig):PrintManifest {
 const envelopes=plan.teams.flatMap((team,teamIndex)=>team.stations.map((station,stationIndex)=>({
  id:teamIndex+'-'+station.id,
  team:team.name,
  teamIndex,
  stationId:station.id,
  stationName:station.name,
  stationNumber:stationIndex+1,
  stationTotal:team.stations.length,
  destination:team.stations[stationIndex+1]?.name??team.finish,
  sheetCount:2+routeSheetCount(team.stations[stationIndex+1]?.name??team.finish,config)
 })));
 const taskSheets=envelopes.reduce((sum,envelope)=>sum+envelope.sheetCount,0);
 // Four labels are assigned to each A5 sheet; physical overflow remains subject to browser print review.
 const labelSheets=Math.ceil(envelopes.length/LABELS_PER_A5_SHEET);
 const organizerSheets=organizerSheetCount(plan,config);
 return {envelopes,organizerSheets,labelSheets,taskSheets,minimumSheets:taskSheets+organizerSheets+labelSheets};
}
