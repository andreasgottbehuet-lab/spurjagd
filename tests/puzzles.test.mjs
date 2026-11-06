import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AGE_GROUPS, ageLevelFor } from '../src/age-groups.ts';
import { createDefaultGameConfig } from '../src/default-game.ts';
import { generateStationChallenge, codeFromPuzzles, generateDigitPuzzle, verifyDigitPuzzle, hashSeed, validCode, generateRoutePuzzle, generateCreativeRouteClue, normalizeSolutionWord, verifyRouteQuestions, verifyCreativeRouteClue, clueRevealsDestination, findDigitWords } from '../src/puzzles.ts';

test('Alle dreistelligen Codes einschließlich führender Nullen sind rückwärts erzeugbar', () => {
  for (let n = 0; n <= 999; n++) {
    const code = String(n).padStart(3, '0');
    const result = generateStationChallenge('playground', code, 'middle', 314159);
    assert.equal(result.code, code);
    assert.equal(codeFromPuzzles(result), code);
    assert.equal(result.puzzles.length, 3);
    assert.ok(result.puzzles.every(verifyDigitPuzzle));
  }
});
test('Drei Altersgruppen und verschiedene Seeds ergeben überprüfbare Lösungen', () => {
  for (const age of ['young', 'middle', 'older']) {
    for (const seed of [0, 1, 2, 21, 123456789]) {
      for (let digit = 0; digit < 10; digit++) {
        for (const kind of ['arithmetic', 'symbols', 'cipher']) {
          const puzzle = generateDigitPuzzle(digit, kind, age, hashSeed(seed+':'+digit+':'+kind));
          assert.equal(puzzle.expectedDigit, digit);
          assert.equal(verifyDigitPuzzle(puzzle), true);
        }
      }
    }
  }
});
test('Gleicher Seed und Eingaben ergeben gleiche Rätsel', () => {
  const first = generateStationChallenge('station-3','007','older',4321);
  assert.deepEqual(generateStationChallenge('station-3','007','older',4321),first);
});
test('Manipulierte Rätsel und ungültige Codes werden abgewiesen', () => {
  assert.equal(validCode('007'),true);
  assert.equal(validCode('12'),false);
  assert.equal(validCode('1234'),false);
  assert.throws(()=>generateStationChallenge('one','12','young',4),/drei Ziffern/);
  const challenge = generateStationChallenge('one','987','older',4);
  challenge.puzzles[0].expectedDigit=(challenge.puzzles[0].expectedDigit+1)%10;
  assert.equal(verifyDigitPuzzle(challenge.puzzles[0]),false);
  assert.throws(()=>codeFromPuzzles(challenge),/Rätselprüfung/);
});

test('Wegrätsel bleiben je Seed gleich und verraten das festgelegte Ziel nicht als Klartext',()=>{
  for(const destination of ['Spielplatz','Wiese am Wasserbassin','Feuerwehrplatz','Zuhause','Burg']){
    for(const seed of [0,1,23,1000]){
      const clue=generateRoutePuzzle(destination,seed);
      assert.equal(clue.answer,destination);
      assert.deepEqual(generateRoutePuzzle(destination,seed),clue);
      assert.notEqual(clue.question,destination);
      if(clue.kind==='reverse') assert.equal([...clue.question].reverse().join(''),destination);
      else assert.equal(clue.question.length,destination.length);
    }
  }
  assert.throws(()=>generateRoutePuzzle('  ',1),/Zielort/);
});

test('Fragenrätsel Feuerwehr ergibt exakt das Lösungswort',()=>{
 const clue=generateCreativeRouteClue('Feuerwehr','Platz neben der Feuerwehr','questions',1);
 assert.equal(clue.rows.map(r=>r.solution[r.letterIndex]).join('').toUpperCase(),'FEUERWEHR');
});
test('Beschreibung verbirgt den Zielnamen und eigene Rätsel bleiben erhalten',()=>{
 const clue=generateCreativeRouteClue('Spielplatz','Spielplatz mit großer Rutsche und Schaukeln','description',1);
 assert.equal(clue.question.toLowerCase().includes('spielplatz'),false);
 assert.match(clue.question,/Rutsche/);
 const custom=generateCreativeRouteClue('Wiese','','custom',1,'Wo wächst das Gras?');
 assert.equal(custom.question,'Wo wächst das Gras?');
 assert.throws(()=>generateCreativeRouteClue('Wiese','','description',1),/Ortsbeschreibung/);
});

