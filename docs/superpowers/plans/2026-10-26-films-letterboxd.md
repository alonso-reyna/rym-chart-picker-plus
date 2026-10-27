# Películas + Letterboxd (1.4.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel de charts para películas de RYM (página de película, página de género de cine, charts de cine), compatibles de cine, y botones RYM ↔ Letterboxd.

**Architecture:** Todo en `rym-chart-picker-plus.user.js`. Lógica de URL/parseo pura arriba del `if (typeof module …)` y exportada en `PURE_API`; runtime abajo. El estado gana `media: "music" | "film"`; las páginas de película reutilizan el flujo de `PAGE === "release"` con una constante `MEDIA`. Letterboxd es una rama aparte al inicio del runtime (otro host).

**Tech Stack:** JS plano de userscript (Tampermonkey, `GM_*`), tests con `node test/pure.test.js` (assert), smoke test con `test/fixtures` + `python3 -m http.server`.

**Spec:** `docs/superpowers/specs/2026-10-26-films-letterboxd-design.md`

## Global Constraints

- **Cero peticiones a rateyourmusic.com desde el agente** (ni curl, ni navegador, ni Playwright). Solo fixtures.
- Un solo archivo de script. UI en inglés; docs en español.
- Claves de storage existentes intactas (`rym_chart_picker_settings_v16`, `rym_chart_picker_compat_v1`, …). Nuevas:
  `rym_chart_picker_compat_film_v1`, `rym_chart_picker_film_genres_v1`.
- Chart de película: `/charts/{listing}/film/{año}/g:…/s:…/d:…/l:…/u:…/separate:live,archival,soundtrack/`.
- Estado de película nuevo agrega `separate:live,archival,soundtrack`.
- Semilla de slugs de cine: `Comedy → comedy-1`, `Satire → satire-1`; si no hay dato, `rymSlug(nombre)`.
- DuckDuckGo: `https://duckduckgo.com/?q=` + `encodeURIComponent("\\site:<host>/film <título> <año>")`; respaldo sin `\`.
- Compatibles de cine: `/find_similar_users?user=<u>&scope=film`. Fuente en modo película: `film` (default) | `music` | `both` (Top N de cada una, unión sin duplicados, case-insensitive).
- Un chart de música debe producir exactamente el mismo URL que en 1.3.2 (los tests existentes no cambian).
- `@version 1.4.0`.

## Review Focus

1. Chart de música abierto con el script nuevo: el URL reconstruido es idéntico al de 1.3.2 → test de regresión en Task 1.
2. Género de cine cuyo slug no se ha aprendido y choca con uno de música (Comedy): debe salir `comedy-1`, no `comedy` → Task 2.
3. Aprender slugs en una página de **música** contaminaría el mapa de cine (`/genre/comedy/`): solo se aprende en páginas de cine → Task 6 (guardia en runtime) y Task 2 (parser recibe el root ya acotado).
4. Título con caracteres especiales en Letterboxd/RYM ("Amélie", "Lilo & Stitch", "8½"): el query debe ir codificado y sin año si no hay → Task 3.
5. Compatibles en modo `both` con usuario repetido en ambas listas y exclusiones: sin duplicados, exclusiones respetadas → Task 4.

---

### Task 1: Medio "film" en parse/build de charts

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (`createState` ~476, `parseChartPath` ~501, `buildTypeSegment` ~595, `buildChartUrl` ~686, `PURE_API` ~1244)
- Test: `test/pure.test.js`

**Interfaces:**
- Produces: `state.media` (`"music"` default); `FILM_SEPARATE_SEGMENT = "separate:live,archival,soundtrack"`; `createFilmState() -> state` (media film, `extraSegments: [FILM_SEPARATE_SEGMENT]`); `parseChartPath` pone `media = "film"` cuando `parts[2] === "film"` y deja `types` vacío; `buildChartUrl` escribe `film` como segmento de tipo si `state.media === "film"`.

- [ ] **Step 1: Tests que fallan**

```js
// film charts
let fp = api.parseChartPath("/charts/top/film/all-time/g:comedy%2d1/d:regional/s:cartoon/separate:live,archival,soundtrack/");
assert.equal(fp.state.media, "film");
assert.equal(fp.state.types.size, 0);
assert.equal(api.buildChartUrl(fp.state, settings, ctx),
  "https://rateyourmusic.com/charts/top/film/all-time/g:comedy-1/d:regional/s:cartoon/separate:live,archival,soundtrack/");
