/**
 * mapa.js — Leaflet, y el ÚNICO módulo del proyecto que depende de un
 * recurso externo.
 *
 * Vive aparte por eso mismo: si el CDN se cae, el radio de daño es este
 * archivo y nada más. La regla que gobierna todo lo de acá:
 *
 *   NINGUNA función de este módulo lanza. Si algo falla, devuelve null
 *   y la app sigue entera sin mapa.
 *
 * Un fallo de red no puede leerse como "no hay teatro" — es el mismo
 * principio que ya rodea cargarTodo() en vista.js.
 */

const VERSION = '1.9.4';
const CDN_JS  = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet-src.esm.js`;
const CDN_CSS = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`;

// OpenStreetMap exige atribución visible. No es decorativa: es la
// condición de uso de las teselas.
const TESELAS = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDITO = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

let promesaLeaflet = null;

function pedirCss() {
  if (document.querySelector('link[data-leaflet]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CDN_CSS;
  link.dataset.leaflet = '';
  document.head.appendChild(link);
}

/** Carga Leaflet una sola vez. Devuelve null si el CDN no responde. */
function pedirLeaflet() {
  if (!promesaLeaflet) {
    pedirCss();
    promesaLeaflet = import(/* @vite-ignore */ CDN_JS).catch((e) => {
      console.warn('Leaflet no cargó; la app sigue sin mapa.', e);
      return null;
    });
  }
  return promesaLeaflet;
}

/**
 * Dibuja los teatros en `contenedor`.
 *
 * @param {HTMLElement} contenedor
 * @param {Array<{id,nombre,lat,lng,cantidad}>} puntos
 * @param {{alSeleccionar?: (id:string)=>void}} opciones
 * @returns {Promise<{destruir:()=>void}|null>} null si no hay mapa que mostrar
 */
export async function crearMapa(contenedor, puntos = [], opciones = {}) {
  const conCoords = puntos.filter((p) => p && p.lat != null && p.lng != null);
  // Sin contenedor o sin un solo punto ubicable no hay nada que dibujar,
  // y un mapa vacío de Lima no informa nada.
  if (!contenedor || !conCoords.length) return null;

  const L = await pedirLeaflet();
  if (!L) return null;

  try {
    const mapa = L.map(contenedor, {
      // El mapa vive arriba de una lista larga. Con la rueda activa,
      // bajar por la página haría zoom en vez de scroll.
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TESELAS, { attribution: CREDITO, maxZoom: 19 }).addTo(mapa);

    for (const p of conCoords) {
      // Pin dibujado con CSS, nunca emoji: renderizan distinto en cada
      // celular y rompen la tipografía (regla 5 de DESIGN.md).
      const icono = L.divIcon({
        className: 'pin-teatro',
        html: `<i></i><span>${String(p.nombre ?? '')
          .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</span>`,
        iconSize: null,
        iconAnchor: [7, 7],
      });

      const marca = L.marker([p.lat, p.lng], {
        icon: icono,
        keyboard: true,
        alt: p.nombre ?? 'Teatro',
        title: p.cantidad ? `${p.nombre} — ${p.cantidad} función(es)` : p.nombre,
      }).addTo(mapa);

      if (opciones.alSeleccionar) {
        marca.on('click', () => opciones.alSeleccionar(p.id));
      }
    }

    // Encuadre: un solo teatro no tiene "bounds" útiles, así que se centra.
    const encuadrar = () => {
      if (conCoords.length === 1) {
        mapa.setView([conCoords[0].lat, conCoords[0].lng], 15);
      } else {
        // Márgenes ajustados: 34px arriba y abajo se comían 40% de una
        // banda de 168px, y en Lima eso se traduce en medio mapa de mar.
        mapa.fitBounds(conCoords.map((p) => [p.lat, p.lng]), { padding: [22, 16], maxZoom: 15 });
      }
    };
    encuadrar();

    /**
     * Reencuadrar cuando el contenedor cambia de tamaño.
     *
     * invalidateSize() sola NO alcanza, y esto costó un bug visible: corrige
     * el tamaño que Leaflet cree tener, pero conserva centro y zoom. Si
     * fitBounds() corrió con el contenedor mal medido —la banda se dibuja
     * antes de que la página termine de acomodarse— el encuadre queda mal
     * para siempre. En producción salieron los 5 teatros fuera de cuadro:
     * un mapa de Lima sin un solo pin a la vista.
     *
     * Le pasa igual a cualquiera que rote el celular, así que la respuesta
     * es escuchar al contenedor, no ejecutar una vez y confiar.
     *
     * Deja de reencuadrar en cuanto el usuario mueve el mapa: si arrastró
     * hasta Barranco, una rotación de pantalla no puede devolverlo al inicio.
     */
    let tocadoPorElUsuario = false;
    mapa.on('dragstart zoomstart', () => { tocadoPorElUsuario = true; });

    let observador = null;
    if (typeof ResizeObserver === 'function') {
      observador = new ResizeObserver(() => {
        mapa.invalidateSize();
        if (!tocadoPorElUsuario) encuadrar();
      });
      observador.observe(contenedor);
    } else {
      requestAnimationFrame(() => { mapa.invalidateSize(); encuadrar(); });
    }

    return {
      destruir: () => {
        try { observador?.disconnect(); } catch { /* no importa */ }
        try { mapa.remove(); } catch { /* ya estaba muerto */ }
      },
    };
  } catch (e) {
    console.warn('El mapa no se pudo dibujar; la app sigue sin él.', e);
    return null;
  }
}
