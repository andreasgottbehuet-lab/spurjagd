/** Deterministic, client-side puzzles. No LLM or network calls. */
export type PuzzleKind = 'arithmetic' | 'symbols' | 'cipher';
export type AgeLevel = 'young' | 'middle' | 'older';
export interface Puzzle {
  id: string;
  kind: PuzzleKind;
  instruction: string;
  question: string;
  hint: string;
  explanation: string;
  expectedDigit: number;
  render?: { symbol: string; count: number };
}
export interface StationChallenge {
  stationId: string;
  code: string;
  puzzles: Puzzle[];
}
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_WORDS = ['NULL','EINS','ZWEI','DREI','VIER','FUENF','SECHS','SIEBEN','ACHT','NEUN'] as const;
const SYMBOLS = ['★','●','◆','▲','■','♥','✿','☀','⬟','♣'];
export function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function chooseInt(rng: () => number, low: number, high: number): number {
  return low + Math.floor(rng() * (high - low + 1));
}
export function validCode(code: string, digits = 3): boolean {
  return new RegExp('^[0-9]{' + digits + '}$').test(code);
}
export function generateDigitPuzzle(target: number, kind: PuzzleKind, age: AgeLevel, seed: number): Puzzle {
  if (!Number.isInteger(target) || target < 0 || target > 9) throw new Error('Ziffer muss zwischen 0 und 9 liegen');
  const rng = seededRandom(seed);
  const id = kind + '-' + (seed >>> 0).toString(16) + '-' + target;
  if (kind === 'symbols') {
    // Counted symbols are placed on the worksheet; zero is represented explicitly.
    const symbol = SYMBOLS[chooseInt(rng, 0, SYMBOLS.length - 1)];
    return { id, kind, instruction: 'Zähle die abgebildeten Zeichen.', question: target === 0 ? 'Wie viele Zeichen siehst du im leeren Feld?' : 'Wie viele Zeichen sind im Kasten?', hint: 'Zeige auf jedes Zeichen und zähle langsam.', explanation: target + ' Zeichen ergeben die Ziffer ' + target + '.', expectedDigit: target, render: {symbol, count: target} };
  }
  if (kind === 'arithmetic') {
    let question: string;
    let explanation: string;
    if (age === 'young') {
      if(rng()<0.5){
        const first=chooseInt(rng,0,target);
        const second=target-first;
        question=first+' + '+second+' = ?';
        explanation=question.replace('?',String(target));
      }else{
        const extra=chooseInt(rng,0,Math.min(3,9-target));
        question=(target+extra)+' − '+extra+' = ?';
        explanation=question.replace('?',String(target));
      }
    } else if (age === 'middle') {
      const extra=chooseInt(rng,1,9);
      if(rng()<0.5){
        question=(target+extra)+' − '+extra+' = ?';
      }else{
        question=target+' + '+extra+' − '+extra+' = ?';
      }
      explanation=question.replace('?',String(target));
    } else {
      const factor = chooseInt(rng, 2, 5);
      const extra = chooseInt(rng, 1, 5);
      question = factor + ' × ' + extra + ' − ' + (factor * extra - target) + ' = ?';
      explanation = factor + ' × ' + extra + ' − (' + (factor * extra - target) + ') = ' + target;
    }
    return { id, kind, instruction: 'Löse die Rechnung. Das Ergebnis ist eine Ziffer für den Code.', question, hint: age==='young'?'Zähle mit den Fingern oder male Punkte.':age==='middle'?'Rechne Schritt für Schritt und prüfe die letzte Rechnung.':'Rechne zuerst die Multiplikation und danach die Subtraktion.', explanation, expectedDigit: target };
  }
  const word = DIGIT_WORDS[target];
  const shift = age==='young'?1:age==='middle'?chooseInt(rng,1,3):chooseInt(rng,2,5);
  const encoded = [...word].map(char => ALPHABET[(ALPHABET.indexOf(char) + shift) % ALPHABET.length]).join('');
  return {
    id, kind,
    instruction: 'Entschlüssele das Wort. Es verrät dir eine Ziffer. Verschiebe jeden Buchstaben im Alphabet um ' + shift + (shift===1?' Stelle':' Stellen') + ' zurück. Beim Rückwärtszählen kommt vor A der Buchstabe Z.',
    question: encoded,
    hint: age==='young'?'Gehe bei jedem Zeichen einen Buchstaben im Alphabet zurück.':'Der erste Buchstabe lautet ' + word[0] + '.',
    explanation: encoded + ' bedeutet ' + word + ', also ' + target + '.',
    expectedDigit: target,
  };
}
export function verifyDigitPuzzle(puzzle: Puzzle): boolean {
  if (!Number.isInteger(puzzle.expectedDigit) || puzzle.expectedDigit < 0 || puzzle.expectedDigit > 9) return false;
  const target = puzzle.expectedDigit;
  if (puzzle.kind === 'symbols') return puzzle.render?.count === target && typeof puzzle.render.symbol === 'string' && puzzle.render.symbol.length > 0;
  if (puzzle.kind === 'arithmetic') {
    const q = puzzle.question.match(/^(-?\d+)\s*([+−×])\s*(-?\d+)(?:\s*−\s*\((-?\d+)\)|\s*−\s*(-?\d+))?\s*=\s*\?$/);
    if (!q) return false;
    const a = Number(q[1]), b = Number(q[3]), sign = q[2];
    const result = sign === '+' ? a+b : sign === '−' ? a-b : a*b;
    const subtraction = q[4] !== undefined ? Number(q[4]) : q[5] !== undefined ? Number(q[5]) : 0;
    return result - subtraction === target;
  }
  if (puzzle.kind === 'cipher') {
    const shift = puzzle.instruction.match(/um (\d+) Stelle(?:n)?/);
    if (!shift || !/^[A-Z]+$/.test(puzzle.question)) return false;
    const decoded = [...puzzle.question].map(char => ALPHABET[(ALPHABET.indexOf(char) - Number(shift[1]) + 26) % 26]).join('');
    return decoded === DIGIT_WORDS[target];
  }
  return false;
}
export function generateStationChallenge(stationId: string, code: string, age: AgeLevel, projectSeed: number): StationChallenge {
  if (!validCode(code)) throw new Error('Der Schloss-Code muss genau drei Ziffern enthalten, auch 000 ist erlaubt.');
  if (!stationId.trim()) throw new Error('Stations-ID fehlt');
  const kinds: PuzzleKind[] = ['arithmetic','symbols','cipher'];
  const puzzles = [...code].map((digit, i) => generateDigitPuzzle(Number(digit), kinds[i], age, hashSeed(projectSeed + ':' + stationId + ':' + i)));
  if (puzzles.some((p,i) => !verifyDigitPuzzle(p) || p.expectedDigit !== Number(code[i]))) throw new Error('Rätselkonsistenz fehlgeschlagen');
  return { stationId, code, puzzles };
}
export function codeFromPuzzles(challenge: StationChallenge): string {
  if (challenge.puzzles.some(p => !verifyDigitPuzzle(p))) throw new Error('Rätselprüfung fehlgeschlagen');
  return challenge.puzzles.map(p=>String(p.expectedDigit)).join('');
}