fp = api.parseChartPath("/charts/top/film/2000-2010/g:all,animation,family/separate:live,archival,soundtrack/");
assert.equal(api.buildChartUrl(fp.state, settings, ctx),
  "https://rateyourmusic.com/charts/top/film/2000-2010/g:all,animation,family/separate:live,archival,soundtrack/");
const fs0 = api.createFilmState();
assert.equal(api.buildChartUrl(fs0, settings, ctx), "https://rateyourmusic.com/charts/top/film/all-time/separate:live,archival,soundtrack/");
// music regression
assert.equal(api.parseChartPath("/charts/top/album/2010-2015/g:indie-folk/").state.media, "music");
```

Nota: `g:comedy%2d1` se decodifica en `parseChartPath` y se escribe con guion plano; el slug `comedy-1` debe sobrevivir (hoy `labelFromSlug("comedy-1")` + `genreSlugs` lo conserva; verifícalo).

- [ ] **Step 2:** `node test/pure.test.js` → falla (`createFilmState is not a function`).
- [ ] **Step 3:** Implementar y exportar `createFilmState`, `FILM_SEPARATE_SEGMENT`.
- [ ] **Step 4:** `node test/pure.test.js` → todo pasa, incluidos los tests viejos de música.
- [ ] **Step 5:** Commit `feat(film): medio film en parse/build de charts`.

### Task 2: Slugs de género de cine

**Files:** Modify `rym-chart-picker-plus.user.js` (bloque puro, junto a `slugFromGenreHref`); Test `test/pure.test.js`.

**Interfaces:**
- Produces:
  - `FILM_GENRE_SLUG_SEED = { "comedy": "comedy-1", "satire": "satire-1" }` (clave = nombre en minúsculas).
  - `filmGenreNameFromHref(href) -> string|null`: `/film_genre/Computer+Animation/` → `"Computer Animation"` (`+` → espacio, `decodeURIComponent`).
  - `filmGenreSlug(name, learned) -> string`: `learned[name.toLowerCase()]` → seed → `rymSlug(name)`. Conserva prefijo `-`.
  - `parseFilmGenreSlugs(root) -> Object<lowerName, slug>`: lee `a.genre[href^="/genre/"]` dentro de `root` (nombre = texto limpio, slug = `slugFromGenreHref`). El llamador decide el root.
  - `mergeFilmGenreSlugs(stored, found) -> Object` (found gana).

- [ ] **Step 1: Tests que fallan**

```js
assert.equal(api.filmGenreNameFromHref("/film_genre/Computer+Animation/"), "Computer Animation");
assert.equal(api.filmGenreSlug("Comedy", {}), "comedy-1");
assert.equal(api.filmGenreSlug("Computer Animation", {}), "computer-animation");
assert.equal(api.filmGenreSlug("Horror Comedy", { "horror comedy": "horror-comedy-2" }), "horror-comedy-2");
assert.equal(api.filmGenreSlug("-Comedy", {}), "-comedy-1");
// parseFilmGenreSlugs con jsdom-free: usa un objeto doc mínimo como en los tests de listas existentes
```

Para `parseFilmGenreSlugs` sigue el patrón que ya usan los tests de `parseListDocument` (doc falso con `querySelectorAll`). Caso: `<a class="genre" href="/genre/comedy-1/">Comedy</a>` → `{ comedy: "comedy-1" }`.

- [ ] **Step 2:** correr → falla.
- [ ] **Step 3:** implementar y exportar los cinco símbolos.
- [ ] **Step 4:** correr → pasa.
- [ ] **Step 5:** Commit `feat(film): slugs de género de cine (semilla + aprendidos)`.

### Task 3: Enlaces DuckDuckGo y título de Letterboxd

**Files:** Modify bloque puro; Test `test/pure.test.js`.

**Interfaces:**
- Produces:
  - `buildDuckyUrl(site, title, year, lucky = true) -> string`. `site` es `"letterboxd.com/film"` o `"rateyourmusic.com/film"`.
  - `parseLetterboxdOgTitle(text) -> { title, year|null }`: `"Monster House (2006)"` → `{ title: "Monster House", year: 2006 }`; sin año → `year: null`.

- [ ] **Step 1: Tests que fallan**

```js
assert.equal(api.buildDuckyUrl("letterboxd.com/film", "Monster House", 2006),
  "https://duckduckgo.com/?q=" + encodeURIComponent("\\site:letterboxd.com/film Monster House 2006"));
