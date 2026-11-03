import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
});
after(() => browser.close());
const config = {
  players:3,groupSize:3,durationMinutes:90,age:'8–10',goal:'locks',
  locations:[{id:'loc-12',name:'Spielplatz',description:''},{id:'loc-2',name:'Wiese',description:''}],
  puzzleMinutes:10,walkingMinutes:3,startFinishMinutes:10,
  startMode:'shared',routeMode:'same',finishMode:'meeting',meetingPoint:'Treffpunkt',
  stationCodes:{'loc-12':'0007','loc-2':'007'},puzzleSeed:987,
  routeClues:{'0:0':{to:'loc-2',text:'Sucht die grüne Fläche.'},'0:1':{to:'@finish:Treffpunkt',text:'Eure Begleitung erwartet euch.'}},
};
const project = (id,title) => ({version:1,id,title,updatedAt:'2026-11-03T14:00:00Z',config:structuredClone(config)});
async function fixture(t) {
  const context=await browser.newContext({acceptDownloads:true});
  t.after(()=>context.close());
  const page=await context.newPage();
  await page.addInitScript(games=>{
    if(!sessionStorage.getItem('test-initialized')){
      localStorage.setItem('spurjagd-projects-v1',JSON.stringify(games));
      localStorage.setItem('spurjagd-active-project-v1','a');
      sessionStorage.setItem('test-initialized','yes');
    }
  },[project('a','Projekt A'),project('b','Projekt B')]);
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5174');
  await page.locator('#projectTitle').filter({visible:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('#projectTitle')?.value==='Projekt A');
  return page;
}
const saved = page => page.evaluate(()=>JSON.parse(localStorage.getItem('spurjagd-projects-v1')));

test('Schneller Projektwechsel erhält die letzte Eingabe',async t=>{
  const page=await fixture(t);
  await page.locator('#projectTitle').fill('A zuletzt geändert');
  await page.locator('#savedProjects').selectOption('b');
  assert.equal((await saved(page)).find(x=>x.id==='a').title,'A zuletzt geändert');
  assert.equal(await page.locator('#projectTitle').inputValue(),'Projekt B');
  await page.locator('#savedProjects').selectOption('a');
  assert.equal(await page.locator('#projectTitle').inputValue(),'A zuletzt geändert');
});
test('Neues Projekt verliert keine gerade bearbeiteten Daten',async t=>{
  const page=await fixture(t);
  await page.locator('#projectTitle').fill('A vor Neu');
  await page.getByRole('button',{name:'Neu',exact:true}).dispatchEvent('click');
  assert.equal((await saved(page)).find(x=>x.id==='a').title,'A vor Neu');
  assert.equal(await page.locator('#projectTitle').inputValue(),'Neue Schnitzeljagd');
});
test('Sofortiges Neuladen erhält gültige Änderungen',async t=>{
  const page=await fixture(t);
  await page.locator('#projectTitle').fill('A vor Reload');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#projectTitle')?.value!=='Meine Schnitzeljagd');
  assert.equal(await page.locator('#projectTitle').inputValue(),'A vor Reload');
});
test('Unvollständige Ortsdaten verhindern einen verlustbehafteten Projektwechsel',async t=>{
  const page=await fixture(t);
  await page.getByRole('button',{name:'02 Standorte'}).click();
  await page.getByRole('button',{name:'Standort hinzufügen'}).click();
  await page.locator('#savedProjects').selectOption('b');
  assert.equal(await page.locator('#projectTitle').inputValue(),'Projekt A');
  assert.equal(await page.locator('#savedProjects').inputValue(),'a');
  assert.equal(await page.locator('.location-card').count(),3);
  assert.match(await page.locator('.storage-message').innerText(),/nicht gespeichert|fehlgeschlagen/i);
});
test('Speicherfehler verhindern Wechsel und behalten die Eingabe',async t=>{
  const page=await fixture(t);
  await page.evaluate(()=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key==='spurjagd-projects-v1')throw new DOMException('Test: Speicher voll','QuotaExceededError');
      return original.call(this,key,value);
    };
  });
  await page.locator('#projectTitle').fill('Ungesicherte Eingabe');
  await page.locator('#savedProjects').selectOption('b');
  assert.equal(await page.locator('#projectTitle').inputValue(),'Ungesicherte Eingabe');
  assert.equal((await saved(page)).find(x=>x.id==='a').title,'Projekt A');
  assert.match(await page.locator('.storage-message').innerText(),/nicht gespeichert|fehlgeschlagen/i);
});
test('Neue Stationen kollidieren nicht mit importierten IDs',async t=>{
  const page=await fixture(t);
  await page.getByRole('button',{name:'02 Standorte'}).click();
  await page.getByRole('button',{name:'Standort hinzufügen'}).click();
  await page.getByLabel('Name des Ortes',{exact:true}).nth(2).fill('Brunnen');
  await page.getByRole('button',{name:'Sichern',exact:true}).click();
  // Force persistence/transition without waiting for the legacy debounce.
  await page.locator('#savedProjects').selectOption('b');
  const game=(await saved(page)).find(x=>x.id==='a');
  assert.equal(game.config.locations.length,3);
  assert.equal(new Set(game.config.locations.map(l=>l.id)).size,3);
  assert.equal(game.config.locations[0].name,'Spielplatz');
});
test('Backup mit 100-Zeichen-Titel wird ohne Seed- oder Codeverlust importiert',async t=>{
  const page=await fixture(t);
  const original=project('backup','X'.repeat(100));
  await page.locator('input[type=file]').setInputFiles({
    name:'backup.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({format:'spurjagd-backup-1',project:original})),
  });
  await page.waitForFunction(()=>document.querySelector('.storage-message')?.textContent);
  const games=await saved(page);
  assert.equal(games.length,3);
  const imported=games.find(x=>!['a','b'].includes(x.id));
  assert.ok(imported.title.length<=100);
  assert.deepEqual(imported.config,original.config);
});

