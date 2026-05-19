(function () {
  "use strict";

  const DIAS_SIN_SEGUIMIENTO = 7;
  const DIAS_NUEVO_INTERES = 3;

  function getSupabaseConfig() {
    return {
      url:
        window.SUPABASE_URL ||
        window.supabaseUrl ||
        localStorage.getItem("sb_url") ||
        localStorage.getItem("supabase_url") ||
        localStorage.getItem("sc_supabase_url") ||
        null,

      key:
        window.SUPABASE_ANON_KEY ||
        window.supabaseAnonKey ||
        localStorage.getItem("sb_key") ||
        localStorage.getItem("supabase_key") ||
        localStorage.getItem("sc_supabase_key") ||
        null
    };
  }

  async function api(table, query) {

    const cfg = getSupabaseConfig();

    if (!cfg.url || !cfg.key) {
      console.warn("[ALERTAS] Supabase no configurado.");
      return [];
    }

    const base = cfg.url.replace(/\/$/, "");

    const res = await fetch(
      `${base}/rest/v1/${table}?${query}`,
      {
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) {

      const txt =
        await res.text().catch(() => "");

      console.warn(
        "[ALERTAS] Error API",
        table,
        res.status,
        txt
      );

      return [];
    }

    return await res.json();
  }

  function diasDesde(fecha) {

    if (!fecha) return 999;

    const f = new Date(fecha);

    if (isNaN(f.getTime())) {
      return 999;
    }

    const hoy = new Date();

    return Math.floor(
      (hoy - f) / 86400000
    );
  }

  function nombrePersona(p) {

    return (
      p.nombre ||
      p.nombres ||
      p.nombre_completo ||
      "Persona"
    );
  }

  function idPersona(p) {

    return String(
      p.id ||
      p.persona_id ||
      p.cedula ||
      p.documento ||
      ""
    );
  }

  function fechaRegistro(p) {

    return (
      p.created_at ||
      p.creado_en ||
      p.fecha_registro ||
      p.fecha ||
      null
    );
  }

  function estadoNormalizado(v) {

    return String(v || "")
      .toLowerCase()
      .trim();
  }

  function esCerrado(estado) {

    const e =
      estadoNormalizado(estado);

    return (
      e.includes("bautizado") ||
      e.includes("miembro")
    );
  }

  function ultimoSeguimientoMap(seguimientos) {

    const map = {};

    seguimientos.forEach(s => {

      const pid = String(
        s.persona_id ||
        s.cedula ||
        ""
      );

      if (!pid) return;

      const fecha =
        s.fecha ||
        s.fecha_seguimiento ||
        s.creado_en ||
        s.created_at;

      if (
        !map[pid] ||
        new Date(fecha) >
        new Date(map[pid]._fecha || 0)
      ) {

        map[pid] = {
          ...s,
          _fecha: fecha
        };
      }
    });

    return map;
  }

  function crearCampanita(alertas) {

    const anterior =
      document.getElementById(
        "sc-alertas-pastorales"
      );

    if (anterior) {
      anterior.remove();
    }

    const wrap =
      document.createElement("div");

    wrap.id =
      "sc-alertas-pastorales";

    wrap.innerHTML = `
      <div style="
        position:fixed;
        top:74px;
        right:18px;
        z-index:99999;
        font-family:Arial,sans-serif;
      ">

        <button id="scBellBtn" style="
          width:56px;
          height:56px;
          border-radius:50%;
          border:none;
          background:#173B5C;
          color:#F5D060;
          font-size:26px;
          cursor:pointer;
          box-shadow:0 8px 26px rgba(0,0,0,.28);
          position:relative;
        ">

          🔔

          <span style="
            position:absolute;
            top:-6px;
            right:-6px;
            min-width:24px;
            height:24px;
            padding:0 6px;
            border-radius:999px;
            background:#D93025;
            color:#fff;
            font-size:12px;
            font-weight:900;
            display:flex;
            align-items:center;
            justify-content:center;
            border:2px solid white;
          ">

            ${alertas.length > 99 ? "99+" : alertas.length}

          </span>

        </button>

        <div id="scBellPanel" style="
          display:none;
          position:absolute;
          right:0;
          top:66px;
          width:390px;
          max-height:72vh;
          overflow:auto;
          background:#fff;
          border-radius:18px;
          padding:16px;
          box-shadow:0 18px 45px rgba(0,0,0,.25);
          border:1px solid rgba(37,92,138,.18);
        ">

          <h3 style="
            margin:0 0 12px;
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
                  background:${
                    a.tipo === "roja"
                      ? "#FFF0EC"
                      : "#FFF8E1"
                  };
                  border-left:4px solid ${
                    a.tipo === "roja"
                      ? "#B53A1A"
                      : "#D9A441"
                  };
                ">

                  <div style="
                    font-weight:900;
                    color:#173B5C;
                    margin-bottom:4px;
                  ">
                    ${a.titulo}
                  </div>

                  <div style="
                    font-size:13px;
                    color:#333;
                    line-height:1.35;
                  ">
                    ${a.texto}
                  </div>

                </div>

              `).join("")

              : `

                <div style="
                  padding:12px;
                  color:#2A6B2A;
                  background:#EDF7ED;
                  border-radius:14px;
                  font-size:14px;
                ">
                  ✅ No hay alertas pastorales pendientes.
                </div>

              `
          }

        </div>

      </div>
    `;

    document.body.appendChild(wrap);

    const btn =
      document.getElementById(
        "scBellBtn"
      );

    const panel =
      document.getElementById(
        "scBellPanel"
      );

    btn.addEventListener(
      "click",
      function () {

        panel.style.display =
          panel.style.display === "block"
            ? "none"
            : "block";
      }
    );
  }

  async function cargarAlertas() {

    try {

      const personas =
        await api(
          "personas",
          "select=*&order=created_at.desc&limit=1000"
        );

      const seguimientos =
        await api(
          "seguimiento_espiritual",
          "select=*&order=creado_en.desc&limit=2000"
        );

      const ultimos =
        ultimoSeguimientoMap(
          seguimientos
        );

      const alertas = [];

      personas.forEach(p => {

        const pid =
          idPersona(p);

        const ultimo =
          ultimos[pid];

        if (!ultimo) {

          const dias =
            diasDesde(
              fechaRegistro(p)
            );

          if (
            dias >=
            DIAS_NUEVO_INTERES
          ) {

            alertas.push({

              tipo: "amarilla",

              titulo:
                "🟡 Nuevo interés sin seguimiento",

              texto:
                `${nombrePersona(p)} lleva ${dias} días sin primer seguimiento pastoral.`
            });
          }

          return;
        }

        const dias =
          diasDesde(
            ultimo._fecha
          );

        const estado =
          ultimo.estado || "";

        if (
          dias >=
          DIAS_SIN_SEGUIMIENTO &&
          !esCerrado(estado)
        ) {

          alertas.push({

            tipo: "roja",

            titulo:
              "🔴 Seguimiento atrasado",

            texto:
              `${nombrePersona(p)} lleva ${dias} días sin seguimiento.`
          });
        }

      });

      crearCampanita(alertas);

      console.log(
        "[ALERTAS] Alertas cargadas:",
        alertas.length
      );

    } catch (e) {

      console.warn(
        "[ALERTAS] Error general:",
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
