@echo off
REM ============================================
REM  Deixa o Catalogo de Animes aberto 24 horas por dia.
REM  Instala o vigia para iniciar com o Windows.
REM   - se o servidor cair, abre ele de novo em ate 10 segundos
REM   - ao ligar o PC, comeca sozinho
REM ============================================
cd /d "%~dp0"

echo Instalando o servico 24h...

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v CatalogoAmigosVigia /t REG_SZ /f /d "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0vigia-amigos.ps1\"" >nul

echo Iniciando o vigia agora...
start "" /MIN powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0vigia-amigos.ps1"

echo.
echo Pronto! O Catalogo de Animes agora fica aberto 24 horas:
echo  - Se o servidor fechar sozinho, ele reabre em ate 10 segundos.
echo  - Ao ligar o PC, ele inicia sozinho.
echo  - Log de eventos: vigia-amigos.log (na pasta do site).
echo.
echo Link publico: https://user.tail025e8c.ts.net:8788  (nunca muda)
echo.
pause