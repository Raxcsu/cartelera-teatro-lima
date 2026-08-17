/**
 * vista.js — TODA la capa DOM.
 *
 * Salió de un <script type="module"> inline en index.html cuando la
 * pantalla creció de una lista de 3 planes a mapa + calendario + mes.
 * Se mudó tal cual: no arrastró lógica de negocio, porque esa ya vivía
 * separada en logica.js. Esa era justamente la idea.
 *
 * Regla que se sostiene acá: si estás por escribir un cálculo en este
 * archivo, va en logica.js. Este módulo decide QUÉ nodos existen, nunca
 * qué precio se muestra ni qué mes abre.
 */

import { cargarTodo, hoyLima, ErrorDeDatos } from './datos.js';
import { crearMapa } from './mapa.js';
import {
  filtrarFunciones, agruparPorDia, diasDelMes, mesesConFunciones,
  desplazarMes, mesInicial, rangoNavegable, confianzaEfectiva, estadoCartelera,
  rangoPrecio, nombreMes, etiquetaDia, formatearSoles, formatearDistancia,
  horaDeSalida, lugaresCercanos, calcularCostoTotal, urlSegura,
} from './logica.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DIAS_CORTOS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Topes de la tarjeta del mapa. Un popup que lista once funciones tapa el
// mapa que lo explica; el resto está a un clic en la lista.
const OBRAS_EN_POPUP = 3;
const DIAS_EN_POPUP = 2;

// ── estado de la pantalla ────────────────────────────────────
let datos = null;
let hoy = null;
let mesVisible = null;
let meses = [];
let mapa = null;

// ─────────────────────────────────────────────────────────────
//  Arranque
// ─────────────────────────────────────────────────────────────

export async function arrancar(app) {
  try {
    hoy = hoyLima();
    datos = await cargarTodo();
  } catch (e) {
    // Un fetch que revienta sin capturar deja la pantalla en blanco, y
    // eso es peor que un error: el usuario cree que no hay teatro.
    pintarError(app, e);
    console.error(e);
    return;
  }

  const estado = estadoCartelera(datos.funciones, hoy);
  if (estado.vencida) {
    pintarVencida(app, estado);
    return;
  }

  meses = mesesConFunciones(datos.funciones);
  mesVisible = mesInicial(meses, hoy);

  pintarEsqueleto(app);
  refrescar(app);
}

// ─────────────────────────────────────────────────────────────
//  Esqueleto: se dibuja UNA vez
//  El contenedor del mapa no puede recrearse en cada refresco o
//  Leaflet perdería su nodo y habría que recargarlo por CDN cada
//  vez que cambiás de mes.
// ─────────────────────────────────────────────────────────────

function pintarEsqueleto(app) {
  // `pantalla` es lo que enciende el layout de dos columnas en escritorio.
  // Va acá y no en index.html para que las pantallas de cartelera vencida
  // y de error —que reemplazan todo #app— no la hereden: un aviso va
  // centrado en una columna, no repartido en un grid con media pantalla
  // vacía al lado.
  app.classList.add('pantalla');

  // El envoltorio .panel es la columna derecha del mockup: calendario fijo
  // arriba y lista con scroll propio abajo. En móvil no hace nada.
  app.innerHTML = `
    ${datos.hayMuestras ? '<p class="andamio">Datos de andamiaje, no cartelera real</p>' : ''}
    <div class="mapa-caja" hidden>
      <div class="mapa" id="mapa"></div>
      <p class="mapa-esperando">Cargando el mapa…</p>
    </div>
    <div class="panel">
      <div class="calendario-caja">
        <nav class="mes-nav" aria-label="Navegación por mes">
          <button type="button" class="mes-ir" data-ir="-1" aria-label="Mes anterior">&lsaquo;</button>
          <h2 class="mes-nombre" aria-live="polite"></h2>
          <button type="button" class="mes-ir" data-ir="1" aria-label="Mes siguiente">&rsaquo;</button>
        </nav>
        <div class="calendario">
          <div class="semana" aria-hidden="true">${DIAS_CORTOS.map((d) => `<span>${d}</span>`).join('')}</div>
          <div class="grilla" role="group" aria-label="Días con función"></div>
        </div>
      </div>
      <section class="lista" aria-live="polite"></section>
    </div>`;

  app.querySelector('.mes-nav').addEventListener('click', (ev) => {
    const boton = ev.target.closest('.mes-ir');
    if (!boton || boton.disabled) return;
    mesVisible = desplazarMes(mesVisible, Number(boton.dataset.ir));
    refrescar(app);
  });

  app.querySelector('.grilla').addEventListener('click', (ev) => {
    const celda = ev.target.closest('[data-fecha]');
    if (celda) irA(app, `dia-${celda.dataset.fecha}`);
  });
}

