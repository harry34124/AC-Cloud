const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function(root){
 const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
 const manifestSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'release-manifest.json'))).digest('hex');
 const file=path.join(root,'build-info.json');
 const build=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 if(build&&(build.version!==version||build.manifestSha256!==manifestSha256))throw Error('Build metadata does not match runtime resources');
 return Object.freeze({version,buildId:manifestSha256.slice(0,12),revision:build?.revision??null,dirty:build?.dirty??null,builtAt:build?.builtAt??null,mode:build?'installed':'development',applicationPath:fs.realpathSync(root)});
};
