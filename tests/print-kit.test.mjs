import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../src/generator.ts';
import { createPrintKit, routeClueKey, expectedClueTarget } from '../src/print-kit.ts';
import * as printKitModule from '../src/print-kit.ts';

const locations = [
  {id:'a', name:'Spielplatz', description:''},
  {id:'b', name:'Wiese', description:''},
  {id:'c', name:'Feuerwehrplatz', description:''},
];
const config = {
  players:6,groupSize:3,durationMinutes:80,age:'8–10',goal:'locks',locations,
  puzzleMinutes:10,walkingMinutes:3,startFinishMinutes:10,
  startMode:'distributed',routeMode:'same',finishMode:'meeting',meetingPoint:'Treffpunkt',
};
function validClues(plan) {
  const clues = {};
  plan.teams.forEach((team, ti) => team.stations.forEach((station, si) => {
    clues[routeClueKey(ti,si)] = {
      to: expectedClueTarget(team.stations,si,team.finish),
      text: 'Folge dem geheimen Weg und löse die nächste Aufgabe ' + ti + '-' + si,
    };
  }));
  return clues;
}
test('Vollständiger Drucksatz: zwei getrennte Kinderkarten je Besuch, passende Reihenfolge, keine Codes auf Kinderkarten', () => {
  const plan=createPlan(config);
  const codes={a:'007',b:'0007',c:'123'};
  const kit=createPrintKit(plan,codes,validClues(plan),'middle',987);
  const visits=plan.teams.reduce((n,t)=>n+t.stations.length,0);
  assert.deepEqual(kit.issues,[]);
  assert.equal(kit.cards.length,visits*2);
  assert.equal(kit.leaderRows.length,visits);
  assert.equal(kit.sheetCount,visits);
  assert.equal(kit.cards[0].kind,'puzzle');
  assert.equal(kit.cards[1].kind,'clue');
  assert.equal(kit.leaderRows[0].code,codes[plan.teams[0].stations[0].id]);
  assert.equal(kit.leaderRows.find(r=>r.station==='Wiese')?.code,'0007');
  for (const card of kit.cards) {
    assert.equal('code' in card,false);
    assert.equal('expectedDigit' in card,false);
    assert.equal('solutions' in card,false);
    if (card.kind==='puzzle') {
      assert.equal(card.puzzles.every(p=>!('expectedDigit' in p) && !('explanation' in p)),true);
    }
  }
});
test('Unvollständige Codes oder falsche bzw. direkt verratende Hinweise blockieren den gesamten Ausdruck', () => {
  const plan=createPlan(config);
  const codes={a:'007',b:'0007',c:'123'};
  const clues=validClues(plan);
  const missing=createPrintKit(plan,{...codes,b:'00'},clues,'middle',987);
  assert.equal(missing.cards.length,0);
  assert.ok(missing.issues.some(x=>x.includes('Schloss-Code')));
  const key=routeClueKey(0,0);
  const wrong=createPrintKit(plan,codes,{...clues,[key]:{to:'falsch',text:'Geheimweg'}},'middle',987);
  assert.equal(wrong.cards.length,0);
  assert.ok(wrong.issues.some(x=>x.includes('Hinweis')));
  const target=plan.teams[0].stations[1]?.name ?? plan.teams[0].finish;
  const leaked=createPrintKit(plan,codes,{...clues,[key]:{...clues[key],text:'Gehe direkt zur '+target}},'middle',987);
  assert.equal(leaked.cards.length,0);
  assert.ok(leaked.issues.some(x=>x.includes('direkt')));
});
test('Einzelstation, getrennte Starts und vierstellige Codes bleiben deterministisch', () => {
  const plan=createPlan({...config,locations:[locations[0]],players:4,groupSize:1,startMode:'shared'});
  const codes={a:'0000'};
  const clues=validClues(plan);
  const first=createPrintKit(plan,codes,clues,'young',0);
  const second=createPrintKit(plan,codes,clues,'young',0);
  assert.deepEqual(first,second);
  assert.equal(first.leaderRows.length,4);
  assert.equal(first.cards.filter(c=>c.kind==='puzzle').every(c=>c.puzzles.length===4),true);
});

test('Ungerade Besuchszahl: getrennte Rätsel- und Hinweisbögen mit je einer leeren Hälfte', () => {
  const plan = createPlan({...config, players:3});
  const kit = createPrintKit(plan, {a:'007',b:'0007',c:'123'}, validClues(plan), 'middle', 987);
  assert.equal(kit.sheetCount, 4);
  const sheets = printKitModule.createChildSheets(kit.cards);
  assert.deepEqual(sheets.map(s => s.map(c => c.kind)), [['puzzle','puzzle'],['puzzle'],['clue','clue'],['clue']]);
  assert.deepEqual(sheets.flat().filter(c => c.kind === 'puzzle'), kit.cards.filter(c => c.kind === 'puzzle'));
  assert.deepEqual(sheets.flat().filter(c => c.kind === 'clue'), kit.cards.filter(c => c.kind === 'clue'));
  assert.deepEqual(printKitModule.createChildSheets([]), []);
});