test('Alle hinterlegten Fragen ergeben ihre vorgesehenen Lösungsbuchstaben',()=>{
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 for(const letter of alphabet){
   const clue=generateCreativeRouteClue(letter,'','questions',123);
   assert.equal(clue.rows.length,1);
   const row=clue.rows[0];
   assert.equal(row.solution[row.letterIndex].toUpperCase(),letter);
 }
});
test('Wegrätsel für einen Zielort sind unabhängig von der Gruppe',()=>{
 const destination='Spielplatz';
 const seed=hashSeed('projekt:destination:loc-1');
 const a=generateCreativeRouteClue(destination,'Rutsche und Schaukeln','letters',seed);
 const b=generateCreativeRouteClue(destination,'Rutsche und Schaukeln','letters',seed);
 assert.deepEqual(a,b);
});

test('Fragenrätsel funktionieren auch bei Ortsnamen mit J, Q, X und Y',()=>{
 const clue=generateCreativeRouteClue('Jux-Quiz','','questions',42);
 assert.equal(clue.rows.map(r=>r.solution[r.letterIndex]).join('').toUpperCase(),'JUXQUIZ');
});

test('Fragenrätsel normalisieren Umlaute, Leerzeichen und ß',()=>{
 for(const name of ['Grüne Wiese','Schloßplatz','Äußere Höhle','Feuerwehr']){
  const clue=generateCreativeRouteClue(name,'','questions',73);
  assert.equal(verifyRouteQuestions(clue),true);
  assert.equal(clue.rows.map(r=>r.solution[r.letterIndex]).join('').toUpperCase(),normalizeSolutionWord(name));
 }
});
test('Wiederholte Buchstaben erhalten unterschiedliche geprüfte Fragen',()=>{
 const clue=generateCreativeRouteClue('AAAA','', 'questions',1);
 assert.equal(verifyRouteQuestions(clue),true);
 assert.ok(new Set(clue.rows.map(r=>r.question)).size>1);
});
test('Fragenrätsel sind reproduzierbar und variieren zwischen Projekten',()=>{
 const a=generateCreativeRouteClue('FEUERWEHR','','questions',123);
 assert.deepEqual(a,generateCreativeRouteClue('FEUERWEHR','','questions',123));
 assert.equal(verifyRouteQuestions(a),true);
 assert.equal(verifyRouteQuestions(generateCreativeRouteClue('FEUERWEHR','','questions',124)),true);
});

test('Fragenrätsel lehnen Ortsnamen mit Ziffern ab, statt die Ziffer zu verschlucken',()=>{
 assert.throws(()=>generateCreativeRouteClue('Station 2','','questions',1),/Ziffern/);
 const clue=generateCreativeRouteClue('Station 2','','letters',1);
 assert.equal(clue.answer,'Station 2');
});
test('Fragenvarianten liefern für verschiedene Seeds stets die richtigen Buchstaben',()=>{
 for(const name of ['FEUERWEHR','WIESE','SCHULHOF','SCHLOSS','GRUENE WIESE','ZIEL']){
  for(let seed=0;seed<40;seed++){
   const clue=generateCreativeRouteClue(name,'','questions',seed);
   assert.equal(verifyRouteQuestions(clue),true,name+' / '+seed);
  }
 }
});

test('Ortsbeschreibungen verbergen den Zielnamen unabhängig von Großschreibung',()=>{
 const clue=generateCreativeRouteClue('Spielplatz','Am SPIELPLATZ stehen Schaukeln. Der spielplatz hat eine Rutsche.','description',7);
 assert.equal(clue.question.toLocaleLowerCase('de').includes('spielplatz'),false);
 assert.match(clue.question,/Schaukeln/);
 assert.match(clue.question,/Rutsche/);
});

