/**
 * app.js — navegación de primer nivel.
 *
 * Las siete vistas no comparten datos ni estados de error. El hash permite
 * entrar directamente a cada una y hace que atrás y adelante del navegador
 * sean navegación real, no una imitación con botones.
 */

import { arrancar as montarCartelera, desmontar as desmontarCartelera } from './vista.js';
import { pintarEscala } from './escala.js';
import { pintarPregunta } from './pregunta.js';
import { pintarFlores, desmontar as desmontarFlores } from './flores.js';
import { pintarPrimerMes, desmontar as desmontarPrimerMes } from './primer-mes.js';
import { pintarNocheCriolla, desmontar as desmontarNocheCriolla } from './noche-criolla.js';
import { pintarRomeoJulieta, desmontar as desmontarRomeoJulieta } from './romeo-julieta.js';

// Marca de que la invitación ya se abrió sola alguna vez.
const CLAVE_VISTA = 'teatro.pregunta.vista';
// Si el menú de escritorio quedó plegado. Es una comodidad por navegador y
// nada más: sin localStorage el menú arranca abierto y funciona igual.
const CLAVE_PLEGADO = 'teatro.menu.plegado';
// El mismo corte que el layout de dos columnas de styles.css. Si cambia
// allá, cambia acá: de esto depende si el menú es panel o columna.
const ESCRITORIO = '(min-width:900px) and (min-height:600px)';

function pintarCartelera(nodo) {
  nodo.className = 'app';
  nodo.innerHTML = '<p class="cargando">Cargando cartelera…</p>';
  return montarCartelera(nodo);
}

/**
 * Cada ruta trae su título, su pintor, el encabezado al que salta el foco y,
 * si deja algo encendido, cómo apagarlo.
 *
 * Con dos vistas alcanzaba un if/else y un ternario; con tres, las dos
 * cadenas crecen cada vez que se agrega una pantalla y el despacho deja de
 * estar en un solo sitio. La tabla ya existía: solo le faltaban columnas.
 *
 * `desmontar` es la última que llegó. Era una llamada suelta a la cartelera,
 * porque era la única vista con algo que liberar. Con el cielo de flores hay
 * dos, y una de ellas tiene un bucle de requestAnimationFrame: dejarlo vivo
 * es pintar para siempre una pantalla que ya no está. Las vistas que no
 * ensucian nada —la escala y la invitación— siguen sin la columna.
 */
const RUTAS = {
  cartelera: {
    titulo: 'Theater with her — cartelera de Lima',
    hash: '#cartelera',
    foco: '.mes-nombre, .vacio h2',
    pintar: pintarCartelera,
    desmontar: desmontarCartelera,
  },
  'escala-astronomica': {
    titulo: 'Escala astronómica — Theater with her',
    hash: '#escala-astronomica',
    foco: '#escala-titulo',
    pintar: pintarEscala,
  },
  'una-pregunta': {
    titulo: 'Una pregunta — Theater with her',
    hash: '#una-pregunta',
    foco: '#pregunta-titulo',
    pintar: pintarPregunta,
  },
  'flores-amarillas': {
    titulo: 'Flores amarillas — Theater with her',
    hash: '#flores-amarillas',
    foco: '#flores-titulo',
    pintar: pintarFlores,
    desmontar: desmontarFlores,
  },
  // Tiene qué apagar: un listener de scroll, dos observadores y el reloj
  // que enciende cada "Descubrir" al llegar su hora.
  'primer-mes': {
    titulo: 'Nuestro primer mes — Theater with her',
    hash: '#primer-mes',
    foco: '#primer-mes-titulo',
    pintar: pintarPrimerMes,
    desmontar: desmontarPrimerMes,
  },
  // Tiene qué apagar: el reloj que mueve el estado de la noche.
  'noche-criolla': {
    titulo: 'Noche criolla — Theater with her',
    hash: '#noche-criolla',
    foco: '#noche-criolla-titulo',
    pintar: pintarNocheCriolla,
    desmontar: desmontarNocheCriolla,
  },
  // Tiene qué apagar: el mismo reloj, con el horario de la función.
  'romeo-y-julieta': {
    titulo: 'Romeo y Julieta — Theater with her',
    hash: '#romeo-y-julieta',
    foco: '#romeo-julieta-titulo',
    pintar: pintarRomeoJulieta,
    desmontar: desmontarRomeoJulieta,
  },
};

let app = null;
let primeraRuta = true;
let rutaActual = null;

