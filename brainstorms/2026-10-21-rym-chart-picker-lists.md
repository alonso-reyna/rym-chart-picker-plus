# RYM Chart Picker+ 1.3: Listas (diseño)

Fecha: 2026-10-21 · Estado: diseño aprobado en conversación, pendiente de plan e implementación.
Lee antes `2026-10-20-rym-chart-picker-1-1.md` (contexto del script, hechos verificados de RYM, Cloudflare).

## Intención

En la página de un release, RYM muestra "listas donde está este álbum". La mayoría son diarios personales
("listening log 2026", "2024 : LOG", "*") y no hay forma de distinguir las listas curadas sin abrir una por una.
Alonso quiere encontrar listas curadas: a partir del disco que está viendo, y también a partir de la gente con
gusto parecido al suyo. El classifier de RYM (`/list_classifier/`) es la fuente de verdad sobre qué es una lista,
pero solo se ve en la página de cada lista.

## Hechos de RYM verificados en esta sesión (2026-10-21, screenshots de Alonso)

- Página de lista (`/list/<user>/<slug>/`): título, "A list by <user>", `Categories: <links al classifier>`,
  `[List<id>]`, likes como `♡ +N`, paginación con número total de ítems (p. ej. "369 - 345" en la primera página),
  botón "Suggest an addition". Ejemplo: `listening log 2026` → Categories: Listener's Diary, 1 like, 369 ítems.
