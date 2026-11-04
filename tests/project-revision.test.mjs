import test from 'node:test';
import assert from 'node:assert/strict';
import { nextProjectRevision } from '../src/project-revision.ts';

test('Mehrere Speichervorgänge im selben Millisekundenintervall erhalten unterschiedliche Revisionen',()=>{
 const first=nextProjectRevision(null,1000);
 const second=nextProjectRevision(first,1000);
 const third=nextProjectRevision(second,1000);
 assert.deepEqual([first,second,third],['1970-01-01T00:00:01.000Z','1970-01-01T00:00:01.001Z','1970-01-01T00:00:01.002Z']);
});
test('Uhrzeit-Rücksprung kann keine alte Revision erneut erzeugen',()=>{
 const first=nextProjectRevision(null,2000);
 assert.equal(nextProjectRevision(first,1000),'1970-01-01T00:00:02.001Z');
});
test('Neue Projekte verwenden die aktuelle Uhrzeit ohne fremde Revision',()=>{
 assert.equal(nextProjectRevision(undefined,1000),'1970-01-01T00:00:01.000Z');
 assert.throws(()=>nextProjectRevision(null,NaN),/Ungültiger Zeitstempel/);
});