/** Reversible route clue: the answer is the exact destination, including spaces. */
export interface RoutePuzzle { instruction: string; question: string; hint: string; answer: string; kind: 'reverse' | 'missing-vowels' }
export function generateRoutePuzzle(destination: string, seed: number): RoutePuzzle {
  const answer = destination.trim();
  if (!answer || answer.length > 80) throw new Error('Ungültiger Zielort');
  const rng = seededRandom(seed);
  const missingVowels = [...answer].some(ch => /[AEIOUÄÖÜaeiouäöü]/.test(ch));
  const reversed=[...answer].reverse().join('');
  if (missingVowels && (rng() >= 0.5 || reversed.toLocaleLowerCase('de')===answer.toLocaleLowerCase('de'))) {
    const question = answer.replace(/[AEIOUÄÖÜaeiouäöü]/g, '_');
    return {kind:'missing-vowels',instruction:'Ergänzt die fehlenden Selbstlaute (A, E, I, O, U, Ä, Ö, Ü). Welcher Ort ist gemeint?',question,hint:'Die Striche stehen für fehlende Buchstaben.',answer};
  }
  if(reversed.toLocaleLowerCase('de')===answer.toLocaleLowerCase('de')) throw new Error('Für diesen Zielnamen bitte ein anderes Wegrätsel wählen.');
  return {kind:'reverse',instruction:'Lest die Zeichenfolge von rechts nach links. Welcher Ort ist gemeint?',question:reversed,hint:'Beginnt mit dem letzten Zeichen.',answer};
}

