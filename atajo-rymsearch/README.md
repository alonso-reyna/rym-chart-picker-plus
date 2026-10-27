# Atajo RYMsearch (Spotify → RYM)

Abre en Rate Your Music el álbum de lo que suena en Spotify (app de escritorio). Aquí vive la copia
versionada; lo que corre de verdad está en `~/.local/bin`. Tras editar: `./install.sh`.

## Cadena

1. **Atajo "RYMsearch"** (app Atajos, Quick Action con tecla asignada): una sola acción
   *Run Shell Script* → `~/.local/bin/rym` (zsh, input a stdin). No se puede exportar por terminal.
2. **`rym`**: le pregunta a Spotify artista/álbum, limpia sufijos (Deluxe, Remaster…), arma el URL
   (DuckDuckGo `\` → primer resultado de `rateyourmusic.com/release`; `rym search` = búsqueda de RYM),
   lo escribe en `/tmp/rym-url` y abre `~/Applications/RYM Abrir.app`.
3. **`RYM Abrir.app`** (applet de AppleScript, fuente en `RYM Abrir.applescript`): solo corre
   `~/.local/bin/rym-abrir`. Existe para que los permisos de Accesibilidad/Automatización sean de una
   app fija y no de la app que tengas al frente.
4. **`rym-abrir`**: si ya hay una ventana de Chrome con RYM, abre pestaña ahí. Si no, llama a
   `rym-espacio-vacio.js`, abre una ventana nueva de Chrome (perfil Default), espera a que exista,
   la coloca en la pantalla correcta y la trae al frente.
5. **`rym-espacio-vacio.js`**: con ⌃→/⌃← busca el escritorio vacío más cercano (+1, −1, +2, …) en la
   pantalla donde estás; si no hay, regresa al original.

Log de cada corrida: `/tmp/rym.log` (`reuso:`, `espacio:`, `ventana:`).

## Fix 2026-10-27 (escritorio vacío sin la pestaña, con y sin monitor)

- El escritorio actual se leía del `.plist` crudo, que macOS escribe con retraso: ahora se lee vía
  `defaults export` (cfprefsd) y cada tecla se confirma esperando a que el escritorio cambie de verdad.
- Con "Displays have separate Spaces" el script siempre revisaba la pantalla principal, aunque las
  teclas movieran la otra: ahora la primera tecla detecta qué pantalla se movió y usa esa.
- "Vacío" solo miraba la esquina superior izquierda de cada ventana: ahora usa intersección real y
  confirma con dos lecturas.
- Chrome se activaba a los 0.7 s, antes de que existiera la ventana, y macOS saltaba a otro escritorio
  con Chrome. Ahora espera la ventana nueva (hasta 10 s) y, si Chrome la abrió en la otra pantalla,
  la mueve al área de la pantalla donde estás.

Respaldo de la versión anterior: `~/.local/share/rym-backup-2026-10-27/`.
