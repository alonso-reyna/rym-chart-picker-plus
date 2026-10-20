# RYM Chart Picker+ (1.1.1)

Fork de [RYM Music Chart Picker](https://github.com/Lin-808/rym-music-chart-picker) de Lin808.
Usa la misma clave de settings, así que al reemplazar el script original no pierdes tu configuración.

Cómo se usa: [TUTORIAL.md](TUTORIAL.md). Contexto para retomar el desarrollo: [CLAUDE.md](CLAUDE.md).

## Instalar (modo local, se actualiza desde el archivo)

1. `chrome://extensions` → Tampermonkey → Detalles → activa **Allow access to file URLs**.
2. Dashboard de Tampermonkey → desactiva "RYM Music Chart Picker 1.0.2".
3. Abre en la barra de direcciones `file:///<ruta a esta carpeta>/rym-chart-picker-plus.user.js` → **Install**.
4. Tras cada cambio al archivo: Tampermonkey → **Check for userscript updates** → F5 en RYM.
   (Dashboard → Settings → Config mode *Advanced* → Script Update → Check Interval *Always* lo hace solo.)

## Qué cambió respecto a 1.0.2

- Slug de género tomado del `href` real (arregla Alternative R&B → `alternative-randb` y similares).
- "Same as release page" funciona en compilaciones, DJ mixes, music videos y bootlegs.
- Username detectado desde el link de perfil del header; override manual en settings.
- Resaltado limitado al bloque de info del release; `render()` ya no re-escanea toda la página.
- **Año**: clic cicla año → década → all time.
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
