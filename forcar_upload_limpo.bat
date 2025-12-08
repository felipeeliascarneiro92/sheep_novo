@echo off
echo.
echo ===================================================
echo     FORCAR UPLOAD LIMPO - SHEEPHOUSE
echo ===================================================
echo.

echo ATENCAO: Isso vai reinicializar o repositorio local para remover qualquer historico do arquivo secreto.
echo Seus arquivos de codigo estarao seguros.
echo.
pause

echo.
echo [1/6] Limpando configuracao Git antiga...
rmdir /s /q .git

echo.
echo [2/6] Configurando Usuario...
set /p GitName="Digite seu Nome: "
set /p GitEmail="Digite seu Email: "

echo.
echo [3/6] Iniciando novo repositorio limpo...
git init
git config user.name "%GitName%"
git config user.email "%GitEmail%"

echo.
echo [4/6] Garantindo que o arquivo secreto seja ignorado...
echo services/credentials.ts >> .gitignore

echo.
echo [5/6] Criando commit inicial seguro...
git add .
git commit -m "Upload Seguro SheepHouse"
git branch -M main

echo.
echo [6/6] Conectando ao GitHub...
set /p RepoUrl="Cole o link do repositorio GitHub novamente: "
git remote add origin %RepoUrl%

echo.
echo [ENVIANDO]...
git push -u -f origin main

echo.
echo ===================================================
echo                 AGORA VAI DAR CERTO!
echo ===================================================
pause
