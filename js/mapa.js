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

/**
 * Las teselas: CARTO Positron, un mapa base gris claro hecho para que lo
 * que se dibuja encima resalte. Reemplazó al OSM estándar, cuyos verdes y
 * rutas amarillas competían con los pines y obligaban a un filtro CSS
 * para calmarlos.
 *
 * Es una SEGUNDA dependencia externa, y su modo de falla NO es el de
 * Leaflet. Si cae el CDN de la librería, crearMapa() devuelve null y la
 * banda desaparece limpia. Si caen solo las teselas, Leaflet vive y deja
 * un rectángulo gris con pines flotando sobre nada: el hueco sin
 * explicación que este proyecto evita. Por eso OSM se queda como
 * RESPALDO y no como reliquia — ver el manejo de 'tileerror'.
 *
 * La atribución no es decorativa en ninguno de los dos: es la condición
 * de uso. Positron va sobre datos de OSM, así que se acreditan los dos.
 */
const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TESELAS = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CREDITO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;
const TESELAS_RESPALDO = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Lado del círculo del pin, en píxeles.
 *
 * Tiene que coincidir con el `width`/`height` de `.pin-teatro i` en
 * styles.css, porque de acá sale el `iconAnchor` — la mitad del icono, o
 * sea el punto del círculo que se apoya en la coordenada real. Si los dos
 * números se separan, cada teatro queda corrido en pantalla respecto de
 * dónde está de verdad, y en silencio: el mapa se ve perfectamente bien.
 */
const PIN = 20;

let promesaLeaflet = null;

/**
 * La hoja de Leaflet entra ANTES que la nuestra, no al final del <head>.
 *
 * Leaflet trae reglas para el popup, los controles y la atribución con la
 * misma especificidad que las de styles.css. Como el orden desempata, una
 * hoja agregada al final ganaría todas y el mapa se vería con la pinta por
 * defecto por más que styles.css diga otra cosa. Insertarla antes deja que
 * nuestras reglas la pisen sin un solo !important.
 */
