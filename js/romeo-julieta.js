/**
 * romeo-julieta.js — la invitación a Romeo y Julieta, viernes 06.11.2026.
 *
 * Es la hermana de noche-criolla.js y está calcada de ella a propósito: NO
 * pide la cartelera, todo lo editable vive en FUNCION, y todo lo que cambia
 * con la hora sale de UN dato, `estadoNoche(ahora, ROMEO_HORARIO)` en
 * logica.js, con sus pruebas. Acá solo se pinta.
 *
 * Reusa las clases `noche-*` de styles.css: es la misma composición. Lo que
 * cambia es el contenido, el dibujo del hero y los textos del reloj.
 *
 * Las entradas NO están en la página y nunca van a estar: llevan el QR de
 * acceso, el número de compra y un correo, y este repo es público. Viven en
 * data/entradas_romeo_julieta/, que está en .gitignore.
 */

import { estadoNoche, ROMEO_HORARIO } from './logica.js';
import { ahoraLima } from './datos.js';

/* ── el contenido: todo lo editable vive acá ─────────────────
   Fuentes: la ficha de Passline del 06.11 y las entradas, consultadas el
   2026-11-03; la prensa (El Peruano, Mano Alzada, Correo) coincide en
   elenco, dirección y duración. Si cambia la hora, cambiar TAMBIÉN
   ROMEO_HORARIO en logica.js: el reloj no lee este objeto.

   La apertura de sala no la publica nadie: por eso el programa dice
   "Llegamos" a las 7:30 y no "Abren las puertas". */
const FUNCION = {
  fecha: '2026-11-06',
  kicker: '06.11.2026 · VIERNES',
  titulo: 'Una noche en Verona',
  bajada: ['Este viernes hay función en el Municipal,', 'y los dos asientos de la fila 15 son nuestros.'],
  asientos: 'Fila 15',
  entradas: 'Platea · asientos 1 y 2 · las entradas las llevo yo',
  lugar: { nombre: 'Teatro Municipal de Lima', direccion: 'Jr. Ica 377, Cercado de Lima' },
  duracion: {
    titulo: 'Unas dos horas',
    nota: 'Empieza puntual a las 8:00 p. m. Una vez iniciada la función, no dejan entrar.',
  },
  obra: {
    titulo: 'Romeo y Julieta',
    produccion: 'Éxodo Teatro · dirección de Jean Pierre Gamarra',
    elenco: 'Óscar Yépez y María Grazia Gamarra',
    cita: '¿El amor es ciego? Romeo y Julieta es la trágica historia de dos jóvenes amantes de familias enemistadas, que se enamoran a primera vista…',
    fuente: 'Passline',
  },
  foto: {
    archivo: 'assets/romeo-julieta/evento.jpg',
    alt: 'Julieta y Romeo frente a frente, a contraluz',
    credito: 'Imagen: Passline',
  },
  // `marca`: en qué estado del reloj esta parada lleva el punto relleno.
  programa: [
    { hora: '7:30', sub: 'p. m.', presente: 'Llegamos con tiempo', pasado: 'Llegamos con tiempo', marca: 'puertas' },
    { hora: '8:00', sub: 'p. m.', presente: 'Se abre el telón', pasado: 'Se abrió el telón', marca: 'durante' },
    { hora: '10:00', sub: 'aprox.', presente: 'Termina, y la noche sigue', pasado: 'Terminó, y la noche siguió', marca: null },
  ],
  // URLs fijas escritas acá, no datos de afuera: no pasan por urlSegura()
  // porque nadie más las llena. La ruta va a Google Maps, igual que en la
  // noche criolla: en el teléfono la web de OSM no arma el camino.
  urls: {
    ruta: 'https://www.google.com/maps/dir/?api=1&destination=Teatro%20Municipal%20de%20Lima%2C%20Jr.%20Ica%20377%2C%20Lima',
    passline: 'https://www.passline.com/eventos-ficha-dvm/romeo-y-julieta-461128',
  },
  // Un borrador de Oscar para editar. Con `texto: null` la nota no se pinta.
  nota: {
    titulo: 'Para ti',
    texto: 'Hay obras que se ven y obras que se cuentan después, de camino a casa. Esta quiero contarla contigo.\n\nShakespeare la escribió como tragedia; la nuestra viene con final feliz incluido: salir del teatro tomados de la mano.',
    firma: 'Oscar',
  },
};

// Cada cuánto se vuelve a mirar el reloj con la página abierta.
const PULSO_MS = 30000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORAZON = '<span class="corazon" aria-hidden="true"></span>';

/* ── dibujos ─────────────────────────────────────────────────
   El balcón de Verona en trazo, con la luna y dos flores del ramo. Cada
   trazo lleva pathLength="1" para que el CSS lo dibuje una sola vez. */

