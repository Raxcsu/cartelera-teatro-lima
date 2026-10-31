/**
 * noche-criolla.js — la invitación a la noche del 31 de octubre de 2026.
 *
 * Como primer-mes, NO pide la cartelera: entrar acá no dispara ningún
 * fetch. De datos.js solo viene `ahoraLima()`, que lee el reloj.
 *
 * Todo lo que cambia con la hora (el reloj, la línea útil, el punto del
 * programa, el tiempo verbal y el botón de la ruta) sale de UN solo dato,
 * `estadoNoche()` en logica.js, con sus pruebas. Acá solo se pinta.
 *
 * Las entradas NO están en la página y nunca van a estar: llevan el QR de
 * acceso, y este repo es público. Viven en data/entradas_estacion_barranco/,
 * que está en .gitignore.
 */

import { estadoNoche } from './logica.js';
import { ahoraLima } from './datos.js';

/* ── el contenido: todo lo editable vive acá ─────────────────
   Fuente de los datos del evento: la ficha de Teleticket y las entradas,
   consultadas el 2026-10-31. `nota.texto: null` significa "todavía no
   escrito", y entonces la nota NO se pinta: en una invitación del mismo
   día, un "Por escribir" firmado se lee como un olvido. */
const NOCHE = {
  fecha: '2026-10-31',
  kicker: '31.10.2026 · SÁBADO',
  titulo: 'Una noche criolla',
  bajada: ['Hoy es el Día de la Canción Criolla,', 'y te guardé un lugar a mi lado.'],
  mesa: 'Mesa 17',
  entradas: 'Zona general · 2 entradas · las llevo yo',
  lugar: { nombre: 'La Estación de Barranco', direccion: 'Av. Pedro de Osma 112, Barranco' },
  duracion: { titulo: 'Hora y media de show', nota: 'Empieza puntual a las 7:30 p. m.' },
  obra: {
    titulo: 'Brujería Criolla',
    elenco: 'Marco Polo Campos y Tefi Valenzuela',
    cita: 'Un concierto muy especial de música criolla para celebrar el Día de la Canción Criolla.',
    fuente: 'Teleticket',
  },
  foto: {
    archivo: 'assets/noche-criolla/evento.jpg',
    alt: 'Marco Polo Campos y Tefi Valenzuela, ella cantando frente al micrófono',
    credito: 'Imagen: Teleticket',
  },
  // `marca`: en qué estado del reloj esta parada lleva el punto relleno.
  programa: [
    { hora: '7:00', sub: 'p. m.', presente: 'Abren las puertas', pasado: 'Abrieron las puertas', marca: 'puertas' },
    { hora: '7:30', sub: 'p. m.', presente: 'Empieza el concierto', pasado: 'Empezó el concierto', marca: 'durante' },
    { hora: '9:00', sub: 'aprox.', presente: 'Termina, y la noche sigue', pasado: 'Terminó, y la noche siguió', marca: null },
  ],
  // URLs fijas escritas acá, no datos de afuera: no pasan por urlSegura()
  // porque nadie más las llena. La ruta va a Google Maps y no a OSM: en el
  // teléfono, la web de OSM muestra el punto pero no arma el camino.
  urls: {
    ruta: 'https://www.google.com/maps/dir/?api=1&destination=La%20Estaci%C3%B3n%20de%20Barranco%2C%20Av.%20Pedro%20de%20Osma%20112%2C%20Barranco',
    teleticket: 'https://teleticket.com.pe/evento/brujeria-criolla-marco-polo-campos-y-tefi-valenzuela-la-estacion-de-barranco',
  },
  nota: { titulo: 'Para ti', texto: null, firma: 'Oscar' },
};

// Cada cuánto se vuelve a mirar el reloj con la página abierta.
const PULSO_MS = 30000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORAZON = '<span class="corazon" aria-hidden="true"></span>';

/* ── dibujos ─────────────────────────────────────────────────
   Guitarra criolla y cajón en trazo, con dos flores del ramo. Cada trazo
   lleva pathLength="1" para que el CSS lo dibuje una sola vez al entrar. */