// ─────────────────────────────────────────────────────────────
//  Refresco: todo lo que cambia al pasar de mes
// ─────────────────────────────────────────────────────────────

function refrescar(app) {
  const [desde, hasta] = [`${mesVisible}-01`, `${mesVisible}-31`];
  const delMes = filtrarFunciones(datos.funciones, { desde, hasta }, datos);

  app.querySelector('.mes-nombre').textContent = nombreMes(mesVisible) ?? '';

  // Un mes más allá de lo cargado, para poder decir "septiembre todavía
  // no se investigó" en vez de dejar la flecha muerta. Ver rangoNavegable().
  const rango = rangoNavegable(meses);
  for (const boton of app.querySelectorAll('.mes-ir')) {
    const destino = desplazarMes(mesVisible, Number(boton.dataset.ir));
    boton.disabled = !rango || !destino || destino < rango.desde || destino > rango.hasta;
  }

  pintarGrilla(app, delMes);
  pintarLista(app, delMes);
  pintarMapa(app, delMes);
}

function pintarGrilla(app, delMes) {
  const celdas = diasDelMes(mesVisible, delMes);
  app.querySelector('.grilla').innerHTML = celdas.map((c) => {
    if (!c.dentroDelMes) return '<span class="celda fuera"></span>';

    const dia = Number(c.fecha.slice(8));
    const clases = ['celda'];
    if (c.fecha === hoy) clases.push('hoy');
    if (c.fecha < hoy) clases.push('pasado');
    if (!c.cantidad) return `<span class="${clases.join(' ')}">${dia}</span>`;

    clases.push('con-funcion');
    // "función" pierde la tilde al pluralizar: son "funciones", no "funciónes".
    const cuantas = `${c.cantidad} ${c.cantidad === 1 ? 'función' : 'funciones'}`;
    return `<button type="button" class="${clases.join(' ')}" data-fecha="${c.fecha}"
      aria-label="${esc(etiquetaDia(c.fecha))}, ${cuantas}"
      >${dia}<i></i></button>`;
  }).join('');
}

function pintarLista(app, delMes) {
  const lista = app.querySelector('.lista');

  // La lista arranca en hoy: lo que ya pasó se ve en la grilla como
  // contexto, pero no se ofrece como si todavía se pudiera ir.
  const dias = agruparPorDia(delMes.filter((f) => f.fecha >= hoy));

  if (!dias.length) {
    const huboAlgo = delMes.length > 0;
    // Tercer estado de vacío, distinto de "cartelera vencida" y de
    // "no se pudieron cargar los datos". Acá los datos están bien: es
    // este mes el que no tiene nada por delante.
    lista.innerHTML = `
      <div class="vacio sin-resultados">
        <div class="marca"><i></i></div>
        <h3>${huboAlgo ? 'Este mes ya pasó' : `Nada cargado en ${esc(nombreMes(mesVisible) ?? 'este mes')}`}</h3>
        <p>${huboAlgo
            ? `Las ${delMes.length} funciones de ${esc(nombreMes(mesVisible) ?? '')} quedaron atrás.`
            : 'La cartelera de este mes todavía no se investigó.'}</p>
        <p class="nota">Probá con las flechas de arriba: ${meses.length
            ? `hay funciones en ${meses.map((m) => esc(nombreMes(m))).join(', ')}.`
            : 'todavía no hay ningún mes cargado.'}</p>
      </div>`;
    return;
  }

  lista.innerHTML = dias.map((d) => `
    <section class="dia" id="dia-${d.fecha}">
      <h3 class="dia-titulo">${esc(etiquetaDia(d.fecha) ?? d.fecha)}</h3>
      <ul class="funciones">${d.funciones.map(tarjeta).join('')}</ul>
    </section>`).join('');
}

