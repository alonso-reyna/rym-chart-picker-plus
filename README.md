# RYM Chart Picker+ (1.1.2)

Fork de [RYM Music Chart Picker](https://github.com/Lin-808/rym-music-chart-picker) de Lin808.
Usa la misma clave de settings, así que al reemplazar el script original no pierdes tu configuración.

Cómo se usa: [TUTORIAL.md](TUTORIAL.md). Contexto para retomar el desarrollo: [CLAUDE.md](CLAUDE.md).

## Instalar

Con Tampermonkey instalado, abre este link y dale **Install**:

https://raw.githubusercontent.com/alonso-reyna/rym-chart-picker-plus/main/rym-chart-picker-plus.user.js

El script trae `@updateURL`, así que Tampermonkey se actualiza solo cada vez que hay push a `main`
(Dashboard → Settings → Script Update → Check Interval; o "Check for userscript updates" para forzar).
Desactiva "RYM Music Chart Picker 1.0.2" si lo tenías.

Para desarrollar en local: abre `file:///<ruta a esta carpeta>/rym-chart-picker-plus.user.js` (necesita
"Allow access to file URLs" en Tampermonkey) y sube `@version` tras cada cambio.

## Qué cambió respecto a 1.0.2

- Slug de género tomado del `href` real (arregla Alternative R&B → `alternative-randb` y similares).
- "Same as release page" funciona en compilaciones, DJ mixes, music videos y bootlegs.
- Username detectado desde el link de perfil del header; override manual en settings.
- Resaltado limitado al bloque de info del release; `render()` ya no re-escanea toda la página.
- **Año**: clic cicla año → década → all time.
- **Music releases**: tabla de tipos como la nativa de RYM (all / main / albums / singles / clear), default = tipo de la página.
- **Must contain all** por fila (géneros, influencias, descriptores); influencias encendido por default.
- **Usuarios compatibles**: toggle + top N en el panel principal; sync de `find_similar_users`; score mínimo,
  exclusiones e "incluirme" en settings.
- **Modo chart**: en `/charts/*` el panel carga el URL actual y "Update chart" lo reemplaza en la misma pestaña
  (Shift+clic = pestaña nueva).
- Preview del URL al pie del panel (clic selecciona todo).

## Pruebas

```bash
node test/pure.test.js
```

`test/fixtures/` tiene páginas falsas con stubs de `GM_*` para probar en navegador (ver CLAUDE.md).
