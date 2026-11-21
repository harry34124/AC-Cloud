const path=require('node:path'),{spawnSync}=require('node:child_process');
for(const [script,args]of [['check.mjs',[]],['test_desktop.cjs',process.argv.slice(2)]]){
 const result=spawnSync(process.execPath,[path.join(__dirname,script),...args],{stdio:'inherit',env:process.env,windowsHide:true});
 if(result.status!==0)process.exit(result.status??1);
}
