// Se mueve al escritorio (Space) vacío más cercano en la pantalla donde estás: +1, -1, +2, -2, ...
// Si no hay ninguno vacío, regresa al escritorio original. Lo usa rym-abrir.
// Imprime: "<estado> x1 y1 x2 y2", con el área visible (coordenadas de Chrome) de esa pantalla.
//   estado = ok | ninguno | sin-cambio (⌃←/⌃→ no movió nada) | sin-info
// Requiere permiso de Accesibilidad para "RYM Abrir" (manda ⌃← / ⌃→).
//
// Funciona con una pantalla y con monitor externo, con "Displays have separate Spaces" encendido o
// apagado: cada tecla se confirma leyendo qué pantalla cambió de escritorio (vía cfprefsd, no el
// plist, que macOS escribe con retraso: ni el archivo ni `defaults` sirven para esto).
ObjC.import('AppKit');
ObjC.import('CoreGraphics');
ObjC.import('Foundation');

const app = Application.currentApplication();
app.includeStandardAdditions = true;
const se = Application('System Events');

// ---------- pantallas ----------
function pantallas() {
  const scr = $.NSScreen.screens;
  const H0 = scr.objectAtIndex(0).frame.size.height; // alto de la pantalla principal (origen de coords)
  const out = [];
  for (let i = 0; i < scr.count; i++) {
    const s = scr.objectAtIndex(i);
    const id = ObjC.unwrap(s.deviceDescription.objectForKey('NSScreenNumber'));
    const uuid = ObjC.unwrap(ObjC.castRefToObject($.CFUUIDCreateString(null, $.CGDisplayCreateUUIDFromDisplayID(id))));
    const b = $.CGDisplayBounds(id);
    const vf = s.visibleFrame;
    out.push({
      uuid,
      main: id === $.CGMainDisplayID(),
      x: b.origin.x, y: b.origin.y, w: b.size.width, h: b.size.height,
      // área visible (sin menú ni Dock) en coordenadas de arriba-izquierda, como las usa Chrome
      vis: [vf.origin.x, H0 - (vf.origin.y + vf.size.height), vf.origin.x + vf.size.width, H0 - vf.origin.y],
    });
  }
  return out;
}

function pantallaDe(mon, ps) {
  return ps.find(p => p.uuid === mon) || (mon === 'Main' && ps.find(p => p.main)) || ps.find(p => p.main) || ps[0];
}

function contiene(p, x, y) { return x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h; }

// Pantalla donde probablemente estás: la de la ventana al frente; si no hay, la del mouse.
function pantallaActual(ps) {
  try {
    const proc = se.processes.whose({ frontmost: true })[0];
    const w = proc.windows[0];
    const [x, y] = w.position(), [ww, hh] = w.size();
    const p = ps.find(p => contiene(p, x + ww / 2, y + hh / 2));
    if (p) return p;
  } catch (e) {}
  const m = $.NSEvent.mouseLocation; // origen abajo-izquierda
  const H0 = ps.find(p => p.main).h;
  return ps.find(p => contiene(p, m.x, H0 - m.y)) || ps.find(p => p.main);
}

// ---------- escritorios ----------
function estado() { // en vivo, vía rym-espacios (CGSCopyManagedDisplaySpaces)
  return JSON.parse(app.doShellScript('$HOME/.local/bin/rym-espacios'))
    .filter(m => m.spaces.length && m.cur >= 0);
}

function monitorDe(p, mons) {
  if (mons.length === 1) return mons[0]; // una pantalla, o "separate Spaces" apagado
  return mons.find(m => m.id === p.uuid) || (p.main && mons.find(m => m.id === 'Main')) || mons[0];
}

// Manda una tecla y espera a que algún monitor cambie de escritorio. Devuelve {mons, id} o null.
function paso(dir, antes) {
  se.keyCode(dir > 0 ? 124 : 123, { using: 'control down' }); // → : ←
  for (let t = 0; t < 20; t++) {
    delay(0.1);
    const mons = estado();
    const ch = mons.find(m => { const b = antes.find(x => x.id === m.id); return b && b.cur !== m.cur; });
    if (ch) { delay(0.5); return { mons, id: ch.id }; } // 0.5 s: termina la animación
  }
  return null;
}

// ---------- ¿está vacío? ----------
function vacio(p) {
  const arr = ObjC.castRefToObject($.CGWindowListCopyWindowInfo(
    $.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0));
  for (let i = 0; i < arr.count; i++) {
    const w = arr.objectAtIndex(i);
    if (ObjC.unwrap(w.objectForKey('kCGWindowLayer')) !== 0) continue;
    if (ObjC.unwrap(w.objectForKey('kCGWindowAlpha')) === 0) continue;
    const r = ObjC.deepUnwrap(w.objectForKey('kCGWindowBounds'));
    if (r.Width < 100 || r.Height < 100) continue;
    // cuenta la ventana si una parte apreciable cae en esta pantalla (no solo la esquina)
    const ix = Math.min(r.X + r.Width, p.x + p.w) - Math.max(r.X, p.x);
    const iy = Math.min(r.Y + r.Height, p.y + p.h) - Math.max(r.Y, p.y);
    if (ix > 50 && iy > 50) return false;
  }
  return true;
}

function vacioSeguro(p) { // dos lecturas: durante la animación la lista puede venir a medias
  if (!vacio(p)) return false;
  delay(0.3);
  return vacio(p);
}

// ---------- principal ----------
function run() {
  const ps = pantallas();
  let mons = estado();
  let p = pantallaActual(ps);
  const salida = (res, pant) => res + ' ' + pant.vis.map(Math.round).join(' ');
  if (!mons.length) return salida('sin-info', p);

  let mon = monitorDe(p, mons);
  if (mon.spaces.length < 2) return salida('ninguno', p);

  // Primer paso de prueba: confirma qué pantalla mueven las teclas.
  const inicial = mons;
  let r = paso(+1, mons), dir = +1;
  if (!r) { r = paso(-1, mons); dir = -1; }
  if (!r) return salida('sin-cambio', p);
  mons = r.mons;
  mon = mons.find(m => m.id === r.id);
  if (mons.length > 1) p = pantallaDe(r.id, ps); // con "separate Spaces" la pantalla es la que cambió
  const idx = mon.spaces.indexOf(inicial.find(m => m.id === r.id).cur);
  const n = mon.spaces.length;
  let pos = mon.spaces.indexOf(mon.cur);
  if (idx < 0 || pos < 0) return salida('sin-info', p);
  if (vacioSeguro(p)) return salida('ok', p);

  const orden = [];
  for (let d = 1; d < n; d++) {
    if (idx + d < n) orden.push(idx + d);
    if (idx - d >= 0) orden.push(idx - d);
  }
  const irA = destino => {
    for (let k = 0; pos !== destino && k < 2 * n; k++) {
      const rr = paso(destino > pos ? +1 : -1, mons);
      if (!rr || rr.id !== mon.id) return false; // la tecla no hizo nada o movió otra pantalla
      mons = rr.mons;
      const m = mons.find(m => m.id === mon.id);
      pos = m.spaces.indexOf(m.cur);
    }
    return pos === destino;
  };
  for (const destino of orden) {
    if (destino === idx + dir) continue; // ya revisado en el paso de prueba
    if (!irA(destino)) break;
    if (vacioSeguro(p)) return salida('ok', p);
  }
  irA(idx); // ninguno vacío: regresa
  return salida('ninguno', p);
}
