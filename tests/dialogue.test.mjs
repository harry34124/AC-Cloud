import test from 'node:test';
import assert from 'node:assert/strict';
import {planDesktopDialogue} from '../app/desktop/dialogue-host.mjs';
test('dialogue remains near the head at each supported size',()=>{
 for(const size of [100,150,200,250,300]){
 const anchor={left:300,right:300+size*.25,top:200,bottom:200+size*.3};
 const result=planDesktopDialogue({left:5,right:125,top:5,bottom:65},{headAnchor:anchor},{size,x:0,y:0,width:1000,height:800,localWidth:1000,localHeight:800});
 assert.equal(result.position.left-anchor.right,Math.max(3,size*.03));assert.equal(result.position.top,anchor.top);
 }
});
test('near-screen-edge placement stays visible and respects occlusion',()=>{
 const result=planDesktopDialogue({left:5,right:125,top:5,bottom:65},{headAnchor:{left:970,right:990,top:200},isClear:r=>r.right<=970},{size:100,x:0,y:0,width:1000,height:800,localWidth:1000,localHeight:800});
 assert.equal(result.position.side,'left');assert(result.position.left>=8);assert(result.position.left+120<970);
});
