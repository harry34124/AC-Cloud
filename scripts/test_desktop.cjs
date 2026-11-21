const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),electron=process.env.ELECTRON_PATH||path.join(repo,'node_modules/electron/dist',process.platform==='win32'?'electron.exe':'electron');
if(!fs.existsSync(electron)){console.error('Run npm install, or set ELECTRON_PATH to Electron 33.2.0.');process.exit(1);}
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const result=spawnSync(electron,[path.join(repo,'tests/desktop/host.cjs'),...process.argv.slice(2)],{env,stdio:'inherit',windowsHide:true});process.exit(result.status??1);
