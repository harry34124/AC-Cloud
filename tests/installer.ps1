$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
. (Join-Path $repo 'scripts/install_directory.ps1')
$build=[IO.Path]::GetFullPath((Join-Path $repo 'build'))
$root=Join-Path $build ('installer-test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root -Force|Out-Null
try {
 $source=Join-Path $root 'source';$dest=Join-Path $root 'dest';$backup=Join-Path $root 'backup'
 New-Item -ItemType Directory -Path $source,$dest|Out-Null
 Set-Content -LiteralPath (Join-Path $source 'original.txt') -Value 'original'
 Set-Content -LiteralPath (Join-Path $dest 'existing.txt') -Value 'existing'
 $failed=$false;try { Move-InstallDirectory -Source $source -Destination $dest -Root $root -Attempts 1 } catch { $failed=$true }
 if (-not $failed -or -not (Test-Path (Join-Path $source 'original.txt')) -or (Test-Path (Join-Path $dest 'original.txt'))) { throw 'Failed switch changed the active tree' }
 Move-InstallDirectory -Source $source -Destination $backup -Root $root
 Move-InstallDirectory -Source $backup -Destination $source -Root $root
 if (-not (Test-Path (Join-Path $source 'original.txt'))) { throw 'Rollback failed' }
 Write-Output 'Atomic directory failure and rollback checks passed'
} finally {
 if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($root)) -ne $build -or ((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe fixture cleanup' }
 Remove-Item -LiteralPath $root -Recurse -Force
}
