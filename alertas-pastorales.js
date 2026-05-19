(function () {
  "use strict";

  const URL = "https://kshmetrlquskxsighywn.supabase.co";
  const KEY = "TU_KEY_ANON_AQUI";

  async function api(tabla, query) {
    const res = await fetch(`${URL}/rest/v1/${tabla}?${query}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.warn("[ALERTAS] Error API", tabla, res.status);
      return [];
    }

    return await res.json();
  }

  function diasDesde(fecha) {
    if (!fecha) return 999;
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return 999;
    return Math.floor((new Date() - f) / 86400000);
  }

  function buscarCampanitaOriginal() {
    return document.querySelector(".sc-bell") || document.querySelector("[onclick*='alert']");
  }

  async function cargarAlertas() {
    const personas = await api("personas", "select=*&limit=1000");
    const segs = await api("seguimiento_espiritual", "select=*&limit=2000");

    const segMap = {};
    segs.forEach(s => {
      const id = String(s.persona_id || s.cedula || "");
      const fecha = s.fecha || s.fecha_seguimiento || s.creado_en || s.created_at;
      if (!segMap[id] || new Date(fecha) > new Date(segMap[id]._fecha || 0)) {
        segMap[id] = { ...s, _fecha: fecha };
      }
    });

    const alertas = [];

    personas.forEach(p => {
      const id = String(p.id || p.cedula || "");
      const nombre = p.nombre || p.nombres || p.nombre_completo || "Persona";
      const ult = segMap[id];

      if (!ult) {
        alertas.push({
          titulo: "🟡 Nuevo interés sin seguimiento",
          texto: `${nombre} no tiene seguimiento pastoral registrado.`
        });
        return;
      }

      const dias = diasDesde(ult._fecha);
      const estado = String(ult.estado || "").toLowerCase();

      if (dias >= 7 && !estado.includes("bautizado") && !estado.includes("miembro")) {
        alertas.push({
          titulo: "🔴 Seguimiento atrasado",
          texto: `${nombre} lleva ${dias} días sin seguimiento.`
        });
      }
    });

    window.SC_ALERTAS_PASTORALES = alertas;

    const badge = document.querySelector(".sc-bell-badge");
    if (badge) badge.textContent = alertas.length > 99 ? "99+" : alertas.length;

    const bell = buscarCampanitaOriginal();
    if (bell && !bell.dataset.alertasModulares) {
      bell.dataset.alertasModulares = "1";
      bell.addEventListener("click", function () {
        mostrarPanel(alertas);
      });
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

    setTimeout(() => {
      document.addEventListener("click", function cerrar(e) {
        if (!panel.contains(e.target) && !e.target.closest(".sc-bell")) {
          panel.remove();
          document.removeEventListener("click", cerrar);
        }
      });
    }, 100);
  }

  setTimeout(cargarAlertas, 1500);
  setInterval(cargarAlertas, 300000);
})();