function flor(x, y, escala, clase) {
  const petalos = [0, 72, 144, 216, 288]
    .map((g) => `<ellipse class="${clase}" rx="5" ry="8" cy="-7" transform="rotate(${g})"/>`).join('');
  return `<g class="noche-flor" transform="translate(${x} ${y}) scale(${escala})">${petalos}<circle class="noche-centro" r="3"/></g>`;
}

const BALAUSTRES = [96, 108, 120, 132, 144, 156]
  .map((x) => `<path class="noche-trazo" pathLength="1" d="M${x} 94v16"/>`).join('');

const ANCLA = `
  <svg class="noche-ancla" viewBox="0 0 250 120" aria-hidden="true">
    <path class="noche-suave" d="M101 86V48a25 25 0 0 1 50 0v38z"/>
    <path class="noche-trazo" pathLength="1" d="M101 86V48a25 25 0 0 1 50 0v38"/>
    <path class="noche-trazo" pathLength="1" d="M126 23v63M101 56h50"/>
    <path class="noche-trazo" pathLength="1" d="M86 86h80v8H86z"/>
    ${BALAUSTRES}
    <path class="noche-trazo" pathLength="1" d="M84 110h84"/>
    <path class="noche-trazo" pathLength="1" d="M208 18a12 12 0 1 0 10 19 10 10 0 0 1-10-19z"/>
    ${flor(204, 76, 1, 'noche-petalo')}
    ${flor(44, 40, 0.7, 'noche-petalo-2')}
    <path class="noche-trazo noche-suelo" pathLength="1" d="M20 114c40-6 80-6 210 0"/>
  </svg>`;

const ICONOS = {
  butaca: '<path d="M6.5 11V6.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V11"/><path d="M4.5 11h15v5h-15zM6.5 16v3.5M17.5 16v3.5"/>',
  lugar: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};