test('Altersgerechte Rechenvarianten ergeben bei vielen Seeds die richtige Ziffer',()=>{
 for(const age of ['young','middle','older']){
  for(let target=0;target<=9;target++){
   for(let seed=0;seed<100;seed++){
    const puzzle=generateDigitPuzzle(target,'arithmetic',age,seed);
    assert.equal(verifyDigitPuzzle(puzzle),true,age+'/'+target+'/'+seed);
   }
  }
 }
});
test('Einfache Buchstabenverschiebung für jüngere Kinder',()=>{
 for(let target=0;target<=9;target++){
  const puzzle=generateDigitPuzzle(target,'cipher','young',target+3);
  assert.match(puzzle.instruction,/um 1 Stelle/);
  assert.equal(verifyDigitPuzzle(puzzle),true);
 }
});
test('Ortsnamen mit gleichem Vorwärts- und Rückwärtstext verraten nicht die Lösung',()=>{
 for(const seed of [0,1,2,3,4,5]){
  const clue=generateRoutePuzzle('Anna',seed);
  assert.notEqual(clue.question,clue.answer);
  assert.equal(clue.kind,'missing-vowels');
 }
});

test('Eigene Ortsrätsel nennen den Zielort nicht ausdrücklich',()=>{const a=generateCreativeRouteClue('Wiese','','custom',1,'Geht zur WIESE.');assert.equal(verifyCreativeRouteClue(a),false);const b=generateCreativeRouteClue('Wiese','','custom',1,'Wo wachsen hohe Gräser?');assert.equal(verifyCreativeRouteClue(b),true);});

test('Kinder erhalten altersgerechte Rechenhilfen',()=>{const a=generateDigitPuzzle(7,'arithmetic','young',3);const b=generateDigitPuzzle(7,'arithmetic','older',3);assert.match(a.hint,/Fingern/);assert.match(b.hint,/Plus- und Minuszeichen/);assert.notEqual(a.hint,b.hint);});

test('Fragenrätsel akzeptieren ausschließlich geprüfte Fragen und Antworten',()=>{
 const clue=generateCreativeRouteClue('Spielplatz','', 'questions',hashSeed('approved-questions'));
 assert.equal(verifyRouteQuestions(clue),true);
 const changed={...clue,rows:clue.rows.map(row=>({...row}))};
 changed.rows[0].question='Eine andere Frage mit derselben Lösung?';
 assert.equal(verifyRouteQuestions(changed),false);
 assert.equal(verifyCreativeRouteClue(changed),false);
 const wrong={...clue,rows:clue.rows.map(row=>({...row}))};
 wrong.rows[0].solution='Erfundene Antwort';
 assert.equal(verifyRouteQuestions(wrong),false);
});

test('Wegrätsel vermeiden wiederholte Fragen, wenn alternative Aufgaben vorhanden sind',()=>{
 const clue=generateCreativeRouteClue('AAAA','', 'questions',hashSeed('question-variants'));
 assert.equal(verifyCreativeRouteClue(clue),true);
 assert.equal(new Set(clue.rows.slice(0,2).map(row=>row.question)).size,2);
 assert.equal(clue.rows.length,4);
});
test('Fragenbank deckt alle Buchstaben und deutsche Umlaute in Ortsnamen ab',()=>{
 for(const name of ['ABCDEFGHIJKLMNOPQRSTUVWXYZ','Ärger Öfen Überweg','Feuerwehr','Spielplatz']){
  const clue=generateCreativeRouteClue(name,'','questions',hashSeed(name));
  assert.equal(verifyCreativeRouteClue(clue),true,name);
  assert.equal(clue.rows.map(row=>row.solution[row.letterIndex].toUpperCase()).join(''),normalizeSolutionWord(name));
 }
});

test('Wegrätsel dürfen den Zielort nicht durch zusätzliche Leerzeichen oder Satzzeichen verraten',()=>{
 const destination='Wiese über der Sabine';
 assert.equal(clueRevealsDestination('Geht zur Wiese, über der Sabine!',destination),true);
 assert.equal(clueRevealsDestination('Geht zur Wiese   über der Sabine!',destination),true);
 assert.equal(clueRevealsDestination('Die hohe Wiese am Waldrand',destination),false);
 const custom=generateCreativeRouteClue(destination,'','custom',7,'Geht zur Wiese, über der Sabine!');
 assert.equal(verifyCreativeRouteClue(custom),false);
});

test('Zielortprüfung unterscheidet vollständige Wörter von Teilwörtern',()=>{assert.equal(clueRevealsDestination('Am Motor steht ein Hinweis','Tor'),false);assert.equal(clueRevealsDestination('Geht zum Tor!','Tor'),true);assert.equal(clueRevealsDestination('Zum Feuerwehr-Platz gehen','Feuerwehr Platz'),true);assert.equal(clueRevealsDestination('Zur Feuerwehrplatz-Rutsche','Feuerwehrplatz'),true);assert.equal(clueRevealsDestination('Zum Sportplatz laufen','Ort'),false);});

