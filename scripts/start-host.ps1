$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
& pm2.cmd startOrRestart ecosystem.config.cjs --update-env
if ($LASTEXITCODE -ne 0) { throw 'AfterBells PM2 startup failed' }
