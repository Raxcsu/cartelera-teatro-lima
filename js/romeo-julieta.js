/**
 * romeo-julieta.js — la función de Romeo y Julieta, viernes 06.11.2026.
 *
 * NO es una invitación más: la página es la boca del escenario. Llega con el
 * telón cerrado y ella lo abre —arrastrando o con un toque—; los paños se
 * recogen a los costados y detrás está la escena. Abajo, primero la nota
 * "Para ti" y después la noche, las butacas, la obra y cómo llegar, que se leen con el telón abierto
 * o cerrado: nada útil queda escondido detrás del gesto.
 *
 * Como noche-criolla.js, NO pide la cartelera, y todo lo que cambia con la
 * hora sale de `estadoNoche(ahora, ROMEO_HORARIO)` en logica.js, con sus
 * pruebas. Acá solo se pinta y se mueve la tela.
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
   "Llegamos" a las 7:30 y no "Abren las puertas". Y las butacas se dibujan
   sueltas, sin plano de la sala: no sabemos dónde caen el 1 y el 2 en la
   fila, así que no se inventa. */
const FUNCION = {
  fecha: '2026-11-06',
  cuando: 'Viernes 6 · 8:00 p. m.',
  fila: 'Fila 15',
  zona: 'Platea',
  asientos: ['1', '2'],
  entradas: 'Las entradas las llevo yo.',
  lugar: { nombre: 'Teatro Municipal de Lima', direccion: 'Jr. Ica 377, Cercado de Lima' },
  duracion: 'Unas dos horas. Empieza puntual: una vez iniciada la función, no dejan entrar.',
  obra: {
    titulo: 'Romeo y Julieta',
    produccion: 'Éxodo Teatro, en coproducción con la Municipalidad de Lima',
    direccion: 'Jean Pierre Gamarra',
    reparto: [
      ['Romeo', 'Óscar Yépez'],
      ['Julieta', 'María Grazia Gamarra'],
      ['Mercucio', 'Alonso Cano'],
      ['Teobaldo', 'Fernando Luque'],
      ['Cupido', 'Amaranta Kun'],
      ['Paris', 'Sebastián Rubio'],
    ],
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
    { hora: '10:00', sub: 'aprox.', presente: 'Continuará…', pasado: 'Continuará…', marca: null },
  ],
  // URLs fijas escritas acá, no datos de afuera: no pasan por urlSegura()
  // porque nadie más las llena. La ruta va a Google Maps, igual que en la
  // noche criolla: en el teléfono la web de OSM no arma el camino.
  urls: {
    ruta: 'https://www.google.com/maps/dir/?api=1&destination=Teatro%20Municipal%20de%20Lima%2C%20Jr.%20Ica%20377%2C%20Lima',
    passline: 'https://www.passline.com/eventos-ficha-dvm/romeo-y-julieta-461128',
  },
  // Las palabras son de Oscar. Con `texto: null` la nota no se pinta.
  nota: {
    titulo: 'Para ti',
    texto: 'Me gustan las historias. Me gustan más cuando eres tú quien me las cuenta, y mucho más cuando las vivimos juntos.\n\nQuiero que seas mi historia de vida: la que algún día les contaré a nuestros nietos, con la voz ronca y gastada por los años, sin olvidar una sola escena.',
    firma: 'Oscar',
  },
};

// Cada cuánto se vuelve a mirar el reloj con la página abierta.
const PULSO_MS = 30000;
// Qué fracción del recorrido hay que arrastrar para que, al soltar, el
// telón termine de abrirse solo. Menos que eso, vuelve a cerrarse.
const UMBRAL = 0.3;
// Un arrastre menor a esto, en px, es un toque.
const TOQUE_PX = 6;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BUTACA = `
  <svg class="rj-butaca-dibujo" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 26V13a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v13"/>
    <path d="M7 24h7v10h20V24h7v12a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z"/>
    <path d="M12 39v4M36 39v4"/>
  </svg>`;

/* ── lo que depende de la hora ───────────────────────────────
   Cada pieza recibe el resultado de estadoNoche() y nada más. */

// Una sola línea, en el cartel del telón. Sin aria-live, a propósito
// (DESIGN.md): un reloj que cambia cada 30 s anunciaría cada minuto.
function relojTexto(e) {
  if (!e) return '';
  switch (e.estado) {
    case 'dias':
      return e.dias === 1 ? 'Falta un día' : `Faltan ${e.dias} días`;
    case 'antes':
      // Con menos de una hora, solo minutos: nunca "0 h 25 min".
      return e.horas > 0
        ? `Faltan ${e.horas} h ${e.minutos} min para el telón`
        : `Faltan ${e.minutos} min para el telón`;
    case 'puertas':
      return 'Ya estamos aquí: el telón se abre a las 8:00';
    case 'durante':
      return 'En escena ahora mismo';
    default:
      return 'Fue nuestra noche en Verona';
  }
}