test('Wegrätsel erkennen Zielort auch mit Umlautumschreibung und unsichtbaren Zeichen',()=>{
 const destination='Wiese über der Sabine';
 assert.equal(clueRevealsDestination('Geht zur Wiese ueber der Sabine.',destination),true);
 assert.equal(clueRevealsDestination('Geht zur Wiese über der Sabine.',destination),true);
 assert.equal(clueRevealsDestination('Geht zur Wiese über der Sa\u200Bbine.',destination),true);
 assert.equal(clueRevealsDestination('Geht zur Wiese am Waldrand.',destination),false);
 const clue=generateCreativeRouteClue(destination,'','custom',1,'Geht zur Wiese ueber der Sabine.');
 assert.equal(verifyCreativeRouteClue(clue),false);
});

test('Zielort bleibt bei Bindestrichen, Zusammenschreibung und getrennten Wörtern geheim',()=>{
 const cases=[
  ['Zur Feuerwehr-Platz-Ecke gehen','Feuerwehrplatz',true],
  ['Zur Feuerwehrplatz-Ecke gehen','Feuerwehr Platz',true],
  ['Die Wiese-ueber-der-Sabine besuchen','Wiese über der Sabine',true],
  ['Der Sportplatz ist weit weg','Ort',false],
  ['Der Motor läuft','Tor',false],
  ['An der Feuerwehr vorbeigehen','Feuerwehrplatz',false],
  ['Am Waldplatz stehen','Wald',false]
 ];
 for(const [hint,destination,expected] of cases) assert.equal(clueRevealsDestination(hint,destination),expected,hint+' / '+destination);
 const clue=generateCreativeRouteClue('Feuerwehrplatz','','custom',12,'Zur Feuerwehr-Platz-Ecke gehen');
 assert.equal(verifyCreativeRouteClue(clue),false);
});

test('Beschreibungsrätsel sperren getarnte Zielnamen vor dem Drucken',()=>{
 for(const disguised of ['Feuer-Wehr','FEUER WEHR','Feuer…Wehr']){
  assert.throws(()=>generateCreativeRouteClue('Feuerwehr',disguised+' neben dem großen Parkplatz','description',1),/verrät den Zielnamen/);
 }
 const valid=generateCreativeRouteClue('Feuerwehr','Platz mit Kies und einem roten Tor','description',1);
 assert.equal(verifyCreativeRouteClue(valid),true);
});

test('Alle 26 Buchstaben ergeben für viele Seeds korrekte Ziel-Fragen',()=>{
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 for(let seed=0;seed<100;seed++){
  for(const letter of alphabet){
   const clue=generateCreativeRouteClue(letter,'','questions',seed);
   assert.equal(verifyCreativeRouteClue(clue),true,letter+' seed '+seed);
   assert.equal(clue.rows[0].solution[clue.rows[0].letterIndex].toUpperCase(),letter);
  }
 }
});

test('Lange Zielnamen bleiben reproduzierbar und in korrekter Reihenfolge',()=>{
 for(const destination of ['Wiese über der Sabine','Schotterplatz neben der Feuerwehr','Graswald Schlittenhang','Äußere Höhle am Bach']){
  for(const mode of ['questions','letters']){
   const clue=generateCreativeRouteClue(destination,'',mode,123);
   assert.equal(verifyCreativeRouteClue(clue),true,destination+' '+mode);
   assert.deepEqual(generateCreativeRouteClue(destination,'',mode,123),clue);
  }
 }
});

test('Fragenblatt mit Klartext-Ziel ist nicht druckfähig',()=>{
 const clue=generateCreativeRouteClue('Feuerwehr','','questions',19);
 clue.rows[0].question='Feuerwehr';
 assert.equal(verifyCreativeRouteClue(clue),false);
});

test('Jüngere Kinder lösen dreistellige Codes ohne Buchstabenverschiebung',()=>{
 for(const code of ['000','007','123','987','999']){
  const challenge=generateStationChallenge('station-young',code,'young',2026);
  assert.ok(challenge.puzzles.every(p=>p.kind!=='cipher'));
  assert.equal(codeFromPuzzles(challenge),code);
 }
 const older=generateStationChallenge('station-older','007','middle',2026);
 assert.ok(older.puzzles.every(verifyDigitPuzzle));
});

