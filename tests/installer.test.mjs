import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('Windows installation fails atomically and restores the original directory',{skip:process.platform!=='win32'},()=>{
 const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./installer.ps1',import.meta.url))],{encoding:'utf8',windowsHide:true});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
