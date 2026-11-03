import type {GamePlan} from './generator';

export interface PrintEnvelope {
 id:string;
 team:string;
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
  stationId:station.id,
  stationName:station.name,
  stationNumber:stationIndex+1,
  stationTotal:team.stations.length,
  destination:team.stations[stationIndex+1]?.name??team.finish,
  sheetCount:3 as const
 })));
 const taskSheets=envelopes.length*3;
 // Labels share pages, but their actual page count depends on printer and text length.
 return {envelopes,organizerSheets:1,labelSheets:1,taskSheets,minimumSheets:taskSheets+2};
}
