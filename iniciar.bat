@echo off
title Catalogo de Animes
cd /d "%~dp0"
echo.
echo  ============================================
echo   CATALOGO DE ANIMES
echo  ============================================
echo.
echo   Acesse no computador:  http://localhost:8788
echo   Link publico permanente:  https://user.tail025e8c.ts.net:8788
echo   (nunca muda - veja com o ver-link.bat)
echo.
echo   Aperte Ctrl+C para encerrar.
echo.
npm run start -- -p 8788
pause