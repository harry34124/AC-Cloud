"""Build an offline Windows portable folder from a pinned Electron runtime."""
import argparse,hashlib,json,pathlib,shutil,zipfile,subprocess,datetime
def main():
 p=argparse.ArgumentParser();p.add_argument('--electron',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path);p.add_argument('--rcedit',type=pathlib.Path);p.add_argument('--zip',action='store_true');a=p.parse_args()
 root=pathlib.Path(__file__).resolve().parents[1];runtime=(a.electron or root/'node_modules/electron/dist').resolve();version=json.loads((root/'package.json').read_text(encoding='utf8'))['version'];manifest_sha=hashlib.sha256((root/'app/release-manifest.json').read_bytes()).hexdigest();out=(a.output or root/'build'/('v'+version+'-'+manifest_sha[:12])/'AC Cloud').resolve()
 if not (runtime/'electron.exe').is_file():p.error('Use --electron pointing to an Electron 33.2.0 Windows x64 directory, or run npm install first.')
 if (runtime/'version').read_text().strip()!='33.2.0':p.error('Expected Electron 33.2.0.')
 if json.loads((root/'app/package.json').read_text(encoding='utf8'))['version']!=version:p.error('Root and app versions differ.')
 if out.is_relative_to(runtime) or out.is_relative_to(root/'app'):p.error('Output must be outside runtime and source app directories.')
 if out.exists():p.error('Output already exists; choose a new empty output path.')
 m=json.loads((root/'app/release-manifest.json').read_text(encoding='utf-8'))
 for rel,info in m['files'].items():
  b=(root/'app'/rel).read_bytes()
  if len(b)!=info['bytes'] or hashlib.sha256(b).hexdigest()!=info['sha256']:raise RuntimeError('Changed app file: '+rel+'; update manifest after intentional development edits.')
 shutil.copytree(runtime,out,ignore=shutil.ignore_patterns('default_app.asar'))
 (out/'electron.exe').rename(out/'AC Cloud.exe');shutil.copytree(root/'app',out/'resources/app')
 try:revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True,stderr=subprocess.DEVNULL).strip();dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True))
 except (OSError,subprocess.CalledProcessError):revision=None;dirty=None
 info={'version':version,'manifestSha256':manifest_sha,'revision':revision,'dirty':dirty,'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'electron':'33.2.0','platform':'win32-x64'}
 (out/'resources/app/build-info.json').write_text(json.dumps(info,indent=2)+'\n',encoding='utf8')
 for filename in ['README.md','THIRD_PARTY_NOTICES.md','NOTICE.md']:
  if (root/filename).exists():shutil.copy2(root/filename,out/filename)
 if (root/'licenses').exists():shutil.copytree(root/'licenses',out/'licenses')
 if (root/'docs').exists():shutil.copytree(root/'docs',out/'docs')
 if a.rcedit:subprocess.run([str(a.rcedit.resolve()),str(out/'AC Cloud.exe'),'--set-icon',str(root/'app/desktop/icon.ico'),'--set-version-string','ProductName','AC Cloud','--set-version-string','FileDescription','AC Cloud','--set-version-string','OriginalFilename','AC Cloud.exe','--set-file-version',version,'--set-product-version',version],check=True)
 (out/'启动 AC Cloud.cmd').write_bytes(b'@echo off\r\ncd /d "%~dp0"\r\nstart "" "%~dp0AC Cloud.exe"\r\n')
 print('Portable:',out)
 if a.zip:
  z=out.parent/('AC-Cloud-v'+version+'-windows-x64.zip')
  with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as f:
   for item in sorted(out.rglob('*')):
    if item.is_file():f.write(item,item.relative_to(out.parent))
  h=hashlib.sha256(z.read_bytes()).hexdigest();(out.parent/'SHA256SUMS.txt').write_text(h+'  '+z.name+'\n',encoding='ascii');print('ZIP:',z,'bytes:',z.stat().st_size)
 (root/'build').mkdir(exist_ok=True);latest=root/'build/latest.json';temp=latest.with_suffix('.tmp');temp.write_text(json.dumps({'directory':str(out),'build':info},indent=2)+'\n',encoding='utf8');temp.replace(latest)
if __name__=='__main__':main()
