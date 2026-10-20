# RYM Chart Picker+

Userscript (Tampermonkey) para rateyourmusic.com. Fork de "RYM Music Chart Picker" de Lin808.
Todo el código vive en `rym-chart-picker-plus.user.js`; es un solo archivo a propósito.

## Archivos

- `rym-chart-picker-plus.user.js`: el script. Bloque de funciones puras arriba (exportado bajo node), runtime/DOM abajo.
- `test/pure.test.js`: tests de las funciones puras. `node test/pure.test.js` antes de cualquier entrega.
- `test/fixtures/`: páginas falsas (release, chart, find_similar_users) + `stub.js` con `GM_*` falsos, para smoke test en navegador.
- `TUTORIAL.md`: cómo se usa (para Alonso). Actualízalo cuando cambie la UI.
- `brainstorms/`: decisiones de diseño y hallazgos verificados en RYM. Lee el más reciente antes de proponer features.

## Cómo probar

1. `node test/pure.test.js`.
2. Smoke test: `cd test/fixtures && cp ../../rym-chart-picker-plus.user.js script.js && python3 -m http.server 8765`,
   abre `http://localhost:8765/release/album/ecco2k/e/`, activa el panel y revisa `window.__errors` y el URL
   gris del panel. Borra `script.js` al terminar (no se versiona).
3. En RYM real: Tampermonkey instala desde el raw de GitHub (`@updateURL` en el header, repo
   `alonso-reyna/rym-chart-picker-plus`, rama `main`). Tras editar, **sube `@version`** (si no, Tampermonkey
   no actualiza), commit, push; luego "Check for userscript updates" y F5 en RYM.

## Hechos de RYM verificados (2026-10-20)

Cachéalos: cada uno costó una prueba en vivo y RYM los cambia sin avisar.

- Slug de género: tómalo del `href` (`/genre/<slug>/`), nunca del texto. `&` se pega: "R&B" → `randb`.
- Chart URL: `/charts/{top|popular|esoteric|diverse}/{tipos,}/{año|2010s|2010-2015|all-time}/g:…/d:…/s:…/l:…/u:…/`.
  Hífenes planos funcionan (RYM escribe `%2d`, da igual).
- "Must contain all" = token `all` al inicio de la lista: `s:all,cloud-rap,ambient-pop`. Igual para `g:` y `d:`.
- `u:` acepta lista plana de usernames y tokens `followed_by:x`, `followers_of:x`.
- `find_similar_users?user=X`: `li#page_user_compat_item_N` → `a.user[href="/~name"]`; `.page_user_compat_pct`
  tiene `style="width:P%"` = score relativo (rank 1 = 100 %). 100 usuarios, sin paginación, sin % absoluto.
- `fetch` repetido desde la página dispara Cloudflare (403 "Verification"). Un fetch por sync y fallback a
  abrir la página, donde este mismo script captura la lista.
- Release: `.album_info tr` con `th` Artist/Type/Released/Recorded/Genres/Descriptors/Language.
  Géneros en `.release_pri_genres a.genre` y `.release_sec_genres a.genre`. Username propio: `a.header_profile_main`.

## Convenciones

- Settings bajo la clave `rym_chart_picker_settings_v16` (compartida con el script original; no la cambies).
  Lista de compatibles bajo `rym_chart_picker_compat_v1`.
- Toda lógica de URL (parse/build) es pura y va arriba del `if (typeof module !== "undefined")`. Si tocas
  esa lógica, agrega el caso al test.
- UI en inglés (como RYM); docs y conversación en español.
- Lo que el usuario descartó: campos de rango de año y botón ±N (quitados en 1.1.1, no los regreses).
- Orden del panel (1.1.2, pedido por Alonso): Year · Primary · Secondary · Descriptors · Music releases · Languages · Users.
  Year e idiomas sin texto explicativo ("all time" como chip, "none"). La tabla Music releases imita el filtro nativo
  de RYM; `TYPE_PRESETS.albums`/`singles` están asumidos (album / single), no verificados contra RYM.

## Roadmap 1.2 (acordado, no empezado)

Presets guardados · canasta persistente entre discos · exclusión con Shift+clic (`-slug`) · atajos de teclado ·
soporte en páginas de artista/género. Detalle en `brainstorms/2026-10-20-rym-chart-picker-1-1.md`.
