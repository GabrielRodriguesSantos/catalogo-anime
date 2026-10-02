@echo off
set /p LINKA=<"%~dp0link-publico.txt"
echo Abrindo o site: %LINKA%
start "" "%LINKA%"