import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/quality.yml',import.meta.url),'utf8');
const windows=readFileSync(new URL('../scripts/verify-windows.ps1',import.meta.url),'utf8');

test('CI prueft Push, Pull Request und manuellen Start mit Node 22',()=>{
 assert.match(workflow,/push:\s*\n\s*branches: \[main\]/);
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/node-version: '22'/);
});

test('CI fuehrt Tests und Produktions-Build mit Fehlerweitergabe aus',()=>{
 assert.match(workflow,/npm test 2>&1 \| tee verification\/tests\.log/);
 assert.match(workflow,/npm run build 2>&1 \| tee verification\/build\.log/);
 assert.equal((workflow.match(/set -o pipefail/g)??[]).length,2);
});

test('CI archiviert auch bei Fehlern die vorhandenen Pruefprotokolle',()=>{
 assert.match(workflow,/actions\/upload-artifact@v4/);
 assert.match(workflow,/if: always\(\)/);
 assert.match(workflow,/path: verification\//);
 assert.match(workflow,/retention-days: 30/);
});

test('Windows-Pruefung protokolliert Testversion, Commit und Build',()=>{
 for(const marker of ['node --version','npm --version','git rev-parse HEAD','npm test','npm run build','Start-Transcript']){
  assert.ok(windows.includes(marker),marker);
 }
});
