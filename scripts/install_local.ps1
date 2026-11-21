param([string]$BuildDirectory, [switch]$NoStart)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (-not $BuildDirectory) { $BuildDirectory = (Get-Content -LiteralPath (Join-Path $repo 'build/latest.json') -Raw | ConvertFrom-Json).directory }
$source = (Resolve-Path -LiteralPath $BuildDirectory).Path
if (-not (Test-Path -LiteralPath (Join-Path $source 'AC Cloud.exe'))) { throw 'Build executable missing' }
& node (Join-Path $PSScriptRoot 'check.mjs') --runtime-root (Join-Path $source 'resources/app')
if ($LASTEXITCODE -ne 0) { throw 'Build validation failed' }
$dist = [IO.Path]::GetFullPath((Join-Path $repo 'dist'))
New-Item -ItemType Directory -Path $dist -Force | Out-Null
if ((Get-Item -LiteralPath $dist).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Install directory must not be a link' }
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$target = Join-Path $dist 'AC Cloud'
$stage = Join-Path $dist ('install-stage-' + [guid]::NewGuid().ToString('N'))
$backup = Join-Path $dist ('AC Cloud.previous-' + (Get-Date -Format 'yyyyMMdd-HHmmssfff'))
foreach ($p in @($target,$stage,$backup)) {
 if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($p)) -ne $dist) { throw 'Unsafe install path' }
 if ((Test-Path -LiteralPath $p) -and ((Get-Item -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Install links are unsupported' }
}
if ($source -eq $target -or $source.StartsWith($target + [IO.Path]::DirectorySeparatorChar)) { throw 'Build source must be outside active installation' }
Copy-Item -LiteralPath $source -Destination $stage -Recurse
& node (Join-Path $PSScriptRoot 'check.mjs') --runtime-root (Join-Path $stage 'resources/app')
if ($LASTEXITCODE -ne 0) { throw 'Staged validation failed; active installation unchanged' }
$exe = Join-Path $target 'AC Cloud.exe'
$running = @(Get-CimInstance Win32_Process -Filter "Name='AC Cloud.exe'" | Where-Object { $_.ExecutablePath -eq $exe -and $_.CommandLine -notmatch '--type=' })
if ($running.Count) { Start-Process -FilePath $exe -ArgumentList '--quit' -WindowStyle Hidden; foreach ($p in $running) { Wait-Process -Id $p.ProcessId -Timeout 25 } }
if (Test-Path -LiteralPath $target) { Move-Item -LiteralPath $target -Destination $backup }
try { Move-Item -LiteralPath $stage -Destination $target } catch { if (-not (Test-Path -LiteralPath $target) -and (Test-Path -LiteralPath $backup)) { Move-Item -LiteralPath $backup -Destination $target }; throw }
$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$link = Join-Path $desktop '克劳德桌宠（试用版）.lnk'
if (-not (Test-Path -LiteralPath $link)) { $link = Join-Path $desktop 'AC Cloud.lnk' }
$shortcut = $ws.CreateShortcut($link); $shortcut.TargetPath = $exe; $shortcut.Arguments = ''; $shortcut.WorkingDirectory = $target; $shortcut.IconLocation = (Join-Path $target 'resources/app/desktop/icon.ico'); $shortcut.Save()
@{installed=$target;backup=$backup;shortcut=$link;build=(Get-Content -LiteralPath (Join-Path $target 'resources/app/build-info.json') -Raw | ConvertFrom-Json)} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $dist 'install-receipt.json') -Encoding UTF8
if (-not $NoStart) { Start-Process -FilePath $exe -WorkingDirectory $target -WindowStyle Hidden }
Write-Output "Installed: $target"
