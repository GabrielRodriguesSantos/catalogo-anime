$ErrorActionPreference = 'SilentlyContinue'
$dir = $PSScriptRoot
$log = Join-Path $dir 'vigia-amigos.log'
$linkFixo = 'https://user.tail025e8c.ts.net:8788'
$porta = 8788
$linkFile = Join-Path $dir 'link-publico.txt'

$ts = 'C:\Program Files\Tailscale\tailscale.exe'
if (-not (Test-Path -LiteralPath $ts)) { $ts = 'tailscale' }

function Log($m) {
  $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  Add-Content -LiteralPath $log -Value $line -Encoding UTF8
  $lines = (Get-Content -LiteralPath $log | Measure-Object).Count
  if ($lines -gt 1000) { Get-Content -LiteralPath $log -Tail 500 | Set-Content -LiteralPath $log -Encoding UTF8 }
}

function Test-Port($hostName, $portNumber) {
  $c = New-Object Net.Sockets.TcpClient
  try {
    $iar = $c.BeginConnect($hostName, $portNumber, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne(1000)) { return $false }
    $c.EndConnect($iar)
    return $c.Connected
  } catch { return $false }
  finally { $c.Close() }
}

function Test-LinkPublico {
  try {
    $r = Invoke-WebRequest -Uri ($linkFixo + '/api/health') -UseBasicParsing -TimeoutSec 25
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Ensure-Funnel {
  $s = & $ts funnel status 2>&1 | Out-String
  if ($s -match '8788') { return $true }
  Log 'funnel 8788 nao esta ativo. religando o Tailscale Funnel (o link NAO muda)...'
  & $ts funnel --bg --https=8788 8788 *>&1 | Out-Null
  $s2 = & $ts funnel status 2>&1 | Out-String
  if ($s2 -match '8788') {
    Log ('funnel religado: ' + $linkFixo)
    return $true
  }
  Log 'ATENCAO: nao foi possivel religar o funnel 8788. Verifique a internet / o Tailscale.'
  return $false
}

function Ensure-LinkFile {
  $atual = (Get-Content -LiteralPath $linkFile -Raw -ErrorAction SilentlyContinue)
  if ($atual) { $atual = $atual.Trim() }
  if ($atual -ne $linkFixo) {
    Set-Content -LiteralPath $linkFile -Value $linkFixo -Encoding UTF8 -NoNewline
    Log ('link publico gravado: ' + $linkFixo)
  }
}

try {
  $mutex = New-Object Threading.Mutex($false, "Global\CatalogoAmigosVigia")
} catch {
  $mutex = New-Object Threading.Mutex($false, "CatalogoAmigosVigia")
}
if (-not $mutex.WaitOne(0)) { exit }

Log ('vigia iniciado (link fixo ' + $linkFixo + ')')
Ensure-LinkFile

$rodadas = 0
$linkOk = $true
while ($true) {
  $portOk = Test-Port '127.0.0.1' $porta

  if (-not $portOk) {
    Log 'catalogo nao esta no ar na porta 8788. iniciando (Next.js)...'
    Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c','npm run start -- -p 8788' -WorkingDirectory $dir
    Log 'catalogo iniciado.'
  } elseif (-not $linkOk) {
    Log 'servidor respondeu de novo na porta 8788.'
    $linkOk = $true
  }

  $svc = Get-Service Tailscale -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -ne 'Running') {
    Log 'servico Tailscale parado. ligando...'
    Start-Service Tailscale
    Start-Sleep -Seconds 5
  }

  Ensure-Funnel | Out-Null
  Ensure-LinkFile

  $rodadas++
  if ($rodadas % 30 -eq 0) {
    if (Test-LinkPublico) {
      Log 'link fixo respondendo normalmente.'
    } else {
      Log 'link fixo nao respondeu na hora. tentando religar...'
      Ensure-Funnel | Out-Null
      if (Test-LinkPublico) { Log 'link fixo voltou a responder.' }
      else { Log 'ATENCAO: link fixo ainda sem resposta.' }
    }
  }

  Start-Sleep -Seconds 10
}