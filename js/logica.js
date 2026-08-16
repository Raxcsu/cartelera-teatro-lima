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

/**
 * Deja pasar solo http y https. Devuelve null para todo lo demás.
 *
 * Escapar con &lt; y &quot; alcanza para texto, pero NO para un href:
 * `javascript:algo()` no lleva ningún carácter que el escape toque, y
 * se ejecuta igual al hacer clic. Hasta la vista de mes no había un
 * solo link en pantalla; ahora hay dos por tarjeta y los llena una
 * investigación externa (ver docs/encargo-cartelera.md), así que el
 * dato entra de afuera y hay que tratarlo como tal.
 */
export function urlSegura(url) {
  const s = String(url ?? '').trim();
  if (!s) return null;
  // Sin URL global (Node viejo) se cae al chequeo de prefijo, que ya
  // cubre el caso peligroso.
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? s : null;
  } catch {
    return /^https?:\/\//i.test(s) ? s : null;
  }
}

export function formatearDistancia(metros) {
  if (metros == null || Number.isNaN(metros)) return null;
  if (metros < 1000) return `${Math.round(metros / 10) * 10} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}

/**
 * Cómo se lee el precio de una entrada. ÚNICO lugar donde se decide.
 *
 * Se muestra el rango tal como lo publica la fuente, sin multiplicar por
 * nadie. Las fuentes son desparejas a propósito y hay que respetarlo:
 * "Cáscaras" publica S/ 30-50, "Inmaduros" publica "desde 35" y no dice
 * techo, "Ipacankure" publica un precio único. Rellenar el techo que
 * falta sería inventar, que es justo lo que prohíbe la Regla 1.
 */
export function rangoPrecio(funcion) {
  const min = funcion?.precio_min ?? null;
  const max = funcion?.precio_max ?? null;

  // Sin número no hay nada que estimar: mismo criterio que calcularCostoTotal.
  if (min == null) return { min: null, max: null, texto: 'sin precio', estimado: false };

  const estimado = Boolean(funcion?.precio_referencial);
  const tilde = estimado ? '~' : '';

  if (max == null)  return { min, max: null, texto: `desde ${tilde}${formatearSoles(min)}`, estimado };
  if (max === min)  return { min, max, texto: `${tilde}${formatearSoles(min)}`, estimado };
  return { min, max, texto: `${tilde}${formatearSoles(min)} – ${Math.round(max)}`, estimado };
}

/**
 * Nombres en español por tabla fija, NO por Intl.DateTimeFormat.
 *
 * Intl depende de qué locales tenga instalado el navegador: puede devolver
 * "agosto" en uno y "ago." en otro, y en Node sin ICU completo devuelve
 * inglés. Doce strings son deterministas, se prueban sin navegador y no
 * dependen del entorno, que es la regla de este archivo.
 */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** 'agosto 2026'. null si el mes no es 'YYYY-MM' válido. */
export function nombreMes(anioMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(anioMes ?? ''));
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return `${MESES[mes - 1]} ${m[1]}`;
}

/** 'sábado 22 de agosto'. null si la fecha no es 'YYYY-MM-DD' válida. */
export function etiquetaDia(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha ?? ''));
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12) return null;
  const t = Date.UTC(anio, mes - 1, dia);
  if (Number.isNaN(t)) return null;
  // getUTCDay(): domingo = 0. Se gira a lunes = 0.
  const diaSemana = (new Date(t).getUTCDay() + 6) % 7;
  return `${DIAS[diaSemana]} ${dia} de ${MESES[mes - 1]}`;
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

/**
 * Cuánto se supone que dura una obra que no publica duración.
 *
 * El código anterior usaba `duracion_min ?? 0`, o sea que una obra sin
 * duración "terminaba" a la hora de empezar. Con eso, un sitio que
 * cierra cocina 21:00 calificaba para una función de 20:00 que en
 * realidad acaba 21:35: exactamente el error que cocinaAbierta() existe
 * para impedir, y errando hacia el lado peligroso.
 *
 * Dos horas no es un dato, es un supuesto conservador, y por eso
 * horaDeSalida() devuelve `supuesta` para que la pantalla lo diga. Errar
 * hacia una obra más larga descarta sitios de más, que es la dirección
 * segura. Cuando la obra publique duracion_min, esto no se usa.
 */
export const DURACION_SUPUESTA_MIN = 120;

export function horaDeSalida(funcion, obra) {
  const duracion = obra?.duracion_min ?? null;
  return {
    hora: sumarMinutos(funcion?.hora, duracion ?? DURACION_SUPUESTA_MIN),
    supuesta: duracion == null,
  };
}

/**
 * Sitios para cenar cerca de un teatro, del más cercano al más lejano.
 *
 * El criterio salió tal cual del cuerpo de proponerPlanes: la cena dejó
 * de ser parte del plan y del precio, pero sigue siendo la misma pregunta
 * ("¿qué hay cerca que siga abierto cuando salgamos?") y la misma
 * respuesta. Ahora vive en el detalle de una función, no en su costo.
 */
export function lugaresCercanos(teatro, lugares = [], horaFin, opciones = {}) {
  const { radioM = 600, margenMin = 20, cantidad = 3 } = opciones;
  if (!teatro) return [];

  return lugares
    .map((lugar) => ({ lugar, distancia: distanciaMetros(teatro, lugar) }))
    .filter((x) => x.distancia != null && x.distancia <= radioM)
    .filter((x) => cocinaAbierta(x.lugar, horaFin, margenMin))
    .sort((a, b) => a.distancia - b.distancia || String(a.lugar.id).localeCompare(String(b.lugar.id)))
    .slice(0, cantidad);
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
//  Calendario — el mes como unidad
//  La cartelera se navega por mes: una grilla arriba para ver de un
//  vistazo qué días tienen algo, y una lista abajo con el detalle.
//  Las dos leen las MISMAS funciones ya filtradas, nunca cada una
//  las suyas.
// ─────────────────────────────────────────────────────────────

/**
 * Agrupa funciones por día, en orden, y dentro de cada día por hora.
 * Los días sin función NO aparecen: la lista muestra lo que hay, y la
 * grilla es la que muestra los huecos.
 */
export function agruparPorDia(funciones = []) {
  const porFecha = new Map();
  for (const f of funciones) {
    if (!f?.fecha) continue;                 // sin fecha no es un día, es un dato roto
    if (!porFecha.has(f.fecha)) porFecha.set(f.fecha, []);
    porFecha.get(f.fecha).push(f);
  }

  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, fs]) => ({
      fecha,
      funciones: fs.sort((a, b) =>
        String(a.hora ?? '').localeCompare(String(b.hora ?? '')) ||
        String(a.id ?? '').localeCompare(String(b.id ?? ''))),
    }));
}

/**
 * Grilla del calendario para un mes 'YYYY-MM'.
 *
 * Devuelve SIEMPRE 42 celdas (6 filas × 7 columnas) aunque el mes entre
 * en 4 o 5. Si la grilla cambiara de alto al pasar de mes, la lista de
 * abajo saltaría con ella y perderías el punto donde estabas mirando.
 *
 * Lunes primero: es como se lee un calendario en Perú.
 */
export function diasDelMes(anioMes, funciones = []) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(anioMes ?? ''));
  if (!m) return [];
  const anio = Number(m[1]);
  const mes = Number(m[2]);                  // 1-12
  if (mes < 1 || mes > 12) return [];

  const cuenta = new Map();
  for (const f of funciones) {
    if (!f?.fecha) continue;
    cuenta.set(f.fecha, (cuenta.get(f.fecha) ?? 0) + 1);
  }

  // Date.UTC con valores explícitos: determinista y sin leer el reloj,
  // igual que diasEntre(). Nada acá depende de la zona del navegador.
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const desplazamiento = (primero.getUTCDay() + 6) % 7;   // domingo=0 → lunes=0
  const largoDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  const celdas = [];
  for (let i = 0; i < 42; i++) {
    const dia = i - desplazamiento + 1;
    if (dia < 1 || dia > largoDelMes) {
      celdas.push({ fecha: null, cantidad: 0, dentroDelMes: false });
    } else {
      const fecha = `${m[1]}-${m[2]}-${String(dia).padStart(2, '0')}`;
      celdas.push({ fecha, cantidad: cuenta.get(fecha) ?? 0, dentroDelMes: true });
    }
  }
  return celdas;
}

/** Meses 'YYYY-MM' con al menos una función, ordenados. Decide qué
 *  flechas del calendario se encienden y cuáles se apagan. */
export function mesesConFunciones(funciones = []) {
  const meses = new Set();
  for (const f of funciones) {
    if (f?.fecha) meses.add(String(f.fecha).slice(0, 7));
  }
  return [...meses].sort();
}

/** Corre un mes 'YYYY-MM' N posiciones. Existe por el salto de año:
 *  diciembre + 1 es enero del año siguiente, no el mes 13. */
export function desplazarMes(anioMes, delta = 0) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(anioMes ?? ''));
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;

  const indice = Number(m[1]) * 12 + (mes - 1) + Number(delta);
  const anio = Math.floor(indice / 12);
  const nuevo = indice - anio * 12 + 1;      // siempre 1-12, también con delta negativo
  return `${String(anio).padStart(4, '0')}-${String(nuevo).padStart(2, '0')}`;
}

/**
 * Hasta dónde dejan llegar las flechas del calendario.
 *
 * Un mes más allá del rango cargado, en cada dirección. Ni más ni menos:
 *
 *  - Frenar justo en el borde deja las flechas muertas cuando hay un
 *    solo mes de datos, y con eso el estado "nada cargado en septiembre"
 *    queda inalcanzable. Un estado vacío que el código nunca puede
 *    mostrar es un estado que nadie verificó.
 *  - Dejarlas sueltas te hace caminar meses vacíos sin fin.
 *
 * Un paso alcanza para responder "¿y el mes que viene?" con la verdad,
 * que es "todavía no se investigó".
 */
export function rangoNavegable(meses = []) {
  if (!meses.length) return null;
  return {
    desde: desplazarMes(meses[0], -1),
    hasta: desplazarMes(meses[meses.length - 1], 1),
  };
}

/**
 * Con qué mes abre la app.
 *
 * El mes de hoy si tiene funciones. Si no, el primero por delante que
 * tenga: abrir en un mes vacío cuando la cartelera empieza la semana
 * que viene se lee como "no hay teatro", que es la confusión que todo
 * este proyecto trata de evitar. Si todo quedó atrás, el último con
 * funciones, y ahí estadoCartelera() avisa que está vencida.
 */
export function mesInicial(meses = [], hoy) {
  const mesDeHoy = String(hoy ?? '').slice(0, 7) || null;
  if (!meses.length) return mesDeHoy;
  if (!mesDeHoy) return meses[0];
  if (meses.includes(mesDeHoy)) return mesDeHoy;
  return meses.find((m) => m > mesDeHoy) ?? meses[meses.length - 1];
}

// ─────────────────────────────────────────────────────────────
//  Costo — solo para la cena del detalle
//  El precio que manda en pantalla es rangoPrecio(), la entrada tal
//  como la publica la fuente. Esto calcula el "y si además cenan",
//  que vive dentro de la tarjeta expandida.
// ─────────────────────────────────────────────────────────────

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
//  Nota sobre el ranking retirado
//
//  Hasta la vista de mes existían PESOS, puntuarFuncion(),
//  proponerPlanes() y motivoDelPrimero(): la app mostraba 3 planes
//  ordenados por confianza, cercanía, precio y género.
//
//  Se retiraron a propósito. El eje del producto pasó a ser el
//  calendario, y en un calendario el orden lo manda la fecha: buscar
//  "qué hay el viernes 28" es incompatible con una lista ordenada por
//  puntaje. Un ranking además pesaba fuerte la cercanía a un
//  restaurante, que ya no es protagonista.
//
//  Están en el historial de git si alguna vez vuelve la pantalla de
//  propuestas. No se dejan como código muerto: el proyecto ya arrastra
//  uno (leerGuardados/alternarGuardado en datos.js) y dos son peor.
// ─────────────────────────────────────────────────────────────
