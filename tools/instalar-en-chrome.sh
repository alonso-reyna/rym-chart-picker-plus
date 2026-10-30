#!/bin/zsh
# Abre el link de instalación del script (commit actual, o el SHA que le pases) en el Chrome donde está RYM.
# Solo abre GitHub raw; no hace peticiones a rateyourmusic.com.
sha=${1:-$(git -C "${0:A:h}/.." rev-parse HEAD)}
url="https://raw.githubusercontent.com/alonso-reyna/rym-chart-picker-plus/$sha/rym-chart-picker-plus.user.js"
print -r -- "$url"
osascript - "$url" <<'OSA'
on run argv
	if application id "com.google.Chrome" is running then
		tell application id "com.google.Chrome"
			repeat with w in windows
				repeat with t in tabs of w
					if URL of t contains "rateyourmusic.com" then
						tell w to make new tab with properties {URL:(item 1 of argv)}
						set index of w to 1
						activate
						return "abierto en la ventana de RYM"
					end if
				end repeat
			end repeat
		end tell
	end if
	do shell script "open -b com.google.Chrome --args --profile-directory=Default " & quoted form of (item 1 of argv)
	return "abierto en Chrome (perfil Default)"
end run
OSA
