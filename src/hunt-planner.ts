import {PARTY_TASKS,type PartyTask,type PartyTaskPlace} from './party-tasks.ts';
import {seededRandom} from './puzzles.ts';

export type HuntPlan={aufgaben:PartyTask[];anzahl:number;gesamtdauerMinuten:number;zuTeil:boolean;fehlend:number};

/** Erlaubte Stationszahl: bis 7 Jahre 6-10, ab 8 Jahren 10-15. */
export function huntRange(alter:number):[number,number]{return alter<=7?[6,10]:[10,15];}
export function clampHuntCount(alter:number,count:number):number{const [min,max]=huntRange(alter);return Math.max(min,Math.min(max,Math.round(count)));}

/** Standardbereich: drinnen die obere, sonst die untere Hälfte des Altersbereichs. */
export function defaultHuntRange(alter:number,ort:PartyTaskPlace):[number,number]{
 const [min,max]=huntRange(alter),mitte=Math.floor((min+max)/2);
 return ort==='drinnen'?[mitte+1,max]:[min,mitte];
}

export function planHunt({alter,ort,seed=0,anzahl}: {alter:number;ort:PartyTaskPlace;seed?:number;anzahl?:number}):HuntPlan{
 const random=seededRandom(seed);
 const [min,max]=huntRange(alter);
 if(anzahl!==undefined&&(!Number.isInteger(anzahl)||anzahl<min||anzahl>max))
  throw new Error(`Die Anzahl der Stationen muss für Alter ${alter} zwischen ${min} und ${max} liegen.`);
 const [von,bis]=defaultHuntRange(alter,ort);
 const passend=PARTY_TASKS.filter(task=>task.alterVon<=alter&&task.alterBis>=alter&&task.orte.includes(ort));
 if(!passend.length)throw new Error('Für dieses Alter und diesen Spielort gibt es keine passenden Aufgaben.');
 const team=passend.filter(task=>task.kategorie==='teamwork');
 const standard=von+Math.floor(random()*(bis-von+1));
 const ziel=Math.min(anzahl??standard,passend.length);
 const shuffled=[...passend];
 for(let i=shuffled.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
 }
 const ausgewaehlt=shuffled.slice(0,ziel);
 if(team.length&&!ausgewaehlt.some(task=>task.kategorie==='teamwork'))ausgewaehlt[0]=team[0];
 const aufgaben:PartyTask[]=[];
 while(ausgewaehlt.length){
  // Häufigste noch verbleibende Kategorie zuerst, aber nicht wie die vorige: vermeidet Wiederholungen, solange möglich.
  const rest=(k:string)=>ausgewaehlt.filter(task=>task.kategorie===k).length;
  const letzte=aufgaben.at(-1)?.kategorie;
  let index=-1;
  ausgewaehlt.forEach((task,i)=>{
   if(task.kategorie!==letzte&&(index<0||rest(task.kategorie)>rest(ausgewaehlt[index].kategorie)))index=i;
  });
  aufgaben.push(ausgewaehlt.splice(index<0?0:index,1)[0]);
 }
 return {aufgaben,anzahl:aufgaben.length,gesamtdauerMinuten:aufgaben.reduce((sum,task)=>sum+task.dauerMinuten,0),zuTeil:aufgaben.length<(anzahl??standard),fehlend:Math.max(0,(anzahl??standard)-aufgaben.length)};
}
