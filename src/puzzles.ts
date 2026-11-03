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
  if (digits !== 3 && digits !== 4) return false;
  return typeof code === 'string' && new RegExp('^[0-9]{' + digits + '}$').test(code);
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
  if (!validCode(code, code.length)) throw new Error('Der Schloss-Code muss genau drei oder vier Ziffern enthalten, auch 000 und 0000 sind erlaubt.');
  if (!stationId.trim()) throw new Error('Stations-ID fehlt');
  const kinds: PuzzleKind[] = ['arithmetic','symbols','cipher'];
  const puzzles = [...code].map((digit, i) => generateDigitPuzzle(Number(digit), kinds[i % kinds.length], age, hashSeed(projectSeed + ':' + stationId + ':' + i)));
  if (puzzles.some((p,i) => !verifyDigitPuzzle(p) || p.expectedDigit !== Number(code[i]))) throw new Error('Rätselkonsistenz fehlgeschlagen');
  return { stationId, code, puzzles };
}
export function codeFromPuzzles(challenge: StationChallenge): string {
  if (challenge.puzzles.some(p => !verifyDigitPuzzle(p))) throw new Error('Rätselprüfung fehlgeschlagen');
  return challenge.puzzles.map(p=>String(p.expectedDigit)).join('');
}