// ─────────────────────────────────────────────────────────────
//  La tarjeta de una función
// ─────────────────────────────────────────────────────────────

function tarjeta(f) {
  const obra = datos.obras[f.obra_id] ?? null;
  const teatro = datos.teatros[f.teatro_id] ?? null;
  const precio = rangoPrecio(f);
  const conf = confianzaEfectiva(f.confianza, f.verificado_el, hoy);

  return `
    <li class="funcion" data-teatro="${esc(f.teatro_id)}">
      <h4>${esc(obra?.titulo ?? f.obra_id)}</h4>
      <p class="meta">${esc(f.hora)} · ${esc(teatro?.nombre ?? '?')}${
        teatro?.distrito ? `, ${esc(teatro.distrito)}` : ''}${
        obra?.duracion_min ? ` · ${esc(obra.duracion_min)} min` : ''}${
        obra?.idioma && obra.idioma !== 'español' ? ` · en ${esc(obra.idioma)}` : ''}</p>

      <p class="precio">${esc(precio.texto)}${
        precio.min != null ? '<small>por entrada</small>' : ''}</p>

      ${conf.texto
        ? `<p class="flag n-${conf.nivel}"><span class="dot"></span>${esc(conf.texto)}</p>`
        : ''}

      <p class="acciones">${
        enlace(f.url_entradas, 'Comprar entradas', 'primario')}${
        enlace(f.fuente_url, 'Ver fuente')}</p>

      ${cerca(f, obra, teatro)}
    </li>`;
}

/** Un link, o nada. urlSegura() decide si el destino se puede abrir. */
function enlace(url, texto, extra = '') {
  const destino = urlSegura(url);
  if (!destino) return '';
  return `<a class="btn ${extra}" href="${esc(destino)}" target="_blank" rel="noopener noreferrer">${esc(texto)}</a>`;
}

/**
 * El bloque de restaurantes, plegado.
 *
 * La cena dejó de ser parte del plan y del precio, pero "¿qué hay cerca
 * que siga abierto cuando salgamos?" sigue siendo una pregunta real.
 * Vive acá adentro: se abre solo si te interesa.
 */
function cerca(f, obra, teatro) {
  const salida = horaDeSalida(f, obra);
  const sitios = lugaresCercanos(teatro, datos.lugares, salida.hora);
  // Sin sitios y sin nada que contar del teatro, un desplegable vacío
  // solo promete algo que no hay.
  if (!sitios.length && !urlSegura(teatro?.web) && !teatro?.direccion) return '';

  const costo = sitios.length ? calcularCostoTotal(f, sitios[0].lugar) : null;

  return `
    <details class="cerca">
      <summary>${sitios.length ? `Cerca para cenar (${sitios.length})` : 'Sobre el teatro'}</summary>
      <div class="cerca-cuerpo">
        ${teatro?.direccion ? `<p class="meta">${esc(teatro.direccion)}</p>` : ''}
        ${urlSegura(teatro?.web) ? `<p class="meta">${enlace(teatro.web, 'Web del teatro')}</p>` : ''}

        ${sitios.length ? `
          ${salida.supuesta
            // El supuesto se declara. Ninguna de las 5 obras publica
            // duración, así que hoy esta línea sale en todas.
            ? `<p class="supuesto">Suponiendo unas 2 h de función: la obra no publica duración.</p>`
            : ''}
          <ul class="sitios">${sitios.map((s) => `
            <li>
              <span class="sitio-nombre">${esc(s.lugar.nombre)}</span>
              <span class="meta">${esc(formatearDistancia(s.distancia) ?? '')}${
                s.lugar.gasto_min != null
                  ? ` · ${s.lugar.gasto_referencial ? '~' : ''}${formatearSoles(s.lugar.gasto_min)}${
                      s.lugar.gasto_max && s.lugar.gasto_max !== s.lugar.gasto_min
                        ? ` – ${Math.round(s.lugar.gasto_max)}` : ''} por persona`
                  : ' · sin precio'}</span>
            </li>`).join('')}</ul>

          ${costo?.total != null ? `
            <p class="total">${costo.estimado ? '~' : ''}${formatearSoles(costo.total)}
              <small>${esc(costo.incluye.join(' + '))}, en ${esc(sitios[0].lugar.nombre)}</small></p>`
            : ''}
        ` : ''}
      </div>
    </details>`;
}

