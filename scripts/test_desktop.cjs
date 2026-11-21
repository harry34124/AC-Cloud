const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),electron=process.env.ELECTRON_PATH||path.join(repo,'node_modules/electron/dist',process.platform==='win32'?'electron.exe':'electron');
if(!fs.existsSync(electron)){console.error('Run npm install, or set ELECTRON_PATH to Electron 33.2.0.');process.exit(1);}
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const args=process.argv.slice(2),suites=args.includes('--suite')?[null]:['regression','dialogue-final','vehicle','landing','gloves','narrow'];
for(const suite of suites){const result=spawnSync(electron,[path.join(repo,'tests/desktop/host.cjs'),...args,...(suite?['--suite',suite]:[])],{env,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status??1);}
