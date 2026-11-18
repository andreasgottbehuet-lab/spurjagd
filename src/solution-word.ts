import {hashSeed,normalizeSolutionWord} from './puzzles.ts';
import type {GameConfig as BaseConfig,GamePlan} from './generator.ts';

/** Nur bei goal 'word': A–Z, Länge = Stationen je Gruppe. Fehlt in älteren Projekten. */
type GameConfig=BaseConfig&{solutionWord?:unknown};
/** Lösungswort-Modus: Station n der Gruppenroute liefert Buchstabe n. Die drei Stationsziffern ergeben die Alphabet-Nummer (A=001 … Z=026). */
export const MAX_SOLUTION_WORD_LENGTH=12;
/** Altersgerechte Wörter ohne Umlaute, je Länge 2–12. */
const WORDS=['A','I','O','EI','OH','ZOO','UHU','EIS','BALL','MOND','BURG','PIRAT','SONNE','KEKSE','SCHATZ','DRACHE','RAKETE','KOMPASS','FREUNDE','DETEKTIV','FLUGZEUG','ABENTEUER','SPIELZEUG','REGENBOGEN','GEBURTSTAG','SCHATZKARTE','SCHATZKISTE','SCHATZSUCHER','FERIENFREUDE'];
export const LETTER_TABLE=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)+'='+(i+1)).join(' ');

export function suggestSolutionWord(length:number,seed:string):string {
 const options=WORDS.filter(word=>word.length===length);
 return options.length?options[hashSeed(seed)%options.length]:'';
}
export function letterCode(letter:string):string {
 if(!/^[A-Z]$/.test(letter)) throw new Error('Ungültiger Buchstabe im Lösungswort');
 return String(letter.charCodeAt(0)-64).padStart(3,'0');
}
export function letterFromCode(code:string):string {
 const n=/^\d{3}$/.test(code)?Number(code):0;
 return n>=1&&n<=26?String.fromCharCode(64+n):'';
}
/** Dreistelliger Code, den die Stationsrätsel für Team/Routenposition ergeben müssen. */
export function codeForStation(config:GameConfig,plan:GamePlan,teamIndex:number,stationIndex:number):string {
 const station=plan.teams[teamIndex]?.stations[stationIndex];
 if(config.goal!=='word') return config.stationCodes?.[station?.id??'']??'';
 const letter=normalizeSolutionWord(String(config.solutionWord??''))[stationIndex];
 return station&&letter?letterCode(letter):'';
}
export function solutionWordIssues(config:GameConfig,plan:GamePlan):string[] {
 if(config.goal!=='word') return [];
 const word=normalizeSolutionWord(String(config.solutionWord??''));
 if(plan.stopsPerTeam>MAX_SOLUTION_WORD_LENGTH) return ['Lösungswort: höchstens '+MAX_SOLUTION_WORD_LENGTH+' Stationen je Gruppe.'];
 if(!word) return ['Lösungswort fehlt.'];
 if(word.length!==plan.stopsPerTeam) return ['Lösungswort muss genau '+plan.stopsPerTeam+' Buchstaben haben (einen je Station).'];
 return [];
}
