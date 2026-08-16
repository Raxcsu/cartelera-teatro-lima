import { describe, it, expect } from 'vitest';
import {
  slug, idTeatro, idObra, idFuncion, idLugar,
  diasEntre, confianzaEfectiva, estadoCartelera,
  formatearSoles, formatearDistancia,
  distanciaMetros, sumarMinutos, cocinaAbierta,
  filtrarFunciones, puntuarFuncion, calcularCostoTotal,
  proponerPlanes, motivoDelPrimero,
} from './logica.js';

const HOY = '2026-08-16';

// ── contexto de prueba ───────────────────────────────────────
const teatros = {
  'teatro-britanico': { id: 'teatro-britanico', distrito: 'Miraflores', lat: -12.1211, lng: -77.0299 },
  'teatro-larco':     { id: 'teatro-larco',     distrito: 'Miraflores', lat: -12.1280, lng: -77.0290 },
  'sin-coords':       { id: 'sin-coords',       distrito: 'Barranco',   lat: null,     lng: null },
};
const obras = {
  'comedia-2026': { id: 'comedia-2026', tipo: 'comedia', idioma: 'español', duracion_min: 95 },
  'drama-2026':   { id: 'drama-2026',   tipo: 'drama',   idioma: 'inglés',  duracion_min: 130 },
};
const lugares = [
  { id: 'cerca-abierto', nombre: 'Cerca Abierto', lat: -12.1213, lng: -77.0303, gasto_min: 25, gasto_max: 45, cierra_cocina: '23:30' },
  { id: 'cerca-cerrado', nombre: 'Cerca Cerrado', lat: -12.1214, lng: -77.0301, gasto_min: 30, gasto_max: 50, cierra_cocina: '21:00' },
  { id: 'lejos',         nombre: 'Lejos',         lat: -12.2000, lng: -77.1000, gasto_min: 20, gasto_max: 30, cierra_cocina: '23:59' },
];
const f = (over = {}) => ({
  id: 'x', obra_id: 'comedia-2026', teatro_id: 'teatro-britanico',
  fecha: '2026-08-22', hora: '20:00', precio_min: 60, precio_max: 90,
  estado: 'disponible', verificado_el: HOY, confianza: 'confirmado', ...over,
});

// ─────────────────────────────────────────────────────────────
describe('IDs deterministas', () => {
  it('quita tildes y normaliza', () => {
    expect(slug('Teatro Británico')).toBe('teatro-britanico');
    expect(slug('  La Señorita  Julia! ')).toBe('la-senorita-julia');
    expect(slug(null)).toBe('');
  });

  it('el mismo contenido produce el mismo id, siempre', () => {
    const a = idFuncion(idObra('La cena de los tontos', '2026-08-01'), idTeatro('Teatro Británico'), '2026-08-22', '20:00');
    const b = idFuncion(idObra('La cena de los tontos', '2026-08-01'), idTeatro('Teatro Británico'), '2026-08-22', '20:00');
    expect(a).toBe(b);
    expect(a).toBe('la-cena-de-los-tontos-2026-teatro-britanico-2026-08-22-2000');
  });

  it('el id es legible, para poder revisar el git diff', () => {
    expect(idLugar('El Pan de la Chola', 'Barranco')).toBe('el-pan-de-la-chola-barranco');
  });

  // Lo encontró validar_datos.py corriendo contra datos, no la revisión.
  it('un título largo no produce un id interminable', () => {
    const largo = 'Obra con un título deliberadamente larguísimo para probar el reflow del layout';
    const s = slug(largo);
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('-')).toBe(false);      // no corta a mitad de guión
    expect(s).not.toMatch(/-[a-z]{1,2}$/);    // ni a mitad de palabra
  });

  it('el corte es estable: el mismo título largo da siempre el mismo id', () => {
    const largo = 'Obra con un título deliberadamente larguísimo para probar el reflow del layout';
    expect(slug(largo)).toBe(slug(largo));
  });
});

