import { findDigitWords, hashSeed, seededRandom } from './puzzles.ts';

const WORDS = ['NULL','EINS','ZWEI','DREI','VIER','FUENF','SECHS','SIEBEN','ACHT','NEUN'] as const;
/** One grid contains exactly the three requested number words. Their top-to-bottom order is the lock code. */
export function generateThreeDigitWordGrid(code:string,seed:number):{rows:string[];words:string[]}{
 if(!/^[0-9]{3}$/.test(code))throw new Error('Drei Ziffern erforderlich');
 const digits=[...code].map(Number);
 const words=digits.map(d=>WORDS[d]);
 const rng=seededRandom(hashSeed(seed+':three-word-grid'));
 const size=12;
 for(let attempt=0;attempt<200;attempt++){
  const grid=Array.from({length:size},()=>Array.from({length:size},()=>String.fromCharCode(65+Math.floor(rng()*26))));
  // Distinct horizontal rows make the ordering unambiguous for children.
  const usedRows=[1,5,9];
  words.forEach((word,index)=>{
   const col=Math.floor(rng()*(size-word.length+1));
   [...word].forEach((letter,j)=>{grid[usedRows[index]][col+j]=letter;});
  });
  const rows=grid.map(row=>row.join(''));
  const found=findDigitWords(rows);
  if(found.length!==3)continue;
  const foundDigits=found.sort((a,b)=>a.row-b.row).map(m=>m.digit);
  if(foundDigits.every((digit,index)=>digit===digits[index]))return {rows,words:[...words]};
 }
 throw new Error('Eindeutiges Drei-Zahlen-Gitter konnte nicht erzeugt werden');
}
