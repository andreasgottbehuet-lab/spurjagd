import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRenderedPrintSheets} from '../src/print-dom-audit.ts';

test('Vollständig gerendertes A5-Paket wird freigegeben',()=>{
 for(const count of [1,3,53,200,1000]) assert.deepEqual(auditRenderedPrintSheets(count,count),[]);
});

test('Fehlende oder zusätzliche A5-Blätter sperren den Druck',()=>{
 assert.ok(auditRenderedPrintSheets(53,52).some(issue=>issue.includes('52 von 53')));
 assert.ok(auditRenderedPrintSheets(53,54).some(issue=>issue.includes('54 von 53')));
});

test('Ungültige Seitenzahlen werden nicht als vollständig behandelt',()=>{
 for(const [expected,actual] of [[0,0],[53,-1],[NaN,53],[53,Infinity],[1,1.5]]){
  assert.ok(auditRenderedPrintSheets(expected,actual).length>0);
 }
});