function rutaDesdeHash(hash = window.location.hash) {
  const nombre = hash.replace(/^#/, '');
  return RUTAS[nombre] ? nombre : 'cartelera';
}

function actualizarMenu(ruta) {
  for (const enlace of document.querySelectorAll('[data-ruta]')) {
    if (enlace.dataset.ruta === ruta) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
}

/* ── el menú ─────────────────────────────────────────────────
   En el teléfono es un panel: se abre con el botón y se cierra con Escape,
   con el velo o al elegir un destino. Mientras está abierto, la cabecera y
   la vista quedan `inert`, que es lo que impide tabular detrás del velo.
   En escritorio es una columna que se pliega; ahí no hay nada que cerrar. */

let menu = null;

function abrirMenu() {
  const { boton, velo, nav } = menu;
  document.body.classList.add('menu-abierto');
  boton.setAttribute('aria-expanded', 'true');
  boton.setAttribute('aria-label', 'Cerrar el menú');
  velo.hidden = false;
  app.inert = true;
  // El destino actual primero: es el que se busca para orientarse.
  (nav.querySelector('[aria-current="page"]') ?? nav.querySelector('a'))?.focus();
}

function cerrarMenu({ devolverFoco = true } = {}) {
  const { boton, velo } = menu;
  if (!document.body.classList.contains('menu-abierto')) return;
  document.body.classList.remove('menu-abierto');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-label', 'Abrir el menú');
  velo.hidden = true;
  app.inert = false;
  if (devolverFoco) boton.focus();
}

/**
 * Plegado, el nombre de cada destino se recorta a 1px pero sigue ahí, así
 * que el lector de pantalla lo lee igual; el `title` es para el ratón.
 *
 * El cielo de flores mide su lienzo solo cuando cambia la ventana, y plegar
 * el menú cambia el ancho de la vista sin cambiar la ventana. Por eso se
 * avisa con un `resize` sintético al terminar la transición (y al instante,
 * por si no la hay). El mapa y el primer mes ya tienen su ResizeObserver.
 */
function aplicarPlegado(plegado) {
  document.body.classList.toggle('menu-plegado', plegado);
  menu.plegar.setAttribute('aria-expanded', String(!plegado));
  menu.plegar.querySelector('.menu-nombre').textContent = plegado ? 'Desplegar el menú' : 'Plegar el menú';
  for (const enlace of menu.nav.querySelectorAll('.menu-item')) {
    if (plegado) enlace.title = enlace.textContent.trim();
    else enlace.removeAttribute('title');
  }
  menu.plegar.title = plegado ? 'Desplegar el menú' : '';
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
}

function leerPlegado() {
  try { return localStorage.getItem(CLAVE_PLEGADO) === '1'; } catch { return false; }
}

function guardarPlegado(plegado) {
  try {
    if (plegado) localStorage.setItem(CLAVE_PLEGADO, '1');
    else localStorage.removeItem(CLAVE_PLEGADO);
  } catch { /* sin storage, el plegado dura lo que dure la página */ }
}

function prepararMenu() {
  const boton = document.querySelector('.menu-boton');
  const velo = document.querySelector('.menu-velo');
  const nav = document.getElementById('menu');
  const plegar = nav?.querySelector('.menu-plegar');
  if (!boton || !velo || !nav || !plegar) return;
  menu = { boton, velo, nav, plegar };

  boton.addEventListener('click', () => {
    if (document.body.classList.contains('menu-abierto')) cerrarMenu();
    else abrirMenu();
  });
  velo.addEventListener('click', () => cerrarMenu());
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') cerrarMenu();
  });
  // Elegir un destino cierra el panel. El foco NO vuelve al botón: lo
  // mueve pintarRuta() al encabezado de la vista nueva. Y si se elige la
  // vista en la que ya se está no hay hashchange, por eso se cierra acá.
  nav.addEventListener('click', (ev) => {
    if (ev.target.closest('a')) cerrarMenu({ devolverFoco: false });
  });
  plegar.addEventListener('click', () => {
    const plegado = !document.body.classList.contains('menu-plegado');
    aplicarPlegado(plegado);
    guardarPlegado(plegado);
  });
  // Al pasar de teléfono a escritorio con el panel abierto (girar una
  // tableta, agrandar la ventana) el velo y el inert no tienen sentido.
  window.matchMedia(ESCRITORIO).addEventListener?.('change', (ev) => {
    if (ev.matches) cerrarMenu({ devolverFoco: false });
  });

  if (leerPlegado()) aplicarPlegado(true);
}

function moverFoco(ruta) {
  const titulo = app.querySelector(RUTAS[ruta].foco);
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

function pintarRuta() {
  const ruta = rutaDesdeHash();
  const destino = RUTAS[ruta];
  // La raíz y cualquier hash desconocido comparten una única URL canónica.
  // replaceState evita agregar una entrada falsa al historial y no dispara
  // otro hashchange, así que esta misma ejecución puede pintar la vista.
  if (window.location.hash !== destino.hash) {
    window.history.replaceState(null, '', destino.hash);
  }
  const debeMoverFoco = !primeraRuta;
  // La vista que se va apaga lo suyo antes de que la siguiente pinte.
  RUTAS[rutaActual]?.desmontar?.();
  rutaActual = ruta;
  actualizarMenu(ruta);
  // Atrás del navegador también cambia de ruta con el panel abierto.
  if (menu) cerrarMenu({ devolverFoco: false });
  document.title = destino.titulo;

  // Solo la cartelera devuelve una promesa: sus JSON tardan y el encabezado
  // al que debe llegar el foco no existe hasta que esa promesa resuelva.
  // Las otras seis pintan sincrónicamente y no devuelven nada.
  const pintado = destino.pintar(app);
  if (debeMoverFoco) {
    if (pintado) pintado.then(() => { if (rutaDesdeHash() === ruta) moverFoco(ruta); });
    else moverFoco(ruta);
  }

  primeraRuta = false;
}

/**
 * La invitación se abre sola UNA sola vez, y solo al entrar limpio a la raíz.
 *
 * Un hash explícito gana siempre: un link a #cartelera tiene que llevar a la
 * cartelera aunque la marca todavía no exista. Y si localStorage no está
 * disponible no hay forma de cumplir el "una sola vez", así que no se abre:
 * mejor no secuestrar la raíz que secuestrarla en cada carga.
 */
function primeraVisitaALaPregunta() {
  if (window.location.hash) return false;
  try {
    if (localStorage.getItem(CLAVE_VISTA)) return false;
    localStorage.setItem(CLAVE_VISTA, '1');
  } catch {
    return false;
  }
  return true;
}

export function arrancarApp(nodoApp) {
  app = nodoApp;
  // Va antes de pintarRuta(): su replaceState normaliza la raíz a #cartelera
  // y después ya no se distingue una entrada limpia de un link directo.
  if (primeraVisitaALaPregunta()) {
    window.history.replaceState(null, '', RUTAS['una-pregunta'].hash);
  }
  window.addEventListener('hashchange', pintarRuta);
  prepararMenu();
  pintarRuta();
}
