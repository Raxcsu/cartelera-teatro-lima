import { describe, it, expect } from 'vitest';
import {
  slug, idTeatro, idObra, idFuncion, idLugar,
  diasEntre, confianzaEfectiva, estadoCartelera,
  formatearSoles, formatearDistancia, rangoPrecio, urlSegura,
  nombreMes, etiquetaDia,
  distanciaMetros, sumarMinutos, cocinaAbierta, lugaresCercanos, horaDeSalida,
  filtrarFunciones, calcularCostoTotal,
  agruparPorDia, diasDelMes, mesesConFunciones, desplazarMes, mesInicial, rangoNavegable,
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

  it('un gasto de cena estimado no se disfraza de precio verificado', () => {
    const estimado = { ...lugares[0], gasto_referencial: true };
    const c = calcularCostoTotal(f(), estimado);
    expect(c.estimado).toBe(true);
    expect(c.incluye).toContain('cena x2 estimada');
    expect(calcularCostoTotal(f(), lugares[0]).estimado).toBe(false);
    expect(calcularCostoTotal(f(), null).estimado).toBe(false);
  });

  // precio_referencial estaba documentado y el codigo lo ignoraba: campo muerto
  // que la revision cruzada destapo. Aplica la misma regla que la cena.
  it('una entrada de precio estimado tambien marca el total como estimado', () => {
    const c = calcularCostoTotal(f({ precio_referencial: true }), null);
    expect(c.estimado).toBe(true);
    expect(c.incluye).toContain('entradas x2 estimadas');
  });

  it('con entrada estimada y cena estimada, ambas se declaran', () => {
    const lugarEst = { ...lugares[0], gasto_referencial: true };
    const c = calcularCostoTotal(f({ precio_referencial: true }), lugarEst);
    expect(c.incluye).toEqual(['entradas x2 estimadas', 'cena x2 estimada']);
  });

  it('sin precio de entrada, precio_referencial no marca nada', () => {
    const c = calcularCostoTotal(f({ precio_min: null, precio_referencial: true }), null);
    expect(c.estimado).toBe(false);
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
describe('rangoPrecio: el precio se muestra como lo publica la fuente', () => {
  it('con mínimo y máximo muestra el rango', () => {
    expect(rangoPrecio(f({ precio_min: 30, precio_max: 50 })).texto).toBe('S/ 30 – 50');
  });

  // 'Inmaduros' dice "desde 35 soles" y no publica techo. Inventarle uno
  // sería exactamente lo que prohíbe la Regla 1.
  it('sin máximo dice "desde", no un rango falso', () => {
    expect(rangoPrecio(f({ precio_min: 35, precio_max: null })).texto).toBe('desde S/ 35');
  });

  it('precio único no se muestra como rango de un solo valor', () => {
    expect(rangoPrecio(f({ precio_min: 40, precio_max: 40 })).texto).toBe('S/ 40');
  });

  it('sin precio nunca produce NaN', () => {
    const r = rangoPrecio(f({ precio_min: null, precio_max: null }));
    expect(r.texto).toBe('sin precio');
    expect(r.texto).not.toMatch(/NaN/);
    expect(r.min).toBeNull();
  });

  it('el precio referencial se marca con virgulilla', () => {
    const r = rangoPrecio(f({ precio_min: 50, precio_max: null, precio_referencial: true }));
    expect(r.texto).toBe('desde ~S/ 50');
    expect(r.estimado).toBe(true);
  });

  // Mismo criterio que calcularCostoTotal: no hay nada estimado si no hay número.
  it('referencial sin precio no se marca como estimado', () => {
    expect(rangoPrecio(f({ precio_min: null, precio_referencial: true })).estimado).toBe(false);
  });

  it('una función indefinida no rompe', () => {
    expect(rangoPrecio(undefined).texto).toBe('sin precio');
  });
});

// ─────────────────────────────────────────────────────────────
describe('urlSegura: los links los llena una investigación externa', () => {
  it('deja pasar http y https', () => {
    expect(urlSegura('https://teleticket.com.pe/teatro')).toBe('https://teleticket.com.pe/teatro');
    expect(urlSegura('http://ejemplo.pe')).toBe('http://ejemplo.pe');
  });

  // esc() no toca ni un carácter de esto: escapar no alcanza para un href.
  it('bloquea javascript: y data:', () => {
    expect(urlSegura('javascript:alert(1)')).toBeNull();
    expect(urlSegura('JavaScript:alert(1)')).toBeNull();
    expect(urlSegura('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(urlSegura(' javascript:alert(1) ')).toBeNull();
  });

  it('null y vacío devuelven null, no la cadena "null"', () => {
    expect(urlSegura(null)).toBeNull();
    expect(urlSegura('')).toBeNull();
    expect(urlSegura('   ')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('agruparPorDia: la lista del mes', () => {
  it('ordena los días y no inventa los vacíos', () => {
    const r = agruparPorDia([
      f({ id: 'b', fecha: '2026-08-25' }),
      f({ id: 'a', fecha: '2026-08-22' }),
    ]);
    expect(r.map((d) => d.fecha)).toEqual(['2026-08-22', '2026-08-25']);
  });

  it('agrupa el mismo día y ordena por hora', () => {
    const r = agruparPorDia([
      f({ id: 'tarde', fecha: '2026-08-22', hora: '20:30' }),
      f({ id: 'temprano', fecha: '2026-08-22', hora: '16:00' }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].funciones.map((x) => x.id)).toEqual(['temprano', 'tarde']);
  });

  it('descarta funciones sin fecha en vez de crear un día "undefined"', () => {
    expect(agruparPorDia([f({ fecha: null })])).toEqual([]);
  });

  it('sin funciones devuelve lista vacía', () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
describe('diasDelMes: la grilla del calendario', () => {
  it('siempre 42 celdas, para que la grilla no cambie de alto entre meses', () => {
    expect(diasDelMes('2026-08', [])).toHaveLength(42);
    expect(diasDelMes('2026-02', [])).toHaveLength(42);
  });

  // Perú lee el calendario de lunes a domingo. El 1 de agosto de 2026 es sábado.
  it('la semana empieza en lunes', () => {
    const celdas = diasDelMes('2026-08', []);
    expect(celdas.slice(0, 5).every((c) => c.fecha === null)).toBe(true);
    expect(celdas[5].fecha).toBe('2026-08-01');
  });

  it('cuenta las funciones de cada día', () => {
    const celdas = diasDelMes('2026-08', [
      f({ id: 'a', fecha: '2026-08-22' }),
      f({ id: 'b', fecha: '2026-08-22' }),
      f({ id: 'c', fecha: '2026-08-25' }),
    ]);
    const porFecha = Object.fromEntries(celdas.filter((c) => c.fecha).map((c) => [c.fecha, c.cantidad]));
    expect(porFecha['2026-08-22']).toBe(2);
    expect(porFecha['2026-08-25']).toBe(1);
    expect(porFecha['2026-08-23']).toBe(0);
  });

  it('respeta el largo real del mes', () => {
    const dentro = (m) => diasDelMes(m, []).filter((c) => c.dentroDelMes).length;
    expect(dentro('2026-02')).toBe(28);   // no bisiesto
    expect(dentro('2024-02')).toBe(29);   // bisiesto
    expect(dentro('2026-04')).toBe(30);
    expect(dentro('2026-12')).toBe(31);
  });

  it('un mes inválido devuelve lista vacía en vez de romper', () => {
    expect(diasDelMes('no-es-un-mes', [])).toEqual([]);
    expect(diasDelMes('2026-13', [])).toEqual([]);
    expect(diasDelMes(null, [])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
describe('mesesConFunciones: qué flechas del calendario se encienden', () => {
  it('devuelve los meses únicos, ordenados', () => {
    expect(mesesConFunciones([
      f({ fecha: '2026-09-03' }),
      f({ fecha: '2026-08-22' }),
      f({ fecha: '2026-08-25' }),
    ])).toEqual(['2026-08', '2026-09']);
  });

  it('sin funciones devuelve lista vacía', () => {
    expect(mesesConFunciones([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
describe('navegación de meses', () => {
  it('avanza y retrocede dentro del año', () => {
    expect(desplazarMes('2026-08', 1)).toBe('2026-09');
    expect(desplazarMes('2026-08', -1)).toBe('2026-07');
  });

  // La razón de existir de esta función.
  it('cruza el fin de año en las dos direcciones', () => {
    expect(desplazarMes('2026-12', 1)).toBe('2027-01');
    expect(desplazarMes('2026-01', -1)).toBe('2025-12');
    expect(desplazarMes('2026-01', -13)).toBe('2024-12');
  });

  it('un mes inválido devuelve null', () => {
    expect(desplazarMes('2026-13', 1)).toBeNull();
    expect(desplazarMes(null, 1)).toBeNull();
  });

  it('abre en el mes de hoy si tiene funciones', () => {
    expect(mesInicial(['2026-07', '2026-08', '2026-09'], HOY)).toBe('2026-08');
  });

  // Abrir en un mes vacío cuando la temporada arranca la semana que
  // viene se leería como "no hay teatro".
  it('si el mes de hoy está vacío, salta al primero por delante', () => {
    expect(mesInicial(['2026-09', '2026-10'], HOY)).toBe('2026-09');
  });

  it('si todo quedó atrás, muestra el último; estadoCartelera avisa', () => {
    expect(mesInicial(['2026-05', '2026-06'], HOY)).toBe('2026-06');
  });

  it('sin funciones abre en el mes de hoy', () => {
    expect(mesInicial([], HOY)).toBe('2026-08');
  });

  // Con un solo mes cargado, frenar en el borde deja las DOS flechas
  // muertas y vuelve inalcanzable el estado "nada cargado en septiembre".
  it('deja llegar un mes más allá del rango cargado', () => {
    expect(rangoNavegable(['2026-08'])).toEqual({ desde: '2026-07', hasta: '2026-09' });
  });

  it('el margen se mide contra los extremos, no contra cada mes', () => {
    expect(rangoNavegable(['2026-08', '2026-09', '2026-10']))
      .toEqual({ desde: '2026-07', hasta: '2026-11' });
  });

  it('sin funciones no hay nada que navegar', () => {
    expect(rangoNavegable([])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('nombres en español: tabla fija, no Intl', () => {
  it('nombra el mes', () => {
    expect(nombreMes('2026-08')).toBe('agosto 2026');
    expect(nombreMes('2026-12')).toBe('diciembre 2026');
  });

  it('nombra el día con su fecha', () => {
    expect(etiquetaDia('2026-08-22')).toBe('sábado 22 de agosto');
  });

  it('una fecha inválida devuelve null en vez de "undefined de undefined"', () => {
    expect(nombreMes('xx')).toBeNull();
    expect(etiquetaDia(null)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('horaDeSalida: el supuesto se declara, no se esconde', () => {
  it('usa la duración publicada cuando existe', () => {
    const r = horaDeSalida(f({ hora: '20:00' }), obras['comedia-2026']);   // 95 min
    expect(r.hora).toBe('21:35');
    expect(r.supuesta).toBe(false);
  });

  // El código viejo hacía `?? 0`: la obra "terminaba" al empezar, y eso
  // dejaba pasar sitios que ya iban a estar cerrados.
  it('sin duración supone 2 h y lo marca', () => {
    const r = horaDeSalida(f({ hora: '20:00' }), { duracion_min: null });
    expect(r.hora).toBe('22:00');
    expect(r.supuesta).toBe(true);
  });

  it('el supuesto erra hacia el lado seguro: descarta cocinas al límite', () => {
    const teatro = teatros['teatro-britanico'];
    const conDuracion = lugaresCercanos(teatro, lugares, horaDeSalida(f({ hora: '20:00' }), null).hora);
    // 'cerca-cerrado' cierra 21:00; con el supuesto de 2 h queda fuera.
    expect(conDuracion.some((x) => x.lugar.id === 'cerca-cerrado')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe('lugaresCercanos: la cena dejó de ser el plan, sigue siendo el criterio', () => {
  const teatro = teatros['teatro-britanico'];

  it('descarta el más cercano si la cocina ya cerró', () => {
    // 'cerca-cerrado' está más cerca, pero cierra 21:00 y la función acaba 21:35.
    const r = lugaresCercanos(teatro, lugares, '21:35');
    expect(r[0].lugar.id).toBe('cerca-abierto');
    expect(r.some((x) => x.lugar.id === 'cerca-cerrado')).toBe(false);
  });

  it('descarta lo que está fuera del radio', () => {
    expect(lugaresCercanos(teatro, lugares, '21:35').some((x) => x.lugar.id === 'lejos')).toBe(false);
  });

  it('devuelve la distancia junto al lugar', () => {
    const [x] = lugaresCercanos(teatro, lugares, '21:35');
    expect(x.distancia).toBeGreaterThan(0);
    expect(x.distancia).toBeLessThanOrEqual(600);
  });

  it('sin teatro o sin coordenadas devuelve lista vacía, no revienta', () => {
    expect(lugaresCercanos(null, lugares, '21:35')).toEqual([]);
    expect(lugaresCercanos(teatros['sin-coords'], lugares, '21:35')).toEqual([]);
  });

  it('sin hora de fin no propone nada: "cenamos después" sería ficción', () => {
    expect(lugaresCercanos(teatro, lugares, null)).toEqual([]);
  });
});
