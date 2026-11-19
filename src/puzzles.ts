/** Deterministic, client-side puzzles. No LLM or network calls. */
import {QUESTION_BANK as SUBJECT_BANK,type Subject} from './question-bank.ts';
export type PuzzleKind = 'arithmetic' | 'symbols' | 'cipher' | 'mirror' | 'wordsearch' | 'arrowpath' | 'sequence' | 'maze' | 'picturesearch';
export type AgeLevel = 'young' | 'early' | 'middle' | 'older' | 'advanced' | 'expert' | 'adult';
export interface Puzzle {
  id: string;
  kind: PuzzleKind;
  instruction: string;
  question: string;
  hint: string;
  explanation: string;
  expectedDigit: number;
  render?: { symbol: string; count: number; items?: string[]; columns?: number };
  workedExample?: string;
  wordGrid?: { rows: string[]; startRow: number; startCol: number; deltaRow: number; deltaCol: number; word: string };
  arrowGrid?: {rows:string[]; startRow:number; startCol:number; arrows:string};
  /** rows[r][c] = Hex-Maske offener Wände (N=1,O=2,S=4,W=8); Start links oben, Ziel rechts unten; stars = Zellindizes r*n+c. */
  maze?: {rows:string[]; stars:number[]};
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
const MAZE_DIRS=[{bit:1,opp:4,dr:-1,dc:0},{bit:2,opp:8,dr:0,dc:1},{bit:4,opp:1,dr:1,dc:0},{bit:8,opp:2,dr:0,dc:-1}];
/** Eindeutiger Weg (Zellindizes) von links oben nach rechts unten; null, wenn das Gitter kein gültiges Labyrinth (zusammenhängend, kreisfrei, symmetrisch) ist. */
export function mazePath(rows:string[]):number[]|null {
  const n=rows.length;
  if(n<4||n>12||rows.some(row=>row.length!==n||!/^[0-9a-f]+$/.test(row))) return null;
  const open=rows.flatMap(row=>[...row].map(ch=>parseInt(ch,16)));
  let edges=0;
  for(let i=0;i<n*n;i++){
    const r=Math.floor(i/n),c=i%n;
    for(const d of MAZE_DIRS){
      if(!(open[i]&d.bit)) continue;
      const nr=r+d.dr,nc=c+d.dc;
      if(nr<0||nc<0||nr>=n||nc>=n||!(open[nr*n+nc]&d.opp)) return null;
      edges++;
    }
  }
  if(edges!==2*(n*n-1)) return null;
  const parent=new Map<number,number>([[0,-1]]),queue=[0];
  for(let q=0;q<queue.length;q++){
    const i=queue[q],r=Math.floor(i/n),c=i%n;
    for(const d of MAZE_DIRS){const j=(r+d.dr)*n+c+d.dc;if((open[i]&d.bit)&&!parent.has(j)){parent.set(j,i);queue.push(j);}}
  }
  if(parent.size!==n*n) return null;
  const path:number[]=[];
  for(let i=n*n-1;i>=0;i=parent.get(i)!) path.unshift(i);
  return path;
}
export function generateDigitPuzzle(target: number, kind: PuzzleKind, age: AgeLevel, seed: number): Puzzle {
  if (!Number.isInteger(target) || target < 0 || target > 9) throw new Error('Ziffer muss zwischen 0 und 9 liegen');
  if (!['arithmetic','symbols','cipher','mirror','wordsearch','arrowpath','sequence','maze','picturesearch'].includes(kind)) throw new Error('Unbekannte Rätselart');
  const rng = seededRandom(seed);
  const id = kind + '-' + (seed >>> 0).toString(16) + '-' + target;
  if (kind === 'sequence') {
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const step=rank<2?chooseInt(rng,1,2):chooseInt(rng,rank===2?3:rank===3?5:rank===4?8:rank===5?11:14,rank===2?6:rank===3?10:rank===4?15:rank===5?20:25);
    const ascending=target>=4*step && rng()<0.5;
    const givenCount=rank>=5?6:rank>=3?5:4;
    const values=Array.from({length:givenCount+1},(_,i)=>ascending?target-(givenCount-i)*step:target+(givenCount-i)*step);
    return {id,kind,instruction:'Erkenne die Zahlenfolge und ergänze die fehlende Zahl. Sie ist deine Code-Ziffer.',question:values.slice(0,-1).join('  ·  ')+'  ·  ?',hint:ascending?'Die Zahlen werden immer um denselben Wert größer.':'Die Zahlen werden immer um denselben Wert kleiner.',explanation:values.join(' → '),expectedDigit:target};
  }
  if (kind === 'maze') {
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const n=[5,5,6,6,7,8,9][rank];
    for(let attempt=0;attempt<500;attempt++){
      const open=new Array<number>(n*n).fill(0),seen=new Set([0]),stack=[0];
      while(stack.length){
        const i=stack[stack.length-1],r=Math.floor(i/n),c=i%n;
        const options=MAZE_DIRS.filter(d=>r+d.dr>=0&&r+d.dr<n&&c+d.dc>=0&&c+d.dc<n&&!seen.has((r+d.dr)*n+c+d.dc));
        if(!options.length){stack.pop();continue;}
        const d=options[chooseInt(rng,0,options.length-1)],j=(r+d.dr)*n+c+d.dc;
        open[i]|=d.bit;open[j]|=d.opp;seen.add(j);stack.push(j);
      }
      const rows=Array.from({length:n},(_,r)=>open.slice(r*n,r*n+n).map(v=>v.toString(16)).join(''));
      const path=mazePath(rows)!;
      const inner=path.slice(1,-1),onPath=new Set(path);
      const off=Array.from({length:n*n},(_,i)=>i).filter(i=>!onPath.has(i));
      if(inner.length<target||off.length<4) continue;
      const pick=(list:number[],count:number)=>{const pool=[...list];const out:number[]=[];for(let k=0;k<count;k++)out.push(pool.splice(chooseInt(rng,0,pool.length-1),1)[0]);return out;};
      const stars=[...pick(inner,target),...pick(off,chooseInt(rng,3,4))].sort((a,b)=>a-b);
      return {id,kind,instruction:'Finde den Weg von S nach Z. Zähle die ★ auf diesem Weg. Die Zahl ist deine Code-Ziffer.',question:'Wie viele ★ liegen auf dem Weg von S nach Z?',hint:'Es gibt nur einen Weg ohne Umkehren. ★ in Sackgassen zählen nicht.',explanation:'Auf dem Lösungsweg liegen '+target+' ★.',expectedDigit:target,maze:{rows,stars}};
    }
    throw new Error('Kein Labyrinth erzeugbar');
  }
  if (kind === 'arrowpath') {
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const size=[5,6,7,8,9,10,11][rank];
    const length=[3,5,7,9,11,13,15][rank];
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
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const size = [8,9,10,11,12,13,14][rank];
    const directions = age === 'young' ? [[0,1],[1,0]] : age === 'early' || age === 'middle'
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
  if (kind === 'mirror') {
    const word = DIGIT_WORDS[target];
    return {id,kind,instruction:age==='young'?'Halte den Zettel vor einen Spiegel.':'',question:word,hint:'',explanation:word+' ergibt die Ziffer '+target+'.',expectedDigit:target};
  }
  if (kind === 'picturesearch') {
    // Bild-Suchrätsel: ein Symbol zählen ODER ein in Symbolen verstecktes Zahlwort lesen (Buchstaben nur in einer Zeile).
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const columns=[6,6,7,7,8,8,9][rank],total=columns*columns;
    const byWord=target===0||rng()<0.5;
    const symbol=SYMBOLS[chooseInt(rng,0,SYMBOLS.length-1)];
    const others=SYMBOLS.filter(candidate=>candidate!==symbol);
    if(!byWord){
      const items=Array.from({length:target},()=>symbol);
      while(items.length<total) items.push(others[chooseInt(rng,0,others.length-1)]);
      for(let i=items.length-1;i>0;i--){const j=chooseInt(rng,0,i);[items[i],items[j]]=[items[j],items[i]];}
      return {id,kind,instruction:'Suche im Bilderfeld das gesuchte Zeichen und zähle es. Die Zahl ist deine Code-Ziffer.',question:'Wie oft findest du dieses Zeichen? '+symbol,hint:'Gehe Reihe für Reihe vor.',explanation:target+' passende Zeichen ergeben die Ziffer '+target+'.',expectedDigit:target,render:{symbol,count:target,items,columns}};
    }
    const word=DIGIT_WORDS[target],row=chooseInt(rng,0,columns-1),col=chooseInt(rng,0,columns-word.length);
    // Füllfelder nur aus SYMBOLS (keine Buchstaben), daher entsteht kein weiteres Zahlwort; der Verifier prüft das zusätzlich.
    const items=Array.from({length:total},()=>SYMBOLS[chooseInt(rng,0,SYMBOLS.length-1)]);
    [...word].forEach((letter,i)=>{items[row*columns+col+i]=letter;});
    return {id,kind,instruction:'Zwischen den Bildern steht ein Zahlwort aus Buchstaben. Lies es und schreibe die Zahl als Ziffer auf. Sie ist deine Code-Ziffer.',question:'Welches Zahlwort versteckt sich in den Bildern?',hint:'Suche Reihe für Reihe nach Buchstaben; sie stehen nebeneinander.',explanation:'Das versteckte Wort '+word+' ergibt die Ziffer '+target+'.',expectedDigit:target,render:{symbol:'',count:0,items,columns}};
  }
  if (kind === 'symbols') {
    // All age groups count a target among distractors; the field grows with age.
    const symbol = SYMBOLS[chooseInt(rng, 0, SYMBOLS.length - 1)];
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const columns=[4,5,4,4,4,4,4][rank];
    const total=columns*columns;
    const items=Array.from({length:target},()=>symbol);
    while(items.length<total) items.push(SYMBOLS.filter(candidate=>candidate!==symbol)[chooseInt(rng,0,SYMBOLS.length-2)]);
    for(let i=items.length-1;i>0;i--){const j=chooseInt(rng,0,i);[items[i],items[j]]=[items[j],items[i]];}
    return { id, kind, instruction: age==='young'?'Zähle die gesuchten Zeichen zwischen den anderen Bildern.':'Zähle in den Kästchen nur das gesuchte Zeichen. Andere Zeichen sind Ablenkung.', question: 'Wie oft findest du dieses Zeichen? '+symbol, hint: 'Gehe Reihe für Reihe vor und zähle das gesuchte Zeichen nur einmal pro Kästchen.', explanation: target + ' passende Zeichen ergeben die Ziffer ' + target + '.', expectedDigit: target, render: {symbol, count: target, items, columns} };
  }
  if (kind === 'arithmetic') {
    const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
    const termCount=rank===0?(target>1?2:3):rank<=2?3:rank===3?4:rank===4?5:rank===5?6:7;
    let terms:number[]=[]; let signs:string[]=[]; let result=0;
    for(let attempt=0;attempt<500;attempt++){
      terms=Array.from({length:termCount-1},()=>chooseInt(rng,1,9));
      if(terms.some((value,index)=>index>0&&value===terms[index-1]))continue;
      signs=Array.from({length:termCount-2},()=>rng()<0.5?'+':'−');
      result=terms[0]; for(let i=0;i<signs.length;i++)result=signs[i]==='+'?result+terms[i+1]:result-terms[i+1];
      for(const lastSign of ['+','−']){
        const last=lastSign==='+'?target-result:result-target;
        if(last<1||last>9)continue;
        if(terms.at(-1)===last)continue;
        terms=[...terms,last]; signs=[...signs,lastSign]; result=target; break;
      }
      if(result===target&&terms.length===termCount)break;
    }
    if(terms.length!==termCount||result!==target)throw new Error('Keine nichttriviale Rechnung erzeugbar');
    const expression=terms.map((term,index)=>(index?signs[index-1]+' ':'')+term).join(' ');
    const question=expression+' = ?';
    const explanation=expression+' = '+target;
    return { id, kind, instruction: 'Löse die Rechnung. Das Ergebnis ist eine Ziffer für den Code.', question, hint: rank===0?'Rechne die Zahlen nacheinander. Du darfst mit den Fingern oder Plättchen mitzählen.':rank<3?'Rechne Schritt für Schritt und prüfe das Ergebnis.':'Achte auf jedes Plus- und Minuszeichen und rechne von links nach rechts.', explanation, expectedDigit: target };
  }
  const word = DIGIT_WORDS[target];
  const rank=['young','early','middle','older','advanced','expert','adult'].indexOf(age);
  const shift = rank===0?1:rank<3?chooseInt(rng,1,3):chooseInt(rng,2,7);
  const encoded = [...word].map(char => ALPHABET[(ALPHABET.indexOf(char) + shift) % ALPHABET.length]).join('');
  return {
    id, kind,
    instruction: 'Entschlüssele das Wort. Es verrät dir eine Ziffer. Verschiebe jeden Buchstaben im Alphabet um ' + shift + (shift===1?' Stelle':' Stellen') + ' zurück. Beim Rückwärtszählen kommt vor A der Buchstabe Z.',
    question: encoded,
    hint: rank>=5?'Nutze das Beispiel und verschiebe dann jeden Buchstaben gleich weit zurück.':age==='young'?'Gehe bei jedem Zeichen einen Buchstaben im Alphabet zurück.':'Schreibe das Alphabet zweimal untereinander. Beginne die untere Reihe um '+shift+' Stellen versetzt und lies die Buchstaben rückwärts ab.',
    workedExample:rank>=5?'Beispiel: '+ALPHABET[shift]+' wird um '+shift+' Stellen zurück zu A.':undefined,
    explanation: encoded + ' bedeutet ' + word + ', also ' + target + '.',
    expectedDigit: target,
  };
}
export function verifyDigitPuzzle(puzzle: Puzzle): boolean {
  if (!Number.isInteger(puzzle.expectedDigit) || puzzle.expectedDigit < 0 || puzzle.expectedDigit > 9) return false;
  const target = puzzle.expectedDigit;
  if (puzzle.kind === 'sequence') {
    const parts=puzzle.question.split('  ·  ');
    if(![5,6,7].includes(parts.length)||parts.at(-1)!=='?') return false;
    const nums=parts.slice(0,-1).map(Number);
    if(nums.some(n=>!Number.isInteger(n))) return false;
    const delta=nums[1]-nums[0];
    return delta!==0 && nums.slice(2).every((value,index)=>value-nums[index+1]===delta) && nums.at(-1)!+delta===target;
  }
  if (puzzle.kind === 'maze') {
    const m=puzzle.maze,path=m&&mazePath(m.rows);
    if(!m||!path||new Set(m.stars).size!==m.stars.length||m.stars.some(i=>!Number.isInteger(i)||i<=0||i>=m.rows.length**2-1)) return false;
    return m.stars.filter(i=>path.includes(i)).length===target;
  }
  if (puzzle.kind === 'arrowpath') {
    const g=puzzle.arrowGrid;
    if(!g||g.rows.length<5||g.rows.some(row=>row.length!==g.rows.length||!/^[0-9]+$/.test(row))||![3,5,7,9,11,13,15].includes([...g.arrows].length)||puzzle.question!==[...g.arrows].join(' ')) return false;
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
    if(!g || g.word!==DIGIT_WORDS[target] || ![8,9,10,11,12,13,14].includes(g.rows.length) || g.rows.some(row=>row.length!==g.rows.length || !/^[A-Z]+$/.test(row))) return false;
    const {startRow:r,startCol:c,deltaRow:dr,deltaCol:dc}=g;
    if(!Number.isInteger(r)||!Number.isInteger(c)||!Number.isInteger(dr)||!Number.isInteger(dc)||(dr===0&&dc===0)||Math.abs(dr)>1||Math.abs(dc)>1) return false;
    if(![...g.word].every((letter,i)=>g.rows[r+i*dr]?.[c+i*dc]===letter)) return false;
    const matches=findDigitWords(g.rows);
    return matches.length===1 && matches[0].digit===target;
  }
  if (puzzle.kind === 'picturesearch') {
    const r=puzzle.render,items=r?.items;
    if(!r||!items||!r.columns||r.columns<6||r.columns>9||items.length!==r.columns*r.columns||items.some(item=>!SYMBOLS.includes(item)&&!/^[A-Z]$/.test(item))) return false;
    const letters=items.map((item,i)=>/^[A-Z]$/.test(item)?i:-1).filter(i=>i>=0);
    if(!letters.length) return r.count===target&&target>0&&SYMBOLS.includes(r.symbol)&&items.filter(item=>item===r.symbol).length===target;
    const first=letters[0],cols=r.columns;
    // Eindeutigkeit: im ganzen Raster (alle 8 Richtungen) darf genau ein Zahlwort lesbar sein.
    const matches=findDigitWords(Array.from({length:cols},(_,y)=>items.slice(y*cols,y*cols+cols).map(item=>/^[A-Z]$/.test(item)?item:'.').join('')));
    return matches.length===1&&matches[0].digit===target&&r.count===0&&r.symbol===''&&letters.every((x,i)=>x===first+i)&&Math.floor(first/r.columns)===Math.floor(letters[letters.length-1]/r.columns)&&letters.map(x=>items[x]).join('')===DIGIT_WORDS[target];
  }
  if (puzzle.kind === 'symbols') {
    const render=puzzle.render;
    if(!render||render.count!==target||typeof render.symbol!=='string'||!render.symbol.trim()||render.symbol.length>4) return false;
    return render.items===undefined || (render.items.length>=16 && render.items.length<=49 && render.items.every(item=>SYMBOLS.includes(item)) && render.items.filter(item=>item===render.symbol).length===target);
  }
  if (puzzle.kind === 'arithmetic') {
    const match=puzzle.question.match(/^\d+(?:\s*[+−]\s*\d+){1,6}\s*=\s*\?$/);
    if(!match)return false;
    const tokens=puzzle.question.replace(/=\s*\?$/,'').trim().split(/\s+/); let result=Number(tokens[0]);
    for(let i=1;i<tokens.length;i+=2){const value=Number(tokens[i+1]);result=tokens[i]==='+'?result+value:result-value;}
    return result===target && !/(\d+)\s*−\s*\1/.test(puzzle.question);
  }
  if (puzzle.kind === 'cipher') {
    const shift = puzzle.instruction.match(/um (\d+) Stelle(?:n)?/);
    if (!shift || !/^[A-Z]+$/.test(puzzle.question) || Number(shift[1])<1 || Number(shift[1])>25) return false;
    const decoded = [...puzzle.question].map(char => ALPHABET[(ALPHABET.indexOf(char) - Number(shift[1]) + 26) % 26]).join('');
    return decoded === DIGIT_WORDS[target];
  }
  if (puzzle.kind === 'mirror') return puzzle.question === DIGIT_WORDS[target];
  return false;
}
export function generateStationChallenge(stationId: string, code: string, age: AgeLevel, projectSeed: number, picture = false): StationChallenge {
  if (!validCode(code)) throw new Error('Der Schloss-Code muss genau drei Ziffern enthalten, auch 000 ist erlaubt.');
  if (!stationId.trim()) throw new Error('Stations-ID fehlt');
  // Younger children should not need Caesar ciphers to open a lock.
  // Keep three independent digits and the existing deterministic seeds.
  const variants: PuzzleKind[][] = age === 'young'
    ? [['arithmetic','symbols','arithmetic'],['symbols','wordsearch','arithmetic'],['wordsearch','arithmetic','symbols'],['arrowpath','arithmetic','symbols'],['sequence','symbols','arrowpath'],['mirror','arithmetic','symbols']]
    : [['arithmetic','symbols','cipher'],['wordsearch','arithmetic','cipher'],['symbols','wordsearch','arithmetic'],['cipher','symbols','wordsearch'],['arrowpath','symbols','arithmetic'],['arithmetic','arrowpath','cipher'],['sequence','wordsearch','cipher'],['cipher','sequence','symbols'],['mirror','symbols','arithmetic']];
  const pictureVariants: PuzzleKind[][] = [['maze','symbols','maze'],['symbols','maze','symbols'],['maze','maze','symbols']];
  const pool=picture?pictureVariants:variants;
  const kinds=pool[hashSeed(projectSeed+':'+stationId+':types')%pool.length];
  // A zero-digit must be earned by solving a real task, never by counting an empty box.
  const puzzles = [...code].map((digit, i) => generateDigitPuzzle(Number(digit), kinds[i] === 'symbols' && digit === '0' ? (picture ? 'maze' : 'arithmetic') : kinds[i], age, hashSeed(projectSeed + ':' + stationId + ':' + i)));
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
 A:[{question:'Was wächst am Baum und kann rot oder grün sein?',solution:'Apfel',letterIndex:0},{question:'Welches kleine Insekt baut große Hügel im Wald?',solution:'Ameise',letterIndex:0},{question:'Welches Tier klettert auf Bäume und isst gern Bananen?',solution:'Affe',letterIndex:0},{question:'Welches Fahrzeug hat vier Räder, einen Motor und einen Kofferraum?',solution:'Auto',letterIndex:0}],
 B:[{question:'Welches Tier baut Dämme in Flüssen?',solution:'Biber',letterIndex:0}],
 D:[{question:'Was ist das Gegenteil von hell?',solution:'Dunkel',letterIndex:0}],
 E:[{question:'Wie heißt gefrorenes Wasser?',solution:'Eis',letterIndex:0},{question:'Welcher Vogel schwimmt auf dem Teich und quakt?',solution:'Ente',letterIndex:0},{question:'Welches graue Tier mit langen Ohren sagt „I-A“?',solution:'Esel',letterIndex:0},{question:'Auf welchem Planeten leben wir?',solution:'Erde',letterIndex:0},{question:'Womit trägt man Wasser mit einem Henkel?',solution:'Eimer',letterIndex:0},{question:'Was legt ein Huhn?',solution:'Ei',letterIndex:0}],
 G:[{question:'Was wächst auf einer Wiese und ist grün?',solution:'Gras',letterIndex:0}],
 H:[{question:'Welches Tier hat lange Ohren und hoppelt?',solution:'Hase',letterIndex:0}],
 J:[{question:'Welcher Monat kommt nach Mai?',solution:'Juni',letterIndex:0}],
 K:[{question:'Was trägt man bei Kälte auf dem Kopf?',solution:'Kappe',letterIndex:0}],
 L:[{question:'Was leuchtet, wenn man es einschaltet?',solution:'Lampe',letterIndex:0}],
 M:[{question:'Welcher Monat kommt nach April?',solution:'Mai',letterIndex:0}],
 N:[{question:'Was ist das Gegenteil von ja?',solution:'Nein',letterIndex:0}],
 P:[{question:'Was wächst auf einem Baum und hat einen Kern?',solution:'Apfel',letterIndex:1}],
 R:[{question:'Was fällt als Wasser aus den Wolken?',solution:'Regen',letterIndex:0},{question:'Welche Blume hat Dornen am Stiel?',solution:'Rose',letterIndex:0}],
 S:[{question:'Was trägt man an den Füßen unter den Schuhen?',solution:'Socken',letterIndex:0},{question:'Was fällt im Winter weiß und kalt vom Himmel?',solution:'Schnee',letterIndex:0}],
 T:[{question:'Womit schreibt man auf Papier?',solution:'Stift',letterIndex:1}],
 U:[{question:'Was zeigt eine Uhr an?',solution:'Uhrzeit',letterIndex:0}],
 W:[{question:'Was weht bei stürmischem Wetter?',solution:'Wind',letterIndex:0}],
 Z:[{question:'Welches gestreifte Tier sieht einem Pferd ähnlich?',solution:'Zebra',letterIndex:0}]
};
const HARD_ALTERNATIVES: Record<string,{question:string;solution:string;letterIndex:number}> = {
 A:{question:'Wie heißt die Hauptschlagader des menschlichen Körpers?',solution:'Aorta',letterIndex:0},
 C:{question:'Wie heißt der grüne Farbstoff in den Blättern der Pflanzen?',solution:'Chlorophyll',letterIndex:0},
 D:{question:'Wie nennt man die Strecke durch den Mittelpunkt eines Kreises von Rand zu Rand?',solution:'Durchmesser',letterIndex:0},
 E:{question:'Welches Metall hat das chemische Symbol Fe?',solution:'Eisen',letterIndex:0},
 G:{question:'Wie nennt man ein Dreieck mit zwei gleich langen Seiten?',solution:'Gleichschenklig',letterIndex:0},
 H:{question:'Wie heißt die längste Seite im rechtwinkligen Dreieck?',solution:'Hypotenuse',letterIndex:0},
 J:{question:'Wie heißt der größte Planet unseres Sonnensystems?',solution:'Jupiter',letterIndex:0},
 K:{question:'Wie heißt das Treibhausgas mit der chemischen Formel CO2?',solution:'Kohlenstoffdioxid',letterIndex:0},
 P:{question:'Wie nennt man eine Zahl größer als 1, die nur durch 1 und sich selbst teilbar ist?',solution:'Primzahl',letterIndex:0}
};
// Weitere Fragen, damit auch lange Ortsnamen (bis 80 Buchstaben) ohne doppelte Frage oder Lösung auskommen.
const EXTRA_ALTERNATIVES: Record<string,[string,string,number?][]> = {
 A:[['Mit welchem Werkzeug spaltet man Holz?','Axt']],
 B:[['Welche gelbe Frucht ist krumm?','Banane'],['Womit spielt man Fußball?','Ball'],['Was hat einen Stamm, Äste und Blätter?','Baum']],
 C:[['Wie heißt die kleine Münze, von der 100 einen Euro ergeben?','Cent'],['Welches Gerät hat Tastatur, Maus und Bildschirm?','Computer'],['Wie heißt ein Platz, auf dem man im Urlaub zeltet?','Campingplatz']],
 D:[['Welches Fabelwesen speit Feuer?','Drache'],['Was ist ganz oben auf einem Haus?','Dach']],
 E:[['Welcher Vogel ruft nachts „Schuhu“?','Eule'],['Welche rote Frucht wächst am Boden und hat kleine Kerne außen?','Erdbeere']],
 F:[['Welches grüne Tier quakt am Teich?','Frosch'],['Welches Tier hat einen buschigen roten Schwanz und lebt im Wald?','Fuchs'],['Was hat ein Vogel statt Fell am Körper?','Feder']],
 G:[['Welches Tier hat den längsten Hals?','Giraffe'],['Welches grüne Gemüse ist lang und kommt in den Salat?','Gurke']],
 H:[['Worin wohnt eine Familie?','Haus'],['Was setzt ein Zauberer auf den Kopf?','Hut']],
 I:[['Welches Tier hat Stacheln und rollt sich ein?','Igel'],['Wie nennt man Land, das ganz von Wasser umgeben ist?','Insel'],['Wie heißt ein Haus aus Schnee?','Iglu']],
 J:[['Was zieht man bei Kälte über den Pullover?','Jacke'],['Welche Milchspeise isst man oft mit Früchten aus dem Becher?','Joghurt']],
 K:[['Welches Tier gibt Milch und sagt „Muh“?','Kuh'],['Was zündet man an, damit es hell wird, und hat einen Docht?','Kerze']],
 L:[['Womit isst man Suppe?','Löffel'],['Worauf steigt man, um hoch hinauf zu kommen?','Leiter']],
 M:[['Welches kleine Tier frisst gern Käse?','Maus'],['Welches weiße Getränk gibt die Kuh?','Milch']],
 N:[['Womit riecht man?','Nase'],['Was baut ein Vogel für seine Eier?','Nest']],
 O:[['Womit hört man?','Ohr'],['Wie heißt ein riesiges Meer, zum Beispiel der Atlantik?','Ozean'],['Wie nennt man die Mutter von Mama oder Papa?','Oma']],
 P:[['Was wächst im Wald und hat einen Hut, aber keinen Kopf?','Pilz'],['Womit malt man mit Wasserfarben?','Pinsel']],
 Q:[['Welches Meerestier ist durchsichtig und kann nesseln?','Qualle'],['Wie nennt man ein Viereck mit vier gleich langen Seiten und vier rechten Winkeln?','Quadrat'],['Welche weiße Milchspeise isst man oft mit Leinöl und Kartoffeln?','Quark']],
 R:[['Welcher schwarze Vogel krächzt laut?','Rabe']],
 S:[['Welches Tier gibt uns Wolle?','Schaf']],
 T:[['An welchem Möbelstück isst man?','Tisch'],['Welches rote Gemüse wird zu Ketchup?','Tomate']],
 U:[['Was ist das Gegenteil von oben?','Unten'],['Wie nennt man Zahlen wie 3, 5 und 7, die nicht durch 2 teilbar sind?','Ungerade']],
 V:[['Welches Tier hat Federn und kann fliegen?','Vogel'],['Worin stellt man Blumen mit Wasser?','Vase'],['Welcher Berg kann Lava spucken?','Vulkan']],
 W:[['Was schwebt weiß am Himmel?','Wolke'],['Welches lange Tier kriecht durch die Erde?','Wurm']],
 X:[['Welches Auto bringt Fahrgäste gegen Bezahlung ans Ziel?','Taxi',2],['Wer fliegt im Märchen auf einem Besen?','Hexe',2]],
 Y:[['Wie heißt ein kleines Pferd?','Pony',3],['Wie nennt man ein ganz kleines Kind?','Baby',3],['Welches zottelige Rind lebt im Himalaya-Gebirge?','Yak']],
 Z:[['Welche gelbe Frucht ist sehr sauer?','Zitrone'],['Welches Fahrzeug fährt auf Schienen?','Zug']]
};
for(const [letter,rows] of Object.entries(EXTRA_ALTERNATIVES)) (QUESTION_ALTERNATIVES[letter]??=[]).push(...rows.map(([question,solution,letterIndex=0])=>({question,solution,letterIndex})));
for(const [letter,row] of Object.entries(HARD_ALTERNATIVES)) (QUESTION_ALTERNATIVES[letter]??=[]).push(row);
export function normalizeSolutionWord(value:string):string {
 return value.toLocaleUpperCase('de').replace(/Ä/g,'AE').replace(/Ö/g,'OE').replace(/Ü/g,'UE').replace(/ß/g,'SS').replace(/[^A-Z]/g,'');
}
export function verifyRouteQuestions(clue:RouteClue):boolean {
 return clue.mode==='questions' && !!clue.rows?.length && clue.rows.every(row=>Number.isInteger(row.letterIndex) && row.letterIndex>=0 && row.letterIndex<row.solution.length && [...Object.values(QUESTION_BANK),...Object.values(QUESTION_ALTERNATIVES).flatMap(rows=>rows??[]),...SUBJECT_BANK.map(b=>({question:b.frage,solution:b.loesung,letterIndex:b.letterIndex}))].some(known=>known.question===row.question && known.solution===row.solution && known.letterIndex===row.letterIndex)) && clue.rows.map(row=>row.solution[row.letterIndex].toUpperCase()).join('')===normalizeSolutionWord(clue.answer);
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
export function generateCreativeRouteClue(destination: string, description: string, mode: RouteClueMode, seed: number, custom = '', age:AgeLevel='middle', subjects?:readonly Subject[]): RouteClue {
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
   const hardAge=age==='older'||age==='advanced';
   const usedQuestions=new Set<string>();
   const usedSolutions=new Set<string>();
   const rows=letters.map(ch=>{
     // Ab 'older': passende Fragen der Fächerbank (optional nach Fächern gefiltert) zuerst, sonst die bisherige Bank.
     const bankLevel=age==='older'?'older':age==='advanced'||age==='expert'||age==='adult'?'advanced':'';
     const banked=bankLevel?SUBJECT_BANK.filter(b=>b.altersstufe===bankLevel&&(!subjects||subjects.includes(b.fach))&&b.loesung[b.letterIndex]?.toUpperCase()===ch).map(b=>({question:b.frage,solution:b.loesung,letterIndex:b.letterIndex})):[];
     const bstart=banked.length?hashSeed(seed+':bank:'+ch)%banked.length:0;
     const bankRows=[...banked.slice(bstart),...banked.slice(0,bstart)];
     const hard=hardAge&&HARD_ALTERNATIVES[ch]?[HARD_ALTERNATIVES[ch]]:[];
     const rest=[QUESTION_BANK[ch],...(QUESTION_ALTERNATIVES[ch]??[])].filter(r=>r!==HARD_ALTERNATIVES[ch]);
     const start=hashSeed(seed+':'+ch)%rest.length;
     const variants=[...bankRows,...hard,...rest.slice(start),...rest.slice(0,start)];
     // Innerhalb eines Rätsels darf weder eine Frage noch eine Lösung doppelt vorkommen.
     const row=variants.find(r=>!usedQuestions.has(r.question) && !usedSolutions.has(r.solution));
     if(!row) throw new Error('Für diesen Ortsnamen fehlen noch passende Fragen. Bitte eine andere Rätselart wählen.');
     usedQuestions.add(row.question);
     usedSolutions.add(row.solution);
     return {...row};
   });
   if(rows.some((r,i)=>r.solution[r.letterIndex]?.toUpperCase()!==letters[i])) throw new Error('Fragenrätsel ist nicht konsistent.');
   return {mode,instruction:'Beantwortet die Fragen. Nehmt jeweils den angegebenen Buchstaben der Antwort. Die Buchstaben ergeben den nächsten Ort (ohne Leerzeichen).',question:'',hint:'Schreibt die Lösungsbuchstaben nacheinander auf.',answer,rows};
 }
 if(age==='young'){
  const p=generateRoutePuzzle(answer,seed);
  return {mode:'letters',instruction:p.instruction,question:p.question,hint:p.hint,answer};
 }
 return {mode:'letters',instruction:'Setzt die Buchstaben abwechselnd zusammen: erst alle ungeraden, dann alle geraden. Die erste Gruppe zeigt die Zeichen an den Stellen 1, 3, 5 usw.; nach dem senkrechten Strich folgen die Zeichen an den Stellen 2, 4, 6 usw.',question:encodeAlternatingRouteName(answer),hint:'Lest links vom senkrechten Strich ein Zeichen und ergänzt dann rechts das nächste.',answer};
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