export type RouteClueMode = 'description' | 'questions' | 'letters' | 'custom';
export interface RouteClue {mode: RouteClueMode; instruction: string; question: string; answer: string; hint: string; rows?: {question:string;solution:string;letterIndex:number}[]}
const QUESTION_BANK: Record<string,{question:string;solution:string;letterIndex:number}> = {
 A:{question:'Welche Frucht ist rot oder grün und wächst am Baum?',solution:'Apfel',letterIndex:0},
 B:{question:'Was liest du in der Schule mit vielen Seiten?',solution:'Buch',letterIndex:0},
 C:{question:'Wie heißt das englische Wort für Katze?',solution:'Cat',letterIndex:0},
 D:{question:'Welches Tier bellt?',solution:'Hund',letterIndex:3},
 E:{question:'Welches große Tier hat einen Rüssel?',solution:'Elefant',letterIndex:0},
 F:{question:'Welches Tier lebt im Wasser und hat Flossen?',solution:'Fisch',letterIndex:0},
 G:{question:'Welches Tier schnattert und hat einen langen Hals?',solution:'Gans',letterIndex:0},
 H:{question:'Welches Tier bellt?',solution:'Hund',letterIndex:0},
 I:{question:'Wie heißt ein gefrorenes Dessert aus der Waffel?',solution:'Eis',letterIndex:1},
 J:{question:'Wie nennt man einen Zeitraum von zwölf Monaten?',solution:'Jahr',letterIndex:0},
 K:{question:'Welches Tier miaut?',solution:'Katze',letterIndex:0},
 L:{question:'Welches Tier ist der König der Tiere?',solution:'Löwe',letterIndex:0},
 M:{question:'Welcher Himmelskörper leuchtet nachts und umkreist die Erde?',solution:'Mond',letterIndex:0},
 N:{question:'Was ist das Gegenteil von Tag?',solution:'Nacht',letterIndex:0},
 O:{question:'Welche runde Frucht kann orange sein?',solution:'Orange',letterIndex:0},
 P:{question:'Welches Tier wiehert?',solution:'Pferd',letterIndex:0},
 Q:{question:'Wie heißt der Ort, an dem ein Fluss entspringt?',solution:'Quelle',letterIndex:0},
 R:{question:'Welche Farbe haben viele Feuerwehrautos?',solution:'Rot',letterIndex:0},
 S:{question:'Welcher Stern spendet uns tagsüber Licht?',solution:'Sonne',letterIndex:0},
 T:{question:'Welches Tier brüllt und hat Streifen?',solution:'Tiger',letterIndex:0},
 U:{question:'Welcher nachtaktive Vogel kann seinen Kopf weit drehen?',solution:'Uhu',letterIndex:0},
 V:{question:'Wie heißt ein anderes Wort für Papa?',solution:'Vater',letterIndex:0},
 W:{question:'Was fällt bei Regen aus den Wolken?',solution:'Wasser',letterIndex:0},
 X:{question:'Welches Musikinstrument besteht aus gestimmten Holzstäben, die man anschlägt?',solution:'Xylophon',letterIndex:0},
 Y:{question:'Wie heißt eine Bewegungs- und Entspannungslehre mit Körperübungen?',solution:'Yoga',letterIndex:0},
 Z:{question:'Womit putzt man sich die Zähne?',solution:'Zahnbürste',letterIndex:0}
};
const QUESTION_ALTERNATIVES: Partial<Record<string,{question:string;solution:string;letterIndex:number}[]>> = {
 A:[{question:'Was wächst am Baum und kann rot oder grün sein?',solution:'Apfel',letterIndex:0}],
 B:[{question:'Welches Tier baut Dämme in Flüssen?',solution:'Biber',letterIndex:0}],
 D:[{question:'Was ist das Gegenteil von hell?',solution:'Dunkel',letterIndex:0}],
 E:[{question:'Wie heißt gefrorenes Wasser?',solution:'Eis',letterIndex:0}],
 G:[{question:'Was wächst auf einer Wiese und ist grün?',solution:'Gras',letterIndex:0}],
 H:[{question:'Welches Tier hat lange Ohren und hoppelt?',solution:'Hase',letterIndex:0}],
 J:[{question:'Welcher Monat kommt nach Mai?',solution:'Juni',letterIndex:0}],
 K:[{question:'Was trägt man bei Kälte auf dem Kopf?',solution:'Kappe',letterIndex:0}],
 L:[{question:'Was leuchtet, wenn man es einschaltet?',solution:'Lampe',letterIndex:0}],
 M:[{question:'Welcher Monat kommt nach April?',solution:'Mai',letterIndex:0}],
 N:[{question:'Was ist das Gegenteil von ja?',solution:'Nein',letterIndex:0}],
 P:[{question:'Was wächst auf einem Baum und hat einen Kern?',solution:'Apfel',letterIndex:1}],
 R:[{question:'Was fällt als Wasser aus den Wolken?',solution:'Regen',letterIndex:0}],
 S:[{question:'Was trägt man an den Füßen unter den Schuhen?',solution:'Socken',letterIndex:0}],
 T:[{question:'Womit schreibt man auf Papier?',solution:'Stift',letterIndex:1}],
 U:[{question:'Was zeigt eine Uhr an?',solution:'Uhrzeit',letterIndex:0}],
 W:[{question:'Was weht bei stürmischem Wetter?',solution:'Wind',letterIndex:0}],
 Z:[{question:'Welches gestreifte Tier sieht einem Pferd ähnlich?',solution:'Zebra',letterIndex:0}]
};
export function normalizeSolutionWord(value:string):string {
 return value.toLocaleUpperCase('de').replace(/Ä/g,'AE').replace(/Ö/g,'OE').replace(/Ü/g,'UE').replace(/ß/g,'SS').replace(/[^A-Z]/g,'');
}
export function verifyRouteQuestions(clue:RouteClue):boolean {
 return clue.mode==='questions' && !!clue.rows?.length && clue.rows.every(row=>Number.isInteger(row.letterIndex) && row.letterIndex>=0 && row.letterIndex<row.solution.length && [...Object.values(QUESTION_BANK),...Object.values(QUESTION_ALTERNATIVES).flatMap(rows=>rows??[])].some(known=>known.question===row.question && known.solution===row.solution && known.letterIndex===row.letterIndex)) && clue.rows.map(row=>row.solution[row.letterIndex].toUpperCase()).join('')===normalizeSolutionWord(clue.answer);
}
function maskDestination(description:string, destination:string):string {
 const source=description.trim();
 const lower=source.toLocaleLowerCase('de');
 const needle=destination.toLocaleLowerCase('de');
 let start=0;
 let result='';
 while(true){
  const index=lower.indexOf(needle,start);
  if(index<0) return result+source.slice(start);
  result+=source.slice(start,index)+'________';
  start=index+destination.length;
 }
}
export function generateCreativeRouteClue(destination: string, description: string, mode: RouteClueMode, seed: number, custom = ''): RouteClue {
 const answer=destination.trim();
 if(!answer || answer.length>80) throw new Error('Ungültiger Zielort');
 if(mode==='custom') {
   if(!custom.trim()) throw new Error('Ein eigenes Wegrätsel fehlt');
   return {mode,instruction:'Findet heraus, welcher Ort gemeint ist.',question:custom.trim(),hint:'Lest die Hinweise genau.',answer};
 }
 if(mode==='description') {
   const safe=maskDestination(description,answer);
   if(safe.length<12) throw new Error('Für ein Beschreibungsrätsel bitte mindestens 12 Zeichen Ortsbeschreibung eingeben.');
   return {mode,instruction:'Welcher Ort passt zu dieser Beschreibung?',question:safe,hint:'Achtet auf besondere Merkmale des Ortes.',answer};
 }
 if(mode==='questions') {
   if (/\d/.test(answer)) throw new Error('Fragenrätsel mit Lösungswort unterstützen keine Ziffern im Ortsnamen. Bitte eine andere Rätselart wählen.');
   const letters=[...normalizeSolutionWord(answer)];
   if(!letters.length || letters.some(ch=>!QUESTION_BANK[ch])) throw new Error('Für diesen Ortsnamen fehlen noch passende Fragen. Bitte eine andere Rätselart wählen.');
   const used=new Map<string,number>();
   const usedQuestions=new Set<string>();
   const rows=letters.map(ch=>{
     const variants=[QUESTION_BANK[ch],...(QUESTION_ALTERNATIVES[ch]??[])];
     const count=used.get(ch)??0;
     used.set(ch,count+1);
     const start=(hashSeed(seed+':'+ch)%variants.length+count)%variants.length;
     const selected=Array.from({length:variants.length},(_,offset)=>variants[(start+offset)%variants.length]).find(row=>!usedQuestions.has(row.question));
     const row=selected??variants[start];
     usedQuestions.add(row.question);
     return {...row};
   });
   if(rows.some((r,i)=>r.solution[r.letterIndex]?.toUpperCase()!==letters[i])) throw new Error('Fragenrätsel ist nicht konsistent.');
   return {mode,instruction:'Beantwortet die Fragen. Nehmt jeweils den angegebenen Buchstaben der Antwort. Die Buchstaben ergeben den nächsten Ort (ohne Leerzeichen).',question:'',hint:'Schreibt die Lösungsbuchstaben nacheinander auf.',answer,rows};
 }
 const p=generateRoutePuzzle(answer,seed);
 return {mode:'letters',instruction:p.instruction,question:p.question,hint:p.hint,answer};
}

