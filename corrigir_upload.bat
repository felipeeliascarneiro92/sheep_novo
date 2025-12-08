@echo off
echo.
echo ===================================================
echo     CORRECAO DE UPLOAD - SHEEPHOUSE
echo ===================================================
echo.

echo [1/4] Desfazendo ultimo commit bloqueado...
git reset --soft HEAD~1

echo.
echo [2/4] Removendo arquivo secreto da lista de envio...
git reset services/credentials.ts

echo.
echo [3/4] Recriando o pacote (commit) seguro...
git add .
git commit -m "Upload inicial SheepHouse (Seguro) - Assistente Antigravity"

echo.
echo [4/4] Tentando enviar novamente...
git push -f origin main

echo.
echo ===================================================
echo                 PROCESSO CONCLUIDO!
echo ===================================================
pause
