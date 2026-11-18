import {hashSeed,validCode} from './puzzles.ts';

/** Creates unique three-digit codes (leading zeros kept) for visited stations without a valid code. Existing codes are never changed. */
export function generateMissingCodes(stationIds:string[],codes:Record<string,string>,seed:string):Record<string,string> {
 const result={...codes};
 const used=new Set(Object.values(result).filter(code=>validCode(code)));
 for(const id of stationIds){
  if(validCode(result[id]??'')) continue;
  const start=hashSeed(seed+':code:'+id)%1000;
  for(let i=0;i<1000;i++){
   const code=String((start+i)%1000).padStart(3,'0');
   if(!used.has(code)){used.add(code);result[id]=code;break;}
  }
 }
 return result;
}

/** Merges per-team/per-station code messages into one short line. The count comes from the IDs of stations without a valid code (not from names, which may repeat). Other messages stay unchanged. */
export function groupPrintIssues(issues:string[],missingCodeIds:string[]):string[] {
 const count=new Set(missingCodeIds).size;
 if(!count) return [...new Set(issues)];
 const rest=issues.filter(issue=>!/^Ungültiger (?:dreistelliger )?Code: /.test(issue)&&!/^.*?: Stationscode fehlt für /s.test(issue));
 rest.unshift(count+(count===1?' Station ohne Code':' Stationen ohne Code')+". Mit 'Codes erzeugen' beheben.");
 return [...new Set(rest)];
}