test('Alle 1000 Schlosskombinationen bleiben für jüngere Kinder lösbar',()=>{
 for(let number=0;number<1000;number++){
  const code=String(number).padStart(3,'0');
  const result=generateStationChallenge('young-station',code,'young',42);
  assert.equal(codeFromPuzzles(result),code);
  assert.equal(result.puzzles.some(p=>p.kind==='cipher'),false);
  assert.ok(result.puzzles.every(verifyDigitPuzzle));
 }
});

test('Manipulierte Symbolrätsel ohne sichtbares Zählzeichen werden abgelehnt',()=>{
 const puzzle=generateDigitPuzzle(4,'symbols','young',17);
 assert.equal(verifyDigitPuzzle(puzzle),true);
 puzzle.render.symbol='   ';
 assert.equal(verifyDigitPuzzle(puzzle),false);
 puzzle.render.symbol='ABCDE';
 assert.equal(verifyDigitPuzzle(puzzle),false);
});

test('Ältere Kinder erhalten keine Rechnung mit negativer Subtraktionszahl',()=>{
 for(let digit=0;digit<=9;digit++) for(let seed=0;seed<300;seed++){
  const puzzle=generateDigitPuzzle(digit,'arithmetic','older',seed);
  assert.ok(verifyDigitPuzzle(puzzle));
  assert.ok((puzzle.question.match(/[+−]/g)??[]).length>=3);
  assert.doesNotMatch(puzzle.question,/− -/);
 }
});

test('Buchstabe C ist ohne englische Vorkenntnisse lösbar',()=>{
 const clue=generateCreativeRouteClue('Clown','', 'questions', 17);
 assert.equal(clue.answer,'Clown');
 assert.ok(verifyCreativeRouteClue(clue));
});

test('Eigene Wegrätsel haben eine maximale Länge',()=>{
 assert.throws(()=>generateCreativeRouteClue('Spielplatz','','custom',1,'A'.repeat(401)),/400 Zeichen/);
 assert.equal(generateCreativeRouteClue('Spielplatz','','custom',1,'A'.repeat(400)).question.length,400);
});

test('Druckprüfung erkennt zu lange eigene Rätsel auch nach Änderung',()=>{
 const clue=generateCreativeRouteClue('Spielplatz','','custom',1,'Hinweis zur Schaukel');
 assert.equal(verifyCreativeRouteClue(clue),true);
 assert.equal(verifyCreativeRouteClue({...clue,question:'X'.repeat(401)}),false);
});

test('Zahlwort-Suchgitter: alle Ziffern, Altersstufen, deterministisch und überprüfbar',()=>{
 for(const age of ['young','middle','older']) for(const digit of [0,1,2,3,4,5,6,7,8,9]) for(const seed of [0,1,17,999]){
  const puzzle=generateDigitPuzzle(digit,'wordsearch',age,seed);
  assert.equal(puzzle.expectedDigit,digit);
  assert.equal(puzzle.wordGrid.rows.length,age==='young'?8:age==='middle'?10:11);
  assert.equal(verifyDigitPuzzle(puzzle),true);
  assert.deepEqual(generateDigitPuzzle(digit,'wordsearch',age,seed),puzzle);
  const tampered=structuredClone(puzzle);
  const g=tampered.wordGrid;
  const r=g.startRow,c=g.startCol;
  g.rows[r]=g.rows[r].slice(0,c)+(g.rows[r][c]==='Z'?'A':'Z')+g.rows[r].slice(c+1);
  assert.equal(verifyDigitPuzzle(tampered),false);
 }
});
test('Stationsrätsel mischen Zahlwortgitter und bestehende Rätsel ohne falsche Schlossziffern',()=>{
 let wordsearchCount=0;
 for(let i=0;i<100;i++){
  const challenge=generateStationChallenge('s'+i,'007','older',i);
  wordsearchCount+=challenge.puzzles.filter(p=>p.kind==='wordsearch').length;
  assert.equal(codeFromPuzzles(challenge),'007');
 }
 assert.ok(wordsearchCount>0);
});

