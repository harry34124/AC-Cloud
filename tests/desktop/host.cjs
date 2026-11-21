const {app,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'../..');const idx=process.argv.indexOf('--root');
const root=idx>=0?path.resolve(process.argv[idx+1]):path.join(repo,'app');
const out=path.join(repo,'build/test-results',Date.now()+'-'+process.pid);fs.mkdirSync(out,{recursive:true});
process.env.CLOUD_PET_DATA=path.join(out,'user-data');process.env.CLOUD_PET_TEST_RESULT=path.join(out,'desktop.json');
fs.mkdirSync(process.env.CLOUD_PET_DATA);fs.writeFileSync(path.join(process.env.CLOUD_PET_DATA,'settings.json'),JSON.stringify({size:150,x:.5,top:false,autonomous:false,words:true}));
app.commandLine.appendSwitch('disable-renderer-backgrounding');app.commandLine.appendSwitch('disable-background-timer-throttling');
let running=false;const errors=[],network=[];
const watchdog=setTimeout(()=>{console.error('Desktop checks timed out');app.exit(1);},180000);
app.whenReady().then(()=>session.defaultSession.webRequest.onCompleted(r=>{if(r.statusCode>=400)network.push({url:r.url,status:r.statusCode});}));
app.on('web-contents-created',(_e,w)=>{w.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});w.once('did-finish-load',async()=>{
 if(running||!w.getURL().includes('/desktop/index.html'))return;running=true;
 let result;try{
 await w.executeJavaScript('(async()=>{for(let n=0;n<1200&&!window.cloudPet;n++)await new Promise(r=>setTimeout(r,50));await window.cloudPet.ready;window.requestAnimationFrame=()=>0;return true;})()');
 const fn=require('./regression.cjs').run;result=await w.executeJavaScript('('+fn.toString()+')({mode:"regression"})');
 const info=await w.executeJavaScript('window.cloudHost.info()');result.buildInfo=info;
 result.checks.push({name:'actual application path matches requested test root',pass:path.resolve(info.applicationPath)===fs.realpathSync(root)});
 result.checks.push({name:'version visible in help',pass:await w.executeJavaScript('document.getElementById("version-label").textContent.includes('+JSON.stringify(info.version)+')')});
 }catch(e){result={pass:false,error:String(e.stack||e)};}
 result.consoleErrors=errors;result.networkErrors=network;result.pass=!!result.pass&&!errors.length&&!network.length&&(result.checks??[]).every(c=>c.pass);
 fs.writeFileSync(process.env.CLOUD_PET_TEST_RESULT,JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,checks:result.checks?.length,result:process.env.CLOUD_PET_TEST_RESULT,error:result.error}));
 clearTimeout(watchdog);app.exit(result.pass?0:1);
 });});
require(path.join(root,'desktop/main.cjs'));
