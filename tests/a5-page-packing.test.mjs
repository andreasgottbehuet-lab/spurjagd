import test from 'node:test';
import assert from 'node:assert/strict';
import {packA5Blocks,underfilledA5Pages} from '../src/a5-page-packing.ts';
const b=(id,owner,heightMm,section='task',keepWithNext=false)=>({id,owner,section,heightMm,keepWithNext});
test('Underfilled compatible blocks share A5 page',()=>{
 const pages=packA5Blocks([b('a','rot',60),b('b','rot',65),b('c','rot',40)]);
 assert.equal(pages.length,1);assert.equal(pages[0].usedMm,165);assert.deepEqual(underfilledA5Pages(pages),[]);
});
test('Teams and organizer sections never share a physical A5 page',()=>{
 const pages=packA5Blocks([b('a','rot',20),b('b','blau',20),b('c','leitung',20,'safety'),b('d','leitung',20,'routes')]);
 assert.equal(pages.length,4);assert.deepEqual(pages.map(p=>p.owner),['rot','blau','leitung','leitung']);
});
test('Oversize and invalid blocks fail closed',()=>{
 for(const height of [0,-1,193,NaN,Infinity])assert.throws(()=>packA5Blocks([b('a','rot',height)]));
 assert.throws(()=>packA5Blocks([b('a','rot',20),b('a','rot',20)]));
 assert.throws(()=>packA5Blocks([b('a','rot',20)],0));
});
test('Keep-together pair moves to new page if it fits there',()=>{
 const pages=packA5Blocks([b('a','rot',130),b('b','rot',45,'task',true),b('c','rot',30)]);
 assert.equal(pages.length,2);assert.deepEqual(pages.map(p=>p.blocks.map(b=>b.id)),[['a'],['b','c']]);
});
test('Content is not dropped when next group does not fit',()=>{
 const blocks=Array.from({length:25},(_,i)=>b('x'+i,'rot',25));
 const pages=packA5Blocks(blocks);
 assert.equal(pages.flatMap(p=>p.blocks).length,25);
 assert.ok(pages.every(p=>p.usedMm<=192));
});
