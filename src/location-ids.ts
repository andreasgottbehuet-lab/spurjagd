import type {Location} from './generator.ts';

/** Allocate IDs without reusing any currently visible or temporarily hidden station. */
export function allocateLocationIds(visible:readonly Location[],hidden:readonly Location[],count:number,start=5):string[] {
 if(!Number.isSafeInteger(count)||count<0||count>20) throw new Error('Ungültige Anzahl neuer Stationen.');
 const used=new Set([...visible,...hidden].map(location=>location.id));
 const result:string[]=[];
 let next=Math.max(1,Math.floor(start));
 while(result.length<count){
  const id='loc-'+next++;
  if(!used.has(id)){used.add(id);result.push(id);}
 }
 return result;
}

/** Find a free ID even if an imported project uses nonsequential station IDs. */
export function nextLocationId(visible:readonly Location[],hidden:readonly Location[],start=5):number {
 return Number(allocateLocationIds(visible,hidden,1,start)[0].slice(4));
}
