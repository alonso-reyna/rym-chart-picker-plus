# RYM Chart Picker 1.1: Brainstorm / Discovery Notes
Date: 2026-10-20 · Goal: Definir el alcance exacto de la versión 1.1 del userscript (bugs, year picker, usuarios compatibles) antes de escribir código.

## Contexto previo (de la conversación)
- Script base: RYM Music Chart Picker 1.0.2 (Lin808), corre en Tampermonkey sobre `/release/*`.
- Bug detonante: `rymSlug` convierte `&` en `and` → `g:alternative-r-and-b` no existe en RYM.
- Bugs detectados: tipos de release vía URL (comp/djmix/musicvideo/unauth caen a "todos"), username por posición en pantalla, resaltado de año/género en toda la página, rendimiento de `render()`.
- Deseos del usuario: arreglar bugs, year picker, integrar `find_similar_users?user=alonsoreyna` como filtro `u:`, todo dentro del panel del picker.

## Summary / key decisions
- Fork propio ("RYM Chart Picker+", namespace propio, v1.1.0). Misma clave de settings `rym_chart_picker_settings_v16` para no perder configuración.
- Corre en `/release/*` y `/charts/*` (en charts: parsea URL → estado editable).
- Year picker: clic cicla año → década → all-time; desde/hasta; botón ±N (default 2). Chip siempre muestra el modo.
- Usuarios compatibles: sync de `find_similar_users` (manual + auto >7 días), Top N + umbral 70 %, "incluirme" default NO, exclusiones persistentes.
- Filtro de usuario visible como chip en panel principal, combinable con Following/Followers/etc. No lo resetea "Clear".
- Open chart: release → nueva pestaña; chart → misma pestaña (Shift+clic = nueva).
- Preview del URL al pie del panel (clic selecciona todo). Sin botón Copy.
- 1.2: presets, canasta persistente, exclusión Shift+clic, atajos, páginas artista/género.

### Alcance 1.1 (cerrado)
Bug fixes · preview URL · year picker · usuarios compatibles · modo chart · chip de usuarios.

## Q&A log
### Q1 — Fork vs contribución
- Asked: ¿Fork propio o PR al script de Lin808?
- Captured: Fork propio. Mantener la misma clave de settings. Posible PR a Lin808 solo con bug fixes, más adelante.
- Flags: ninguno

### Q2 — Alcance de páginas
- Asked: ¿Dónde corre el script?
- Captured: Releases + páginas de chart (`/charts/*`). En charts el panel parsea el URL actual, lo carga como estado y permite editar filtros y reabrir. Artista/género quedan para 1.2.
- Flags: ninguno

### Q3 — Year picker
- Asked: ¿Qué controles tiene el year picker?
- Captured: Clic en el año cicla año → década → all-time. En panel, campos desde/hasta. Botón ±N alrededor del año del release (N en settings, default 2). Condición del usuario: "que sea intuitivo" → el chip de año muestra claramente el modo actual ("2015", "2010s", "2013–2017", "all time") y el rango se edita en un solo lugar.
- Flags: ninguno

### Q4 — Selección de usuarios compatibles
- Asked: ¿Cómo se seleccionan los usuarios del filtro `u:`?
- Captured: Settings con Top N (5/10/25/50) y umbral mínimo de compatibilidad (default 70 %); aplica el más restrictivo. Toggle "incluirme a mí" **default: NO**. Chip `u: N compatibles` en panel; al clic, lista con checkboxes para excluir usuarios puntuales (exclusiones persistentes). Sync manual con botón + auto si la lista tiene >7 días.
- Flags: ninguno

### Q5 — Integración con filtros de usuario existentes
- Asked: ¿Cómo convive "compatibles" con All/Following/Followers/Myself/Other?
- Captured: "Compatibles" es una opción más del mismo checklist, combinable (lista plana en `u:`). El filtro de usuario sube al panel principal como chip visible ("Users: everyone" / "Users: 12 compatibles + following"). Se recuerda entre charts; "Clear" no lo resetea.
- Flags: ninguno

### Q6 — Navegación al abrir chart
- Asked: ¿Open chart reemplaza la pestaña o abre nueva?
- Captured: En release → nueva pestaña. En chart → reemplaza la pestaña actual; Shift+clic (o botón pequeño) abre en nueva pestaña para bifurcar.
- Flags: ninguno

### Q7 — Corte de alcance
- Asked: ¿Qué queda fuera de 1.1? ¿Para qué sirve el URL copy?
- Captured: 1.1 cerrado como arriba. Preview del URL sí (línea gris al pie, clic selecciona), botón Copy no. Atajos de teclado a 1.2.
- Flags: verificar en RYM real: estructura de `find_similar_users`, sintaxis `u:` con varios usuarios, rango de años `2010-2015` → yo (en el navegador)

## Verificado en RYM (2026-10-20, Chrome con sesión)
- `find_similar_users?user=X`: `ul.page_user_compat_list > li#page_user_compat_item_N`; `a.user[href="/~name"]`; `.page_user_compat_pct` con `style="width:P%"` = score relativo (rank 1 = 100 %, rank 100 ≈ 50 %) y texto = rank. 100 usuarios, sin paginación. No hay % absoluto → el umbral del diseño usa este score relativo.
- Slug real de Alternative R&B: `/genre/alternative-randb/` (ni `r-and-b` ni `r-b`). Confirma: leer slug del href.
- `charts/top/album/all-time/u:a,b,c/` → 200, "Custom chart". `u:followed_by:me,a` también funciona.
- `charts/top/album/2010-2015/g:indie-folk/` → "Best Indie Folk albums between 2010 and 2015". Hífenes planos funcionan.
- Fetch repetido desde la página dispara Cloudflare (403 "Verification"). El sync debe ser 1 fetch y con fallback: abrir la página y capturar desde ahí (script también matchea `find_similar_users`).
- Release page: `.album_info tr` con `th` = Artist/Type/Released/Recorded/Genres/Descriptors/Language. Géneros en `.release_pri_genres a.genre` y `.release_sec_genres a.genre`. Username propio: `a.header_profile_main[href^="/~"]`.

## Estado (2026-10-20)
- 1.1.0 implementada en `rym-chart-picker-plus.user.js`. Tests de funciones puras en `test/pure.test.js` (pasan). Smoke test en navegador con fixtures: release, chart y captura de compatibles sin errores.
- Pendiente: probar en RYM real (instalar en Tampermonkey).

## Open flags (pending input)
- Verificar en RYM real que `s:` filtra géneros secundarios y que `l:` acepta códigos ISO → Alonso al usarlo