function pedirCss() {
  if (document.querySelector('link[data-leaflet]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CDN_CSS;
  link.dataset.leaflet = '';
  const nuestra = document.querySelector('link[rel="stylesheet"]:not([data-leaflet])');
  if (nuestra) nuestra.before(link);
  else document.head.appendChild(link);
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
 * @param {Array<{id,nombre,lat,lng,cantidad,popupHtml?}>} puntos
 *        `popupHtml` lo arma vista.js, ya escapado: este módulo no conoce
 *        obras ni precios y no puede empezar a conocerlos por un popup.
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
      // Arranca apagada; ajustarRueda() decide según el alto del contenedor.
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
      // Zoom en cuartos, no en enteros.
      //
      // Por defecto fitBounds redondea HACIA ABAJO al entero más cercano, y
      // medio nivel de zoom es un factor de 1,4 de más. Con los teatros de
      // Lima eso se veía: el grupo entraba en el 40% del alto y el resto era
      // Lurigancho y mar. En cuartos el error máximo baja a 1,09.
      zoomSnap: 0.25,
    });

    // `{r}` solo se sustituye por '@2x' si detectRetina está encendido;
    // sin eso quedaría literal en la URL y las teselas darían 404.
    const base = L.tileLayer(TESELAS, {
      attribution: CREDITO, maxZoom: 19, subdomains: 'abcd', detectRetina: true,
    }).addTo(mapa);

    /**
     * Respaldo de teselas.
     *
     * Que fallen unas pocas es ruido de red normal y no justifica cambiar
     * de proveedor a mitad de camino. Un fallo sostenido significa que
     * CARTO no está, y ahí el mapa se queda gris con los pines flotando
     * sobre nada. Pasado el umbral se pasa a OSM UNA sola vez.
     *
     * El orden importa: primero se agrega la capa nueva y recién después
     * se saca la vieja, o entre las dos operaciones se ve el fondo pelado.
     */
    const FALLOS_PARA_CAMBIAR = 6;
    let fallos = 0;
    let yaSeCambio = false;
    base.on('tileerror', () => {
      if (yaSeCambio || (fallos += 1) < FALLOS_PARA_CAMBIAR) return;
      yaSeCambio = true;
      console.warn('Las teselas de CARTO no responden; se pasa a OpenStreetMap.');
      try {
        L.tileLayer(TESELAS_RESPALDO, { attribution: OSM, maxZoom: 19 }).addTo(mapa);
        mapa.removeLayer(base);
      } catch { /* si tampoco se puede, queda el mapa gris y la lista entera */ }
    });

    for (const p of conCoords) {
      // Pin dibujado con CSS, nunca emoji: renderizan distinto en cada
      // celular y rompen la tipografía (regla 5 de DESIGN.md).
      const icono = L.divIcon({
        className: 'pin-teatro',
        html: `<i></i><span>${String(p.nombre ?? '')
          .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</span>`,
        iconSize: null,
        // La MITAD del círculo: es el punto que se apoya en la coordenada.
        // Sale de PIN para que no pueda quedar desfasado del CSS.
        iconAnchor: [PIN / 2, PIN / 2],
      });

      const marca = L.marker([p.lat, p.lng], {
        icon: icono,
        keyboard: true,
        alt: p.nombre ?? 'Teatro',
        title: p.cantidad ? `${p.nombre} — ${p.cantidad} función(es)` : p.nombre,
      }).addTo(mapa);

      if (p.popupHtml) {
        // El ancho se fija ACÁ y nunca por CSS: Leaflet mide el contenido y
        // escribe el ancho inline en .leaflet-popup-content, así que una
        // regla que lo pise le rompe el cálculo y el popup sale descuadrado.
        marca.bindPopup(p.popupHtml, { maxWidth: 280, minWidth: 210, autoPanPadding: [16, 16] });
        // El pin de la tarjeta abierta se distingue de sus vecinos: en
        // Miraflores hay tres a 300 m y si no, no se sabe cuál se abrió.
        marca.on('popupopen', () => marca.getElement()?.classList.add('activo'));
        marca.on('popupclose', () => marca.getElement()?.classList.remove('activo'));
      } else if (opciones.alSeleccionar) {
        // Sin tarjeta, el pin sigue llevando a la lista como antes.
        marca.on('click', () => opciones.alSeleccionar(p.id));
      }
    }

    /**
     * El "Ver más" de la tarjeta, por delegación en el contenedor.
     *
     * Un listener por popup se duplicaría en cada apertura, y buscar el
     * marcador de origen obliga a leer `_source`, que es privado. El id
     * viaja en el propio botón (`data-ver-mas`), que lo escribió quien
     * armó el HTML. Leaflet no frena el 'click' del DOM dentro del popup
     * —solo mousedown y dblclick—, así que el evento llega hasta acá.
     */
    const alHacerClic = (ev) => {
      const boton = ev.target?.closest?.('[data-ver-mas]');
      if (boton && opciones.alSeleccionar) opciones.alSeleccionar(boton.dataset.verMas);
    };
    contenedor.addEventListener('click', alHacerClic);

    // Encuadre: un solo teatro no tiene "bounds" útiles, así que se centra.
    const entre = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));
    const encuadrar = () => {
      if (conCoords.length === 1) {
        mapa.setView([conCoords[0].lat, conCoords[0].lng], 15);
        return;
      }
      // El margen sigue al tamaño del contenedor en vez de ser fijo.
      // [22, 16] estaba calibrado para la banda de 260px de móvil: en la
      // columna de escritorio, que pasa de 600px, ese mismo margen es casi
      // nada y los pines de los extremos quedan pegados al borde.
      // Ojo con el orden: en Leaflet `padding` es un Point, o sea [x, y].
      mapa.fitBounds(conCoords.map((p) => [p.lat, p.lng]), {
        padding: [entre(contenedor.clientWidth * 0.08, 14, 56),
                  entre(contenedor.clientHeight * 0.10, 16, 56)],
        maxZoom: 15,
      });
    };
    encuadrar();

    /**
     * La rueda hace zoom solo cuando el mapa es grande.
     *
     * En la banda de móvil, que vive arriba de una lista larga, la rueda
     * activa haría zoom en vez de dejarte bajar por la página. En la
     * columna de escritorio no hay nada que robar: la página no scrollea y
     * la lista tiene su propio contenedor. La decisión es geométrica, así
     * que se toma acá y no hace falta que vista.js pase breakpoints.
     */
    const ALTO_PARA_RUEDA = 420;
    const ajustarRueda = () => {
      if (contenedor.clientHeight >= ALTO_PARA_RUEDA) mapa.scrollWheelZoom.enable();
      else mapa.scrollWheelZoom.disable();
    };
    ajustarRueda();

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
        ajustarRueda();
        if (!tocadoPorElUsuario) encuadrar();
      });
      observador.observe(contenedor);
    } else {
      requestAnimationFrame(() => { mapa.invalidateSize(); ajustarRueda(); encuadrar(); });
    }

    return {
      destruir: () => {
        try { observador?.disconnect(); } catch { /* no importa */ }
        // El contenedor sobrevive al mapa (vista.js lo conserva para no
        // recargar Leaflet en cada mes), así que este listener hay que
        // sacarlo a mano o se acumula uno por refresco.
        try { contenedor.removeEventListener('click', alHacerClic); } catch { /* no importa */ }
        try { mapa.remove(); } catch { /* ya estaba muerto */ }
      },
    };
  } catch (e) {
    console.warn('El mapa no se pudo dibujar; la app sigue sin él.', e);
    return null;
  }
}