- Página del classifier (`/list_classifier/<Nombre%20codificado>/`, p. ej. `Listener%27s+Diary`): listado plano y
  paginado (1,260 páginas para Listener's Diary), cada entrada con título, descripción, "Author: <user>; N items".
  **Sin likes, sin orden por popularidad, sin filtro por género ni año.** Internamente es un descriptor
  (`[Descriptor27287]`). No sirve para rankear ni para buscar; solo como diccionario de categorías.
- Taxonomía del classifier (rama Music y transversales; pegada por Alonso): Best Of, Chart Position,
  Music Genres (Pop, Rock…), Music Scenes, Time Periods → All Time / Century / Decade (1870s–2020s) / Year
  (1950–2026), Underrated, Obscure, Worst Of, Influences, Record Labels, Discographies, Artist, Composers,
  Producers, Instruments, Length, Live Performance, Radio, Samples, Scores & Soundtracks, Songs (Homemade
  Playlists, Lyrics…), Releases (Release Attributes, Release Titles, Cover Song Versions, Music Videos),
  Lists From Other Publications (1001 Albums…), Galleries → Cover Art Themes (muchas subcategorías),
  RYM → Autobiographical (Listener's Diary, Gamer's Diary, Viewer's Diary, My Life on RYM), Users, Poll Results,
  Lists of Lists, Projects, Shopping List, Wishlists, Upcoming, Reviews, Humor, Guide, Regions, Miscellaneous.
- Sección de listas en la página del release: tarjeta con portada, título (truncado) y autor. **Nada más**: ni
  likes, ni categoría, ni tamaño. Selectores DOM pendientes de verificar (ver "Por verificar").

## Decisiones (de Alonso)

1. **Pestañas en la sección de listas del release** (opción B del mockup): Curated · Unrated · Logs · All.
   Reemplaza la vista plana; lo bueno por default, el ruido a un clic.
2. **Listas de usuarios compatibles**: descubrir listas curadas donde el disco actual no necesariamente está,
   recorriendo las listas de los usuarios de `find_similar_users` que ya tenemos en caché.
3. **Buscar listas con los filtros del picker**: atajo a la búsqueda de listas de RYM con género + año del estado
   actual.
4. **Soporte en página de lista**: el panel aparece en `/list/*`, muestra la calificación de la lista y permite
   marcarla con estrella; las listas con estrella quedan como accesos rápidos en el panel.

Descartado por Alonso (no construir): "Lists you keep running into" (agregación de listas a lo largo de los
releases visitados). Navegación por página del classifier (no rankea).

## Goals / Non-goals / Anti-goals

- Goal: en un release, ver primero las listas curadas con categoría, likes y tamaño; esconder diarios.
- Goal: desde el panel, llegar a listas curadas de gente compatible y a la búsqueda de listas de RYM.
- Goal: desde una lista, guardarla como favorita y verla desde cualquier página.
- Non-goal: rankear el classifier entero, indexar RYM, o replicar su buscador.
- Non-goal: cambiar nada del flujo de charts existente (semántica 1.2.0 intacta).
- Anti-goal: **disparar Cloudflare**. Un 403 en RYM real es un fallo del diseño, no un detalle. Ningún fetch
  automático en segundo plano; todo fetch es explícito, secuencial, con pausa y se detiene al primer error.
- Anti-goal: romper la sección de listas nativa (listeners de RYM, re-render). Si el script falla, la sección
  original debe quedar visible e intacta.

## Restricciones

- Un solo archivo `rym-chart-picker-plus.user.js`; funciones puras arriba del `module.exports`, con test en
  `test/pure.test.js`. Toda lógica de clasificación, puntuación, parseo de documentos y construcción de URLs es
  pura y se prueba contra fixtures.
- Settings siguen en `rym_chart_picker_settings_v16`. Claves nuevas: `rym_chart_picker_lists_v1` (caché de
  metadatos de listas) y `rym_chart_picker_starred_lists_v1` (favoritas). Compatibles: `rym_chart_picker_compat_v1`.
- `@match` nuevo: `https://rateyourmusic.com/list/*` (y `www.`). Posiblemente `/~*/lists*` si la vía de
  fallback "abrir la página y capturar" se usa para listas de usuarios (ver F2).
- UI en inglés. Sube `@version` a 1.3.0.

## Modelo de datos

### Clasificación de una lista

Tres clases: `curated`, `log`, `other`, más `unknown` cuando no hay datos.

- Por **categoría del classifier** (fuente de verdad, cuando la lista ya está en caché). La página de la lista
  muestra solo la hoja ("Listener's Diary", "Shoegaze", "1994"), sin el camino a la raíz, así que **no** se embebe
  el árbol: se mantienen dos conjuntos cortos y el default es `curated` (llamada del diseñador: lo que Alonso
  busca son listas de género/año/región/escena, que son justo las hojas que no cabría enumerar).
  - `log` (conjunto cerrado): Listener's Diary, Gamer's Diary, Viewer's Diary, My Life on RYM, Autobiographical,
    Wishlists, Shopping List, Upcoming, User Stats, Favorite Users or Friends, RYM Users in Real Life, Fans Of…,
    Users.
  - `other` (conjunto cerrado): Galleries, Artist Galleries, Cover Art Themes y sus hojas pegadas por Alonso
    (Animals, Architecture & Edifices, Business & Finance, Clothing & Accessories, Colors, Culture & Ethnicity,
    Drugs & Alcohol, Fine Arts, Food & Drink, Graphic Design, Health & Medicine, History, Housewares, Media &
    Communication, People, Men, Women, Plants, Religion & Mythology, Science & Nature, Spoofs & Similarities,
    Sports & Games, Symbols, The Human Body, Transportation, Travel & Geography), Release Attributes, Release
    Titles, Cover Song Versions, Music Videos, Humor, Lists of Lists, Projects, Miscellaneous, Reviews, Front Page
    Reviews, Radio, Memoriam, Lost Media, Other Databases, Subculture, Fandom, Television, Anime, Videos, Books,
    Comics, Magazines, Awards, Games, Free and Legal, Films y toda su rama, Video Games y toda su rama, RYM, RYM25.
  - Cualquier otra categoría → `curated`.
  - Varias categorías: `log` gana sobre todo; luego `other`; luego `curated`.
  - Página leída sin categorías: `curated` si likes ≥ 3, si no `other` (llamada del diseñador).
- Por **título** (provisional, cuando no hay caché): patrón insensible a mayúsculas sobre el título:
  `log`, `diary`, `journal`, `listening`, `listened`, `first listens?`, `\b20\d\d\s*:`, `^\W*$` (solo símbolos,
  como "*"), `w\.?i\.?p`, `to listen`, `backlog` → `log` provisional. Todo lo demás → `unknown`.
  Un `log` provisional se muestra en la pestaña Logs con un indicador de "guessed from title"; el dato real lo
  sustituye en cuanto exista.
- **Override manual**: en cualquier fila, menú con "Mark as curated / log / other / reset". Se guarda en la caché
  con `override: true` y gana sobre categoría y título.

### Puntuación dentro de Curated

`score = log10(likes + 1) * 10 + (compat ? 5 : 0) + (starred ? 100 : 0)`. Orden descendente; empate por
likes, luego título. `compat` = el autor está en la lista de compatibles seleccionada (`selectCompatUsers`),
no en la lista completa de 100. Esta fórmula es llamada del diseñador; el builder puede ajustarla si los tests
muestran algo raro, sin cambiar el orden de prioridad (starred > likes > compat).

### Caché de listas (`rym_chart_picker_lists_v1`)

```
{ version: 1,
  lists: { "<listId>": { id, url, title, author, categories: [..], likes, items,
                         fetchedAt, override?: "curated"|"log"|"other" } } }
```

- `listId` es el número de `[List<id>]`. Si la sección del release no expone el id (solo el URL), la clave
  es el path normalizado `/list/<user>/<slug>/` y el id se rellena al leer la página.
- Expira a 30 días (`fetchedAt`); un override no expira. Tope 3,000 entradas; al rebasar, se descartan las
  más viejas sin override ni estrella.
- Se llena de tres formas: pasiva (cada vez que Alonso abre una página de lista, el script la parsea y guarda),
  bajo demanda (botón "Rate", F1) y al recorrer listas de compatibles (F2).

### Favoritas (`rym_chart_picker_starred_lists_v1`)

`{ version: 1, lists: [ { id, url, title, author, starredAt } ] }`, orden por `starredAt` desc. Sin tope duro.

## Features

### F1 · Pestañas en la sección de listas del release

- Al cargar un release, el script lee la sección nativa de listas y construye su propia vista **al lado**
  (no reemplaza el `innerHTML` nativo; la sección original se oculta con CSS y se puede restaurar con un botón
  "Show RYM's view"). Si el parseo falla o la sección no existe, no se hace nada.
- Cabecera: `Lists · 13` + pestañas `Curated (4) · Unrated (6) · Logs & other (3) · All` + botón
  `Rate 6 unrated (~20 s)`. (Llamada del diseñador: la clase `other` comparte pestaña con `log`, en sub-bloque
  propio debajo de los logs; no ensucia Curated y no merece pestaña.)
- Unrated = clase `unknown` = lista sin leer todavía (sin caché o expirada). Es lo que cuenta el botón Rate.
- Pestaña por default: Curated si tiene ≥1; si no, Unrated; si no hay nada en ninguna, All. All = orden original.
- Fila: portada, título completo (sin truncar, con wrap), autor, y a la derecha: chip de categoría (primera
  categoría reconocida; "Diary" en rojo, curadas en verde, otras en gris), `♥ N`, `N items`, chip `compat` si
  aplica, estrella (toggle, F4), menú de override. Unrated muestra "unrated" y, si es log provisional, "log?".
- Botón **Rate**: recorre las listas sin caché (o expiradas), una a la vez, `fetch` con `credentials: include`,
  pausa de 3 s entre fetches (constante `LIST_FETCH_DELAY_MS`), máximo 25 por clic. Progreso en el botón
  ("Rating 3/6…"), botón "Stop". Al primer status ≠ 200 (o HTML sin el marcador `[List`) se detiene y muestra
  "RYM blocked the fetch; open lists manually, they get rated as you visit them". Cada lista calificada se
  mueve de pestaña en vivo.
- Las filas conservan los enlaces nativos; clic normal abre la lista (misma pestaña, como RYM). Visitar la
  lista la califica por la vía pasiva.

### F2 · Listas de usuarios compatibles

- En el panel, nueva sección **Lists** (debajo de Users). Botón `Lists by compatible users`.
- Al clic: toma los usuarios de `selectCompatUsers` (los mismos N del filtro `u:`), recorre `/~<user>/lists`
  (**URL por verificar**) secuencialmente con la misma política de F1 (3 s, stop al primer error, máximo 10
  usuarios por clic, botón Stop), parsea las listas de cada usuario y las guarda en una caché por usuario
  (`compatLists: { "<user>": { fetchedAt, lists: [ {url,title, items?, categories?} ] } }` dentro de
  `rym_chart_picker_lists_v1`, 7 días).
- Resultado: panel/modal "Lists by compatible users" con las listas agrupadas por clase (Curated primero,
  luego Unrated, Logs colapsados), cada una con autor, chips como en F1, estrella. Si la página de listas de
  usuario trae categorías o tamaño, se usan; si no, clasificación por título y botón "Rate" como en F1.
- Fallback Cloudflare: si el fetch falla en el primer usuario, el botón cambia a "Open <user>'s lists" y el
  script (con `@match` en `/~*/lists*`) captura la página al abrirse, igual que hoy con `find_similar_users`.

### F3 · Buscar listas con los filtros del picker

- En la sección Lists del panel, botón `Find lists on RYM`. Abre en pestaña nueva la búsqueda de listas de RYM
  con el término construido del estado actual: etiquetas de géneros primarios seleccionados + etiqueta de año
  (`2015`, `2010s`; nada si all time). Ejemplo: `cloud rap 2010s`.
- URL **por verificar**: `https://rateyourmusic.com/search?searchterm=<term>&searchtype=l`. Función pura
  `buildListSearchUrl(state)`; si el término queda vacío, el botón se deshabilita.
- Sin más inteligencia: es un atajo, no descubrimiento.

### F4 · Página de lista y favoritas

- `@match /list/*`. El script parsea la página (`parseListDocument(doc)` → id, url, title, author, categories
  (texto y href), likes, items) y guarda en caché (vía pasiva).
- El panel aparece en la página de lista con la sección Lists arriba: título, chips (categoría, likes, items,
  clase), estrella toggle, override. El resto del panel (géneros, año…) **no** aplica en listas: se oculta;
  "Open chart" no se muestra.
- **Starred lists**: en todas las páginas (release, chart, list), la sección Lists del panel muestra las
  favoritas como enlaces (título · autor · ♥), con "unstar" al pasar el mouse. Máximo 10 visibles y "show all".
- Estrella también disponible en las filas de F1 y F2.

### Política anti-Cloudflare (aplica a F1 y F2)

- Pausa y tope son settings (`listFetchDelayMs`, default 3000; `listFetchMax`, default 25 listas / 10 usuarios),
  no constantes, para poder retirarse sin recompilar.
- Orden de retirada si en RYM real el bucle dispara 403 aun con pausa: 1) subir pausa a 6–8 s y bajar tope a 10;
  2) si sigue fallando, F1 se queda solo con vía pasiva + override manual y el botón Rate se oculta; 3) F2 pasa
  a ser únicamente "Open <user>'s lists" con captura al abrir (el fallback se vuelve el camino principal).
