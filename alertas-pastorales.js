(function () {
  "use strict";

  const DIAS_ALERTA = [1, 3, 5];
  const DIAS_SIN_SEGUIMIENTO = 7;

  function log(...args) {
    console.log("[ALERTAS]", ...args);
  }

  function getSupabaseConfig() {
    return {
      url:
        window.SUPABASE_URL ||
        window.supabaseUrl ||
        null,

      key:
        window.SUPABASE_ANON_KEY ||
        window.supabaseAnonKey ||
        null
    };
  }

  function getCurrentUser() {
    return (
      window.currentUser ||
      window.usuarioActual ||
      null
    );
  }

  function isPastor(user) {
    if (!user) return false;

    const rol = String(
      user.rol ||
      user.role ||
      ""
    ).toLowerCase();

    return (
      rol.includes("pastor") ||
      rol.includes("admin")
    );
  }

  async function api(table, query) {

    const cfg = getSupabaseConfig();

    if (!cfg.url || !cfg.key) {
      console.warn("Supabase no configurado");
      return [];
    }

    const res = await fetch(
      `${cfg.url}/rest/v1/${table}?${query}`,
      {
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`
        }
      }
    );

    if (!res.ok) {
      console.warn("Error API", table);
      return [];
    }

    return await res.json();
  }

  function diasDesde(fecha) {

    if (!fecha) return 999;

    const f = new Date(fecha);
    const hoy = new Date();

    return Math.floor(
      (hoy - f) / 86400000
    );
  }

  function crearCampanita(alertas) {

    const vieja =
      document.getElementById(
        "sc-alertas"
      );

    if (vieja) vieja.remove();

    const wrap =
      document.createElement("div");

    wrap.id = "sc-alertas";

    wrap.innerHTML = `
      <div style="
        position:fixed;
        top:75px;
        right:18px;
        z-index:9999;
      ">
        <button id="btnBell" style="
          width:55px;
          height:55px;
          border-radius:50%;
          border:none;
          background:#173B5C;
          color:#F5D060;
          font-size:25px;
          cursor:pointer;
          box-shadow:0 8px 25px rgba(0,0,0,.25);
          position:relative;
        ">
          🔔
          <span style="
            position:absolute;
            top:-5px;
            right:-5px;
            background:#B53A1A;
            color:#fff;
            width:24px;
            height:24px;
            border-radius:50%;
            font-size:12px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:900;
          ">
            ${alertas.length}
          </span>
        </button>

        <div id="panelBell" style="
          display:none;
          position:absolute;
          right:0;
          top:65px;
          width:360px;
          max-height:70vh;
          overflow:auto;
          background:#fff;
          border-radius:18px;
          padding:14px;
          box-shadow:0 15px 40px rgba(0,0,0,.25);
          border:1px solid rgba(0,0,0,.1);
        ">
          <h3 style="
            margin-bottom:12px;
            color:#173B5C;
          ">
            🔔 Alertas pastorales
          </h3>

          ${
            alertas.length
              ? alertas.map(a => `
                <div style="
                  padding:12px;
                  border-radius:14px;
                  margin-bottom:10px;
                  background:#FFF8E1;
                  border:1px solid rgba(217,164,65,.2);
                ">
                  <div style="
                    font-weight:800;
                    color:#173B5C;
                    margin-bottom:4px;
                  ">
                    ${a.titulo}
                  </div>

                  <div style="
                    font-size:13px;
                    color:#333;
                  ">
                    ${a.texto}
                  </div>
                </div>
              `).join("")
              : `
                <div style="
                  color:#2A6B2A;
                  font-size:14px;
                ">
                  ✅ No hay alertas pendientes.
                </div>
              `
          }

        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const btn =
      document.getElementById(
        "btnBell"
      );

    const panel =
      document.getElementById(
        "panelBell"
      );

    btn.onclick = () => {

      panel.style.display =
        panel.style.display === "block"
          ? "none"
          : "block";
    };
  }

  async function cargarAlertas() {

    try {

      const user =
        getCurrentUser();

      if (user && !isPastor(user)) {
        return;
      }

      const personas =
        await api(
          "personas",
          "select=*"
        );

      const seguimiento =
        await api(
          "seguimiento_espiritual",
          "select=*"
        );

      const alertas = [];

      personas.forEach(p => {

        const seg =
          seguimiento.find(
            s =>
              String(s.persona_id) ===
              String(p.id)
          );

        if (!seg) {

          const dias =
            diasDesde(
              p.created_at
            );

          if (dias >= 3) {

            alertas.push({
              titulo:
                "🟡 Nuevo interés",
              texto:
                `${p.nombre || "Persona"} lleva ${dias} días sin seguimiento.`
            });
          }

          return;
        }

        const dias =
          diasDesde(
            seg.fecha ||
            seg.created_at
          );

        if (
          dias >=
          DIAS_SIN_SEGUIMIENTO
        ) {

          alertas.push({
            titulo:
              "🔴 Seguimiento atrasado",
            texto:
              `${p.nombre || "Persona"} lleva ${dias} días sin seguimiento.`
          });
        }

      });

      crearCampanita(alertas);

      log(
        "Alertas cargadas:",
        alertas.length
      );

    } catch (e) {

      console.warn(
        "Alertas error",
        e
      );
    }
  }

  function iniciar() {

    setTimeout(
      cargarAlertas,
      1500
    );

    setInterval(
      cargarAlertas,
      300000
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );

  } else {

    iniciar();
  }

})();
