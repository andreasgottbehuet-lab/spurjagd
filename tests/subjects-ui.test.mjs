import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { messages } from '../src/i18n.ts';
import { SUBJECTS } from '../src/question-bank.ts';
import { isGameConfig } from '../src/project-storage.ts';

const base={players:6,groupSize:3,durationMinutes:60,age:'middle',goal:'locks',puzzleMinutes:5,walkingMinutes:5,startFinishMinutes:5,startMode:'shared',routeMode:'same',finishMode:'origin',meetingPoint:'',locations:[{id:'a',name:'A',description:''}]};
test('Fächer: Texte in beiden Sprachen und Speicherung validiert',()=>{
  for(const l of ['de','en']){
    assert.ok(messages[l].subjects&&messages[l].subjectsHint);
    for(const s of SUBJECTS) assert.ok(messages[l].subjectNames[s]);
  }
  assert.equal(isGameConfig(base),true);
  assert.equal(isGameConfig({...base,subjects:['Physik']}),true);
  assert.equal(isGameConfig({...base,subjects:[...SUBJECTS]}),true);
  assert.equal(isGameConfig({...base,subjects:[]}),false);
  assert.equal(isGameConfig({...base,subjects:['Latein']}),false);
  assert.equal(isGameConfig({...base,subjects:['Physik','Physik']}),false);
  const src=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  assert.match(src,/useState<Subject\[\]>\(\[\.\.\.SUBJECTS\]\)/);
});
