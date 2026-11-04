import test from 'node:test';
import assert from 'node:assert/strict';
import {saveGame,loadGames,deleteGame,replaceLastGame,serializeGameBackup,parseGameBackup} from '../src/project-storage.ts';
import {createDefaultGameConfig} from '../src/default-game.ts';
import {nextProjectRevision} from '../src/project-revision.ts';

const project=(id='one',title='Start',updatedAt='2026-11-04T12:00:00.000Z')=>({version:1,id,title,updatedAt,config:createDefaultGameConfig()});
const withStorage=(fn)=>{
 const previous=globalThis.localStorage, data=new Map();
 globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 try{fn(data);}finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
};

test('Zwei Tabs: veraltetes Autospeichern wird abgelehnt und neuerer Stand bleibt erhalten',()=>withStorage(()=>{
 const first=project();saveGame(first,null);
 const tabA=loadGames()[0],tabB=loadGames()[0];
 const newer={...tabA,title:'Bearbeitung A',updatedAt:nextProjectRevision(tabA.updatedAt,Date.parse(tabA.updatedAt))};
 saveGame(newer,tabA.updatedAt);
 assert.throws(()=>saveGame({...tabB,title:'Bearbeitung B',updatedAt:nextProjectRevision(tabB.updatedAt,Date.parse(tabB.updatedAt))},tabB.updatedAt),/zwischenzeitlich verändert/);
 assert.equal(loadGames()[0].title,'Bearbeitung A');
}));

test('Projektwechsel: alter Entwurf wird vor dem Wechsel gesichert und wiederhergestellt',()=>withStorage(()=>{
 const a=project('a'),b=project('b','Zweites Projekt');
 saveGame(a,null);saveGame(b,null);
 const edited={...a,title:'Noch nicht gespeicherter Text',updatedAt:nextProjectRevision(a.updatedAt,Date.parse(a.updatedAt))};
 saveGame(edited,a.updatedAt);
 assert.equal(loadGames().find(p=>p.id==='a')?.title,'Noch nicht gespeicherter Text');
 assert.equal(loadGames().find(p=>p.id==='b')?.title,'Zweites Projekt');
}));

test('Import einer Sicherung legt eine unabhängige Projektkopie an',()=>withStorage(()=>{
 const original=project('original');saveGame(original,null);
 const restored=parseGameBackup(serializeGameBackup(original));
 const copy={...restored,id:'import-copy',title:'Start (Import)',updatedAt:nextProjectRevision()};
 saveGame(copy,null);
 assert.equal(loadGames().length,2);
 assert.equal(loadGames().find(p=>p.id==='original')?.title,'Start');
 assert.equal(loadGames().find(p=>p.id==='import-copy')?.title,'Start (Import)');
}));

test('Veraltete Löschung und Ersatz des letzten Projekts bleiben wirkungslos',()=>withStorage(()=>{
 const original=project();saveGame(original,null);
 const newer={...original,updatedAt:nextProjectRevision(original.updatedAt,Date.parse(original.updatedAt)),title:'Neu'};
 saveGame(newer,original.updatedAt);
 assert.throws(()=>deleteGame(original.id,original.updatedAt),/zwischenzeitlich verändert/);
 assert.throws(()=>replaceLastGame(original.id,project('replacement'),original.updatedAt),/zwischenzeitlich verändert/);
 assert.equal(loadGames().length,1);
 assert.equal(loadGames()[0].title,'Neu');
}));

import {readFileSync} from 'node:fs';
test('UI sperrt weitere Schreibvorgänge nach erkanntem Versionskonflikt beim Projektwechsel oder Löschen',()=>{
 const source=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 const switching=source.slice(source.indexOf('const saveCurrentBeforeSwitch ='),source.indexOf('const newProject ='));
 const deleting=source.slice(source.indexOf('const removeProject ='),source.indexOf('const exportProject ='));
 for(const segment of [switching,deleting]){
  assert.ok(segment.includes("String(error).includes('zwischenzeitlich verändert')") || segment.includes("String(e).includes('zwischenzeitlich verändert')"));
  assert.ok(segment.includes('storageConflict.current=true'));
  assert.ok(segment.includes('setStorageReady(false)'));
 }
});
