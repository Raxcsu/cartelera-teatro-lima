/**
 * app.js — navegación de primer nivel.
 *
 * La cartelera y la escala astronómica no comparten datos ni estados de
 * error. El hash permite entrar directamente a cada una y hace que atrás y
 * adelante del navegador sean navegación real, no una imitación con botones.
 */

import { arrancar as montarCartelera, desmontar as desmontarCartelera } from './vista.js';
import { pintarEscala } from './escala.js';

const RUTAS = {
  cartelera: {
    titulo: 'Theater with her — cartelera de Lima',
    hash: '#cartelera',
  },
  'escala-astronomica': {
    titulo: 'Escala astronómica — Theater with her',
    hash: '#escala-astronomica',
  },
};

let app = null;
let primeraRuta = true;

function rutaDesdeHash(hash = window.location.hash) {
  const nombre = hash.replace(/^#/, '');
  return RUTAS[nombre] ? nombre : 'cartelera';
}

function actualizarPestanas(ruta) {
  for (const enlace of document.querySelectorAll('[data-ruta]')) {
    const activa = enlace.dataset.ruta === ruta;
    if (activa) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
}

function moverFoco(ruta) {
  const titulo = app.querySelector(ruta === 'cartelera' ? '.mes-nombre, .vacio h2' : '#escala-titulo');
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

function pintarRuta() {
  const ruta = rutaDesdeHash();
  // La raíz y cualquier hash desconocido comparten una única URL canónica.
  // replaceState evita agregar una entrada falsa al historial y no dispara
  // otro hashchange, así que esta misma ejecución puede pintar la vista.
  if (window.location.hash !== RUTAS[ruta].hash) {
    window.history.replaceState(null, '', RUTAS[ruta].hash);
  }
  const debeMoverFoco = !primeraRuta;
  desmontarCartelera();
  actualizarPestanas(ruta);
  document.title = RUTAS[ruta].titulo;

  if (ruta === 'escala-astronomica') {
    pintarEscala(app);
    if (debeMoverFoco) moverFoco(ruta);
  } else {
    app.className = 'app';
    app.innerHTML = '<p class="cargando">Cargando cartelera…</p>';
    montarCartelera(app).then(() => {
      // La cartelera puede tardar en traer sus JSON; el encabezado al que
      // debe llegar el foco no existe hasta que esa promesa se resuelva.
      if (debeMoverFoco && rutaDesdeHash() === ruta) moverFoco(ruta);
    });
  }

  primeraRuta = false;
}

export function arrancarApp(nodoApp) {
  app = nodoApp;
  window.addEventListener('hashchange', pintarRuta);
  pintarRuta();
}
