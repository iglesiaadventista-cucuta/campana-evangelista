(function () {
  "use strict";

  function diasDesde(fecha) {
    if (!fecha) return 999;
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return 999;
    return Math.floor((new Date() - f) / 86400000);
  }

  function nombrePersona(p) {
    return p.nombre_completo || p.nombre || p.nombres || "Persona";
  }

  async function cargarAlertas() {
    if (typeof sbGet !== "function") {
      console.warn("[ALERTAS] sbGet no está disponible todavía.");
      return;
    }

    const personas = await sbGet("personas", "select=*");
    const segs = await sbGet("seguimiento_espiritual", "select=*");

    if (!Array.isArray(personas) || !Array.isArray(segs)) {
      console.warn("[ALERTAS] No se pudieron leer datos.");
      return;
    }

    const mapa = {};
    segs.forEach(s => {
      const id = String(s.persona_id || s.cedula || "");
      const fecha = s.fecha || s.fecha_seguimiento || s.creado_en || s.created_at;
      if (!mapa[id] || new Date(fecha) > new Date(mapa[id]._fecha || 0)) {
        mapa[id] = { ...s, _fecha: fecha };
      }
    });

    const alertas = [];

    personas.forEach(p => {
      const id = String(p.id || p.cedula || "");
      const ult = mapa[id];

      if (!ult) {
        alertas.push({
          titulo: "🟡 Nuevo interés sin seguimiento",
          texto: `${nombrePersona(p)} no tiene seguimiento pastoral registrado.`
        });
        return;
      }

      const dias = diasDesde(ult._fecha);
      const estado = String(ult.estado || "").toLowerCase();

      if (dias >= 7 && !estado.includes("bautizado") && !estado.includes("miembro")) {
        alertas.push({
          titulo: "🔴 Seguimiento atrasado",
          texto: `${nombrePersona(p)} lleva ${dias} días sin seguimiento.`
        });
      }
    });

    window.SC_ALERTAS_PASTORALES = alertas;

    const badge = document.querySelector(".sc-bell-badge");
    if (badge) badge.textContent = alertas.length > 99 ? "99+" : alertas.length;

    const bell = document.querySelector(".sc-bell");
    if (bell && !bell.dataset.alertasOk) {
      bell.dataset.alertasOk = "1";
      bell.addEventListener("click", () => mostrarPanel(alertas));
    }

    console.log("[ALERTAS] Alertas cargadas:", alertas.length);
  }

  function mostrarPanel(alertas) {
    document.getElementById("sc-alertas-panel-modular")?.remove();

    const panel = document.createElement("div");
    panel.id = "sc-alertas-panel-modular";
    panel.style.cssText = `
      position:fixed;
      top:95px;
      left:18px;
      width:390px;
      max-height:72vh;
      overflow:auto;
      background:white;
      border-radius:18px;
      padding:16px;
      z-index:99999;
      box-shadow:0 18px 45px rgba(0,0,0,.25);
      border:1px solid rgba(37,92,138,.18);
      font-family:Arial,sans-serif;
    `;

    panel.innerHTML = `
      <h3 style="margin:0 0 12px;color:#173B5C;">🔔 Alertas pastorales</h3>
      ${
        alertas.length
          ? alertas.map(a => `
            <div style="padding:12px;border-radius:14px;margin-bottom:10px;background:#FFF8E1;border-left:4px solid #D9A441;">
              <div style="font-weight:900;color:#173B5C;margin-bottom:4px;">${a.titulo}</div>
              <div style="font-size:13px;color:#333;line-height:1.35;">${a.texto}</div>
            </div>
          `).join("")
          : `<div style="padding:12px;color:#2A6B2A;background:#EDF7ED;border-radius:14px;font-size:14px;">✅ No hay alertas pastorales pendientes.</div>`
      }
    `;

    document.body.appendChild(panel);
  }

  setTimeout(cargarAlertas, 2000);
  setInterval(cargarAlertas, 300000);
})();