test('Pfeilpfade ergeben in jeder Altersstufe exakt die Schlossziffer',()=>{
 for(const age of ['young','middle','older']) for(let digit=0;digit<10;digit++) for(const seed of [0,1,13,97]){
  const p=generateDigitPuzzle(digit,'arrowpath',age,seed);
  assert.equal(verifyDigitPuzzle(p),true);
  assert.deepEqual(generateDigitPuzzle(digit,'arrowpath',age,seed),p);
  const changed=structuredClone(p);
  changed.arrowGrid.arrows+='X';
  assert.equal(verifyDigitPuzzle(changed),false);
 }
});
test('A5-Gitterrätsel zeigt für jede Antwort genau ein hervorgehobenes Lösungsfeld',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('route-answer-grid'));
 assert.ok(source.includes('index===r.letterIndex'));
 assert.ok(source.includes('route-answer-highlight'));
});

test('Zahlenfolgen sind für jede Codeziffer und Altersstufe eindeutig prüfbar',()=>{
 for(const age of ['young','middle','older']) for(let digit=0;digit<=9;digit++) for(const seed of [0,1,2,7,91]){
  const p=generateDigitPuzzle(digit,'sequence',age,seed);
  assert.equal(verifyDigitPuzzle(p),true);
  assert.equal(p.expectedDigit,digit);
  assert.deepEqual(generateDigitPuzzle(digit,'sequence',age,seed),p);
  const invalid={...p,question:p.question.replace('  ·  ?', '  ·  5')};
  assert.equal(verifyDigitPuzzle(invalid),false);
 }
});

test('Suchgitter enthalten genau ein Zahlwort und keine unbeabsichtigten Alternativziffern',()=>{
 for(const age of ['young','middle','older']) for(let digit=0;digit<10;digit++) for(let seed=0;seed<100;seed++){
  const p=generateDigitPuzzle(digit,'wordsearch',age,seed);
  const found=findDigitWords(p.wordGrid.rows);
  assert.equal(found.length,1,age+':'+digit+':'+seed);
  assert.equal(found[0].digit,digit);
  assert.equal(verifyDigitPuzzle(p),true);
 }
});
test('Referenzspiel deckt alle sechs Schlossrätselarten mit gültigen Codes ab',()=>{
 const kinds=new Set();
 const codes=['007','000','123','987'];
 for(let station=0;station<120;station++){
  const challenge=generateStationChallenge('reference-'+station,codes[station%4],station%3===0?'young':station%3===1?'middle':'older',314159);
  assert.equal(codeFromPuzzles(challenge),codes[station%4]);
  assert.equal(challenge.puzzles.length,3);
  challenge.puzzles.forEach(p=>kinds.add(p.kind));
 }
 assert.deepEqual([...kinds].sort(),['arithmetic','arrowpath','cipher','sequence','symbols','wordsearch']);
});

test('Pfeilpfade haben auch bei schwierigen Seeds immer die volle altersgerechte Länge',()=>{
 for(const [age,length] of [['young',3],['middle',7],['older',9]]) for(let digit=0;digit<10;digit++) for(let seed=0;seed<120;seed++){
  const p=generateDigitPuzzle(digit,'arrowpath',age,seed);
  assert.equal([...p.arrowGrid.arrows].length,length);
  assert.equal(verifyDigitPuzzle(p),true);
 }
});
test('Unbekannte Rätselarten werden nicht stillschweigend als Geheimschrift erzeugt',()=>{
 assert.throws(()=>generateDigitPuzzle(5,'unknown','middle',12),/Unbekannte Rätselart/);
});

test('Manipulierte Schloss-Pakete mit fehlender Aufgabe oder abweichendem Code werden gesperrt',()=>{
 const original=generateStationChallenge('s-lock','007','middle',121);
 assert.equal(codeFromPuzzles(original),'007');
 assert.throws(()=>codeFromPuzzles({...original,puzzles:original.puzzles.slice(0,2)}),/Rätselprüfung/);
 assert.throws(()=>codeFromPuzzles({...original,code:'008'}),/Schloss-Code/);
 assert.throws(()=>codeFromPuzzles({...original,code:'07'}),/Rätselprüfung/);
});

test('Geheime Funkpost: Hinweise verraten keine Klartextbuchstaben',()=>{
 for(const age of ['middle','older'])for(let digit=0;digit<=9;digit++){
  const puzzle=generateDigitPuzzle(digit,'cipher',age,hashSeed('hint:'+age+':'+digit));
  assert.equal(verifyDigitPuzzle(puzzle),true);
  assert.match(puzzle.hint,/Alphabet/);
  assert.doesNotMatch(puzzle.hint,/Der erste Buchstabe lautet/);
  assert.ok(!puzzle.hint.includes(puzzle.explanation.split(' bedeutet ')[1]??'NO-SOLUTION'));
 }
});

