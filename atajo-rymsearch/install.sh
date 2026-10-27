#!/bin/zsh
# Copia los scripts del repo a ~/.local/bin (de ahí los corre el Atajo). No toca "RYM Abrir.app":
# recompilarla le quitaría los permisos de Accesibilidad/Automatización que ya tiene.
set -e
cd "${0:a:h}"
mkdir -p ~/.local/bin
cp rym rym-abrir rym-espacio-vacio.js ~/.local/bin/
chmod +x ~/.local/bin/rym ~/.local/bin/rym-abrir
echo "Instalado en ~/.local/bin"