// ─────────────────────────────────────────────────────────────
//  Mapa — enteramente opcional
// ─────────────────────────────────────────────────────────────

async function pintarMapa(app, delMes) {
  const caja = app.querySelector('.mapa-caja');
  if (mapa) { mapa.destruir(); mapa = null; }

  // La banda se REVELA antes de crear el mapa, y no es cosmético.
  //
  // Un elemento con [hidden] no tiene caja, así que Leaflet lo mide 0x0:
  // fitBounds calcula un zoom enorme, maxZoom lo recorta en 15 y el mapa
  // queda encuadrado sobre el centro correcto con los teatros a más de mil
  // píxeles fuera de cuadro. Pasó en producción: un mapa de Lima sin un
  // solo pin a la vista. Revelarlo después no lo arregla — invalidateSize()
  // corrige el tamaño pero conserva el zoom equivocado, y el ResizeObserver
  // de mapa.js tampoco, porque Chrome no notifica elementos sin caja.
  //
  // Si el mapa no se puede crear, la banda vuelve a esconderse abajo.
  caja.hidden = false;

  // Y mientras Leaflet viaja por el CDN, la caja dice que está esperando.
  // En la banda de móvil eran 260px en blanco un segundo; en la columna de
  // escritorio es media pantalla, y un rectángulo vacío sin explicación se
  // lee como "acá no hay nada", que es justo lo que este proyecto evita.
  const esperando = caja.querySelector('.mapa-esperando');
  esperando.hidden = false;

  // El mapa muestra lo MISMO que la lista: de hoy en adelante. Un pin de un
  // teatro cuyas funciones ya pasaron no tiene tarjeta a la que llevar, así
  // que su "Ver más" no haría nada, y en silencio.
  const proximas = delMes.filter((f) => f.fecha >= hoy);

  // Un teatro por marca, no una por función: cinco funciones en el mismo
  // teatro son un solo pin con el conteo y una sola tarjeta.
  const porTeatro = new Map();
  for (const f of proximas) {
    const t = datos.teatros[f.teatro_id];
    if (!t) continue;
    if (!porTeatro.has(t.id)) porTeatro.set(t.id, { teatro: t, funciones: [] });
    porTeatro.get(t.id).funciones.push(f);
  }

  const puntos = [...porTeatro.values()].map(({ teatro, funciones }) => ({
    id: teatro.id,
    nombre: teatro.nombre,
    lat: teatro.lat,
    lng: teatro.lng,
    cantidad: funciones.length,
    // El HTML de la tarjeta se arma acá y no en mapa.js: toca obras,
    // funciones y precios, y necesita esc(). mapa.js no conoce el dominio
    // y no puede empezar a conocerlo por un popup.
    popupHtml: popupTeatro(teatro, funciones),
  }));

  mapa = await crearMapa(caja.querySelector('.mapa'), puntos, {
    alSeleccionar: (id) => {
      const destino = app.querySelector(`.funcion[data-teatro="${CSS.escape(id)}"]`);
      if (!destino) return;
      desplazar(destino, 'center');
      destino.classList.add('resaltada');
      setTimeout(() => destino.classList.remove('resaltada'), 1600);
    },
  });

  esperando.hidden = true;

  // Si Leaflet no cargó, o no hay un solo teatro ubicable, la banda
  // desaparece y la lista queda intacta. Nunca un hueco gris.
  caja.hidden = !mapa;
  // Y en escritorio se retira además la columna del grid. Esconder solo la
  // caja dejaría su pista en pie: media pantalla vacía a la izquierda.
  app.classList.toggle('sin-mapa', !mapa);
}

/**
 * La tarjeta que se abre al tocar un pin: obra, género, teatro, fechas,
 * horarios y un "Ver más" que lleva a la lista. Es el mockup, con una
 * salvedad de la Regla 1 del dato — el género solo aparece si la fuente
 * lo publicó; `tipo: "otro"` es literalmente "nadie lo dijo".
 *
 * Devuelve HTML ya escapado. Todo lo que entra pasa por esc().
 */
