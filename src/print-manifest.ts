import type {GamePlan} from './generator.ts';

export const LABELS_PER_A5_SHEET = 4;
export const ORGANIZER_ITEMS_PER_A5_SHEET = 2;
export function organizerSheetCount(plan:GamePlan):number {
 const routes=Math.ceil(plan.teams.length/ORGANIZER_ITEMS_PER_A5_SHEET);
 const stations=new Set(plan.teams.flatMap(team=>team.stations.map(station=>station.id))).size;
 const codes=Math.ceil(stations/ORGANIZER_ITEMS_PER_A5_SHEET);
 const destinations=new Set(plan.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish))).size;
 return routes+codes+destinations+1;
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
 sheetCount:3;
}
export interface PrintManifest {
 envelopes:PrintEnvelope[];
 organizerSheets:number;
 labelSheets:number;
 taskSheets:number;
 minimumSheets:number;
}

/** Three task sheets per team visit; organizer and labels are separate. */
export function createPrintManifest(plan:GamePlan):PrintManifest {
 const envelopes=plan.teams.flatMap((team,teamIndex)=>team.stations.map((station,stationIndex)=>({
  id:teamIndex+'-'+station.id,
  team:team.name,
  teamIndex,
  stationId:station.id,
  stationName:station.name,
  stationNumber:stationIndex+1,
  stationTotal:team.stations.length,
  destination:team.stations[stationIndex+1]?.name??team.finish,
  sheetCount:3 as const
 })));
 const taskSheets=envelopes.reduce((sum,envelope)=>sum+envelope.sheetCount,0);
 // Four labels are assigned to each A5 sheet; physical overflow remains subject to browser print review.
 const labelSheets=Math.ceil(envelopes.length/LABELS_PER_A5_SHEET);
 const organizerSheets=organizerSheetCount(plan);
 return {envelopes,organizerSheets,labelSheets,taskSheets,minimumSheets:taskSheets+organizerSheets+labelSheets};
}
