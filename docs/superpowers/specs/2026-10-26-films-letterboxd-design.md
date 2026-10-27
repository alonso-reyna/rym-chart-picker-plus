# Películas en RYM + puente con Letterboxd (1.4)

## Para qué

Alonso usa RYM también para cine. Hoy el picker solo entiende música: en la página de una película no hay panel,
la página de género de cine (`/film_genre/<Name>/`) lista en orden cronológico en vez de dar un top, y en un chart de
películas el panel rompería el URL (no reconoce el tipo `film`). Además quiere brincar entre RYM y Letterboxd con un
clic, igual que su atajo de Spotify → RYM.

## Metas

1. **Botón RYM → Letterboxd** en la página de una película de RYM: abre la misma película en Letterboxd.
2. **Botón Letterboxd → RYM** en la página de una película de Letterboxd: abre la misma película en RYM.
3. **Panel en la página de película**: el mismo panel que en discos (Year · Primary · Secondary · Languages · Users) que
   arma un chart `/charts/top/film/…`.
4. **Página de género de cine**: botón "Top chart" (directo a `/charts/top/film/all-time/g:<slug>/`) **y** el panel
   completo, con ese género precargado, para combinarlo con año, otros géneros, etc.
5. **Charts de películas**: el panel corre y respeta `film` y `separate:…` al reconstruir el URL.

## No-metas

- Nada de calificar, sincronizar ni copiar datos entre RYM y Letterboxd. Solo abrir enlaces.
- Juegos y otros medios de RYM: fuera.
- Listas (1.3) en páginas de película: fuera por ahora.

## Anti-metas

- **Ninguna petición a rateyourmusic.com** (ni del script en segundo plano ni del agente). Los botones solo abren
  pestañas con clic del usuario.
- No romper música: un chart de música debe seguir generando exactamente el mismo URL que hoy.

## Hechos verificados por Alonso (2026-10-26)

- Chart de películas: `/charts/top/film/{año|all-time}/g:<slug>/u:<users>/separate:live,archival,soundtrack/`.
- Slug de género de cine = nombre en minúsculas con guiones: "Computer Animation" → `computer-animation`
  (RYM escribe `computer%2danimation`; da igual).
- Página de género de cine: `/film_genre/Computer+Animation/` (nombre con `+`, sin ranking, cronológica).
- Página de película: título, "Directed by", "Release date" (con año enlazado), "Runtime", "Language",
  "Genres" con primarios (arriba, en negrita) y secundarios (abajo, chicos). Id tipo `[Film6279]`.

## Cómo (decidido)

- Todo en `rym-chart-picker-plus.user.js` (un solo archivo, como siempre). Se agregan `@match` para películas de RYM,
  `/film_genre/*` y `https://letterboxd.com/film/*`.
- **Enlaces cruzados con DuckDuckGo "I'm feeling ducky"** (el mismo truco del atajo `~/.local/bin/rym`):
  - RYM → Letterboxd: `https://duckduckgo.com/?q=` + `\site:letterboxd.com/film <título> <año>`.
  - Letterboxd → RYM: `https://duckduckgo.com/?q=` + `\site:rateyourmusic.com/film <título> <año>`.
  - Junto a cada botón, un enlace chico "search" de respaldo (búsqueda normal de DuckDuckGo sin `\`).
- El panel en modo película oculta la tabla "Music releases" y Descriptors; el segmento de tipo es siempre `film`.
- En charts de película el `separate:…` se conserva tal cual (ya cae en `extraSegments`).
- Lógica de URL (detectar medio, slug de género de cine, URL de DuckDuckGo, chart de película) va en el bloque puro
  con tests en `test/pure.test.js`.

## Mi decisión (Claude) — revisar

- En estados nuevos de película, los defaults de settings de tipo **no** aplican (siempre `film`); los de idioma y
  usuarios sí, igual que en discos.
- Al estado de película nuevo le agrego `separate:live,archival,soundtrack`, que es el default que RYM puso en los
  links de Alonso.
- El botón Letterboxd va en el encabezado de la película, junto al título.
- El año para buscar sale de "Release date"; si no hay, se busca sin año.
- Letterboxd: título y año de `og:title` ("Monster House (2006)") o del encabezado. Por confirmar con HTML guardado.

- Slug de género de cine (ver "HTML guardado"): mapa nombre → slug aprendido en charts de película, sembrado con
  Comedy → `comedy-1` y Satire → `satire-1`; si no está en el mapa, `rymSlug(nombre)`.

## HTML guardado por Alonso (2026-10-26, en `test/fixtures/film/`)

- Película: URL `/film/monster_house/`. Título `.film_title h1`. Tabla `table.film_info tr` con `th.info_hdr`
  (Directed by, Release date, Runtime, Language, Genres). Año: `a[href^="/charts/top/film/"]` dentro de Release
  date, o `meta[itemprop=dateCreated]`. Géneros `.film_pri_genres a.film_genre` / `.film_sec_genres a.film_genre`,
  con `href="/film_genre/Computer+Animation/"` y `title="[Genre20040]"`. No hay fila de descriptores.
- **El `href` del género de cine no trae el slug del chart.** "Comedy" es `comedy-1` en el chart (el `comedy` sin
  número es el de música). Los charts de película sí traen el slug real: `.page_charts_section_charts_item_genres_*
  a.genre[href="/genre/comedy-1/"]` y un JSON con `genre_include: [{id, name, text}]`. De ahí sale el mapa.
- Página de género de cine: breadcrumb `.ui_breadcrumb_item_main span` con el nombre, `[Genre20040]` en
  `div.shortcut`; los géneros relacionados enlazan a `/genre/<slug>/` (útiles para el mapa).
- Chart de película acepta `g:`, `s:` y `d:` (`/charts/top/film/all-time/g:comedy%2d1/d:regional/s:cartoon/separate:…/`).
- Letterboxd: `meta[property="og:title"]` = "Monster House (2006)"; `og:url` = `https://letterboxd.com/film/monster-house/`.

## Usuarios compatibles de cine (pedido por Alonso)

- RYM tiene lista aparte: `/find_similar_users?user=<u>&scope=film` (verificado por Alonso). Mismo markup que la de
  música (`li#page_user_compat_item_N`, `a.user`, `.page_user_compat_pct`); el HTML no dice el scope, se distingue
  por el URL.
- Se guarda en clave nueva `rym_chart_picker_compat_film_v1`. La captura pasiva y el "sync" (un fetch, fallback a
  abrir la página) funcionan igual que en música, usando `&scope=film`.
- En modo película, el filtro "compatible users" deja escoger la fuente: **Film** (default), **Music** o **Both**
  (Top N de cada lista, unidas sin duplicados; mi decisión). Top N, exclusiones y score mínimo son los mismos settings.
- Mi decisión: los demás defaults (idioma, following/followers/myself/other) aplican a películas igual que a discos.

## Por confirmar con Alonso

- Nada pendiente. Verificado por Alonso (2026-10-26): en charts de película funcionan `l:en`, décadas (`2000s`),
  rangos (`2000-2010`) y `g:all,…` ("Must contain all genres"). `s:comedy` se ignoró en silencio: confirma que el
  Comedy de cine es `comedy-1` y que un slug equivocado no da error, solo desaparece del filtro.

## Fixtures


Copias de los HTML guardados por Alonso (película RYM, `/film_genre/Computer+Animation/`, chart de película,
película en Letterboxd) en `test/fixtures/film/`, recortadas a lo necesario. Sin peticiones a RYM.
