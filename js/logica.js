/**
 * logica.js — TODA la lógica pura del proyecto.
 *
 * Reglas de este archivo:
 *   1. Cero imports. Cero DOM. Cero red. Cero Date.now() implícito.
 *   2. Toda función recibe `hoy` como parámetro en vez de leer el reloj.
 *      Así se puede probar el paso del tiempo sin trucos.
 *   3. Si algo puede estar mal en un cálculo, vive acá y tiene test.
 *
 * Las fechas se manejan como strings 'YYYY-MM-DD' y se comparan
 * lexicográficamente: es correcto, y evita por completo los líos de
 * zona horaria. Lima es UTC-5 y no tiene horario de verano.
 */

// ─────────────────────────────────────────────────────────────
//  IDs deterministas
//  Derivados del contenido, NUNCA de un contador. Si fueran
//  correlativos, cada /actualizar-cartelera los barajaría: tus
//  guardados apuntarían a obras equivocadas y el git diff sería
//  ilegible. Legibles a propósito, para poder revisar el diff.
// ─────────────────────────────────────────────────────────────

/**
 * Tope de longitud del slug. Sin él, un título largo produce un id de
 * 74 caracteres que ensucia URLs y diffs. Lo encontró validar_datos.py
 * corriendo contra datos reales, no la revisión de diseño.
 * Una colisión exigiría dos obras con los primeros 60 caracteres
 * iguales Y la misma temporada.
 */
export const SLUG_MAX = 60;

export function slug(texto) {
  if (texto == null) return '';
  const s = String(texto)
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '')   // quita tildes: "británico" → "britanico"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (s.length <= SLUG_MAX) return s;
  // corta en frontera de palabra para que siga siendo legible
  return s.slice(0, SLUG_MAX).replace(/-[^-]*$/, '').replace(/-+$/, '');
}

export const idTeatro = (nombre) => slug(nombre);
export const idLugar = (nombre, distrito) => `${slug(nombre)}-${slug(distrito)}`;
export const idObra = (titulo, temporadaInicio) =>
  `${slug(titulo)}-${String(temporadaInicio ?? '').slice(0, 4)}`;
export const idFuncion = (obraId, teatroId, fecha, hora) =>
  `${obraId}-${teatroId}-${fecha}-${String(hora ?? '').replace(':', '')}`;

// ─────────────────────────────────────────────────────────────
//  Tiempo y frescura del dato
// ─────────────────────────────────────────────────────────────