test('Zero-digit lock codes never ask children to count an empty symbol box',()=>{
 for(const age of ['young','middle','older'])for(let seed=0;seed<160;seed++){
  const challenge=generateStationChallenge('zero-station','000',age,seed);
  assert.equal(codeFromPuzzles(challenge),'000');
  assert.ok(challenge.puzzles.every(puzzle=>puzzle.kind!=='symbols'));
  assert.ok(challenge.puzzles.every(verifyDigitPuzzle));
 }
});

test('Arrow paths remain in bounds and visit unique adjacent cells for all age levels',()=>{
 const moves={'→':[0,1],'←':[0,-1],'↓':[1,0],'↑':[-1,0]};
 for(const age of ['young','middle','older'])for(let seed=0;seed<120;seed++){
  const target=seed%10;
  const puzzle=generateDigitPuzzle(target,'arrowpath',age,hashSeed('arrow-boundary:'+age+':'+seed));
  assert.equal(verifyDigitPuzzle(puzzle),true);
  const grid=puzzle.arrowGrid;
  let row=grid.startRow,col=grid.startCol;
  const visited=new Set([row+':'+col]);
  for(const arrow of grid.arrows){
   const [dr,dc]=moves[arrow];row+=dr;col+=dc;
   assert.ok(row>=0&&col>=0&&row<grid.rows.length&&col<grid.rows.length);
   assert.ok(!visited.has(row+':'+col),'Arrow path must not revisit a cell');
   visited.add(row+':'+col);
  }
  assert.equal(Number(grid.rows[row][col]),target);
 }
});

test('Arrow verifier rejects a repeated cell even when the final digit matches',()=>{
 const original=generateDigitPuzzle(7,'arrowpath','young',hashSeed('arrow-tamper'));
 assert.equal(verifyDigitPuzzle(original),true);
 const rows=Array.from({length:5},()=> '77777');
 const repeated={...original,question:'→ ← →',arrowGrid:{rows,startRow:2,startCol:2,arrows:'→←→'}};
 assert.equal(verifyDigitPuzzle(repeated),false);
 const invalidStart={...original,arrowGrid:{...original.arrowGrid,startRow:-1}};
 assert.equal(verifyDigitPuzzle(invalidStart),false);
});

test('Cipher verifier rejects zero and full-alphabet shifts that reveal the answer',()=>{
 const original=generateDigitPuzzle(7,'cipher','older',hashSeed('cipher-shift-hardening'));
 assert.equal(verifyDigitPuzzle(original),true);
 for(const shift of [0,26,52]){
  const tampered={...original,instruction:original.instruction.replace(/um \d+ Stelle(?:n)?/,'um '+shift+' Stellen'),question:'SIEBEN'};
  assert.equal(verifyDigitPuzzle(tampered),false,'shift '+shift+' must not be accepted');
 }
});

test('Wordsearch verifier rejects unsupported grid sizes without losing valid age grids',()=>{
 for(const age of ['young','middle','older']){
  const puzzle=generateDigitPuzzle(4,'wordsearch',age,hashSeed('grid-dimensions:'+age));
  assert.equal(verifyDigitPuzzle(puzzle),true);
  const original=puzzle.wordGrid;
  const extra={...puzzle,wordGrid:{...original,rows:[...original.rows,original.rows[0]]}};
  assert.equal(verifyDigitPuzzle(extra),false);
  const empty={...puzzle,wordGrid:{...original,rows:[]}};
  assert.equal(verifyDigitPuzzle(empty),false);
 }
});


test('Zahlenfolgen für 8- bis 10-Jährige zeigen vier Ausgangszahlen mit einem deutlichen Rechenschritt',()=>{
 for(let target=0;target<=9;target++) for(let seed=0;seed<20;seed++){
  const puzzle=generateDigitPuzzle(target,'sequence','middle',seed+target*20);
  const parts=puzzle.question.split('  ·  ');
  assert.equal(parts.length,5);
  assert.equal(parts[4],'?');
  const values=parts.slice(0,4).map(Number);
  const steps=values.slice(1).map((value,index)=>value-values[index]);
  assert.ok(steps.every(step=>step===steps[0]&&Math.abs(step)>=2));
  assert.equal(values[3]+steps[0],target);
  assert.equal(verifyDigitPuzzle(puzzle),true);
 }
});