const icono = (nombre) => `<svg class="noche-icono" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;

/* ── lo que depende de la hora ───────────────────────────────
   Cada pieza recibe el resultado de estadoNoche() y nada más. */

// Sin aria-live, a propósito (DESIGN.md): un reloj que cambia cada 30 s
// anunciaría cada minuto sin que nadie lo pida.
function relojHtml(e) {
  if (!e) return '';
  const caja = (clase, etiqueta, cifra, nota) => `
    <div class="noche-reloj ${clase}">
      <p class="noche-etiqueta">${etiqueta}</p>
      <p class="noche-cifra">${cifra}</p>
      <p class="noche-reloj-nota">${nota}</p>
    </div>`;
  switch (e.estado) {
    case 'dias':
      return caja('texto', 'Para nuestra función',
        e.dias === 1 ? 'Falta 1 día' : `Faltan ${e.dias} días`, 'Viernes 6 a las 8:00 p. m.');
    case 'antes': {
      // Con menos de una hora, solo minutos: nunca "0 h 25 min".
      const cifra = e.horas > 0
        ? `${e.horas}<small>h</small>${e.minutos}<small>min</small>`
        : `${e.minutos}<small>min</small>`;
      return caja('', 'Para que se abra el telón', cifra, 'Llegamos a las 7:30 p. m.: no dejan entrar tarde.');
    }
    case 'puertas':
      return caja('texto', 'Ya estamos aquí', esc(FUNCION.asientos), 'El telón se abre a las 8:00 p. m.');
    case 'durante':
      return caja('texto', 'Ahora mismo', 'En escena', 'Fin estimado: alrededor de las 10:00 p. m.');
    default:
      return caja('recuerdo', esc(FUNCION.kicker.slice(0, 10)), 'Fue nuestra noche en Verona', 'Ya es un recuerdo.');
  }
}

const esRecuerdo = (e) => e?.estado === 'despues';

// La línea útil vive en la primera pantalla mientras sirve para llegar.
function utilHtml(e) {
  if (esRecuerdo(e)) return '';
  return `
    <p class="noche-util-linea"><b>${esc(FUNCION.asientos)}</b> · ${esc(FUNCION.lugar.nombre)}</p>
    <a class="btn primario noche-ruta" href="${esc(FUNCION.urls.ruta)}" target="_blank" rel="noopener">Cómo llegar</a>`;
}

function programaHtml(e) {
  const pasado = esRecuerdo(e);
  return FUNCION.programa.map((p) => `
    <li class="${p.marca && e?.estado === p.marca ? 'clave' : ''}">
      <span class="noche-hora">${esc(p.hora)}<small>${esc(p.sub)}</small></span>
      <span class="noche-punto" aria-hidden="true"></span>
      <span class="noche-que">${esc(pasado ? p.pasado : p.presente)}</span>
    </li>`).join('');
}

function accionesHtml(e) {
  const ruta = esRecuerdo(e)
    ? ''
    : `<a class="btn primario" href="${esc(FUNCION.urls.ruta)}" target="_blank" rel="noopener">Cómo llegar</a>`;
  return `${ruta}
    <a class="btn" href="${esc(FUNCION.urls.passline)}" target="_blank" rel="noopener">Ver en Passline</a>`;
}

function notaHtml() {
  const { titulo, texto, firma } = FUNCION.nota;
  if (!texto) return '';
  return `
    <section class="noche-nota" aria-labelledby="romeo-nota-titulo">
      <h3 id="romeo-nota-titulo">${esc(titulo)}</h3>
      ${String(texto).split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="noche-firma">${esc(firma)} ${CORAZON}</p>
    </section>`;
}

/* ── lo vivo: el reloj ───────────────────────────────────────── */

let vivo = null;

// Repinta solo las piezas que dependen de la hora, y solo si el estado
// cambió: repintar un botón con el foco encima lo haría perder.
function aplicar(app, e) {
  const clave = JSON.stringify(e);
  if (vivo && vivo.clave === clave) return;
  if (vivo) vivo.clave = clave;
  const piezas = {
    '[data-noche="reloj"]': relojHtml(e),
    '[data-noche="util"]': utilHtml(e),
    '[data-noche="programa"]': programaHtml(e),
    '[data-noche="acciones"]': accionesHtml(e),
  };
  for (const [sel, html] of Object.entries(piezas)) {
    const nodo = app.querySelector(sel);
    if (nodo) nodo.innerHTML = html;
  }
  const util = app.querySelector('[data-noche="util"]');
  if (util) util.hidden = esRecuerdo(e);
}

/**
 * `ahora` se inyecta para probar cada estado sin tocar el reloj:
 * `pintarRomeoJulieta(app, '2026-11-06T19:40')` congela la pantalla en la
 * llegada; sin él, lee la hora de Lima y la vuelve a mirar cada medio minuto.
 */
export function pintarRomeoJulieta(app, ahora) {
  desmontar();
  const reloj = ahora ? () => ahora : ahoraLima;
  const { obra, foto, lugar, duracion } = FUNCION;
  const estado = () => estadoNoche(reloj(), ROMEO_HORARIO);

  app.className = 'app romeo-julieta';
  app.innerHTML = `
    <article class="noche-articulo" aria-labelledby="romeo-julieta-titulo">
      <header class="noche-hero">
        <p class="noche-kicker"><time datetime="${FUNCION.fecha}T20:00">${esc(FUNCION.kicker)}</time></p>
        <h2 id="romeo-julieta-titulo" tabindex="-1">${esc(FUNCION.titulo)} ${CORAZON}</h2>
        <p class="noche-bajada">${FUNCION.bajada.map(esc).join('<br>')}</p>
        ${ANCLA}
        <div data-noche="reloj"></div>
        <div class="noche-util" data-noche="util"></div>
      </header>

      <section class="noche-obra" aria-labelledby="romeo-obra-titulo">
        <p class="noche-etiqueta">Lo que vamos a ver</p>
        <figure class="noche-foto">
          <img src="${esc(foto.archivo)}" width="800" height="800" decoding="async" alt="${esc(foto.alt)}">
          <figcaption>${esc(foto.credito)}</figcaption>
        </figure>
        <h3 id="romeo-obra-titulo">${esc(obra.titulo)}</h3>
        <p class="noche-elenco">${esc(obra.elenco)}</p>
        <p class="noche-produccion">${esc(obra.produccion)}</p>
        <blockquote>"${esc(obra.cita)}"<cite>${esc(obra.fuente)}</cite></blockquote>
      </section>

      <section aria-labelledby="romeo-programa-titulo">
        <h3 id="romeo-programa-titulo" class="noche-titulo-seccion">El programa</h3>
        <ol class="noche-programa" data-noche="programa"></ol>
      </section>

      <section aria-labelledby="romeo-saber-titulo">
        <h3 id="romeo-saber-titulo" class="noche-titulo-seccion">Lo que hay que saber</h3>
        <ul class="noche-datos">
          <li class="noche-mesa">${icono('butaca')}<div><b>${esc(FUNCION.asientos)}</b><span>${esc(FUNCION.entradas)}</span></div></li>
          <li>${icono('lugar')}<div><b>${esc(lugar.nombre)}</b><span>${esc(lugar.direccion)}</span></div></li>
          <li>${icono('reloj')}<div><b>${esc(duracion.titulo)}</b><span>${esc(duracion.nota)}</span></div></li>
        </ul>
        <div class="noche-acciones" data-noche="acciones"></div>
      </section>

      ${notaHtml()}
    </article>`;

  // Sin foto no queda ni el marco ni el crédito. `complete` cubre un fallo
  // ya resuelto en caché.
  const img = app.querySelector('.noche-foto img');
  if (img) {
    const quitar = () => img.closest('figure')?.remove();
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar, { once: true });
  }

  vivo = { clave: null, pulso: 0 };
  aplicar(app, estado());
  vivo.pulso = setInterval(() => aplicar(app, estado()), PULSO_MS);
}

export function desmontar() {
  if (!vivo) return;
  clearInterval(vivo.pulso);
  vivo = null;
}
