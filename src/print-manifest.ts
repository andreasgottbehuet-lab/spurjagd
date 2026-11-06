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
export const ORGANIZER_ITEMS_PER_A5_SHEET = 6;
export const ORGANIZER_ROUTES_PER_A5_SHEET = 7;
export const ORGANIZER_CODES_PER_A5_SHEET = 9;
export const ORGANIZER_ENVELOPES_PER_A5_SHEET = 7;
export const ORGANIZER_CAUTIONS_PER_A5_SHEET = 6;
/** Keep each team's code bundle together and balance remaining groups across pages. */
export function organizerGroupPageRanges(groupSizes:number[],capacity=ORGANIZER_CODES_PER_A5_SHEET,maxGroups=3):{start:number;end:number}[] {
 if(groupSizes.some(size=>!Number.isInteger(size)||size<1)||!Number.isInteger(capacity)||capacity<1||!Number.isInteger(maxGroups)||maxGroups<1)
  throw new Error('Ungültige Spielleiter-Gruppengröße');
 let minimumPages=0,used=0,groups=0;
 for(const size of groupSizes){
  if(groups&&(groups>=maxGroups||used+size>capacity)){minimumPages++;used=0;groups=0;}
  used+=size;groups++;
 }
 if(groups)minimumPages++;
 const ranges:{start:number;end:number}[]=[];
 let start=0,remainingPages=minimumPages;
 while(start<groupSizes.length){
  const target=Math.ceil((groupSizes.length-start)/remainingPages);
  let end=start,items=0;
  while(end<groupSizes.length&&end-start<target&&end-start<maxGroups&&(!end||items+groupSizes[end]<=capacity)){
   items+=groupSizes[end];end++;
  }
  if(end===start)end++;
  ranges.push({start,end});
  start=end;
  remainingPages=Math.max(1,remainingPages-1);
 }
 return ranges;
}
export function organizerCautionSheetCount(plan:GamePlan):number {
 return Math.ceil(plan.cautions.length/ORGANIZER_CAUTIONS_PER_A5_SHEET);
}
export function organizerSheetCount(plan:GamePlan,_config?:GameConfig):number {
 const routes=Math.ceil(plan.teams.length/ORGANIZER_ROUTES_PER_A5_SHEET);
 const codes=organizerGroupPageRanges(plan.teams.map(team=>team.stations.length)).length;
 const destinations=new Set(plan.teams.flatMap(team=>team.stations.map((_,i)=>team.stations[i+1]?.name??team.finish)));
 const solutionEntries=destinations.size;
 const solutionSheets=Math.ceil(solutionEntries/ORGANIZER_ITEMS_PER_A5_SHEET);
 const envelopeCount=plan.teams.reduce((sum,team)=>sum+team.stations.length,0);
 const controlSheets=Math.max(1,Math.ceil(envelopeCount/ORGANIZER_ENVELOPES_PER_A5_SHEET));
 return routes+codes+solutionSheets+controlSheets+1+organizerCautionSheetCount(plan); // Safety sheet and any route warnings
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

/** One task sheet with inline answer space plus route-clue sheets per visit. */
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
  sheetCount:1+routeSheetCount(team.stations[stationIndex+1]?.name??team.finish,config)
 })));
 const taskSheets=envelopes.reduce((sum,envelope)=>sum+envelope.sheetCount,0);
 // Four labels are assigned to each A5 sheet; physical overflow remains subject to browser print review.
 const labelSheets=Math.ceil(envelopes.length/LABELS_PER_A5_SHEET);
 const organizerSheets=organizerSheetCount(plan,config);
 return {envelopes,organizerSheets,labelSheets,taskSheets,minimumSheets:taskSheets+organizerSheets+labelSheets};
}
