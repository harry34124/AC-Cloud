import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import info from '../app/desktop/build-info.cjs';
test('installed build identity rejects a stale resource manifest',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ac-cloud-info-'));
 try{
 fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({version:'0.1.1'}));fs.writeFileSync(path.join(dir,'release-manifest.json'),'{}');
 assert.equal(info(dir).mode,'development');
 const manifestSha256=crypto.createHash('sha256').update('{}').digest('hex');fs.writeFileSync(path.join(dir,'build-info.json'),JSON.stringify({version:'0.1.1',manifestSha256}));assert.equal(info(dir).mode,'installed');
 fs.writeFileSync(path.join(dir,'release-manifest.json'),'{"changed":true}');assert.throws(()=>info(dir),/does not match/);
 }finally{for(const name of ['package.json','release-manifest.json','build-info.json'])fs.rmSync(path.join(dir,name),{force:true});fs.rmdirSync(dir);}
});