/** Normalize punctuation and repeated spaces before checking whether a clue reveals its answer. */
export function clueRevealsDestination(clueText:string,destination:string):boolean {
 const fold=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('de').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const target=fold(destination);
 if(!target) return false;
 const words=fold(clueText).split(' ').filter(Boolean);
 const compactTarget=target.replace(/ /g,'');
 // Match complete adjacent words, including hyphenated or concatenated destination names.
 for(let start=0;start<words.length;start++){
  let combined='';
  for(let end=start;end<words.length;end++){
   combined+=words[end];
   if(combined===compactTarget) return true;
   if(combined.length>=compactTarget.length) break;
  }
 }
 return false;
}

/** Independent checks for route puzzle integrity before printing. */
export function verifyCreativeRouteClue(clue:RouteClue):boolean {
 const destination=clue.answer.trim();
 if(!destination || !clue.instruction.trim()) return false;
 if(clue.mode==='questions') return verifyRouteQuestions(clue) && clue.rows!.every(row=>row.question.trim().length>0 && row.solution.trim().length>0);
 if(clue.mode==='description') {
  return clue.question.trim().length>=12
   && !clueRevealsDestination(clue.question,destination);
 }
 if(clue.mode==='custom') return clue.question.trim().length>0 && !clueRevealsDestination(clue.question,destination);
 if(clue.mode==='letters') {
  const reverse=[...destination].reverse().join('');
  const vowels=destination.replace(/[AEIOUÄÖÜaeiouäöü]/g,'_');
  return clue.question!==destination && (clue.question===reverse || clue.question===vowels);
 }
 return false;
}