function popupTeatro(teatro, funciones) {
  const porObra = new Map();
  for (const f of funciones) {
    if (!porObra.has(f.obra_id)) porObra.set(f.obra_id, []);
    porObra.get(f.obra_id).push(f);
  }

  const obras = [...porObra.entries()].slice(0, OBRAS_EN_POPUP);
  const otrasObras = porObra.size - obras.length;

  const bloques = obras.map(([obraId, fs]) => {
    const obra = datos.obras[obraId] ?? null;
    // 'otro' es el valor que llevan las obras cuyo género no publicó ninguna
    // fuente. Rellenarlo con algo plausible sería inventar; se omite.
    const genero = obra?.tipo && obra.tipo !== 'otro' ? obra.tipo : null;

    // agruparPorDia ya ordena por fecha y por hora. Ese orden no puede
    // vivir en dos lados: si acá se ordenara distinto, el popup y la lista
    // contarían la misma cartelera en dos secuencias.
    const todos = agruparPorDia(fs);
    const dias = todos.slice(0, DIAS_EN_POPUP);
    const otrosDias = todos.length - dias.length;

    return `
      <div class="obra">
        <p class="obra-titulo">${esc(obra?.titulo ?? obraId)}</p>
        ${genero ? `<p class="meta">${esc(genero)}</p>` : ''}
        ${dias.map((d) => `<p class="meta">${esc(etiquetaDia(d.fecha) ?? d.fecha)} · ${
          d.funciones.map((f) => esc(f.hora)).join(', ')}</p>`).join('')}
        ${otrosDias > 0
          ? `<p class="mas">y ${otrosDias} ${otrosDias === 1 ? 'fecha más' : 'fechas más'}</p>`
          : ''}
      </div>`;
  }).join('');

  return `
    <div class="popup-teatro">
      <p class="teatro">${esc(teatro.nombre ?? '')}${
        teatro.distrito ? ` · ${esc(teatro.distrito)}` : ''}</p>
      ${bloques}
      ${otrasObras > 0
        ? `<p class="mas">y ${otrasObras} ${otrasObras === 1 ? 'obra más' : 'obras más'} en este teatro</p>`
        : ''}
      <button type="button" class="btn" data-ver-mas="${esc(teatro.id)}">Ver más</button>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  Estados de vacío y de error
//  Los TRES son visualmente distintos a propósito. Si se parecieran,
//  el modelo de confianza quedaría anulado en la práctica.
// ─────────────────────────────────────────────────────────────

function pintarVencida(app, estado) {
  app.innerHTML = `
    <div class="vacio vencido">
      <div class="marca reloj"><i></i><i></i></div>
      <h2>Esta cartelera está vencida</h2>
      <p>${estado.diasSinVerificar == null
          ? 'Todavía no hay datos cargados.'
          : `La última verificación fue hace ${estado.diasSinVerificar} días.`}</p>
      <p class="nota">No te mostramos funciones viejas como si fueran de hoy.</p>
    </div>`;
}

function pintarError(app, e) {
  const cual = e instanceof ErrorDeDatos ? ` (${esc(e.archivo)}.json)` : '';
  app.innerHTML = `
    <div class="vacio error">
      <div class="marca"><i></i></div>
      <h2>No se pudieron cargar los datos</h2>
      <p>Puede ser falta de señal, o un archivo de datos dañado${cual}.</p>
      <p class="nota">Si estás en tu PC: revisá que <code>python -m http.server</code> siga corriendo.</p>
    </div>`;
}

// ── utilidades de navegación ─────────────────────────────────

/**
 * El desplazamiento NO pide `behavior: 'smooth'`, y esa omisión es el
 * arreglo de un bug encontrado probando en el navegador:
 *
 * cuando el sistema tiene las animaciones apagadas, un
 * `scrollIntoView({behavior:'smooth'})` no se desplaza NADA. No es que
 * salte sin animación: se queda quieto. Tocar un día del calendario no
 * hacía absolutamente nada, y en silencio.
 *
 * Sin la opción, el navegador usa `scroll-behavior` del CSS: suave donde
 * se puede, instantáneo donde no, pero siempre llega. Y ahí la
 * preferencia de movimiento reducido se respeta por media query.
 */
function desplazar(destino, block = 'start') {
  destino.scrollIntoView({ block });
}

function irA(app, id) {
  const destino = app.querySelector(`#${CSS.escape(id)}`);
  if (destino) desplazar(destino);
}
