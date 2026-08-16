/**
 * datos.js — la ÚNICA puerta a los datos.
 *
 * Es la costura para V2: hoy hace fetch a archivos estáticos y lee
 * localStorage. Cuando llegue la votación, esto apunta a un Cloudflare
 * Worker y ningún otro módulo se entera.
 *
 * Todo lo que toca red o navegador vive acá. Nada de esto se prueba
 * con Vitest; lo testeable vive en logica.js.
 */

const ARCHIVOS = ['teatros', 'obras', 'funciones', 'lugares', 'overrides'];

export class ErrorDeDatos extends Error {
  constructor(archivo, causa) {
    super(`No se pudo leer data/${archivo}.json`);
    this.archivo = archivo;
    this.causa = causa;
  }
}

async function leer(nombre) {
  let res;
  try {
    res = await fetch(`data/${nombre}.json`, { cache: 'no-cache' });
  } catch (e) {
    // Sin señal, o el archivo no llegó. NO puede terminar en pantalla blanca.
    throw new ErrorDeDatos(nombre, e);
  }
  if (!res.ok) throw new ErrorDeDatos(nombre, new Error(`HTTP ${res.status}`));
  try {
    return await res.json();
  } catch (e) {
    // JSON malformado tras un refresco a medias.
    throw new ErrorDeDatos(nombre, e);
  }
}

/** Aplica overrides.json ENCIMA de los datos, por id. Las correcciones
 *  humanas tienen que sobrevivir a cada /actualizar-cartelera. */
function aplicarOverrides(registros, overridesDeGrupo = {}) {
  if (!overridesDeGrupo || !Object.keys(overridesDeGrupo).length) return registros;
  return registros.map((r) => {
    const parche = overridesDeGrupo[r.id];
    if (!parche) return r;
    const { _motivo, ...campos } = parche;
    return { ...r, ...campos, _corregido: true };
  });
}

const porId = (lista) => Object.fromEntries(lista.map((r) => [r.id, r]));

export async function cargarTodo() {
  const [teatros, obras, funciones, lugares, overrides] = await Promise.all(
    ARCHIVOS.map(leer),
  );

  const t = aplicarOverrides(teatros.teatros ?? [], overrides.teatros);
  const o = aplicarOverrides(obras.obras ?? [], overrides.obras);
  const f = aplicarOverrides(funciones.funciones ?? [], overrides.funciones);
  const l = aplicarOverrides(lugares.lugares ?? [], overrides.lugares);

  return {
    teatros: porId(t), obras: porId(o), lugares: l, funciones: f,
    hayMuestras: [...t, ...o, ...f, ...l].some((r) => r._muestra),
  };
}

/** Hoy en Lima (UTC-5, sin horario de verano) como 'YYYY-MM-DD'. */
export function hoyLima() {
  const ahora = new Date();
  const lima = new Date(ahora.getTime() - 5 * 3600000);
  return lima.toISOString().slice(0, 10);
}

// ── guardados (localStorage) ─────────────────────────────────
// V1: viven en el navegador. V2: se mudan al Worker sin tocar vista.js.
const CLAVE = 'teatro.guardados';

export function leerGuardados() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function alternarGuardado(funcionId) {
  const s = leerGuardados();
  s.has(funcionId) ? s.delete(funcionId) : s.add(funcionId);
  try {
    localStorage.setItem(CLAVE, JSON.stringify([...s]));
  } catch { /* modo privado o cuota llena: no es motivo para romper la app */ }
  return s;
}