test('Vollständiger Ablauf: neues Spiel, Codes, Hinweise, Druck, Backup und Wiederöffnung',async t=>{
  const page=await fixture(t);
  await page.getByRole('button',{name:'Neu',exact:true}).click();
  await page.locator('#projectTitle').fill('Geburtstagsrunde');
  await page.locator('.form-grid input[type=number]').nth(0).fill('6');
  await page.locator('.form-grid input[type=number]').nth(1).fill('3');
  await page.locator('.form-grid select').nth(0).selectOption('8–10');
  await page.locator('.form-grid select').nth(1).selectOption('90');
  await page.getByRole('button',{name:'02 Standorte'}).click();
  await page.getByLabel('Name des Ortes',{exact:true}).nth(0).fill('Turm');
  const codeInputs=page.locator('.location-card input[inputmode=numeric]');
  for (const [i,code] of ['0007','007','1234','987'].entries()) await codeInputs.nth(i).fill(code);
  await page.getByRole('button',{name:'04 Spielplan'}).click();
  const hints=page.locator('.clue-row textarea');
  assert.equal(await hints.count(),8);
  for(let i=0;i<8;i++)await hints.nth(i).fill('Löst den nächsten Hinweis gemeinsam. Aufgabe '+(i+1));
  await page.evaluate(()=>{window.printCalls=0;window.print=()=>window.printCalls++;});
  for(const [name,expectedKind] of [
    ['Rätselkarten drucken','puzzle'],['Geheime Hinweiskarten drucken','clue'],['Spielleitung: Lösungen drucken','leader']
  ]){
    const before=await page.evaluate(()=>window.printCalls);
    await page.getByRole('button',{name:new RegExp(name)}).click();
    await page.waitForFunction(n=>window.printCalls>n,before);
    assert.equal(await page.locator(expectedKind==='leader'?'.leader-entry':'.print-'+expectedKind+'-card').count(),8);
  }
  const expected=(await saved(page)).find(x=>x.title==='Geburtstagsrunde');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Sichern',exact:true}).click();
  const download=await downloadPromise;
  const chunks=[];
  for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const buffer=Buffer.concat(chunks);
  assert.deepEqual(JSON.parse(buffer).project.config,expected.config);
  await page.locator('input[type=file]').setInputFiles({name:'runde.json',mimeType:'application/json',buffer});
  await page.waitForFunction(()=>document.querySelector('#projectTitle')?.value==='Geburtstagsrunde (Import)');
  const imported=(await saved(page)).find(x=>x.title==='Geburtstagsrunde (Import)');
  assert.notEqual(imported.id,expected.id);
  assert.deepEqual(imported.config,expected.config);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#projectTitle')?.value==='Geburtstagsrunde (Import)');
  await page.getByRole('button',{name:'04 Spielplan'}).click();
  assert.equal(await page.locator('.print-preflight').count(),0);
  assert.equal(await page.locator('.print-puzzle-card').count(),8);
  assert.deepEqual((await saved(page)).find(x=>x.id===imported.id).config,expected.config);
});

