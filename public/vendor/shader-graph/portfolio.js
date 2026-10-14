/* Local-file adapter for Shader Graph Viewer. GPL-3.0; see NOTICE.md. */
document.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("viewer-status");
  const graphName = document.getElementById("graph-name");
  const container = document.querySelector(".container");
  // Keep zoom anchored under the pointer after our fit-to-view changes the scale.
  // The upstream wheel handler calls this method, so its event wiring is preserved.
  window.PannerDragger.resize = function(delta, x, y) {
    if (!this.shaderLoaded || this.blackboard.hovering || this.inspector.hovering || this.isHoveringHeader || this.isPresenting) return false;
    const previous = this.scaleFactor;
    const next = Math.max(this.minScaleFactor, Math.min(this.maxScaleFactor, previous * Math.exp((delta < 0 ? 1 : -1) * this.scaleStep)));
    const cursorX = x - this.containerElement.offsetLeft;
    const cursorY = y - this.containerElement.offsetTop;
    this.translateX += cursorX * (1 / next - 1 / previous);
    this.translateY += cursorY * (1 / next - 1 / previous);
    this.scaleFactor = next;
    this.originX = this.originY = this.translateOriginX = this.translateOriginY = 0;
    this.lastTranslateX = this.translateX;
    this.lastTranslateY = this.translateY;
    this.zoomElement.style.display = "block";
    this.zoomElement.textContent = `Zoom: ${Math.round(next * 100)}%`;
    this.updateTransform();
    return true;
  };
  // Root wheel listeners can be passive by default. Capture the canvas gesture
  // explicitly so it cannot also scroll the surrounding portfolio page.
  window.addEventListener("wheel", event => {
    if (!(event.target instanceof Element) || !event.target.closest("#canvas")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.deltaY !== 0) window.PannerDragger.resize(event.deltaY, event.clientX, event.clientY);
  }, { capture: true, passive: false });
  function fitGraph() {
    const nodes = [...container.querySelectorAll(".node")];
    if (!nodes.length) return;
    const panner = window.PannerDragger;
    panner.panTo(0, 0);
    const origin = container.getBoundingClientRect();
    const bounds = nodes.map(node => node.getBoundingClientRect());
    const left = Math.min(...bounds.map(box => box.left)) - origin.left;
    const top = Math.min(...bounds.map(box => box.top)) - origin.top;
    const width = Math.max(...bounds.map(box => box.right)) - origin.left - left;
    const height = Math.max(...bounds.map(box => box.bottom)) - origin.top - top;
    const header = document.querySelector("header").offsetHeight;
    const footer = document.querySelector("footer").offsetHeight;
    const availableHeight = innerHeight - header - footer - 40;
    const scale = Math.max(0.025, Math.min(1, (innerWidth - 40) / width, availableHeight / height));
    panner.minScaleFactor = 0.025;
    panner.scaleFactor = scale;
    panner.translateX = (innerWidth / scale - width) / 2 - left;
    panner.translateY = (availableHeight / scale - height) / 2 - top + (header + 20) / scale;
    panner.lastTranslateX = panner.translateX;
    panner.lastTranslateY = panner.translateY;
    panner.updateTransform();
  }
  document.getElementById("fit").addEventListener("click", fitGraph);
  try {
    const requested = new URLSearchParams(location.search).get("src");
    if (!requested) throw new Error("No shader graph file was selected.");
    const url = new URL(requested, location.href);
    if (url.origin !== location.origin || !/\.(shadergraph|shadersubgraph)$/i.test(url.pathname)) {
      throw new Error("Select a .shadergraph or .shadersubgraph file hosted on this website.");
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Could not load shader graph (HTTP ${response.status}).`);
    const text = await response.text();
    if (text.length > 8 * 1024 * 1024) throw new Error("Shader graph is too large to preview.");
    const filename = decodeURIComponent(url.pathname.split("/").pop());
    window.fileLoader.loadShaderGraph(filename, text, false, false);
    if (!container.querySelector(".node")) throw new Error("No supported nodes were found in this graph.");
    window.Blackboard.hide();
    window.Inspector.hide();
    graphName.textContent = filename;
    status.hidden = true;
    // Subgraph links in upstream point to its public library, not our local files.
    container.querySelectorAll(".subgraph").forEach(node => {
      node.onclick = null;
      node.title = "Subgraph structure requires its separate source file.";
    });
    requestAnimationFrame(fitGraph);
  } catch (error) {
    console.error("[Portfolio Shader Graph]", error);
    status.textContent = error instanceof Error ? error.message : "Could not open this shader graph.";
  }
});