// ─────────────────────────────────────────────────────────────
describe('confianzaEfectiva: la confianza se calcula, no se lee', () => {
  it('confirmado hoy → verde sin marca', () => {
    const r = confianzaEfectiva('confirmado', HOY, HOY);
    expect(r.nivel).toBe('ok');
    expect(r.texto).toBeNull();
  });

  it('confirmado hace 14 días → ámbar y lo dice', () => {
    const r = confianzaEfectiva('confirmado', '2026-08-02', HOY);
    expect(r.nivel).toBe('mid');
    expect(r.texto).toBe('confirmado hace 14 días');
  });

  it('confirmado hace 30 días → gris', () => {
    expect(confianzaEfectiva('confirmado', '2026-07-17', HOY).nivel).toBe('no');
  });

  it('probable NUNCA sube a verde, por reciente que sea', () => {
    expect(confianzaEfectiva('probable', HOY, HOY).nivel).toBe('mid');
  });

  it('sin verificado_el no puede ser verde', () => {
    expect(confianzaEfectiva('confirmado', null, HOY).nivel).toBe('no');
  });

  it('el límite de 7 días es inclusivo', () => {
    expect(confianzaEfectiva('confirmado', '2026-08-09', HOY).nivel).toBe('ok');
    expect(confianzaEfectiva('confirmado', '2026-08-08', HOY).nivel).toBe('mid');
  });
});