function flor(x, y, escala, clase) {
  const petalos = [0, 72, 144, 216, 288]
    .map((g) => `<ellipse class="${clase}" rx="5" ry="8" cy="-7" transform="rotate(${g})"/>`).join('');
  return `<g class="noche-flor" transform="translate(${x} ${y}) scale(${escala})">${petalos}<circle class="noche-centro" r="3"/></g>`;
}

const CUERPO = 'M92 52c-12 0-18 8-16 17 1 5 4 7 4 10s-6 6-6 14c0 11 9 18 18 18s18-7 18-18c0-8-6-11-6-14s3-5 4-10c2-9-4-17-16-17z';

const ANCLA = `
  <svg class="noche-ancla" viewBox="0 0 250 120" aria-hidden="true">
    <rect class="noche-suave" x="138" y="46" width="52" height="66" rx="3"/>
    <rect class="noche-trazo" pathLength="1" x="138" y="46" width="52" height="66" rx="3"/>
    <circle class="noche-trazo" pathLength="1" cx="164" cy="70" r="9"/>
    <path class="noche-trazo" pathLength="1" d="M144 104h40"/>
    <g transform="rotate(-28 92 78)">
      <path class="noche-suave" d="${CUERPO}"/>
      <path class="noche-trazo" pathLength="1" d="${CUERPO}"/>
      <circle class="noche-trazo" pathLength="1" cx="92" cy="80" r="5.5"/>
      <path class="noche-trazo" pathLength="1" d="M86 100h12"/>
      <path class="noche-trazo" pathLength="1" d="M89 52V10h6v42"/>
      <path class="noche-trazo" pathLength="1" d="M88 10h8l-1-8h-6z"/>
    </g>
    ${flor(212, 60, 1, 'noche-petalo')}
    ${flor(36, 34, 0.7, 'noche-petalo-2')}
    <path class="noche-trazo noche-suelo" pathLength="1" d="M20 114c40-6 80-6 210 0"/>
  </svg>`;

const ICONOS = {
  mesa: '<path d="M3 9h18M5 9v11M19 9v11M8 9v5h8V9"/><circle cx="12" cy="5" r="1.6"/>',
  lugar: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};

const icono = (nombre) => `<svg class="noche-icono" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre]}</svg>`;

/* ── lo que depende de la hora ───────────────────────────────
   Cada pieza recibe el resultado de estadoNoche() y nada más. */

// Sin aria-live, a propósito (DESIGN.md): un reloj que cambia cada 30 s
// anunciaría cada minuto sin que nadie lo pida. Se lee entero al llegar a él.
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
      return caja('texto', 'Para nuestra noche',
        e.dias === 1 ? 'Falta 1 día' : `Faltan ${e.dias} días`, 'Sábado 31 a las 7:30 p. m.');
    case 'antes': {
      // Con menos de una hora, solo minutos: nunca "0 h 25 min".
      const cifra = e.horas > 0
        ? `${e.horas}<small>h</small>${e.minutos}<small>min</small>`
        : `${e.minutos}<small>min</small>`;
      return caja('', 'Para que empiece', cifra, 'Las puertas abren a las 7:00 p. m.');
    }
    case 'puertas':
      return caja('texto', 'Ya abrieron las puertas', esc(NOCHE.mesa), 'Empieza a las 7:30 p. m.');
    case 'durante':
      return caja('texto', 'Ahora mismo', 'Está sonando', 'Fin estimado: alrededor de las 9:00 p. m.');
    default:
      return caja('recuerdo', esc(NOCHE.kicker.slice(0, 10)), 'Fue nuestra noche criolla', 'Ya es un recuerdo.');
  }
}

const esRecuerdo = (e) => e?.estado === 'despues';

// La línea útil vive en la primera pantalla mientras sirve para llegar.
function utilHtml(e) {
  if (esRecuerdo(e)) return '';
  return `
    <p class="noche-util-linea"><b>${esc(NOCHE.mesa)}</b> · ${esc(NOCHE.lugar.nombre)}</p>
    <a class="btn primario noche-ruta" href="${esc(NOCHE.urls.ruta)}" target="_blank" rel="noopener">Cómo llegar</a>`;
}

function programaHtml(e) {
  const pasado = esRecuerdo(e);
  return NOCHE.programa.map((p) => `
    <li class="${p.marca && e?.estado === p.marca ? 'clave' : ''}">
      <span class="noche-hora">${esc(p.hora)}<small>${esc(p.sub)}</small></span>
      <span class="noche-punto" aria-hidden="true"></span>
      <span class="noche-que">${esc(pasado ? p.pasado : p.presente)}</span>
    </li>`).join('');
}