/** Días completos entre dos fechas 'YYYY-MM-DD'. null si falta alguna. */
export function diasEntre(desde, hasta) {
  if (!desde || !hasta) return null;
  const a = Date.parse(`${desde}T12:00:00Z`);
  const b = Date.parse(`${hasta}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * La confianza mostrada se CALCULA, no se lee del JSON.
 *
 * Guardar `verificado_el` y después nunca mirarlo produce confianza
 * falsa con apariencia de rigor: un precio confirmado hace seis
 * semanas se vería idéntico a uno de hoy.
 */
export function confianzaEfectiva(confianza, verificadoEl, hoy) {
  const dias = diasEntre(verificadoEl, hoy);

  if (confianza === 'confirmado' && dias !== null) {
    if (dias <= 7)  return { nivel: 'ok',  dias, texto: null };
    if (dias <= 21) return { nivel: 'mid', dias, texto: `confirmado hace ${dias} días` };
    return { nivel: 'no', dias, texto: `sin verificar hace ${dias} días` };
  }
  // 'probable' nunca sube a verde, por reciente que sea.
  if (confianza === 'probable') {
    return { nivel: 'mid', dias, texto: 'verificar antes de ir' };
  }
  return { nivel: 'no', dias, texto: 'sin verificar' };
}

/**
 * Distingue los DOS estados de vacío. Si se confundieran, el modelo
 * de confianza quedaría anulado en la práctica: el usuario leería
 * "no hay teatro este finde" cuando la verdad es "estos datos
 * tienen dos meses".
 */
export function estadoCartelera(funciones, hoy) {
  const futuras = funciones.filter((f) => f.fecha >= hoy);
  if (futuras.length > 0) return { vencida: false, diasSinVerificar: null };

  const fechas = funciones.map((f) => f.verificado_el).filter(Boolean).sort();
  const ultima = fechas[fechas.length - 1] ?? null;
  return { vencida: true, diasSinVerificar: diasEntre(ultima, hoy) };
}

// ─────────────────────────────────────────────────────────────
//  Formato
// ─────────────────────────────────────────────────────────────

/**
 * Regla 1 dice que un precio no verificado va como null. La
 * consecuencia obligatoria es que nada aritmético puede tocarlo
 * sin guarda, o la pantalla muestra "S/ NaN".
 */
export function formatearSoles(monto) {
  if (monto == null || Number.isNaN(monto)) return 'sin precio';
  return `S/ ${Math.round(monto)}`;
}

export function formatearDistancia(metros) {
  if (metros == null || Number.isNaN(metros)) return null;
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}

// ─────────────────────────────────────────────────────────────
//  Geografía
// ─────────────────────────────────────────────────────────────

/** Haversine. null si falta cualquier coordenada. */
export function distanciaMetros(a, b) {
  if (!a || !b) return null;
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Suma minutos a una hora 'HH:MM'. Devuelve 'HH:MM', puede pasar de 24h. */
export function sumarMinutos(hora, minutos) {
  if (!hora || minutos == null) return null;
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * ¿La cocina sigue abierta cuando termina la función?
 * "Cenamos después" es ficción si la función acaba 22:00 y la
 * cocina cierra 22:30 sin margen para llegar.
 */
export function cocinaAbierta(lugar, horaFin, margenMin = 20) {
  if (!lugar || !lugar.cierra_cocina || !horaFin) return false;
  const llegada = sumarMinutos(horaFin, margenMin);
  return llegada != null && llegada <= lugar.cierra_cocina;
}

// ─────────────────────────────────────────────────────────────
//  Filtrado — FUENTE ÚNICA
//  La lista y las propuestas consumen esta misma función. Si cada
//  una filtrara por su cuenta, divergirían: cambiás el filtro de
//  precio en la lista y las propuestas seguirían con el criterio viejo.
// ─────────────────────────────────────────────────────────────

export function filtrarFunciones(funciones, criterios = {}, ctx = {}) {
  const { obras = {}, teatros = {} } = ctx;
  const { desde, hasta, tipo, distrito, precioMax, idioma, soloConfirmados } = criterios;

  return funciones.filter((f) => {
    if (f.estado === 'cancelada' || f.estado === 'agotada') return false;
    if (desde && f.fecha < desde) return false;
    if (hasta && f.fecha > hasta) return false;

    const obra = obras[f.obra_id];
    const teatro = teatros[f.teatro_id];

    if (tipo && obra?.tipo !== tipo) return false;
    if (idioma && obra?.idioma !== idioma) return false;
    if (distrito && teatro?.distrito !== distrito) return false;

    // Precio null NO se descarta por presupuesto: se desconoce, no es caro.
    // Descartarlo escondería funciones que quizá sí entran.
    if (precioMax != null && f.precio_min != null && f.precio_min > precioMax) return false;

    if (soloConfirmados && f.confianza !== 'confirmado') return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────
//  TUYAS — las dos decisiones de gusto, no de ingeniería
// ─────────────────────────────────────────────────────────────

/**
 * Criterio de orden. Más alto = va primero.
 *
 * El razonamiento, para que puedas discutirlo y no solo cambiarlo:
 *
 *  confianza (1.4) — pesa más que todo. Lo que arruina una salida no
 *    es pagar S/ 20 de más: es llegar y que el precio o el horario ya
 *    no sean los que decía la app. Todo el proyecto modela la frescura
 *    del dato; el orden tiene que honrarla o el modelo es decorativo.
 *
 *  cercanía (1.2) — segundo, y es específico de Lima. Cruzar de
 *    distrito un sábado en la noche puede costar una hora. Además la
 *    cena a pie solo existe si el sitio está de verdad cerca.
 *
 *  precio (0.6) — bajo A PROPÓSITO. El presupuesto ya es un FILTRO:
 *    todo lo que se muestra entra. Volver a pesarlo fuerte cuenta dos
 *    veces la misma restricción y empuja siempre a lo más barato, que
 *    no es lo mismo que lo mejor. Ser más barato es un desempate.
 *
 *  género (0.3) — casi nulo, por la misma razón: el tipo de obra ya
 *    es un filtro de la interfaz. Si querés comedia, filtrás comedia.
 *
 * Cambiá los números con libertad: las pruebas verifican invariantes
 * (nunca NaN, nunca negativo), no este criterio.
 */
export const PESOS = { precio: 0.6, cercania: 1.2, confianza: 1.4, genero: 0.3 };

export function puntuarFuncion(funcion, ctx = {}) {
  const { presupuesto, distanciaM, confEfectiva, tipoFavorito, obra } = ctx;

  let p = 0;
  if (presupuesto != null && funcion.precio_min != null) {
    p += PESOS.precio * Math.max(0, 1 - funcion.precio_min / presupuesto);
  }
  if (distanciaM != null) {
    p += PESOS.cercania * Math.max(0, 1 - distanciaM / 3000);
  }
  if (confEfectiva) {
    p += PESOS.confianza * ({ ok: 1, mid: 0.5, no: 0 }[confEfectiva.nivel] ?? 0);
  }
  if (tipoFavorito && obra?.tipo === tipoFavorito) {
    p += PESOS.genero;
  }
  return Number.isFinite(p) ? p : 0;
}

/**
 * Qué entra en el costo de una salida.
 *
 *  entradas × 2  — sí, siempre. Es una salida de dos.
 *  cena × 2      — sí, cuando el plan tiene lugar.
 *  taxi          — NO por defecto, y es la decisión de fondo.
 *
 * El taxi depende de desde dónde salgan y de si van en auto propio.
 * Meter un número fijo haría mentir al filtro de presupuesto, que es
 * exactamente lo que este proyecto no hace con los precios de entrada.
 * Queda como parámetro: si algún día la interfaz pregunta "¿van en
 * taxi?", se pasa acá y el total lo refleja.
 *
 * Devuelve `incluye`: la lista de lo que SÍ está contado. Un booleano
 * no alcanza para ser honesto. La interfaz muestra esa lista, así que
 * el total nunca puede insinuar que cubre algo que no cubre.
 */
export const PERSONAS = 2;

export function calcularCostoTotal(funcion, lugar, opciones = {}) {
  const { personas = PERSONAS, taxiIdaVuelta = 0 } = opciones;

  const entradaMin = funcion?.precio_min ?? null;
  const entradaMax = funcion?.precio_max ?? funcion?.precio_min ?? null;
  const cenaMin = lugar?.gasto_min ?? null;
  const cenaMax = lugar?.gasto_max ?? lugar?.gasto_min ?? null;

  const faltaEntrada = entradaMin == null;
  const faltaCena = lugar != null && cenaMin == null;

  const min = (entradaMin ?? 0) * personas + (cenaMin ?? 0) * personas + taxiIdaVuelta;
  const max = (entradaMax ?? 0) * personas + (cenaMax ?? 0) * personas + taxiIdaVuelta;

  return {
    total: faltaEntrada ? null : min,
    min: faltaEntrada ? null : min,
    max: faltaEntrada ? null : max,
    // `completo` = no falta ningún precio de lo que SÍ está incluido.
    // `incluyeCena` = si hay cena en el plan. Sin este segundo dato la
    // interfaz decía "los dos, con cena" en planes que no tenían cena:
    // completo era true porque no faltaba nada... al no haber nada.
    completo: !faltaEntrada && !faltaCena,
    incluyeCena: lugar != null,
    falta: [faltaEntrada && 'entradas', faltaCena && 'cena'].filter(Boolean),
    // Lo que el total SÍ cuenta. La interfaz lo muestra tal cual, así
    // el número nunca insinúa que cubre algo que no cubre.
    incluye: [
      !faltaEntrada &&
        `entradas x${personas}${funcion?.precio_referencial ? ' estimadas' : ''}`,
      lugar != null && !faltaCena &&
        `cena x${personas}${lugar.gasto_referencial ? ' estimada' : ''}`,
      taxiIdaVuelta > 0 && 'taxi',
    ].filter(Boolean),
    // Ningún precio estimado puede disfrazarse de precio verificado. Vale para
    // los dos lados: la entrada (precio_referencial) y la cena
    // (gasto_referencial). La interfaz muestra "~" cuando esto es true.
    estimado: Boolean(
      (funcion?.precio_referencial && !faltaEntrada) ||
      (lugar?.gasto_referencial && !faltaCena),
    ),
    personas,
  };
}

// ─────────────────────────────────────────────────────────────
//  Propuestas
// ─────────────────────────────────────────────────────────────

/**
 * Arma planes completos: función + lugar cercano + costo, ordenados
 * por puntuarFuncion. Devuelve como máximo `cantidad`.
 */
export function proponerPlanes(funciones, criterios = {}, ctx = {}, cantidad = 3) {
  const { obras = {}, teatros = {}, lugares = [], hoy } = ctx;
  const { presupuesto, tipoFavorito, radioM = 600 } = criterios;

  const candidatas = filtrarFunciones(funciones, criterios, ctx);

  const planes = candidatas.map((f) => {
    const obra = obras[f.obra_id] ?? null;
    const teatro = teatros[f.teatro_id] ?? null;
    const confEfectiva = confianzaEfectiva(f.confianza, f.verificado_el, hoy);
    const horaFin = sumarMinutos(f.hora, obra?.duracion_min ?? 0);

    const cercanos = lugares
      .map((l) => ({ lugar: l, distancia: distanciaMetros(teatro, l) }))
      .filter((x) => x.distancia != null && x.distancia <= radioM)
      .filter((x) => cocinaAbierta(x.lugar, horaFin))
      .sort((a, b) => a.distancia - b.distancia);

    const elegido = cercanos[0] ?? null;
    const costo = calcularCostoTotal(f, elegido?.lugar ?? null, {});

    return {
      funcion: f, obra, teatro, confEfectiva, horaFin, costo,
      lugar: elegido?.lugar ?? null,
      distanciaLugar: elegido?.distancia ?? null,
      puntaje: puntuarFuncion(f, {
        presupuesto, tipoFavorito, obra, confEfectiva,
        distanciaM: elegido?.distancia ?? null,
      }),
    };
  });

  // Presupuesto se aplica sobre el costo TOTAL, no sobre la entrada
  // suelta: el filtro promete "los dos, con cena".
  const dentro = presupuesto == null
    ? planes
    : planes.filter((p) => p.costo.total == null || p.costo.total <= presupuesto);

  return dentro
    .sort((a, b) => b.puntaje - a.puntaje || a.funcion.id.localeCompare(b.funcion.id))
    .slice(0, cantidad);
}

/** Por qué este plan quedó primero. Un orden sin motivo se lee como arbitrario. */
export function motivoDelPrimero(plan, resto) {
  if (!plan) return null;
  const razones = [];
  if (plan.distanciaLugar != null && resto.every((p) => (p.distanciaLugar ?? Infinity) >= plan.distanciaLugar)) {
    razones.push('el que tiene la cena más cerca');
  }
  if (plan.confEfectiva?.nivel === 'ok' && resto.some((p) => p.confEfectiva?.nivel !== 'ok')) {
    razones.push('el único con precio confirmado hoy');
  }
  if (plan.costo?.total != null && resto.every((p) => (p.costo?.total ?? Infinity) >= plan.costo.total)) {
    razones.push('el más barato');
  }
  if (!razones.length) return null;
  return `Es ${razones.join(' y ')}.`;
}