test('Wortteile lösen keinen Fehlalarm aus; vollständige Zielnamen bleiben gesperrt', () => {
  for (const [target, harmless, leaked] of [
    ['Wald', 'Folgt dem Waldweg.', 'Geht in den WALD!'],
    ['Bank', 'Sucht die Sandbank.', 'Sucht die Bank.'],
    ['Ähre', 'Zählt die Ähren.', 'Sucht die ÄHRE.'],
    ['Tor (alt)', 'Sucht den nächsten Hinweis.', 'Sucht Tor (alt)!'],
  ]) {
    const plan = createPlan({...config, players:3, meetingPoint:target});
    const clues = validClues(plan);
    const key = routeClueKey(0, plan.teams[0].stations.length - 1);
    const kitFor = text => createPrintKit(plan, {a:'007',b:'0007',c:'123'}, {...clues,[key]:{...clues[key],text}}, 'middle',987);
    assert.deepEqual(kitFor(harmless).issues, [], target);
    assert.ok(kitFor(leaked).issues.some(x => x.includes('direkt')), target);
  }
});

const commonClues = {
  'station:a':'Sucht die Geräte zum Klettern.',
  'station:b':'Sucht die große grüne Fläche.',
  'station:c':'Sucht die roten Einsatzfahrzeuge.',
  'finish:Treffpunkt':'Eure Begleitung wartet am vereinbarten Ort.',
};
test('Gemeinsame Hinweise werden dem tatsächlichen Ziel aller Teams zugeordnet', () => {
  const plan=createPlan({...config,players:12});
  const kit=createPrintKit(plan,{a:'007',b:'0007',c:'123'},{},'middle',987,commonClues);
  assert.deepEqual(kit.issues,[]);
  assert.equal(kit.leaderRows.length,12);
  plan.teams.forEach((team,ti)=>team.stations.forEach((_,si)=>{
    const key=team.stations[si+1]?'station:'+team.stations[si+1].id:'finish:'+team.finish;
    assert.equal(kit.leaderRows[ti*3+si].clue,commonClues[key]);
  }));
  assert.equal(printKitModule.clueDestinations(plan).length,4);
  assert.equal(printKitModule.clueDestinations(plan).reduce((n,x)=>n+x.visits,0),12);
});
test('Individueller Hinweis hat Vorrang; veralteter oder leerer Hinweis blockiert trotz Standard', () => {
  const plan=createPlan(config);
  const to=expectedClueTarget(plan.teams[0].stations,0,plan.teams[0].finish);
  const kitFor=override=>createPrintKit(plan,{a:'007',b:'0007',c:'123'},override,'middle',987,commonClues);
  const custom=kitFor({'0:0':{to,text:'Nur euer Team erhält diese besondere Spur.'}});
  assert.deepEqual(custom.issues,[]);
  assert.equal(custom.leaderRows[0].clue,'Nur euer Team erhält diese besondere Spur.');
  assert.equal(kitFor({'0:0':{to:'altes-ziel',text:'Alter Hinweis'}}).cards.length,0);
  assert.equal(kitFor({'0:0':{to,text:''}}).cards.length,0);
  assert.equal(kitFor({}).leaderRows[0].clue,commonClues['station:b']);
});
test('Gemeinsame Hinweise unterliegen derselben Druckvorprüfung', () => {
  const plan=createPlan(config);
  for (const text of ['', 'Geht zur Wiese.', 'x'.repeat(241)]) {
    const kit=createPrintKit(plan,{a:'007',b:'0007',c:'123'},{},'middle',987,{...commonClues,'station:b':text});
    assert.ok(kit.issues.length>0);
    assert.equal(kit.cards.length,0);
  }
});
test('Station und Finale haben getrennte Schlüssel; geändertes Finale erbt keinen alten Hinweis', () => {
  const plan=createPlan({...config,meetingPoint:'Wiese'});
  const kit=createPrintKit(plan,{a:'007',b:'0007',c:'123'},{},'middle',987,commonClues);
  assert.equal(kit.cards.length,0);
  const destinations=printKitModule.clueDestinations(plan);
  assert.ok(destinations.some(x=>x.key==='station:b'&&!x.isFinal));
  assert.ok(destinations.some(x=>x.key==='finish:Wiese'&&x.isFinal));
});
