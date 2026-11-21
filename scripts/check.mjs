import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const flag=process.argv.indexOf('--runtime-root');
const root=flag>=0?path.resolve(process.argv[flag+1]):path.join(repo,'app');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
for(const [rel,info]of Object.entries(manifest.files)){
 const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep))throw Error('Escaping manifest path: '+rel);
 const bytes=fs.readFileSync(file);if(bytes.length!==info.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==info.sha256)throw Error('Invalid runtime file: '+rel);
}
for(const rel of Object.values(manifest.routes))if(!manifest.files[rel])throw Error('Unverified route: '+rel);
const info=createRequire(import.meta.url)(path.join(root,'desktop/build-info.cjs'))(root);
console.log(`Runtime verified: ${Object.keys(manifest.files).length} files; ${info.version} / ${info.buildId}`);
if(flag<0){
 const version=JSON.parse(fs.readFileSync(path.join(repo,'package.json'))).version;
 if(version!==info.version||version!==JSON.parse(fs.readFileSync(path.join(repo,'package-lock.json'))).version)throw Error('Package versions differ');
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
 for(const file of walk(path.join(root,'desktop')).filter(f=>/\.(mjs|cjs|js)$/.test(f))){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
 const result=spawnSync(process.execPath,['--test',...walk(path.join(repo,'tests')).filter(f=>f.endsWith('.test.mjs'))],{stdio:'inherit'});process.exit(result.status??1);
}