function accionesHtml(e) {
  const ruta = esRecuerdo(e)
    ? ''
    : `<a class="btn primario" href="${esc(NOCHE.urls.ruta)}" target="_blank" rel="noopener">Cómo llegar</a>`;
  return `${ruta}
    <a class="btn" href="${esc(NOCHE.urls.teleticket)}" target="_blank" rel="noopener">Ver en Teleticket</a>`;
}

function notaHtml() {
  const { titulo, texto, firma } = NOCHE.nota;
  if (!texto) return '';
  return `
    <section class="noche-nota" aria-labelledby="noche-nota-titulo">
      <h3 id="noche-nota-titulo">${esc(titulo)}</h3>
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
 * `pintarNocheCriolla(app, '2026-10-31T19:10')` congela la pantalla en las
 * puertas; sin él, lee la hora de Lima y la vuelve a mirar cada medio minuto.
 */
export function pintarNocheCriolla(app, ahora) {
  desmontar();
  const reloj = ahora ? () => ahora : ahoraLima;
  const { obra, foto, lugar, duracion } = NOCHE;

  app.className = 'app noche-criolla';
  app.innerHTML = `
    <article class="noche-articulo" aria-labelledby="noche-criolla-titulo">
      <header class="noche-hero">
        <p class="noche-kicker"><time datetime="${NOCHE.fecha}T19:30">${esc(NOCHE.kicker)}</time></p>
        <h2 id="noche-criolla-titulo" tabindex="-1">${esc(NOCHE.titulo)} ${CORAZON}</h2>
        <p class="noche-bajada">${NOCHE.bajada.map(esc).join('<br>')}</p>
        ${ANCLA}
        <div data-noche="reloj"></div>
        <div class="noche-util" data-noche="util"></div>
      </header>

      <section class="noche-obra" aria-labelledby="noche-obra-titulo">
        <p class="noche-etiqueta">Lo que vamos a ver</p>
        <figure class="noche-foto">
          <img src="${esc(foto.archivo)}" width="1300" height="501" decoding="async" alt="${esc(foto.alt)}">
          <figcaption>${esc(foto.credito)}</figcaption>
        </figure>
        <h3 id="noche-obra-titulo">${esc(obra.titulo)}</h3>
        <p class="noche-elenco">${esc(obra.elenco)}</p>
        <blockquote>"${esc(obra.cita)}"<cite>${esc(obra.fuente)}</cite></blockquote>
      </section>

      <section aria-labelledby="noche-programa-titulo">
        <h3 id="noche-programa-titulo" class="noche-titulo-seccion">El programa</h3>
        <ol class="noche-programa" data-noche="programa"></ol>
      </section>

      <section aria-labelledby="noche-saber-titulo">
        <h3 id="noche-saber-titulo" class="noche-titulo-seccion">Lo que hay que saber</h3>
        <ul class="noche-datos">
          <li class="noche-mesa">${icono('mesa')}<div><b>${esc(NOCHE.mesa)}</b><span>${esc(NOCHE.entradas)}</span></div></li>
          <li>${icono('lugar')}<div><b>${esc(lugar.nombre)}</b><span>${esc(lugar.direccion)}</span></div></li>
          <li>${icono('reloj')}<div><b>${esc(duracion.titulo)}</b><span>${esc(duracion.nota)}</span></div></li>
        </ul>
        <div class="noche-acciones" data-noche="acciones"></div>
      </section>

      ${notaHtml()}
    </article>`;

  // Sin foto no queda ni el marco ni el crédito: la obra se sostiene con
  // título, elenco y cita. `complete` cubre un fallo ya resuelto en caché.
  const img = app.querySelector('.noche-foto img');
  if (img) {
    const quitar = () => img.closest('figure')?.remove();
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar, { once: true });
  }

  vivo = { clave: null, pulso: 0 };
  aplicar(app, estadoNoche(reloj()));
  vivo.pulso = setInterval(() => aplicar(app, estadoNoche(reloj())), PULSO_MS);
}

export function desmontar() {
  if (!vivo) return;
  clearInterval(vivo.pulso);
  vivo = null;
}
