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

## Hechos de RYM verificados (2026-10-21, listas)

Capturados del sitio real salvo lo marcado como no verificado.

- Página de lista `/list/<user>/<slug>/`: título en `#content h1`; autor `a.user[href^="/~"]`; categorías
  `Categories:` → `a.genre[href^="/list_classifier/<Name>/"]`; id como `[List<id>]` dentro de un `<p>`; likes en
  `span[id^="favtext_"]` como `+N`; items = el número máximo de `#nav_bottom .navlinkcurrent` ("369 - 345") o, sin
  paginación, el conteo de `table#user_list td.number`.
- Índice de listas de un usuario `/list/<user>/`: `table.mbgen` con filas `a.listpage_list` y `.smallgray`
  "Created: … | Updated: … | N items".
- `/list_classifier/<Name>/` es plano, paginado y sin ranking (sin likes, sin filtro de género/año): inútil para descubrir.
- Búsqueda de listas: `searchtype=s` (verificado 2026-10-22 leyendo `RYMsearch.types` en la página de búsqueda; `l` =
  releases, `a` artistas, `z` canciones, `b` sellos, `h` géneros, `u` usuarios). El setting guardado `l` se migra a `s`.
- **PROHIBIDO hacer peticiones a rateyourmusic.com desde el agente** (navegador de T3, Playwright, WebFetch, curl, lo que
  sea): comparte la IP de Alonso y el firewall la bloqueó (2026-10-22, 13 fetch en ~10 s → "IP blocked"). Alonso lo pidió
  explícitamente el 2026-10-26: ni "una sola para verificar". Lo que haya que comprobar en vivo lo hace Alonso y manda
  captura o HTML guardado; el agente trabaja con fixtures en `test/fixtures/`.
- El markup de la sección de listas en la página de release **no está verificado** (Cloudflare bloqueó la captura).
  El parser se basa en anclas `/list/<user>/<slug>/`; el bloque del fixture es una suposición.
- `fetch` repetido desde la página dispara Cloudflare (403/503) también con listas. Ver política abajo.

## Hechos de RYM verificados (2026-10-26, películas)

- Película: `/film/<slug>/` (ej. `/film/monster_house/`); título `.film_title h1`; `table.film_info tr` con `th.info_hdr`
  (Directed by, Release date, Runtime, Language, Genres); año en `meta[itemprop=dateCreated]` o
  `a[href^="/charts/top/film/<año>/"]`; géneros `.film_pri_genres`/`.film_sec_genres a.film_genre` con
  `href="/film_genre/Computer+Animation/"` y `title="[GenreN]"`; sin descriptores.
- Chart de cine: `/charts/top/film/{año|2000s|2000-2010|all-time}/g:…/s:…/d:…/l:…/u:…/separate:live,archival,soundtrack/`;
  verificados `l:en`, décadas, rangos, `g:all,…`, `s:`, `d:`.
- El slug de género de cine no sale del href de la película: "Comedy" de cine es `comedy-1` (el `comedy` es de música);
  un slug equivocado se ignora en silencio. El script aprende nombre→slug en charts de cine
  (`.page_charts_section_charts_item_genres_* a.genre`) y en la página de género; semilla Comedy→comedy-1, Satire→satire-1.
- Los acentos se quitan en el slug: "Cinéma Vérité" → `cinema-verite` (verificado por Alonso, `g:all,cinema%2dverite`).
- `/film_genre/<Name>/`: cronológica, sin ranking; breadcrumb `.ui_breadcrumb_item_main`, `[GenreN]` en `div.shortcut`.
- Compatibles de cine: `/find_similar_users?user=<u>&scope=film`, mismo markup que música.
- Letterboxd: `og:title` "Monster House (2006)", `og:url` `/film/monster-house/`.
- Convenciones nuevas (1.4): claves `rym_chart_picker_compat_film_v1`, `rym_chart_picker_film_genres_v1`; setting
  `filmCompatSource` (film|music|both, default film); enlaces cruzados vía DuckDuckGo `\` (I'm feeling ducky), sin peticiones.
- Fixtures de cine en `test/fixtures/` (film, film_genre, charts, find_similar_users, letterboxd) para el smoke test.

## Convenciones

- Settings bajo la clave `rym_chart_picker_settings_v16` (compartida con el script original; no la cambies).
  Lista de compatibles bajo `rym_chart_picker_compat_v1`.
- Listas (1.3): caché y `compatLists` bajo `rym_chart_picker_lists_v1`; listas con estrella bajo
  `rym_chart_picker_starred_lists_v1`. Settings nuevos: `listSearchType`, `listFetchDelayMs` (default 3000), `listFetchMax` (default 25).
- Toda lógica de URL (parse/build) es pura y va arriba del `if (typeof module !== "undefined")`. Si tocas
  esa lógica, agrega el caso al test.
- UI en inglés (como RYM); docs y conversación en español.
- Lo que el usuario descartó: campos de rango de año y botón ±N (quitados en 1.1.1, no los regreses); agregación
  "lists you keep running into" (listas que se repiten entre varios discos, 1.3; no la propongas).
- Orden del panel (1.1.2, pedido por Alonso): Year · Primary · Secondary · Descriptors · Music releases · Languages · Users.
  Year e idiomas sin texto explicativo ("all time" como chip, "none"). La tabla Music releases imita el filtro nativo
  de RYM; `TYPE_PRESETS.albums`/`singles` están asumidos (album / single), no verificados contra RYM.

## Semántica que no hay que romper (1.2.0)

- `state.fromUrl` (modo chart): el URL se reproduce tal cual; los defaults de settings (tipo, idioma, usuarios) solo
  aplican a estados nuevos de página de release. `state.urlUsers`: `null` = usar settings, `[]` = el URL no traía `u:`.
- `selectCompatUsers`: top N cuenta usuarios distintos y no excluidos; `compatMinScore` es opcional (default 0) y el
  flag `compatMinScoreV2` marca settings ya migrados (los viejos traían 70 y recortaban el top N).
- El `@namespace` cambió a `alonso-reyna` en 1.1.2; una instalación vieja (`alonsoreyna`) convive como script aparte.
- Revisión GPT 2026-10-20 pendiente de atender (bajo impacto): restaurar `innerHTML` al apagar Search pierde listeners
  de RYM; no hay observer para cuando RYM re-renderiza una fila; `window.open` del fallback puede bloquearse como popup.

## Política anti-Cloudflare para listas (1.3)

- El fetch de listas solo ocurre por clic ("Rate N unrated", "Lists by compatible users"): secuencial, con delay
  (`listFetchDelayMs`) y tope (`listFetchMax`), y se detiene en el primer error.
- Si RYM bloquea, el script lo dice y manda a abrir las listas a mano; la captura pasiva al visitar una página de
  lista es el camino seguro. No agregues fetch automático ni en paralelo.

- Listas 1.3: `parseReleaseListsSection` falla cerrado (devuelve `null` si el contenedor no es acotado: body/#content, >=60 % de los enlaces, >4 enlaces por lista). Los fetch automáticos solo en release/chart. Escrituras de caché/estrellas se fusionan con lo guardado (`mergeListCaches`/`mergeStarred`). Entradas con lectura >30 días se tratan como no leídas.

## Roadmap 1.2 (acordado, no empezado)

Presets guardados · canasta persistente entre discos · exclusión con Shift+clic (`-slug`) · atajos de teclado ·
soporte en páginas de artista/género. Detalle en `brainstorms/2026-10-20-rym-chart-picker-1-1.md`.