assert.equal(api.buildDuckyUrl("rateyourmusic.com/film", "Lilo & Stitch", null, false),
  "https://duckduckgo.com/?q=" + encodeURIComponent("site:rateyourmusic.com/film Lilo & Stitch"));
assert.deepEqual(api.parseLetterboxdOgTitle("Monster House (2006)"), { title: "Monster House", year: 2006 });
assert.deepEqual(api.parseLetterboxdOgTitle("8½ (1963)"), { title: "8½", year: 1963 });
assert.deepEqual(api.parseLetterboxdOgTitle("Untitled"), { title: "Untitled", year: null });
```

- [ ] **Step 2–4:** fallar, implementar, pasar.
- [ ] **Step 5:** Commit `feat(letterboxd): URLs de DuckDuckGo y parseo de og:title`.

### Task 4: Compatibles de cine en el segmento `u:`

**Files:** Modify `DEFAULT_SETTINGS` ~318, `normalizeSettings` ~830, `buildUserSegment` ~652, bloque puro; Test `test/pure.test.js`.

**Interfaces:**
- Consumes: `selectCompatUsers(compat, settings)` existente.
- Produces:
  - Setting `filmCompatSource: "film"` (valores `film|music|both`; `normalizeSettings` corrige inválidos a `"film"`).
  - `compatScopeFromSearch(search) -> "film"|"music"` (`?user=x&scope=film` → `"film"`).
  - `context.compatFilm` (mismo formato que `context.compat`).
  - `compatNamesFor(state, settings, context) -> string[]`: si `state.media !== "film"` → igual que hoy; si film → según `filmCompatSource`, con `both` = Top N de cada lista, unión sin duplicados case-insensitive, film primero. `buildUserSegment` la usa.

- [ ] **Step 1: Tests que fallan**

```js
const compatFilm = { users: [{ username: "phowbee", score: 100, rank: 1 }, { username: "kai7", score: 90, rank: 2 }] };
const fctx = { ...ctx, compatFilm };
const fstate = api.createFilmState(); fstate.urlUsers = null;
const fset = { ...settings, userFilters: ["compat"], compatTopN: 2 };
assert.equal(api.buildUserSegment(fstate, fset, fctx), "u:phowbee,kai7");
assert.equal(api.buildUserSegment(fstate, { ...fset, filmCompatSource: "music" }, fctx), "u:bnsaiboy,Kai7");
assert.equal(api.buildUserSegment(fstate, { ...fset, filmCompatSource: "both" }, fctx), "u:phowbee,kai7,bnsaiboy");
assert.equal(api.buildUserSegment(fstate, { ...fset, filmCompatSource: "both", compatExcluded: ["phowbee"] }, fctx), "u:kai7,bnsaiboy");
assert.equal(api.compatScopeFromSearch("?user=alonsoreyna&scope=film"), "film");
assert.equal(api.compatScopeFromSearch("?user=alonsoreyna"), "music");
assert.equal(api.normalizeSettings({ filmCompatSource: "x" }).filmCompatSource, "film");
// música sin cambios: el test existente de buildUserSegment con compat sigue igual
```


- [ ] **Step 2–4:** fallar, implementar, pasar.
- [ ] **Step 5:** Commit `feat(film): compatibles de cine (film/music/both)`.

### Task 5: Fixtures de cine

**Files:** Create `test/fixtures/film/monster_house/index.html`, `test/fixtures/film_genre/Computer+Animation/index.html`,
`test/fixtures/charts/top/film/all-time/g:comedy%2d1/d:regional/s:cartoon/separate:live,archival,soundtrack/index.html`,
`test/fixtures/find_similar_users/film.html`, `test/fixtures/letterboxd/film/monster-house/index.html`.

Fuente: `~/Downloads/` (guardados por Alonso 2026-10-26; copias en `/tmp/filmhtml/`). Recórtalos al patrón de los fixtures existentes: quita `<script>` externos y trackers, conserva `.film_title h1`, `table.film_info` completa, el breadcrumb y `div.shortcut` de la página de género con los enlaces relacionados, 3–5 items del chart con sus `a.genre`, 5 usuarios de compatibles, y `<head>` con `og:title`/`og:url` de Letterboxd más el bloque del título de la película. Agrega `<script src="/stub.js"></script><script src="/script.js"></script>` como en `test/fixtures/release/album/ecco2k/e/index.html`. El nombre de la carpeta del chart con `:` y `%2d` debe resolverse con `python3 -m http.server`; si no, usa `g:comedy-1`.

- [ ] **Step 1:** crear fixtures.
- [ ] **Step 2:** `cd test/fixtures && python3 -m http.server 8765` y abrir cada uno: carga sin 404 de HTML.
- [ ] **Step 3:** Commit `test(film): fixtures de película, género, chart, compatibles y Letterboxd`.

### Task 6: Runtime RYM — película, género de cine, chart de cine

**Files:** Modify `rym-chart-picker-plus.user.js` (header `@match`, detección de `PAGE` ~1267, `state` init ~1290, `captureCompatFromCurrentPage` ~1624, `loadCompat`/`saveCompat`, `syncCompat` ~2573, `detectReleaseYear`, `findRowsByLabel`, `infoRoot`, `refreshPageHighlights`, `classifyClick`, `render`, `renderTypes`, settings UI de compat).

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: `MEDIA` (`"film"` si path empieza con `/film/`, `/film_genre/` o chart con `parts[2] === "film"`; si no `"music"`); `PAGE` nuevo `"filmgenre"`; `/film/…` usa `PAGE = "release"`.

- [ ] **Step 1:** `@match` para `https://rateyourmusic.com/film/*`, `https://rateyourmusic.com/film_genre/*` y sus `www.`.
- [ ] **Step 2: película.** `state = createFilmState()` cuando `MEDIA === "film"` y `PAGE === "release"`. `findRowsByLabel` y `infoRoot` aceptan `.film_info`. El año sale de la fila `"release date"` (además de `"released"`). `classifyClick`: en la fila `genres`, `href` con `/film_genre/` → nombre con `filmGenreNameFromHref`, slug con `filmGenreSlug(nombre, learned)`, secundario si `closest(".film_sec_genres")`. `refreshPageHighlights` también marca `a[href*="/film_genre/"]`. En modo película se ocultan las secciones `rym-picker-types` y `rym-picker-desc` (en la página de película; en charts de cine `d:` se conserva y se muestra si viene en el URL) y no se llama `renderReleaseLists`.
- [ ] **Step 3: página de género de cine** (`PAGE = "filmgenre"`): nombre del breadcrumb `.ui_breadcrumb_item_main span`. Botón "Top chart" que abre `buildChartUrl` de un estado de película con solo ese género (all-time). Panel completo con ese género precargado como primario. Aprende slugs de los enlaces relacionados del `table.mbgen`.
- [ ] **Step 4: chart de cine.** Aprende slugs con `parseFilmGenreSlugs` sobre `.page_charts_section_charts_item_genres_primary, …_secondary` y el estado parseado (`genreSlugs`), y los guarda en `rym_chart_picker_film_genres_v1` con `mergeFilmGenreSlugs`. Nunca aprende si `MEDIA !== "film"`.
- [ ] **Step 5: compatibles de cine.** `captureCompatFromCurrentPage` guarda en `rym_chart_picker_compat_film_v1` si `compatScopeFromSearch(location.search) === "film"`. Agrega `syncCompatFilm` (mismo flujo que `syncCompat` con `&scope=film`: un fetch, y si falla, abre la página). `buildContext` agrega `compatFilm`. En modo película, junto al toggle de compatibles, un `<select id="rym-compat-source">` (Film / Music / Both) que escribe `settings.filmCompatSource`.
- [ ] **Step 6: smoke test** (fixtures de Task 5): película → activar Search, clic en "Computer Animation" y "Comedy" (secundario) → URL gris `…/charts/top/film/2006/g:computer-animation/s:comedy-1/separate:live,archival,soundtrack/` (si el año se agregó); género → botón "Top chart" con `g:computer-animation`; chart de cine → "Update chart" reproduce el URL; release de música → mismo URL que antes. `window.__errors` vacío en todos.
- [ ] **Step 7:** `node test/pure.test.js` pasa. Commit `feat(film): panel en película, género de cine y charts de cine; compatibles de cine`.

