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

// ─────────────────────────────────────────────────────────────
//  La obra en pantalla
//
//  Qué se muestra de una obra y qué se calla. Las tres funciones de acá
//  comparten un criterio: lo que la fuente no publicó se devuelve como
//  null, nunca como texto de relleno. La tarjeta omite la línea entera
//  y el hueco queda declarado en vez de disimulado.
// ─────────────────────────────────────────────────────────────

/**
 * El género de una obra, o null.
 *
 * 'otro' NO es un género: es el valor que llevan las obras cuyo género no
 * publicó ninguna fuente. Mostrarlo pondría la palabra "otro" en la
 * tarjeta, que informa menos que el silencio.
 *
 * Vivía inline dentro de popupTeatro(), en vista.js. Salió acá cuando el
 * género pasó a verse también en la tarjeta: la misma regla decidida en
 * dos archivos se separa sola con el tiempo.
 */
export function generoVisible(obra) {
  const tipo = String(obra?.tipo ?? '').trim();
  return tipo && tipo !== 'otro' ? tipo : null;
}

/**
 * El elenco listo para leer: "Aldo Miyashiro, Lucho Cáceres y Ebelin Ortiz".
 *
 * Acá NADIE decide quién es "conocido", y es la Regla 1 aplicada a los
 * nombres. Si la fuente nombra a alguien es porque es el gancho de la
 * obra; si no nombra a nadie, `elenco` va vacío y esto devuelve null.
 * Deducir fama sería inventar igual que inventar un precio.
 *
 * @returns {{texto: string, otros: number}|null}
 */
export function resumenElenco(obra, max = 3) {
  const nombres = (Array.isArray(obra?.elenco) ? obra.elenco : [])
    .map((n) => String(n ?? '').trim())
    .filter(Boolean);
  if (!nombres.length) return null;

  const visibles = nombres.slice(0, Math.max(1, max));
  const otros = nombres.length - visibles.length;

  // "A", "A y B", "A, B y C". En español no va coma antes de la "y".
  //
  // Pero cuando quedan nombres AFUERA, la lista va entera con comas: la
  // "y" la aporta el "y N más" que la pantalla escribe a continuación.
  // Poner las dos daba "Con A, B y C y 3 más", que salió así en pantalla.
  const texto = otros > 0 || visibles.length === 1
    ? visibles.join(', ')
    : `${visibles.slice(0, -1).join(', ')} y ${visibles[visibles.length - 1]}`;

  return { texto, otros };
}

/**
 * ¿La sinopsis necesita un "seguir leyendo"?
 *
 * Cuenta caracteres y NO líneas, a propósito. Las líneas dependen del
 * ancho, de la tipografía y de dónde caiga cada palabra: para saberlas
 * hay que medir el DOM, y este archivo no lo toca ni puede tocarlo. El
 * recorte visual lo hace CSS con line-clamp; esto solo decide si además
 * hace falta el botón.
 *
 * El umbral se erra hacia arriba a propósito: un botón que despliega dos
 * palabras molesta más que tres líneas de más.
 */
export function necesitaRecorte(texto, umbral = 180) {
  return String(texto ?? '').trim().length > umbral;
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

/**
 * Descompone 'YYYY-MM-DD' con el día de semana ya girado a lunes = 0.
 * Privada, y compartida por etiquetaDia() y diaCorto(): la misma
 * aritmética de fechas escrita dos veces se desincroniza sola.
 */
function partesDelDia(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha ?? ''));
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12) return null;
  const t = Date.UTC(anio, mes - 1, dia);
  if (Number.isNaN(t)) return null;
  // getUTCDay(): domingo = 0. Se gira a lunes = 0.
  return { anio, mes, dia, diaSemana: (new Date(t).getUTCDay() + 6) % 7 };
}

/** 'sábado 22 de agosto'. null si la fecha no es 'YYYY-MM-DD' válida. */
export function etiquetaDia(fecha) {
  const p = partesDelDia(fecha);
  if (!p) return null;
  return `${DIAS[p.diaSemana]} ${p.dia} de ${MESES[p.mes - 1]}`;
}

/**
 * 'sáb'. La abreviatura que va sobre el número en cada chip de la tira,
 * donde 'sábado' entero no entra.
 *
 * Se corta a tres letras CON tilde: 'mié' y no 'mie'. Quitarla para que
 * los chips midan igual sería un error de ortografía a cambio de nada —
 * la tilde no ocupa ancho.
 */