test('Während des Dateilesens bearbeitete Eingaben werden vor Import erhalten',async t=>{
  const page=await fixture(t);
  await page.evaluate(()=>{
    const original=File.prototype.text;
    File.prototype.text=function(){
      return new Promise(resolve=>{window.finishImport=async()=>resolve(await original.call(this));});
    };
  });
  await page.locator('input[type=file]').setInputFiles({
    name:'backup.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({format:'spurjagd-backup-1',project:project('c','Importiert')})),
  });
  await page.locator('#projectTitle').fill('Während Import geändert');
  await page.evaluate(()=>window.finishImport());
  await page.waitForFunction(()=>document.querySelector('#projectTitle')?.value==='Importiert (Import)');
  assert.equal((await saved(page)).find(x=>x.id==='a').title,'Während Import geändert');
});

test('Ungültiges Backup verändert keine gespeicherten Projekte',async t=>{
  const page=await fixture(t);
  const before=await saved(page);
  await page.locator('input[type=file]').setInputFiles({
    name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"format":"falsch"}'),
  });
  await page.waitForFunction(()=>document.querySelector('.storage-message')?.textContent?.includes('Import fehlgeschlagen'));
  assert.deepEqual(await saved(page),before);
  assert.equal(await page.locator('#projectTitle').inputValue(),'Projekt A');
});

test('Ungespeicherte Eingaben lösen eine Verlassen-Warnung aus; Korrektur hebt sie auf',async t=>{
  const page=await fixture(t);
  await page.getByRole('button',{name:'02 Standorte'}).click();
  await page.getByLabel('Name des Ortes',{exact:true}).nth(0).fill('');
  const warned=()=>page.evaluate(()=>{
    const event=new Event('beforeunload',{cancelable:true});
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(await warned(),true);
  await page.getByLabel('Name des Ortes',{exact:true}).nth(0).fill('Spielplatz');
  assert.equal(await warned(),false);
});

test('Neuanlage und Import lassen einen unvollständigen Entwurf geöffnet',async t=>{
  const page=await fixture(t);
  await page.getByRole('button',{name:'02 Standorte'}).click();
  await page.getByLabel('Name des Ortes',{exact:true}).nth(0).fill('');
  await page.getByRole('button',{name:'Neu',exact:true}).click();
  assert.equal(await page.locator('#projectTitle').inputValue(),'Projekt A');
  await page.locator('input[type=file]').setInputFiles({
    name:'backup.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({format:'spurjagd-backup-1',project:project('c','Importiert')})),
  });
  await page.waitForFunction(()=>document.querySelector('input[type=file]')?.value==='');
  assert.equal(await page.locator('#projectTitle').inputValue(),'Projekt A');
  assert.equal(await page.getByLabel('Name des Ortes',{exact:true}).nth(0).inputValue(),'');
  assert.equal((await saved(page)).length,2);
});