### Task 7: Botones RYM ↔ Letterboxd

**Files:** Modify `rym-chart-picker-plus.user.js` (header, inicio del runtime).

**Interfaces:** Consumes `buildDuckyUrl`, `parseLetterboxdOgTitle` (Task 3).

- [ ] **Step 1:** `@match https://letterboxd.com/film/*`. Al inicio del runtime, si `location.hostname` termina en `letterboxd.com`: leer `meta[property="og:title"]`, insertar junto al título (`h1` de la película; si no hay, flotante arriba a la derecha) un enlace "RYM" → `buildDuckyUrl("rateyourmusic.com/film", title, year)` y un enlace chico "search" → mismo con `lucky=false`. Ambos `target="_blank" rel="noopener"`. `return` sin tocar nada más.
- [ ] **Step 2:** En película de RYM, junto a `.film_title h1`: enlace "Letterboxd" → `buildDuckyUrl("letterboxd.com/film", h1, año)` y "search". Usa el año de `meta[itemprop=dateCreated]` o de la fila Release date.
- [ ] **Step 3: smoke test** con los fixtures de película y de Letterboxd: los `href` coinciden con los de los tests de Task 3; `window.__errors` vacío.
- [ ] **Step 4:** Commit `feat(letterboxd): botones RYM ↔ Letterboxd`.

### Task 8: Versión y docs

**Files:** Modify `rym-chart-picker-plus.user.js` (`@version 1.4.0`, `@description` menciona films y Letterboxd), `TUTORIAL.md` (sección Películas y Letterboxd), `CLAUDE.md` (hechos verificados 2026-10-26: URL de película, `.film_info`, `/film_genre/`, `comedy-1`, `scope=film`, `l:`/rangos/`all,` en cine; claves nuevas; `filmCompatSource`).

- [ ] **Step 1:** editar.
- [ ] **Step 2:** `node test/pure.test.js` pasa; borrar `test/fixtures/script.js`.
- [ ] **Step 3:** Commit `1.4.0: películas (panel, género, charts, compatibles de cine) y puente Letterboxd`. No hacer push sin que Alonso lo pida.
