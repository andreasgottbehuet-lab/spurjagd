import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateLocationIds,nextLocationId} from '../src/location-ids.ts';
const place=id=>({id,name:id,description:''});

test('Imported IDs are never reused',()=>{
 const visible=[place('loc-5'),place('loc-15'),place('external')];
 assert.deepEqual(allocateLocationIds(visible,[],3,5),['loc-6','loc-7','loc-8']);
 assert.equal(nextLocationId(visible,[],5),6);
});
test('Hidden locations reserve their IDs',()=>{
 const visible=[place('loc-5')],hidden=[place('loc-6'),place('loc-8')];
 assert.deepEqual(allocateLocationIds(visible,hidden,3,5),['loc-7','loc-9','loc-10']);
});
test('Allocated IDs remain unique across multiple expansions',()=>{
 const visible=[place('loc-5')],hidden=[place('loc-6')];
 const first=allocateLocationIds(visible,hidden,2,5);
 const second=allocateLocationIds([...visible,...first.map(place)],hidden,2,5);
 assert.equal(new Set([...visible,...hidden,...first.map(place),...second.map(place)].map(x=>x.id)).size,6);
});
test('Invalid station counts are rejected',()=>{
 for(const n of [-1,21,1.5,Infinity]) assert.throws(()=>allocateLocationIds([],[],n));
});

test('Invalid allocator start values are rejected without looping',()=>{
 for(const start of [NaN,Infinity,-1,0,1.5,1000001]){
  assert.throws(()=>allocateLocationIds([],[],1,start),/Startwert/);
 }
 assert.deepEqual(allocateLocationIds([],[],2,1),['loc-1','loc-2']);
});
