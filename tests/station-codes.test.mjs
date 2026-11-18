import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMissingCodes,groupPrintIssues} from '../src/station-codes.ts';

test('Codes erzeugen: eindeutig, dreistellig, vorhandene bleiben',()=>{
 const ids=Array.from({length:20},(_,i)=>'s'+i);
 const out=generateMissingCodes(ids,{s0:'007',s1:'12'},'p');
 assert.equal(out.s0,'007');
 assert.match(out.s1,/^\d{3}$/);
 assert.equal(new Set(ids.map(i=>out[i])).size,20);
 assert.deepEqual(generateMissingCodes(ids,out,'p'),out);
 assert.deepEqual(generateMissingCodes(ids,{},'p'),generateMissingCodes(ids,{},'p'));
});
test('Codes erzeugen: alle 1000 Codes möglich, führende Nullen als String',()=>{
 const ids=Array.from({length:1000},(_,i)=>'s'+i);
 const out=generateMissingCodes(ids,{},'x');
 assert.equal(new Set(Object.values(out)).size,1000);
 assert.ok(Object.values(out).includes('000'));
});
test('Meldungen gleicher Art werden zu einer Zeile gruppiert',()=>{
 const g=groupPrintIssues(['Ungültiger Code: A','Ungültiger Code: B','Team 1: Stationscode fehlt für A','Team 2: Stationscode fehlt für B','Ungültiger dreistelliger Code: C','Startort fehlt.'],['a','b','c']);
 assert.deepEqual(g,["3 Stationen ohne Code. Mit 'Codes erzeugen' beheben.",'Startort fehlt.']);
 assert.deepEqual(groupPrintIssues(['Ungültiger Code: A'],['a']),["1 Station ohne Code. Mit 'Codes erzeugen' beheben."]);
 assert.deepEqual(groupPrintIssues([],[]),[]);
});
test('Gleichnamige Stationen werden getrennt gezählt',()=>{
 const g=groupPrintIssues(['Ungültiger Code: Baum','Ungültiger Code: Baum','Team 1: Stationscode fehlt für Baum','Team 2: Stationscode fehlt für Baum'],['s1','s2','s1']);
 assert.deepEqual(g,["2 Stationen ohne Code. Mit 'Codes erzeugen' beheben."]);
});