- Inversión en UI de progreso/Stop: mínima (texto en el botón + botón Stop); nada de barras ni colas.
- Tras un 403 la navegación normal sigue funcionando (según la experiencia de 1.1: el fallback de abrir la página
  funcionó justo después del 403). Si en 1.3 se observa lo contrario, el tope por clic baja a 5.

## Por verificar en RYM real (Alonso, con sesión, antes o durante la implementación)

Cada uno necesita el HTML real guardado como fixture en `test/fixtures/`:

1. Release: selector de la sección de listas y de cada tarjeta (href de la lista, título, autor, portada).
   ¿Hay enlace "more lists" o paginación de esa sección? Fixture: `test/fixtures/release/.../` (ya existe una
   página de release; hay que incluir la sección de listas real).
2. Página de lista: selectores de `Categories` (links a `/list_classifier/...`), likes (`♡ +N`), total de ítems
   (paginación o contador), `[List<id>]`. Fixture: `test/fixtures/list/`.
3. Listas de un usuario: URL exacta (`/~user/lists`?) y qué trae cada entrada (título, categorías, tamaño,
   likes). Fixture: `test/fixtures/user_lists/`.
4. Búsqueda de listas: parámetro `searchtype` real para listas.
5. Que un `fetch` con `credentials: include` de una página de lista devuelva HTML completo con sesión (igual
   que `find_similar_users`).

## Qué queda al builder

- Estructura exacta del DOM de la nueva sección y del modal de F2, siguiendo el estilo del panel actual
  (`.rym-picker-*`, variables de tema de RYM).
- Dónde exactamente va la sección Lists dentro del panel y cómo colapsa.
- Textos de estado y errores (en inglés).
- Función pura de parseo de HTML de la sección de listas y de la página de lista, con sus tests sobre los
  fixtures reales.
- Orden de implementación sugerido: F4 (parser de lista + caché + estrella) → F1 → F3 → F2.
- Actualizar `TUTORIAL.md` y `CLAUDE.md` (hechos verificados, claves nuevas, semántica de Cloudflare).
