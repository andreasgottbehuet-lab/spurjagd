/** Deterministic, client-side puzzles. No LLM or network calls. */
export type PuzzleKind = 'arithmetic' | 'symbols' | 'cipher' | 'wordsearch' | 'arrowpath' | 'sequence';
export type AgeLevel = 'young' | 'middle' | 'older';
export interface Puzzle {
  id: string;
  kind: PuzzleKind;
  instruction: string;
  question: string;
  hint: string;
  explanation: string;
  expectedDigit: number;
  render?: { symbol: string; count: number; items?: string[] };
  wordGrid?: { rows: string[]; startRow: number; startCol: number; deltaRow: number; deltaCol: number; word: string };
  arrowGrid?: {rows:string[]; startRow:number; startCol:number; arrows:string};
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
/** Enumerate every visible digit-word match, including reverse and diagonal directions. */
export function findDigitWords(rows: string[]): {digit:number;row:number;col:number;dr:number;dc:number}[] {
  const n=rows.length;
  if(!n||rows.some(row=>row.length!==n)) return [];
  const matches: {digit:number;row:number;col:number;dr:number;dc:number}[]=[];
  for(let digit=0;digit<DIGIT_WORDS.length;digit++){
    const word=DIGIT_WORDS[digit];
    for(let row=0;row<n;row++) for(let col=0;col<n;col++)
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        if(!dr&&!dc) continue;
        if([...word].every((letter,i)=>rows[row+i*dr]?.[col+i*dc]===letter)) matches.push({digit,row,col,dr,dc});
      }
  }
  return matches;
}
export function generateDigitPuzzle(target: number, kind: PuzzleKind, age: AgeLevel, seed: number): Puzzle {
  if (!Number.isInteger(target) || target < 0 || target > 9) throw new Error('Ziffer muss zwischen 0 und 9 liegen');
  if (!['arithmetic','symbols','cipher','wordsearch','arrowpath','sequence'].includes(kind)) throw new Error('Unbekannte Rätselart');
  const rng = seededRandom(seed);
  const id = kind + '-' + (seed >>> 0).toString(16) + '-' + target;
  if (kind === 'sequence') {
    // The missing final number is always the exact target digit.
    const step=age==='young'?1:chooseInt(rng,age==='middle'?2:3,age==='middle'?5:8);
    const ascending=target>=4*step && rng()<0.5;
    const values=Array.from({length:5},(_,i)=>ascending?target-(4-i)*step:target+(4-i)*step);
    return {id,kind,instruction:'Erkenne die Zahlenfolge und ergänze die fehlende Zahl. Sie ist deine Code-Ziffer.',question:values.slice(0,4).join('  ·  ')+'  ·  ?',hint:ascending?'Die Zahlen werden immer um denselben Wert größer.':'Die Zahlen werden immer um denselben Wert kleiner.',explanation:values.join(' → '),expectedDigit:target};
  }
  if (kind === 'arrowpath') {
    const size=age==='young'?5:age==='middle'?6:7;
    const length=age==='young'?3:age==='middle'?5:7;
    const moves=[{dr:0,dc:1,s:'→'},{dr:0,dc:-1,s:'←'},{dr:1,dc:0,s:'↓'},{dr:-1,dc:0,s:'↑'}];
    let startRow=0,startCol=0,r=0,c=0,arrows='';
    let completed=false;
    for(let attempt=0;attempt<100&&!completed;attempt++){
      startRow=chooseInt(rng,0,size-1);startCol=chooseInt(rng,0,size-1);
      r=startRow;c=startCol;arrows='';
      const visited=new Set([r+':'+c]);
      for(let i=0;i<length;i++){
        const options=moves.filter(m=>r+m.dr>=0&&r+m.dr<size&&c+m.dc>=0&&c+m.dc<size&&!visited.has((r+m.dr)+':'+(c+m.dc)));
        if(!options.length) break;
        const move=options[chooseInt(rng,0,options.length-1)];
        r+=move.dr;c+=move.dc;visited.add(r+':'+c);arrows+=move.s;
      }
      completed=[...arrows].length===length;
    }
    if(!completed) throw new Error('Kein vollständiger Pfeilpfad erzeugbar');
    const grid=Array.from({length:size},()=>Array.from({length:size},()=>String(chooseInt(rng,0,9))));
    grid[r][c]=String(target);
    return {id,kind,instruction:'Starte bei S und folge jedem Pfeil genau ein Kästchen. Die letzte Ziffer ist dein Code.',question:arrows.split('').join(' '),hint:'Jeder Pfeil bedeutet genau einen Schritt. Gehe nicht diagonal.',explanation:'Pfeilfolge '+arrows+' endet bei '+target+'.',expectedDigit:target,arrowGrid:{rows:grid.map(row=>row.join('')),startRow,startCol,arrows}};
  }
  if (kind === 'wordsearch') {
    const word = DIGIT_WORDS[target];
    const size = age === 'young' ? 8 : age === 'middle' ? 10 : 12;
    const directions = age === 'young' ? [[0,1],[1,0]] : age === 'middle'
      ? [[0,1],[1,0],[1,1],[-1,1]]
      : [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
    const candidates: {r:number;c:number;dr:number;dc:number}[] = [];
    for (const [dr,dc] of directions) for (let r=0;r<size;r++) for(let c=0;c<size;c++) {
      if(r+(word.length-1)*dr>=0 && r+(word.length-1)*dr<size && c+(word.length-1)*dc>=0 && c+(word.length-1)*dc<size)
        candidates.push({r,c,dr,dc});
    }
    for(let attempt=0;attempt<200;attempt++){
      const selected=candidates[chooseInt(rng,0,candidates.length-1)];
      const grid=Array.from({length:size},()=>Array.from({length:size},()=>ALPHABET[chooseInt(rng,0,25)]));
      for(let i=0;i<word.length;i++) grid[selected.r+i*selected.dr][selected.c+i*selected.dc]=word[i];
      const rows=grid.map(row=>row.join(''));
      const matches=findDigitWords(rows);
      if(matches.length!==1||matches[0].digit!==target) continue;
      return {id,kind,instruction:'Finde ein ausgeschriebenes Zahlwort im Buchstabengitter. Die Zahl ist deine Code-Ziffer.',question:age==='young'?'Suche waagerecht oder senkrecht.':age==='middle'?'Suche auch diagonal.':'Suche waagerecht, senkrecht und diagonal – auch rückwärts.',hint:'Die Buchstaben stehen direkt nebeneinander in einer geraden Linie.',explanation:'Das versteckte Wort '+word+' ergibt die Ziffer '+target+'.',expectedDigit:target,wordGrid:{rows,startRow:selected.r,startCol:selected.c,deltaRow:selected.dr,deltaCol:selected.dc,word}};
    }
    throw new Error('Kein eindeutiges Zahlwort-Suchgitter erzeugbar');
  }
  if (kind === 'symbols') {
    // School-age children count one target among decoys in a fixed 4×4 field.
    const symbol = SYMBOLS[chooseInt(rng, 0, SYMBOLS.length - 1)];
    if(age==='young') return { id, kind, instruction: 'Zähle die abgebildeten Zeichen.', question: target === 0 ? 'Wie viele Zeichen siehst du im leeren Feld?' : 'Wie viele Zeichen sind im Kasten?', hint: 'Zeige auf jedes Zeichen und zähle langsam.', explanation: target + ' Zeichen ergeben die Ziffer ' + target + '.', expectedDigit: target, render: {symbol, count: target} };
    const items=Array.from({length:target},()=>symbol);
    while(items.length<16) items.push(SYMBOLS.filter(candidate=>candidate!==symbol)[chooseInt(rng,0,SYMBOLS.length-2)]);
    for(let i=items.length-1;i>0;i--){const j=chooseInt(rng,0,i);[items[i],items[j]]=[items[j],items[i]];}
    return { id, kind, instruction: 'Zähle in den Kästchen nur das gesuchte Zeichen. Andere Zeichen sind Ablenkung.', question: 'Wie oft findest du dieses Zeichen? '+symbol, hint: 'Gehe Reihe für Reihe vor und zähle das gesuchte Zeichen nur einmal pro Kästchen.', explanation: target + ' passende Zeichen ergeben die Ziffer ' + target + '.', expectedDigit: target, render: {symbol, count: target, items} };
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
      // The product must be at least the target: avoid confusing 'minus -3' expressions.
      const factor = chooseInt(rng, 3, 5);
      const extra = chooseInt(rng, 3, 5);
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
    hint: age==='young'?'Gehe bei jedem Zeichen einen Buchstaben im Alphabet zurück.':'Schreibe das Alphabet zweimal untereinander. Beginne die untere Reihe um '+shift+' Stellen versetzt und lies die Buchstaben rückwärts ab.',
    explanation: encoded + ' bedeutet ' + word + ', also ' + target + '.',
    expectedDigit: target,
  };
}
export function verifyDigitPuzzle(puzzle: Puzzle): boolean {
  if (!Number.isInteger(puzzle.expectedDigit) || puzzle.expectedDigit < 0 || puzzle.expectedDigit > 9) return false;
  const target = puzzle.expectedDigit;
  if (puzzle.kind === 'sequence') {
    const parts=puzzle.question.split('  ·  ');
    if(parts.length!==5||parts[4]!=='?') return false;
    const nums=parts.slice(0,4).map(Number);
    if(nums.some(n=>!Number.isInteger(n))) return false;
    const delta=nums[1]-nums[0];
    return delta!==0 && nums.slice(2).every((value,index)=>value-nums[index+1]===delta) && nums[3]+delta===target;
  }
  if (puzzle.kind === 'arrowpath') {
    const g=puzzle.arrowGrid;
    if(!g||g.rows.length<5||g.rows.some(row=>row.length!==g.rows.length||!/^[0-9]+$/.test(row))||![3,5,7].includes([...g.arrows].length)||puzzle.question!==[...g.arrows].join(' ')) return false;
    let r=g.startRow,c=g.startCol;
    if(!Number.isInteger(r)||!Number.isInteger(c)||r<0||c<0||r>=g.rows.length||c>=g.rows.length) return false;
    const visited=new Set([r+':'+c]);
    for(const arrow of g.arrows){
      if(arrow==='→') c++;else if(arrow==='←') c--;else if(arrow==='↓') r++;else if(arrow==='↑') r--;else return false;
      if(r<0||c<0||r>=g.rows.length||c>=g.rows.length||visited.has(r+':'+c)) return false;
      visited.add(r+':'+c);
    }
    return Number(g.rows[r]?.[c])===target;
  }
  if (puzzle.kind === 'wordsearch') {
    const g=puzzle.wordGrid;
    if(!g || g.word!==DIGIT_WORDS[target] || ![8,10,12].includes(g.rows.length) || g.rows.some(row=>row.length!==g.rows.length || !/^[A-Z]+$/.test(row))) return false;
    const {startRow:r,startCol:c,deltaRow:dr,deltaCol:dc}=g;
    if(!Number.isInteger(r)||!Number.isInteger(c)||!Number.isInteger(dr)||!Number.isInteger(dc)||(dr===0&&dc===0)||Math.abs(dr)>1||Math.abs(dc)>1) return false;
    if(![...g.word].every((letter,i)=>g.rows[r+i*dr]?.[c+i*dc]===letter)) return false;
    const matches=findDigitWords(g.rows);
    return matches.length===1 && matches[0].digit===target;
  }
  if (puzzle.kind === 'symbols') {
    const render=puzzle.render;
    if(!render||render.count!==target||typeof render.symbol!=='string'||!render.symbol.trim()||render.symbol.length>4) return false;
    return render.items===undefined || (render.items.length===16 && render.items.every(item=>SYMBOLS.includes(item)) && render.items.filter(item=>item===render.symbol).length===target);
  }
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
    if (!shift || !/^[A-Z]+$/.test(puzzle.question) || Number(shift[1])<1 || Number(shift[1])>25) return false;
    const decoded = [...puzzle.question].map(char => ALPHABET[(ALPHABET.indexOf(char) - Number(shift[1]) + 26) % 26]).join('');
    return decoded === DIGIT_WORDS[target];
  }
  return false;
}
export function generateStationChallenge(stationId: string, code: string, age: AgeLevel, projectSeed: number): StationChallenge {
  if (!validCode(code)) throw new Error('Der Schloss-Code muss genau drei Ziffern enthalten, auch 000 ist erlaubt.');
  if (!stationId.trim()) throw new Error('Stations-ID fehlt');
  // Younger children should not need Caesar ciphers to open a lock.
  // Keep three independent digits and the existing deterministic seeds.
  const variants: PuzzleKind[][] = age === 'young'
    ? [['arithmetic','symbols','arithmetic'],['symbols','wordsearch','arithmetic'],['wordsearch','arithmetic','symbols'],['arrowpath','arithmetic','symbols'],['sequence','symbols','arrowpath']]
    : [['arithmetic','symbols','cipher'],['wordsearch','arithmetic','cipher'],['symbols','wordsearch','arithmetic'],['cipher','symbols','wordsearch'],['arrowpath','symbols','arithmetic'],['arithmetic','arrowpath','cipher'],['sequence','wordsearch','cipher'],['cipher','sequence','symbols']];
  const kinds=variants[hashSeed(projectSeed+':'+stationId+':types')%variants.length];
  // A zero-digit must be earned by solving a real task, never by counting an empty box.
  const puzzles = [...code].map((digit, i) => generateDigitPuzzle(Number(digit), kinds[i] === 'symbols' && digit === '0' ? 'arithmetic' : kinds[i], age, hashSeed(projectSeed + ':' + stationId + ':' + i)));
  if (puzzles.some((p,i) => !verifyDigitPuzzle(p) || p.expectedDigit !== Number(code[i]))) throw new Error('Rätselkonsistenz fehlgeschlagen');
  return { stationId, code, puzzles };
}
export function codeFromPuzzles(challenge: StationChallenge): string {
  if (!validCode(challenge.code) || challenge.puzzles.length!==3 || challenge.puzzles.some(p=>!verifyDigitPuzzle(p))) throw new Error('Rätselprüfung fehlgeschlagen');
  const code=challenge.puzzles.map(p=>String(p.expectedDigit)).join('');
  if(code!==challenge.code) throw new Error('Schloss-Code stimmt nicht mit den Rätseln überein');
  return code;
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
 C:{question:'Wie nennt man einen lustigen Spaßmacher mit roter Nase im Zirkus?',solution:'Clown',letterIndex:0},
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
 // Match literal occurrences first. A separate folded-name check below rejects
 // disguised spellings that could otherwise disclose the destination.
 const lower=source.toLocaleLowerCase('de');
 const needle=destination.toLocaleLowerCase('de');
 let start=0;
 let result='';
 while(true){
  const index=lower.indexOf(needle,start);
  if(index<0) break;
  result+=source.slice(start,index)+'________';
  start=index+destination.length;
 }
 return result+source.slice(start);
}
export function encodeAlternatingRouteName(destination:string):string {
 const chars=[...destination];
 const first=chars.filter((_,index)=>index%2===0).join('');
 const second=chars.filter((_,index)=>index%2===1).join('');
 return first.length+':'+first+'|'+second;
}
export function decodeAlternatingRouteName(question:string):string|null {
 const separator=question.indexOf(':');
 if(separator<1||!/^\d+$/.test(question.slice(0,separator)))return null;
 const firstLength=Number(question.slice(0,separator));
 if(!Number.isSafeInteger(firstLength))return null;
 const body=[...question.slice(separator+1)];
 if(body.length<=firstLength||body[firstLength]!=='|')return null;
 const first=body.slice(0,firstLength),second=body.slice(firstLength+1);
 if(first.length!==second.length&&first.length!==second.length+1)return null;
 return first.map((character,index)=>character+(second[index]??'')).join('');
}
export function generateCreativeRouteClue(destination: string, description: string, mode: RouteClueMode, seed: number, custom = '', age:AgeLevel='middle'): RouteClue {
 const answer=destination.trim();
 if(!answer || answer.length>80) throw new Error('Ungültiger Zielort');
 if(mode==='custom') {
   if(!custom.trim()) throw new Error('Ein eigenes Wegrätsel fehlt');
   if(custom.trim().length>400) throw new Error('Eigenes Wegrätsel ist zu lang (maximal 400 Zeichen).');
   return {mode,instruction:'Findet heraus, welcher Ort gemeint ist.',question:custom.trim(),hint:'Lest die Hinweise genau.',answer};
 }
 if(mode==='description') {
   const safe=maskDestination(description,answer).replace(/\s+/g,' ').trim();
   if(safe.length<12) throw new Error('Für ein Beschreibungsrätsel bitte mindestens 12 Zeichen Ortsbeschreibung eingeben.');
   if(clueRevealsDestination(safe,answer)) throw new Error('Die Ortsbeschreibung verrät den Zielnamen auch nach dem Ausblenden. Bitte den Text umformulieren.');
   const listItems=safe.split(/[,;]\s*/).map(item=>item.trim()).filter(Boolean);
   const prose=/[.!?]$/.test(safe)
     ? safe
     : listItems.length>1
       ? 'Besondere Merkmale: '+listItems.slice(0,-1).join(', ')+' und '+listItems.at(-1)+'.'
       : 'Hinweis: '+safe+'.';
   return {mode,instruction:'Lest den Hinweistext und findet heraus, welcher Ort gemeint ist.',question:prose+' Welcher Ort passt zu diesem Text?',hint:'Achtet darauf, welche Merkmale im Text wirklich genannt werden.',answer};
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
 if(age==='young'){
  const p=generateRoutePuzzle(answer,seed);
  return {mode:'letters',instruction:p.instruction,question:p.question,hint:p.hint,answer};
 }
 return {mode:'letters',instruction:'Die erste Gruppe zeigt die Zeichen an den Stellen 1, 3, 5 usw.; nach dem senkrechten Strich folgen die Zeichen an den Stellen 2, 4, 6 usw. Setzt die Zeichen abwechselnd zusammen.',question:encodeAlternatingRouteName(answer),hint:'Lest links vom senkrechten Strich ein Zeichen und ergänzt dann rechts das nächste.',answer};
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
 if(clue.mode==='questions') return verifyRouteQuestions(clue) && clue.rows!.every(row=>row.question.trim().length>0 && row.solution.trim().length>0 && !clueRevealsDestination(row.question,destination));
 if(clue.mode==='description') {
  return clue.question.trim().length>=12
   && !clueRevealsDestination(clue.question,destination);
 }
 if(clue.mode==='custom') return clue.question.trim().length>0 && clue.question.trim().length<=400 && !clueRevealsDestination(clue.question,destination);
 if(clue.mode==='letters') {
  const decoded=decodeAlternatingRouteName(clue.question);
  if(decoded===destination)return true;
  const reverse=[...destination].reverse().join('');
  const vowels=destination.replace(/[AEIOUÄÖÜaeiouäöü]/g,'_');
  return clue.question!==destination && (clue.question===reverse || clue.question===vowels);
 }
 return false;
}
