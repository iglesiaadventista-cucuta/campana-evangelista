(function () {
  "use strict";

  const URL = localStorage.getItem("sb_url") || "https://kshmetrlquskxsighywn.supabase.co";
  const KEY = localStorage.getItem("sb_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaG1ldHJscXVza3hzaWdoeXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDU2OTEsImV4cCI6MjA5MTkyMTY5MX0.yQIxym2gt7-BBkHMyQU-aQVaqpZFKabPz3ZRaKfOxlY";

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

  function crearCampanita(alertas) {
    document.getElementById("sc-alertas-pastorales")?.remove();

    const wrap = document.createElement("div");
    wrap.id = "sc-alertas-pastorales";
    wrap.innerHTML = `
      <div style="position:fixed;top:74px;right:18px;z-index:99999;font-family:Arial,sans-serif;">
        <button id="scBellBtn" style="width:56px;height:56px;border-radius:50%;border:none;background:#173B5C;color:#F5D060;font-size:26px;cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.28);position:relative;">
          🔔
          <span style="position:absolute;top:-6px;right:-6px;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#D93025;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid white;">
            ${alertas.length > 99 ? "99+" : alertas.length}
          </span>
        </button>
        <div id="scBellPanel" style="display:none;position:absolute;right:0;top:66px;width:390px;max-height:72vh;overflow:auto;background:#fff;border-radius:18px;padding:16px;box-shadow:0 18px 45px rgba(0,0,0,.25);border:1px solid rgba(37,92,138,.18);">
          <h3 style="margin:0 0 12px;color:#173B5C;">🔔 Alertas pastorales</h3>
          ${
            alertas.length
              ? alertas.map(a => `
                <div style="padding:12px;border-radius:14px;margin-bottom:10px;background:${a.tipo === "roja" ? "#FFF0EC" : "#FFF8E1"};border-left:4px solid ${a.tipo === "roja" ? "#B53A1A" : "#D9A441"};">
                  <div style="font-weight:900;color:#173B5C;margin-bottom:4px;">${a.titulo}</div>
                  <div style="font-size:13px;color:#333;line-height:1.35;">${a.texto}</div>
                </div>
              `).join("")
              : `<div style="padding:12px;color:#2A6B2A;background:#EDF7ED;border-radius:14px;font-size:14px;">✅ No hay alertas pastorales pendientes.</div>`
          }
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    document.getElementById("scBellBtn").onclick = () => {
      const p = document.getElementById("scBellPanel");
      p.style.display = p.style.display === "block" ? "none" : "block";
    };
  }

  async function cargarAlertas() {
    const personas = await api("personas", "select=*&order=created_at.desc&limit=1000");
    const segs = await api("seguimiento_espiritual", "select=*&order=creado_en.desc&limit=2000");

    const ultimos = {};
    segs.forEach(s => {
      const id = String(s.persona_id || s.cedula || "");
      const fecha = s.fecha || s.fecha_seguimiento || s.creado_en || s.created_at;
      if (!ultimos[id] || new Date(fecha) > new Date(ultimos[id]._fecha || 0)) {
        ultimos[id] = {...s, _fecha: fecha};
      }
    });

    const alertas = [];
    personas.forEach(p => {
      const id = String(p.id || p.cedula || "");
      const nombre = p.nombre || p.nombres || p.nombre_completo || "Persona";
      const ult = ultimos[id];

      if (!ult) {
        const dias = diasDesde(p.created_at || p.creado_en || p.fecha_registro);
        if (dias >= 3) {
          alertas.push({
            tipo: "amarilla",
            titulo: "🟡 Nuevo interés sin seguimiento",
            texto: `${nombre} lleva ${dias} días sin primer seguimiento pastoral.`
          });
        }
        return;
      }

      const dias = diasDesde(ult._fecha);
      const estado = String(ult.estado || "").toLowerCase();
      if (dias >= 7 && !estado.includes("bautizado") && !estado.includes("miembro")) {
        alertas.push({
          tipo: "roja",
          titulo: "🔴 Seguimiento atrasado",
          texto: `${nombre} lleva ${dias} días sin seguimiento.`
        });
      }
    });

    crearCampanita(alertas);
    console.log("[ALERTAS] Alertas cargadas:", alertas.length);
  }

  setTimeout(cargarAlertas, 1500);
  setInterval(cargarAlertas, 300000);
})();
