# Tutorial: RYM Chart Picker+

El panel vive en la esquina superior derecha de cualquier página de release y de cualquier chart de RYM.
La idea: tomas datos del disco que tienes enfrente (género, año, descriptores, idioma) y, con un clic,
abres el chart de RYM que corresponde. Con el filtro de usuarios compatibles, ese chart se convierte en
un recomendador personal.

## 1. El panel

| Botón | Qué hace |
|---|---|
| **Chart Search: OFF / ON** | Enciende el modo selección. Con ON, los datos del release se vuelven clicables. |
| ▾ / ▴ | Muestra u oculta lo seleccionado. |
| 🔍 | Abre el chart con lo que llevas (atajo de "Open chart"). |
| ⚙ | Settings. |

Al pie del panel siempre ves el **URL** que se va a abrir. Si algo no cuadra, ahí se ve.

## 2. Flujo básico (desde un release)

1. Clic en **Chart Search: OFF** → ON. El cursor se vuelve cruz sobre lo que puedes elegir.
2. Clic en los datos que quieras:
   - **Género** (Alternative R&B, Art Pop…) → `g:` si está en la primera línea, `s:` si está en la segunda (influencias).
   - **Año** en "Released" → cicla `2019` → `2010s` → *all time*. Ver §3.
   - **Descriptor** (ethereal, melancholic…) → `d:`.
   - **Language** → `l:`. El **Type** se elige en la tabla **Music releases** del panel (ver §3b).
3. Cada clic se agrega como un chip en el panel. Clic en el chip para quitarlo.
4. **Open chart** → se abre en pestaña nueva.

**Clear** borra la selección (no toca el filtro de usuarios ni los settings).

## 3. Año

Clic en el año del release cicla **año → década → all time**. El chip dice en qué modo está. Si no tocas
nada, el chip dice *all time* (clic en ese chip también toma el año del disco).

## 3b. Music releases

Misma tabla que el filtro nativo de RYM en los charts: Album / EP / Mixtape / DJ Mix / Single / Compilation /
Video / Unauthorized / Music video / Addl release. Por default está encendido el tipo del disco en el que estás
(abajo dice *default: Same as release page (Mixtape)*); clic en una celda la enciende o apaga.
Atajos arriba a la derecha: **all** (todos), **main** (Album, EP, Mixtape, DJ Mix), **albums**, **singles**,
**clear** (regresa al default).

## 4. "Must contain all"

Junto a los títulos **Primary genres**, **Secondary genres / influences** y **Descriptors** aparece un
switch pequeño **must contain all** en cuanto eliges algo de esa fila:

- Apagado → el disco necesita *alguno* (Cloud Rap **o** Ambient Pop).
- Encendido → necesita *todos* (Cloud Rap **y** Ambient Pop). En el URL se ve como `s:all,…`.

Para influencias viene **encendido por default** (se cambia en ⚙ → Genre matching defaults).

## 5. Usuarios compatibles

RYM calcula tus 100 usuarios más compatibles en `find_similar_users`. El script los usa como filtro `u:`
del chart: en vez de 100 000 votos, el ranking sale de 10–25 personas que puntúan como tú.

En el panel principal, fila **Users**:
- Marca **Compatible users** y elige **top 5 / 10 / 25 / 50**. Listo: el chip abajo dice `10 compatible`.
- La primera vez se sincroniza solo. Si RYM bloquea el sync, se abre la página de compatibilidad en otra
  pestaña y ahí se guarda sola (verás "saved 100 compatible users"). Vuelve y recarga.

Ajustes finos en ⚙ → **Compatible users**: score mínimo (70 % por default, relativo al #1), incluir tus
propios ratings (apagado por default) y desmarcar usuarios puntuales. Ahí también se combina con
"I'm following", "Myself", etc.

Se recuerda entre charts y se re-sincroniza solo cada 7 días.

## 5. Editar un chart (modo chart)

En cualquier `/charts/...` el panel dice **"Chart Picker+: edit this chart"**. Clic → carga tipo, año,
géneros, descriptores, idiomas y usuarios del URL actual. Cambia lo que quieras y:

- **Update chart** → recarga la misma pestaña con el nuevo chart.
- **Shift + clic** en Update chart → lo abre en pestaña nueva (para comparar dos versiones).

Si el chart traía usuarios en el URL, el chip dice `from URL (N users)` y se respeta hasta que toques el
filtro de usuarios en settings.

## 6. Recetas para listas

| Quieres | Haz |
|---|---|
| Más discos como este, según gente como tú | género principal + **Top 10 compatibles** |
| La escena de ese momento | género + **±2** años |
| Joyas que tu círculo subestima | listing **Esoteric** (settings) + compatibles + un descriptor |
| Qué escucha tu gente este año | compatibles + año actual, sin género |
| Afinar un chart que salió muy amplio | ábrelo → modo chart → agrega descriptor o acorta años → Update |

Listing (**Top / Popular / Esoteric / Diverse**) se elige en ⚙ y se recuerda.

## 7. Settings que vale la pena tocar una vez

- **Default release type when none is selected**: "Same as release page" (default) usa el tipo del disco.
  Pon "All release types" si quieres que EPs y singles entren siempre.
- **Minimum compatibility score**: apagado (0) por default. Si lo subes, recorta la lista *antes* del top N, así que
  "top 50" puede darte menos de 50.
- **Your username**: se detecta solo del header. Si dice "Not detected", escríbelo aquí y recarga.
- **Panel behavior**: "Stay visible while scrolling" si prefieres el panel fijo.

## 8. Si algo falla

- El chart abre el ranking general (OK Computer, To Pimp a Butterfly…): el filtro no se aplicó. Mira el URL
  gris del panel y pásamelo.
- "Could not detect your username": settings → Your username.
- "No compatible users yet": Sync now.