const esRecuerdo = (e) => e?.estado === 'despues';

function programaHtml(e) {
  const pasado = esRecuerdo(e);
  return FUNCION.programa.map((p) => `
    <li class="${p.marca && e?.estado === p.marca ? 'clave' : ''}">
      <span class="rj-hora">${esc(p.hora)}<small>${esc(p.sub)}</small></span>
      <span class="rj-que">${esc(pasado ? p.pasado : p.presente)}</span>
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
    <section class="rj-nota" aria-labelledby="rj-nota-titulo">
      <h3 id="rj-nota-titulo">${esc(titulo)}</h3>
      ${String(texto).split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('')}
      <p class="rj-firma">${esc(firma)}</p>
    </section>`;
}

/* ── lo vivo: el reloj y el telón ─────────────────────────────── */

let vivo = null;

// Repinta solo las piezas que dependen de la hora, y solo si el estado
// cambió: repintar un botón con el foco encima lo haría perder.
function aplicar(app, e) {
  const clave = JSON.stringify(e);
  if (vivo && vivo.clave === clave) return;
  if (vivo) vivo.clave = clave;
  const piezas = {
    '[data-rj="reloj"]': esc(relojTexto(e)),
    '[data-rj="programa"]': programaHtml(e),
    '[data-rj="acciones"]': accionesHtml(e),
  };
  for (const [sel, html] of Object.entries(piezas)) {
    const nodo = app.querySelector(sel);
    if (nodo) nodo.innerHTML = html;
  }
}

/**
 * El telón es una sola variable, `--abierto` (0 cerrado, 1 abierto), sobre
 * la boca. El CSS hace el resto: cada paño se recoge con scaleX desde su
 * borde exterior, así los pliegues se comprimen como en una tela de verdad
 * en vez de deslizarse enteros fuera de cuadro.
 *
 * Arrastrar mueve la variable sin transición (la tela va con el dedo);
 * soltar o tocar la lleva a 0 o a 1 con la transición del CSS. El botón es
 * el camino de teclado y del lector de pantalla, con aria-expanded.
 */
function prepararTelon(boca) {
  const tirador = boca.querySelector('.rj-tirador');
  const etiqueta = tirador.querySelector('.rj-tirador-texto');
  let abierto = false;
  let arrastre = null;

  const fijar = (valor) => boca.style.setProperty('--abierto', String(valor));

  const decidir = (abrir) => {
    abierto = abrir;
    boca.classList.remove('arrastrando');
    boca.classList.toggle('abierto', abrir);
    fijar(abrir ? 1 : 0);
    tirador.setAttribute('aria-expanded', String(abrir));
    etiqueta.textContent = abrir ? 'Cerrar el telón' : 'Abrir el telón';
  };

  tirador.addEventListener('click', (ev) => {
    // Un arrastre que empezó en el tirador ya decidió en pointerup.
    if (arrastre?.movio) return;
    ev.preventDefault();
    decidir(!abierto);
  });

  // El gesto vive en la tela, no en toda la boca: con el telón abierto la
  // escena tiene que dejar seleccionar y hacer scroll sin abrir nada.
  const alBajar = (ev) => {
    if (abierto || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    arrastre = { x: ev.clientX, ancho: boca.clientWidth || 1, id: ev.pointerId, movio: false };
  };
  const alMover = (ev) => {
    if (!arrastre || ev.pointerId !== arrastre.id) return;
    const dx = Math.abs(ev.clientX - arrastre.x);
    if (!arrastre.movio && dx < TOQUE_PX) return;
    if (!arrastre.movio) {
      arrastre.movio = true;
      boca.classList.add('arrastrando');
      // Lanza si el puntero ya no existe (se levantó en el mismo cuadro):
      // sin captura el arrastre sigue funcionando dentro de la boca.
      try { boca.setPointerCapture(ev.pointerId); } catch { /* sin captura */ }
    }
    // Abrir desde el centro: medio ancho de recorrido es el telón entero.
    fijar(Math.min(1, dx / (arrastre.ancho * 0.5)));
  };
  const alSoltar = (ev) => {
    if (!arrastre || ev.pointerId !== arrastre.id) return;
    const { movio } = arrastre;
    const avance = parseFloat(boca.style.getPropertyValue('--abierto')) || 0;
    if (movio) decidir(avance >= UMBRAL);
    else if (!ev.target.closest('.rj-tirador')) decidir(true);
    // El click del tirador llega después del pointerup: que vea `movio`.
    setTimeout(() => { arrastre = null; }, 0);
  };
  const alCancelar = () => {
    if (!arrastre) return;
    arrastre = null;
    decidir(false);
  };

  for (const pano of boca.querySelectorAll('.rj-pano, .rj-tirador')) {
    pano.addEventListener('pointerdown', alBajar);
  }
  boca.addEventListener('pointermove', alMover);
  boca.addEventListener('pointerup', alSoltar);
  boca.addEventListener('pointercancel', alCancelar);

  decidir(false);
}

/**
 * `ahora` se inyecta para probar cada estado sin tocar el reloj:
 * `pintarRomeoJulieta(app, '2026-11-06T19:40')` congela la pantalla en la
 * llegada; sin él, lee la hora de Lima y la vuelve a mirar cada medio minuto.
 */
export function pintarRomeoJulieta(app, ahora) {
  desmontar();
  const reloj = ahora ? () => ahora : ahoraLima;
  const { obra, foto, lugar } = FUNCION;
  const estado = () => estadoNoche(reloj(), ROMEO_HORARIO);

  app.className = 'app romeo-julieta';
  app.innerHTML = `
    <article class="rj" aria-labelledby="romeo-julieta-titulo">
      <section class="rj-boca">
        <div class="rj-escena" id="rj-escena">
          <img src="${esc(foto.archivo)}" width="800" height="800" decoding="async" alt="${esc(foto.alt)}">
          <p class="rj-credito">${esc(foto.credito)}</p>
        </div>
        <div class="rj-pano rj-pano-izq" aria-hidden="true"></div>
        <div class="rj-pano rj-pano-der" aria-hidden="true"></div>
        <div class="rj-amarre rj-amarre-izq" aria-hidden="true"></div>
        <div class="rj-amarre rj-amarre-der" aria-hidden="true"></div>
        <div class="rj-cuerda" aria-hidden="true"></div>
        <div class="rj-bambalina" aria-hidden="true"></div>

        <button class="rj-tirador" type="button" aria-controls="rj-escena" aria-expanded="false">
          <span class="rj-tirador-marca" aria-hidden="true"></span>
          <span class="rj-tirador-texto">Abrir el telón</span>
        </button>
        <p class="rj-pista" aria-hidden="true">Desliza o toca para abrir el telón</p>

        <div class="rj-cartel">
          <h2 id="romeo-julieta-titulo" tabindex="-1">${esc(obra.titulo)}</h2>
          <p class="rj-cuando"><time datetime="${FUNCION.fecha}T20:00">${esc(FUNCION.cuando)}</time> · ${esc(FUNCION.fila)}</p>
          <p class="rj-teatro">${esc(lugar.nombre)}</p>
          <p class="rj-reloj" data-rj="reloj"></p>
        </div>
      </section>

      <div class="rj-cuerpo">
        ${notaHtml()}

        <section class="rj-noche" aria-labelledby="rj-noche-titulo">
          <h3 id="rj-noche-titulo">Esa noche</h3>
          <ol class="rj-programa" data-rj="programa"></ol>
        </section>

        <section class="rj-butacas" aria-labelledby="rj-butacas-titulo">
          <h3 id="rj-butacas-titulo">${esc(FUNCION.zona)}, ${esc(FUNCION.fila.toLowerCase())}</h3>
          <ul class="rj-asientos">
            ${FUNCION.asientos.map((n) => `<li>${BUTACA}<span>Asiento ${esc(n)}</span></li>`).join('')}
          </ul>
          <p class="rj-entradas">${esc(FUNCION.entradas)}</p>
        </section>

        <section class="rj-obra" aria-labelledby="rj-obra-titulo">
          <h3 id="rj-obra-titulo">La puesta</h3>
          <p class="rj-produccion">${esc(obra.produccion)}. Dirige ${esc(obra.direccion)}.</p>
          <dl class="rj-reparto">
            ${obra.reparto.map(([papel, nombre]) => `<div><dt>${esc(papel)}</dt><dd>${esc(nombre)}</dd></div>`).join('')}
          </dl>
          <blockquote>${esc(obra.cita)}<cite>${esc(obra.fuente)}</cite></blockquote>
        </section>

        <section class="rj-llegar" aria-labelledby="rj-llegar-titulo">
          <h3 id="rj-llegar-titulo">${esc(lugar.nombre)}</h3>
          <p>${esc(lugar.direccion)}</p>
          <p>${esc(FUNCION.duracion)}</p>
          <div class="rj-acciones" data-rj="acciones"></div>
        </section>
      </div>
    </article>`;

  // Sin foto, la escena queda en el rosa oscuro del fondo del escenario y
  // sin crédito: el telón se sigue abriendo sobre algo, no sobre un ícono
  // de imagen rota. `complete` cubre un fallo ya resuelto en caché.
  const img = app.querySelector('.rj-escena img');
  if (img) {
    const quitar = () => {
      img.remove();
      app.querySelector('.rj-credito')?.remove();
    };
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar, { once: true });
  }

  prepararTelon(app.querySelector('.rj-boca'));

  vivo = { clave: null, pulso: 0 };
  aplicar(app, estado());
  vivo.pulso = setInterval(() => aplicar(app, estado()), PULSO_MS);
}

export function desmontar() {
  if (!vivo) return;
  clearInterval(vivo.pulso);
  vivo = null;
}
