import { describe, it, expect } from 'vitest';
import {
  slug, idTeatro, idObra, idFuncion, idLugar,
  diasEntre, confianzaEfectiva, estadoCartelera,
  formatearDistancia, urlSegura,
  nombreMes, etiquetaDia, diaCorto,
  generoVisible, resumenElenco, necesitaRecorte,
  distanciaMetros, sumarMinutos, cocinaAbierta, lugaresCercanos, horaDeSalida,
  filtrarFunciones,
  agruparPorDia, diasDelMes, diasParaTira, mesesConFunciones, desplazarMes,
  mesInicial, rangoNavegable,
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
  it('distancias', () => {
    expect(formatearDistancia(null)).toBeNull();
    expect(formatearDistancia(237)).toBe('240 m');
    expect(formatearDistancia(1520)).toBe('1.5 km');
  });
});

// ─────────────────────────────────────────────────────────────
describe('generoVisible: "otro" no es un género', () => {
  it('devuelve el género cuando la fuente lo publicó', () => {
    expect(generoVisible({ tipo: 'comedia' })).toBe('comedia');
  });

  // 'otro' es literalmente "nadie lo dijo". Escribirlo en la tarjeta
  // informa menos que dejar la línea afuera.
  it('"otro" devuelve null, no la palabra "otro"', () => {
    expect(generoVisible({ tipo: 'otro' })).toBeNull();
  });

  it('sin tipo, vacío o sin obra devuelve null', () => {
    expect(generoVisible({ tipo: null })).toBeNull();
    expect(generoVisible({ tipo: '   ' })).toBeNull();
    expect(generoVisible({})).toBeNull();
    expect(generoVisible(null)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('resumenElenco: los nombres como los publica la fuente', () => {
  const conElenco = (...elenco) => ({ id: 'o', elenco });

  it('une en español, sin coma antes de la "y"', () => {
    expect(resumenElenco(conElenco('Aldo Miyashiro')).texto).toBe('Aldo Miyashiro');
    expect(resumenElenco(conElenco('Aldo Miyashiro', 'Lucho Cáceres')).texto)
      .toBe('Aldo Miyashiro y Lucho Cáceres');
    expect(resumenElenco(conElenco('Aldo Miyashiro', 'Lucho Cáceres', 'Ebelin Ortiz')).texto)
      .toBe('Aldo Miyashiro, Lucho Cáceres y Ebelin Ortiz');
  });

  it('corta en max y cuenta los que quedan afuera', () => {
    const r = resumenElenco(conElenco('A', 'B', 'C', 'D', 'E'), 3);
    expect(r.otros).toBe(2);
  });

  // Salió así en pantalla: "Con Aldo Miyashiro, Lucho Cáceres y Ebelin
  // Ortiz y 3 más". La pantalla escribe "y N más" a continuación, así que
  // la lista no puede traer su propia "y" o quedan dos seguidas.
  it('con nombres afuera, la lista va con comas y sin "y"', () => {
    expect(resumenElenco(conElenco('A', 'B', 'C', 'D'), 3).texto).toBe('A, B, C');
    expect(`Con ${resumenElenco(conElenco('A', 'B', 'C', 'D'), 3).texto} y 1 más`)
      .not.toMatch(/ y .* y /);
  });

  it('sin nadie afuera, otros es 0 — nunca "y 0 más"', () => {
    expect(resumenElenco(conElenco('A', 'B')).otros).toBe(0);
  });

  // Un elenco vacío tiene que devolver null y no una cadena vacía: la
  // tarjeta decide con esto si pinta la línea entera o la omite.
  it('sin elenco devuelve null, nunca una cadena vacía', () => {
    expect(resumenElenco(conElenco())).toBeNull();
    expect(resumenElenco({ elenco: null })).toBeNull();
    expect(resumenElenco({})).toBeNull();
    expect(resumenElenco(null)).toBeNull();
    expect(resumenElenco({ elenco: 'Aldo Miyashiro' })).toBeNull();   // string, no lista
  });

  it('descarta nombres vacíos en vez de dejar comas sueltas', () => {
    expect(resumenElenco(conElenco('A', '  ', 'B')).texto).toBe('A y B');
    expect(resumenElenco(conElenco('  ', null))).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
describe('necesitaRecorte: cuándo va el "seguir leyendo"', () => {
  it('un texto corto no lleva botón', () => {
    expect(necesitaRecorte('Comedia sobre la amistad.')).toBe(false);
  });

  it('uno largo sí', () => {
    expect(necesitaRecorte('x'.repeat(181))).toBe(true);
    expect(necesitaRecorte('x'.repeat(180))).toBe(false);   // el umbral no es inclusivo
  });

  // Una obra sin sinopsis no puede ofrecer un botón que no abra nada.
  it('sin texto, nunca', () => {
    expect(necesitaRecorte(null)).toBe(false);
    expect(necesitaRecorte('')).toBe(false);
    expect(necesitaRecorte(' '.repeat(300))).toBe(false);   // espacios no son sinopsis
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
describe('diasParaTira: la fila de días', () => {
  const enAgosto = [
    f({ id: 'a', fecha: '2026-08-10' }),   // pasado
    f({ id: 'b', fecha: '2026-08-16' }),   // hoy
    f({ id: 'c', fecha: '2026-08-22' }),
    f({ id: 'd', fecha: '2026-08-22' }),
  ];

  it('arranca en hoy: lo pasado no tiene adónde llevarte', () => {
    const tira = diasParaTira('2026-08', enAgosto, HOY);
    expect(tira[0].fecha).toBe(HOY);
    expect(tira.every((d) => d.fecha >= HOY)).toBe(true);
  });

  it('llega hasta fin de mes y no se sale', () => {
    const tira = diasParaTira('2026-08', enAgosto, HOY);
    expect(tira).toHaveLength(16);                      // del 16 al 31
    expect(tira[tira.length - 1].fecha).toBe('2026-08-31');
  });

  // Los huecos son información: si la tira solo listara los días con
  // teatro, tres días seguidos se verían igual que tres salteados.
  it('incluye los días SIN función, con cantidad 0', () => {
    const tira = diasParaTira('2026-08', enAgosto, HOY);
    const porFecha = Object.fromEntries(tira.map((d) => [d.fecha, d.cantidad]));
    expect(porFecha['2026-08-22']).toBe(2);
    expect(porFecha['2026-08-23']).toBe(0);
    expect(porFecha['2026-08-17']).toBe(0);
  });

  it('marca hoy, y solo hoy', () => {
    const tira = diasParaTira('2026-08', enAgosto, HOY);
    expect(tira.filter((d) => d.esHoy).map((d) => d.fecha)).toEqual([HOY]);
  });

  it('un mes futuro con funciones entra entero', () => {
    const enSetiembre = [f({ id: 's', fecha: '2026-09-12' })];
    expect(diasParaTira('2026-09', enSetiembre, HOY)).toHaveLength(30);
  });

  // Sin esto la vista pintaría una fila de días muertos debajo de
  // "este mes ya pasó", contando dos veces la misma noticia.
  it('un mes íntegramente pasado devuelve lista vacía', () => {
    expect(diasParaTira('2026-07', enAgosto, HOY)).toEqual([]);
  });

  // Salió en pantalla: octubre mostraba 31 chips muertos encima del cartel
  // "nada cargado en octubre". Misma regla que el mapa, que tampoco se
  // dibuja en un mes sin funciones.
  it('un mes sin una sola función devuelve lista vacía, no 31 días muertos', () => {
    expect(diasParaTira('2026-10', enAgosto, HOY)).toEqual([]);
    expect(diasParaTira('2026-10', [], HOY)).toEqual([]);
  });

  it('un mes inválido no rompe', () => {
    expect(diasParaTira('2026-13', [], HOY)).toEqual([]);
    expect(diasParaTira(null, [], HOY)).toEqual([]);
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

  it('abrevia el día a tres letras, con tilde', () => {
    expect(diaCorto('2026-08-22')).toBe('sáb');
    expect(diaCorto('2026-08-19')).toBe('mié');   // no 'mie'
    expect(diaCorto('2026-08-17')).toBe('lun');
    expect(diaCorto('2026-08-23')).toBe('dom');
  });

  it('las siete abreviaturas son distintas entre sí', () => {
    const semana = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20',
                    '2026-08-21', '2026-08-22', '2026-08-23'].map(diaCorto);
    expect(new Set(semana).size).toBe(7);
  });

  it('una fecha inválida devuelve null en vez de "undefined de undefined"', () => {
    expect(nombreMes('xx')).toBeNull();
    expect(etiquetaDia(null)).toBeNull();
    expect(diaCorto('no-es-fecha')).toBeNull();
    expect(diaCorto(null)).toBeNull();
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
