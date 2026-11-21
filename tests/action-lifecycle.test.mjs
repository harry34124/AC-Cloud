import test from 'node:test';
import assert from 'node:assert/strict';
import {createActionLoadScope,disposeActionContext} from '../app/desktop/action-lifecycle.mjs';
test('cancel settles a load even if the iframe never fires load',async()=>{
 const scope=createActionLoadScope(),pending=scope.wait(new Promise(()=>{}));scope.cancel();await assert.rejects(pending,{name:'ActionLoadCancelled'});
});
test('late rejection is observed after cancellation and a new scope still loads',async()=>{
 const scope=createActionLoadScope();let reject;const pending=scope.wait(new Promise((_,r)=>reject=r));scope.cancel();await assert.rejects(pending,{name:'ActionLoadCancelled'});reject(Error('late failure'));await new Promise(r=>setImmediate(r));assert.equal(await createActionLoadScope().wait(Promise.resolve(42)),42);
});
test('teardown happens once and removes the context even if adapter disposal fails',()=>{
 let calls=0,canvas=0,frame=0,errors=0;const owner={adapter:{dispose(){calls++;throw Error('dispose failed');},canvas:{remove(){canvas++;}}},frame:{remove(){frame++;}}};
 disposeActionContext(owner,()=>errors++);disposeActionContext(owner,()=>errors++);assert.deepEqual([calls,canvas,frame,errors],[1,1,1,1]);
});