export function diaCorto(fecha) {
  const p = partesDelDia(fecha);
  return p ? DIAS[p.diaSemana].slice(0, 3) : null;
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
//  La lista, la grilla y el mapa consumen esta misma función. Si cada
//  uno filtrara por su cuenta, divergirían: cambiás el filtro de género
//  en la lista y el mapa seguiría pintando pines con el criterio viejo.
// ─────────────────────────────────────────────────────────────

export function filtrarFunciones(funciones, criterios = {}, ctx = {}) {
  const { obras = {}, teatros = {} } = ctx;
  const { desde, hasta, tipo, distrito, idioma, soloConfirmados } = criterios;

  return funciones.filter((f) => {
    if (f.estado === 'cancelada' || f.estado === 'agotada') return false;
    if (desde && f.fecha < desde) return false;
    if (hasta && f.fecha > hasta) return false;

    const obra = obras[f.obra_id];
    const teatro = teatros[f.teatro_id];

    if (tipo && obra?.tipo !== tipo) return false;
    if (idioma && obra?.idioma !== idioma) return false;
    if (distrito && teatro?.distrito !== distrito) return false;

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

/**
 * Los días de la tira: una fila horizontal en lugar de una grilla de seis.
 *
 * La tira es lo primero que se ve del calendario, y por eso lleva TODOS
 * los días que quedan del mes, no solo los que tienen función. Los huecos
 * son información: "el jueves no hay nada" es una respuesta. Si la tira
 * listara únicamente los días con teatro, tres días seguidos con función
 * se verían idénticos a tres días salteados.
 *
 * Lo pasado no entra. Es el mismo corte que ya hacen la lista y el mapa:
 * un día que ya ocurrió no tiene adónde llevarte.
 *
 * Reusa diasDelMes() en vez de rehacer el almanaque.
 *
 * Devuelve [] —y la vista entonces no pinta tira— en los DOS casos en que
 * la fila no señalaría nada:
 *
 *  - el mes entero quedó atrás, o
 *  - no queda ni una función por delante (octubre sin investigar).
 *
 * El segundo se vio en pantalla: 31 chips muertos encima de un cartel que
 * ya decía "nada cargado en octubre", o sea el mismo dato contado dos
 * veces, una de ellas con ruido. Es la misma regla que ya sigue el mapa,
 * que en un mes sin funciones tampoco se dibuja. La forma del mes sigue
 * estando en la grilla, detrás de "Ver el mes completo".
 */
export function diasParaTira(anioMes, funciones = [], hoy) {
  const dias = diasDelMes(anioMes, funciones)
    .filter((c) => c.dentroDelMes && (!hoy || c.fecha >= hoy))
    .map((c) => ({ fecha: c.fecha, cantidad: c.cantidad, esHoy: c.fecha === hoy }));

  return dias.some((d) => d.cantidad) ? dias : [];
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
//  Notas sobre lo retirado
//
//  El ranking. Hasta la vista de mes existían PESOS, puntuarFuncion(),
//  proponerPlanes() y motivoDelPrimero(): la app mostraba 3 planes
//  ordenados por confianza, cercanía, precio y género. Se retiraron
//  cuando el eje del producto pasó a ser el calendario, donde el orden
//  lo manda la fecha: buscar "qué hay el viernes 28" es incompatible
//  con una lista ordenada por puntaje.
//
//  El precio. Después existieron rangoPrecio(), calcularCostoTotal(),
//  PERSONAS y formatearSoles(), y el criterio `precioMax` de
//  filtrarFunciones(). La pregunta del producto dejó de ser "¿cuánto
//  sale?" y pasó a ser "¿qué obra es?": el precio de la entrada y el
//  gasto del restaurante salieron de la pantalla y con ellos las cinco.
//
//  Ojo con lo que ESTO no significa: los precios siguen en los JSON,
//  con su fuente y su fecha, y el validador los sigue revisando. Lo que
//  se retiró es la manera de mostrarlos, no el dato. Si algún día vuelve
//  a pantalla, vuelve de acá — y con él la guarda contra "S/ NaN", que
//  era la consecuencia obligatoria de que un precio pueda ser null.
//
//  Todo está en el historial de git. No se deja como código muerto: el
//  proyecto ya arrastra uno (leerGuardados/alternarGuardado en datos.js)
//  y dos son peor.
// ─────────────────────────────────────────────────────────────
