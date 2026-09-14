/**
 * escala.js — la lectura estática que acompaña el paper de Valeria.
 *
 * No importa datos.js: entrar a esta ruta no hace fetch de la cartelera y
 * puede funcionar incluso cuando la información mensual esté vencida.
 */

export function pintarEscala(app) {
  app.className = 'app escala';
  app.innerHTML = `
    <article class="escala-articulo" aria-labelledby="escala-titulo">
      <section class="resumen-paper" aria-label="Resumen del experimento">
        <header class="resumen-cabecera">
          <p class="escala-kicker">Un experimento de metrología afectiva</p>
          <h2 id="escala-titulo" tabindex="-1">Escala astronómica<br>del amor</h2>
          <p class="escala-intro">¿Cuánto tomaría cruzar la Vía Láctea caminando por Valeria?</p>
        </header>

        <dl class="resumen-cifras" aria-label="Magnitudes del experimento">
          <div class="resumen-cifra">
            <dt>Distancia</dt>
            <dd>100 000 <span>años luz</span></dd>
          </div>
          <div class="resumen-cifra">
            <dt>Ritmo</dt>
            <dd>40 <span>km por día</span></dd>
          </div>
          <div class="resumen-cifra">
            <dt>Duración</dt>
            <dd>64.8 <span>billones de años</span></dd>
          </div>
          <div class="resumen-cifra">
            <dt>Equivalencia</dt>
            <dd>809 mil millones <span>de vidas</span></dd>
          </div>
        </dl>

        <section class="resumen-veredicto" aria-labelledby="veredicto-titulo">
          <div>
            <p class="escala-kicker">La conclusión</p>
            <h3 id="veredicto-titulo">La galaxia no mide el amor.</h3>
          </div>
          <p class="formula" aria-label="Coeficiente de Amor de Valeria mayor que uno">𝒱 &gt; 1</p>
          <p class="resumen-conclusion">Si el experimento se repitiera infinitas veces, en cada una volvería a encontrarte, elegirte y enamorarme de ti.</p>
        </section>
      </section>

      <section class="paper" aria-labelledby="paper-titulo">
        <div class="paper-cabecera">
          <div>
            <p class="escala-kicker">El documento completo</p>
            <h3 id="paper-titulo">Sobre la escala astronómica del amor</h3>
          </div>
          <a class="btn primario" href="data/paper_cientifico/paper.pdf" target="_blank" rel="noopener noreferrer">Abrir documento completo</a>
        </div>
        <object class="lector-pdf" data="data/paper_cientifico/paper.pdf" type="application/pdf"
          title="Paper completo: Sobre la escala astronómica del amor" aria-label="Paper completo: Sobre la escala astronómica del amor">
          <p>Tu navegador no puede mostrar el PDF integrado. <a href="data/paper_cientifico/paper.pdf" target="_blank" rel="noopener noreferrer">Abrí el documento completo</a>.</p>
        </object>
      </section>
    </article>`;
}
