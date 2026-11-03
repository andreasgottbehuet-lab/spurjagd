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
      const first = chooseInt(rng, 0, target);
      const second = target - first;
      question = first + ' + ' + second + ' = ?';
      explanation = first + ' + ' + second + ' = ' + target;
    } else if (age === 'middle') {
      const extra = chooseInt(rng, 1, 9);
      question = (target + extra) + ' − ' + extra + ' = ?';
      explanation = (target + extra) + ' − ' + extra + ' = ' + target;
    } else {
      const factor = chooseInt(rng, 2, 5);
      const extra = chooseInt(rng, 1, 5);
      question = factor + ' × ' + extra + ' − ' + (factor * extra - target) + ' = ?';
      explanation = factor + ' × ' + extra + ' − (' + (factor * extra - target) + ') = ' + target;
    }
    return { id, kind, instruction: 'Löse die Rechnung. Das Ergebnis ist eine Ziffer für den Code.', question, hint: 'Rechne Punkt vor Strich und überprüfe dein Ergebnis.', explanation, expectedDigit: target };
  }
  const word = DIGIT_WORDS[target];
  const shift = chooseInt(rng, 1, 5);
  const encoded = [...word].map(char => ALPHABET[(ALPHABET.indexOf(char) + shift) % ALPHABET.length]).join('');
  return {
    id, kind,
    instruction: 'Entschlüssele das Wort. Es verrät dir eine Ziffer. Verschiebe jeden Buchstaben im Alphabet um ' + shift + ' Stellen zurück. A folgt nach Z.',
    question: encoded,
    hint: 'Der erste Buchstabe lautet ' + word[0] + '.',
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
    const shift = puzzle.instruction.match(/um (\d+) Stellen/);
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
  if (missingVowels && rng() >= 0.5) {
    const question = answer.replace(/[AEIOUÄÖÜaeiouäöü]/g, '_');
    return {kind:'missing-vowels',instruction:'Ergänzt die fehlenden Selbstlaute (A, E, I, O, U, Ä, Ö, Ü). Welcher Ort ist gemeint?',question,hint:'Die Striche stehen für fehlende Buchstaben.',answer};
  }
  return {kind:'reverse',instruction:'Lest die Zeichenfolge von rechts nach links. Welcher Ort ist gemeint?',question:[...answer].reverse().join(''),hint:'Beginnt mit dem letzten Zeichen.',answer};
}

export type RouteClueMode = 'description' | 'questions' | 'letters' | 'custom';
export interface RouteClue {mode: RouteClueMode; instruction: string; question: string; answer: string; hint: string; rows?: {question:string;solution:string;letterIndex:number}[]}
const QUESTION_BANK: Record<string,{question:string;solution:string;letterIndex:number}> = {
 A:{question:'Welches Tier baut Dämme in Flüssen?',solution:'Biber',letterIndex:4},
 B:{question:'Was liest du in der Schule mit vielen Seiten?',solution:'Buch',letterIndex:0},
 C:{question:'Wie heißt das englische Wort für Katze?',solution:'Cat',letterIndex:0},
 D:{question:'Welches Tier bellt?',solution:'Hund',letterIndex:3},
 E:{question:'Welches große Tier hat einen Rüssel?',solution:'Elefant',letterIndex:0},
 F:{question:'Welches Tier lebt im Wasser und hat Flossen?',solution:'Fisch',letterIndex:0},
 G:{question:'Welches Tier schnattert und hat einen langen Hals?',solution:'Gans',letterIndex:0},
 H:{question:'Welches Tier wiehert?',solution:'Pferd',letterIndex:4},
 I:{question:'Wie heißt ein gefrorenes Dessert aus der Waffel?',solution:'Eis',letterIndex:1},
 K:{question:'Welches Tier miaut?',solution:'Katze',letterIndex:0},
 L:{question:'Was leuchtet nachts am Himmel und umkreist die Erde?',solution:'Mond',letterIndex:2},
 M:{question:'Welcher Himmelskörper leuchtet nachts und umkreist die Erde?',solution:'Mond',letterIndex:0},
 N:{question:'Was ist das Gegenteil von Tag?',solution:'Nacht',letterIndex:0},
 O:{question:'Welche runde Frucht kann orange sein?',solution:'Orange',letterIndex:0},
 P:{question:'Welches Tier wiehert?',solution:'Pferd',letterIndex:0},
 R:{question:'Welche Farbe haben viele Feuerwehrautos?',solution:'Rot',letterIndex:0},
 S:{question:'Welcher Stern spendet uns tagsüber Licht?',solution:'Sonne',letterIndex:0},
 T:{question:'Welches Tier brüllt und hat Streifen?',solution:'Tiger',letterIndex:0},
 U:{question:'Welches Tier ist ein großer, kräftiger Waldbewohner mit Geweih?',solution:'Uhu',letterIndex:0},
 V:{question:'Wie heißt ein anderes Wort für Papa?',solution:'Vater',letterIndex:0},
 W:{question:'Was fällt bei Regen aus den Wolken?',solution:'Wasser',letterIndex:0},
 Z:{question:'Womit putzt man sich die Zähne?',solution:'Zahnbürste',letterIndex:0}
};
export function generateCreativeRouteClue(destination: string, description: string, mode: RouteClueMode, seed: number, custom = ''): RouteClue {
 const answer=destination.trim();
 if(!answer || answer.length>80) throw new Error('Ungültiger Zielort');
 if(mode==='custom') {
   if(!custom.trim()) throw new Error('Ein eigenes Wegrätsel fehlt');
   return {mode,instruction:'Findet heraus, welcher Ort gemeint ist.',question:custom.trim(),hint:'Lest die Hinweise genau.',answer};
 }
 if(mode==='description') {
   const safe=description.trim().replace(new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'________');
   if(safe.length<12) throw new Error('Für ein Beschreibungsrätsel bitte mindestens 12 Zeichen Ortsbeschreibung eingeben.');
   return {mode,instruction:'Welcher Ort passt zu dieser Beschreibung?',question:safe,hint:'Achtet auf besondere Merkmale des Ortes.',answer};
 }
 if(mode==='questions') {
   const letters=[...answer.toUpperCase()].filter(ch=>/[A-Z]/.test(ch));
   if(!letters.length || letters.some(ch=>!QUESTION_BANK[ch])) throw new Error('Für diesen Ortsnamen fehlen noch passende Fragen. Bitte eine andere Rätselart wählen.');
   const rows=letters.map(ch=>({...QUESTION_BANK[ch]}));
   if(rows.some((r,i)=>r.solution[r.letterIndex]?.toUpperCase()!==letters[i])) throw new Error('Fragenrätsel ist nicht konsistent.');
   return {mode,instruction:'Beantwortet die Fragen. Nehmt jeweils den angegebenen Buchstaben der Antwort. Die Buchstaben ergeben den nächsten Ort (ohne Leerzeichen).',question:'',hint:'Schreibt die Lösungsbuchstaben nacheinander auf.',answer,rows};
 }
 const p=generateRoutePuzzle(answer,seed);
 return {mode:'letters',instruction:p.instruction,question:p.question,hint:p.hint,answer};
}