// ─────────────────────────────────────────────────────────────
describe('estadoCartelera: los dos vacíos son distintos', () => {
  it('con funciones futuras no está vencida', () => {
    expect(estadoCartelera([f()], HOY).vencida).toBe(false);
  });

  it('solo funciones pasadas → vencida, y dice hace cuánto', () => {
    const r = estadoCartelera([f({ fecha: '2026-06-01', verificado_el: '2026-05-30' })], HOY);
    expect(r.vencida).toBe(true);
    expect(r.diasSinVerificar).toBe(78);
  });

  it('cartelera vacía cuenta como vencida', () => {
    expect(estadoCartelera([], HOY).vencida).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
describe('formato: nunca NaN en pantalla', () => {
  it('precio null dice "sin precio", no S/ NaN', () => {
    expect(formatearSoles(null)).toBe('sin precio');
    expect(formatearSoles(undefined)).toBe('sin precio');
    expect(formatearSoles(NaN)).toBe('sin precio');
    expect(formatearSoles(0)).toBe('S/ 0');
    expect(formatearSoles(148.4)).toBe('S/ 148');
  });

  it('distancias', () => {
    expect(formatearDistancia(null)).toBeNull();
    expect(formatearDistancia(237)).toBe('240 m');
    expect(formatearDistancia(1520)).toBe('1.5 km');
  });
});

// ─────────────────────────────────────────────────────────────
describe('geografía', () => {
  it('mide contra dos puntos conocidos de Miraflores', () => {
    const d = distanciaMetros(teatros['teatro-britanico'], teatros['teatro-larco']);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(800);
  });

  it('sin coordenadas devuelve null, no cero', () => {
    expect(distanciaMetros(teatros['sin-coords'], lugares[0])).toBeNull();
    expect(distanciaMetros(null, lugares[0])).toBeNull();
  });

  it('sumarMinutos cruza la hora', () => {
    expect(sumarMinutos('20:00', 95)).toBe('21:35');
    expect(sumarMinutos('23:30', 60)).toBe('24:30');
    expect(sumarMinutos(null, 30)).toBeNull();
  });

  it('no propone cenar donde la cocina ya cerró', () => {
    expect(cocinaAbierta(lugares[0], '21:35')).toBe(true);   // cierra 23:30
    expect(cocinaAbierta(lugares[1], '21:35')).toBe(false);  // cierra 21:00
    expect(cocinaAbierta({ cierra_cocina: null }, '21:35')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe('filtrarFunciones: fuente única de verdad', () => {
  const ctx = { obras, teatros };

  it('descarta agotadas y canceladas', () => {
    expect(filtrarFunciones([f({ estado: 'agotada' })], {}, ctx)).toHaveLength(0);
    expect(filtrarFunciones([f({ estado: 'cancelada' })], {}, ctx)).toHaveLength(0);
  });

  it('filtra por rango de fechas', () => {
    const fs = [f({ id: 'a', fecha: '2026-08-20' }), f({ id: 'b', fecha: '2026-08-25' })];
    expect(filtrarFunciones(fs, { desde: '2026-08-22', hasta: '2026-08-24' }, ctx)).toHaveLength(0);
    expect(filtrarFunciones(fs, { desde: '2026-08-24' }, ctx)).toHaveLength(1);
  });

  it('precio null NO se descarta por presupuesto: se desconoce, no es caro', () => {
    const fs = [f({ id: 'caro', precio_min: 200 }), f({ id: 'desconocido', precio_min: null })];
    const r = filtrarFunciones(fs, { precioMax: 100 }, ctx);
    expect(r.map((x) => x.id)).toEqual(['desconocido']);
  });

  it('filtra por tipo, idioma y distrito', () => {
    const fs = [f({ id: 'c' }), f({ id: 'd', obra_id: 'drama-2026' })];
    expect(filtrarFunciones(fs, { tipo: 'comedia' }, ctx).map((x) => x.id)).toEqual(['c']);
    expect(filtrarFunciones(fs, { idioma: 'inglés' }, ctx).map((x) => x.id)).toEqual(['d']);
    expect(filtrarFunciones(fs, { distrito: 'Barranco' }, ctx)).toHaveLength(0);
  });

  it('soloConfirmados deja fuera lo probable y lo sin verificar', () => {
    const fs = [f({ id: 'ok' }), f({ id: 'p', confianza: 'probable' })];
    expect(filtrarFunciones(fs, { soloConfirmados: true }, ctx).map((x) => x.id)).toEqual(['ok']);
  });
});

// ─────────────────────────────────────────────────────────────
describe('calcularCostoTotal: invariantes, no gustos', () => {
  it('cuenta para dos personas', () => {
    const c = calcularCostoTotal(f({ precio_min: 60, precio_max: 60 }), null);
    expect(c.total).toBe(120);
  });

  it('suma la cena de ambos', () => {
    const c = calcularCostoTotal(f({ precio_min: 60, precio_max: 60 }), lugares[0]);
    expect(c.min).toBe(120 + 50);
    expect(c.max).toBe(120 + 90);
    expect(c.completo).toBe(true);
  });

  it('sin precio de entrada el total es null, NUNCA NaN', () => {
    const c = calcularCostoTotal(f({ precio_min: null, precio_max: null }), lugares[0]);
    expect(c.total).toBeNull();
    expect(Number.isNaN(c.total)).toBe(false);
    expect(c.completo).toBe(false);
    expect(c.falta).toContain('entradas');
  });

  // Bug encontrado corriendo la app, no en revisión: sin lugar, `completo`
  // daba true y la pantalla decía "los dos, con cena" en un plan sin cena.
  it('sin lugar distingue "no falta nada" de "no hay cena"', () => {
    const c = calcularCostoTotal(f(), null);
    expect(c.completo).toBe(true);
    expect(c.incluyeCena).toBe(false);
  });

  it('con lugar completo, incluye cena', () => {
    const c = calcularCostoTotal(f(), lugares[0]);
    expect(c.completo).toBe(true);
    expect(c.incluyeCena).toBe(true);
  });

  it('declara exactamente qué está contando', () => {
    expect(calcularCostoTotal(f(), null).incluye).toEqual(['entradas x2']);
    expect(calcularCostoTotal(f(), lugares[0]).incluye).toEqual(['entradas x2', 'cena x2']);
    expect(calcularCostoTotal(f(), lugares[0], { taxiIdaVuelta: 50 }).incluye)
      .toEqual(['entradas x2', 'cena x2', 'taxi']);
  });

  it('un gasto estimado no se disfraza de precio verificado', () => {
    const estimado = { ...lugares[0], gasto_referencial: true };
    const c = calcularCostoTotal(f(), estimado);
    expect(c.estimado).toBe(true);
    expect(c.incluye).toContain('cena x2 estimada');
    expect(calcularCostoTotal(f(), lugares[0]).estimado).toBe(false);
    expect(calcularCostoTotal(f(), null).estimado).toBe(false);
  });

  it('el taxi no se asume: sin pasarlo, no está en el total', () => {
    const sin = calcularCostoTotal(f(), lugares[0]);
    const con = calcularCostoTotal(f(), lugares[0], { taxiIdaVuelta: 50 });
    expect(con.total - sin.total).toBe(50);
    expect(sin.incluye).not.toContain('taxi');
  });

  it('con lugar sin gasto declarado el total es parcial y lo declara', () => {
    const c = calcularCostoTotal(f(), { gasto_min: null, gasto_max: null });
    expect(c.completo).toBe(false);
    expect(c.falta).toContain('cena');
    expect(c.total).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('puntuarFuncion: invariantes (los pesos son de Óscar)', () => {
  it('siempre devuelve un número finito, nunca NaN', () => {
    expect(Number.isFinite(puntuarFuncion(f(), {}))).toBe(true);
    expect(Number.isFinite(puntuarFuncion(f({ precio_min: null }), { presupuesto: 150 }))).toBe(true);
    expect(Number.isFinite(puntuarFuncion(f(), { distanciaM: null, confEfectiva: null }))).toBe(true);
  });

  it('nunca es negativo', () => {
    expect(puntuarFuncion(f({ precio_min: 9999 }), { presupuesto: 10, distanciaM: 99999 })).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────
describe('proponerPlanes', () => {
  const ctx = { obras, teatros, lugares, hoy: HOY };

  it('devuelve como máximo la cantidad pedida', () => {
    const fs = [f({ id: 'a' }), f({ id: 'b' }), f({ id: 'c' }), f({ id: 'd' })];
    expect(proponerPlanes(fs, {}, ctx, 3)).toHaveLength(3);
  });

  it('elige el lugar más cercano con la cocina abierta', () => {
    const [p] = proponerPlanes([f()], {}, ctx, 1);
    expect(p.lugar.id).toBe('cerca-abierto');   // 'cerca-cerrado' está más cerca pero cierra 21:00
    expect(p.horaFin).toBe('21:35');
  });

  it('sin ningún lugar a menos de 600 m el plan existe igual, sin cena', () => {
    const [p] = proponerPlanes([f()], { radioM: 5 }, ctx, 1);
    expect(p.lugar).toBeNull();
    expect(p.costo.total).toBe(120);
  });

  it('el presupuesto se aplica al costo TOTAL, no a la entrada suelta', () => {
    // 60x2 entradas + 25x2 cena = 170. Con presupuesto 150 no debe entrar.
    expect(proponerPlanes([f()], { presupuesto: 150 }, ctx, 3)).toHaveLength(0);
    expect(proponerPlanes([f()], { presupuesto: 200 }, ctx, 3)).toHaveLength(1);
  });

  it('el orden es estable ante empate de puntaje', () => {
    const fs = [f({ id: 'zzz' }), f({ id: 'aaa' })];
    const r = proponerPlanes(fs, {}, ctx, 2);
    expect(r[0].funcion.id).toBe('aaa');
  });

  it('sin funciones devuelve lista vacía, no revienta', () => {
    expect(proponerPlanes([], {}, ctx, 3)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
describe('motivoDelPrimero: un orden sin razón se lee como arbitrario', () => {
  const ctx = { obras, teatros, lugares, hoy: HOY };

  it('explica por qué ganó el primero', () => {
    const planes = proponerPlanes(
      [f({ id: 'a' }), f({ id: 'b', teatro_id: 'teatro-larco', confianza: 'probable' })],
      {}, ctx, 2,
    );
    const motivo = motivoDelPrimero(planes[0], planes.slice(1));
    expect(motivo).toBeTypeOf('string');
    expect(motivo).toMatch(/^Es .+\.$/);
  });

  it('sin plan devuelve null en vez de romper', () => {
    expect(motivoDelPrimero(null, [])).toBeNull();
  });
});