test('Zählrätsel für 8- bis 10-Jährige mischen 16 Zeichen und ergeben eindeutig die gesuchte Ziffer',()=>{
 for(let target=0;target<=9;target++) for(let seed=0;seed<20;seed++){
  const puzzle=generateDigitPuzzle(target,'symbols','middle',seed+target*20);
  assert.equal(puzzle.render.items.length,16);
  assert.equal(puzzle.render.items.filter(item=>item===puzzle.render.symbol).length,target);
  assert.ok(puzzle.render.items.some(item=>item!==puzzle.render.symbol));
  assert.equal(verifyDigitPuzzle(puzzle),true);
 }
});

test('Neue Spiele wählen Textbeschreibungen und die Wiese beschreibt Blumen statt Bäume',()=>{
 const config=createDefaultGameConfig();
 assert.ok(Object.values(config.routeClueModes).every(mode=>mode==='description'));
 assert.match(config.locations.find(location=>location.name==='Wiese').description,/Blumen/i);
 assert.doesNotMatch(config.locations.find(location=>location.name==='Wiese').description,/Bäume|Häuser/i);
});

test('Altersgruppen decken den Zweijahresrhythmus bis 14+ und optional 18+ ab',()=>{
 assert.deepEqual(AGE_GROUPS,['4–6','6–8','8–10','10–12','12–14','14+','18+']);
 assert.deepEqual(AGE_GROUPS.map(ageLevelFor),['young','early','middle','older','advanced','expert','adult']);
});

test('Text-Wegrätsel formt Ortsmerkmale aus einer Liste zu einem lesbaren Hinweis',()=>{
 const clue=generateCreativeRouteClue('Spielplatz','Schaukeln, Rutsche, Klettergerüst','description',11);
 assert.equal(clue.question,'Besondere Merkmale: Schaukeln, Rutsche und Klettergerüst. Welcher Ort passt zu diesem Text?');
 assert.equal(verifyCreativeRouteClue(clue),true);
});

test('Die optionalen Erwachsenen erhalten eine eigene Altersstufe und Schwierigkeitsklasse',()=>{
 assert.deepEqual(AGE_GROUPS,['4–6','6–8','8–10','10–12','12–14','14+','18+']);
 assert.deepEqual(AGE_GROUPS.map(ageLevelFor),['young','early','middle','older','advanced','expert','adult']);
});

test('Zählrätsel für 6- bis 8-Jährige mischen mehrere Zeichen und bleiben eindeutig',()=>{
 for(let target=0;target<=9;target++){
  const p=generateDigitPuzzle(target,'symbols','early',target+610);
  assert.ok(p.render.items.length>16);
  assert.ok(new Set(p.render.items).size>=3);
  assert.equal(p.render.items.filter(item=>item===p.render.symbol).length,target);
  assert.equal(verifyDigitPuzzle(p),true);
 }
});

test('Rechenaufgaben ab 10 Jahren enthalten mindestens vier sinnvolle Rechenschritte',()=>{
 for(const age of ['older','advanced','expert','adult']) for(let target=0;target<=9;target++){
  const p=generateDigitPuzzle(target,'arithmetic',age,target+100);
  assert.ok((p.question.match(/[+−]/g)??[]).length>=3,p.question);
  assert.doesNotMatch(p.question,/(\d+)\s*([+−])\s*\1/,p.question);
  assert.equal(verifyDigitPuzzle(p),true,p.question);
 }
});

test('Zahlfolgen und Pfeilpfade wachsen bis zur Erwachsenenstufe weiter',()=>{
 const lengths=[];
 for(const age of ['young','early','middle','older','advanced','expert','adult']){
  const path=generateDigitPuzzle(7,'arrowpath',age,777);
  lengths.push(path.arrowGrid.arrows.length);
  assert.equal(verifyDigitPuzzle(path),true);
 }
 assert.deepEqual(lengths,[3,5,7,9,11,13,15]);
});

test('Geheimschrift ab 14+ erklärt die Verschiebung mit einem Beispiel statt Alphabettabelle',()=>{
 for(const age of ['expert','adult']){
  const p=generateDigitPuzzle(8,'cipher',age,1234);
  assert.ok(p.workedExample);
  assert.equal(verifyDigitPuzzle(p),true);
 }
});
