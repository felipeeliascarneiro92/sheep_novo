@echo off
echo.
echo ===================================================
echo     ATUALIZAR PROJETO NO GITHUB - SHEEPHOUSE
echo ===================================================
echo.

REM Verifica se Git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] O Git nao esta instalado!
    echo Instale aqui: https://git-scm.com/download/win
    pause
    exit /b
)

REM Verifica se é um repositório Git
if not exist ".git" (
    echo [ERRO] Este nao e um repositorio Git!
    echo Use 'subir_projeto.bat' para primeira vez.
    pause
    exit /b
)

echo.
echo O que voce quer fazer?
echo.
echo 1. Atualizar com todas as mudancas de hoje
echo 2. Atualizar com mensagem personalizada
echo 3. Ver status (o que foi alterado)
echo 4. Cancelar
echo.
set /p opcao="Escolha (1-4): "

if "%opcao%"=="4" (
    echo Cancelado.
    pause
    exit /b
)

if "%opcao%"=="3" (
    echo.
    echo === ARQUIVOS ALTERADOS ===
    git status
    echo.
    pause
    exit /b
)

set mensagem=""

if "%opcao%"=="1" (
    REM Gera mensagem automática com data
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%b-%%a)
    set mensagem=Atualização do projeto - %mydate%
) else if "%opcao%"=="2" (
    echo.
    set /p mensagem="Digite a mensagem do commit: "
) else (
    echo Opcao invalida!
    pause
    exit /b
)

echo.
echo [1/4] Verificando alteracoes...
git status

echo.
echo [2/4] Preparando arquivos...
git add .

echo.
echo [3/4] Salvando alteracoes...
git commit -m "%mensagem%"

echo.
echo [4/4] Enviando para o GitHub...
git push

echo.
echo ===================================================
echo             ATUALIZACAO CONCLUIDA!
echo ===================================================
echo.
echo Seu projeto foi atualizado no GitHub!
echo Acesse: https://github.com/felipeeliascarneiro92/sheep2026
echo.
pause
