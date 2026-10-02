@echo off
echo Encerrando o servico 24h do Catalogo de Animes...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v CatalogoAmigosVigia /f >nul 2>&1

echo Matando o vigia...
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'powershell.exe'\" | Where-Object { $_.CommandLine -match 'vigia-amigos' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo Matando o servidor...
powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -match 'next' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo.
echo Pronto. O link publico para de responder, mas TODOS os dados continuam salvos na pasta do site.
echo Para voltar a ficar 24h, rode o instalar-24h.bat de novo.
echo.
pause