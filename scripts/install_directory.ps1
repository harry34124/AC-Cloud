function Move-InstallDirectory {
    param([string]$Source, [string]$Destination, [string]$Root, [int]$Attempts = 8)
    $base = [IO.Path]::GetFullPath($Root)
    foreach ($p in @($Source, $Destination)) {
        if ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($p)) -ne $base) { throw 'Unsafe directory switch' }
        if ((Test-Path -LiteralPath $p) -and ((Get-Item -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Directory links are unsupported' }
    }
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try { [IO.Directory]::Move($Source, $Destination); return }
        catch [IO.IOException] { if ($attempt -eq $Attempts) { throw }; Start-Sleep -Milliseconds 250 }
    }
}
