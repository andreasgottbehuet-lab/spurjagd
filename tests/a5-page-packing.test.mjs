import test from 'node:test';
import assert from 'node:assert/strict';
import {packA5Blocks,underfilledA5Pages,measureA5Sheets,compactableUnderfilledPages} from '../src/a5-page-packing.ts';
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
 for(const height of [0,-1,191,NaN,Infinity])assert.throws(()=>packA5Blocks([b('a','rot',height)]));
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
 assert.ok(pages.every(p=>p.usedMm<=190));
});

test('Measured CSS pixels convert into physical A5 dimensions',()=>{
 const blocks=measureA5Sheets([{id:'a',owner:'rot',section:'task',heightPx:96}]);
 assert.ok(Math.abs(blocks[0].heightMm-25.4)<0.001);
 assert.throws(()=>measureA5Sheets([],0));
});
test('Underfilled pages are only compactable for matching owner and section',()=>{
 const pages=packA5Blocks([b('a','rot',40),b('b','blau',30),b('c','leitung',30,'routes')],190);
 assert.deepEqual(compactableUnderfilledPages(pages,190),[]);
});

test('Keep-together blocks exceeding one A5 page are rejected',()=>{
 assert.throws(()=>packA5Blocks([b('a','rot',110,'task',true),b('b','rot',90)]),/Zusammengehörige/);
});
test('Invalid browser measurements are rejected',()=>{
 for(const heightPx of [0,-1,NaN,Infinity]) assert.throws(()=>measureA5Sheets([{id:'a',owner:'rot',section:'task',heightPx}]));
});
test('190 mm usable height is consistent across packing and underfill checks',()=>{
 assert.throws(()=>packA5Blocks([b('a','rot',191)]));
 const pages=packA5Blocks([b('a','rot',100),b('b','rot',90)]);
 assert.equal(pages.length,1);assert.deepEqual(underfilledA5Pages(pages),[]);
});
