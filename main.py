import streamlit as st
import pandas as pd
import logging

from config import YEAR, USER_NAMES, GP_OPTIONS
from data import load_weekend_data
from scoring import calculate_weekend_points

# ─── Logging setup ───────────────────────────────────────────────────────────

class StreamlitLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()

    def emit(self, record):
        msg = self.format(record)
        if "log_messages" not in st.session_state:
            st.session_state.log_messages = []
        st.session_state.log_messages.append(msg)

logger = logging.getLogger("porres_f1")
logger.setLevel(logging.INFO)
logger.handlers.clear()
handler = StreamlitLogHandler()
handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s", datefmt="%H:%M:%S"))
logger.addHandler(handler)

# ─── Page config ─────────────────────────────────────────────────────────────
st.set_page_config(page_title="Recompte Porres F1", page_icon="🏎️", layout="wide")
st.title("🏎️ Recompte de Punts — Porres F1")

# ─── Sidebar ─────────────────────────────────────────────────────────────────

st.sidebar.header("⚙️ Paràmetres")
selected_gp_label = st.sidebar.selectbox("Grand Prix", GP_OPTIONS, index=0)
gp = int(selected_gp_label.split("·")[0].replace("R", "").strip())

# ─── Main area: load data ────────────────────────────────────────────────────

if st.button("📡 Carregar dades del GP"):
    st.session_state.log_messages = []
    try:
        data, event_name, event_format = load_weekend_data(YEAR, gp)
        st.session_state.weekend_data = data
        st.session_state.event_name = event_name
        st.session_state.event_format = event_format
        st.session_state.loaded_gp = gp
        st.success(f"Dades carregades: **{event_name}**")
    except Exception as e:
        st.error(f"Error carregant dades: {e}")

if "weekend_data" in st.session_state:
    if st.session_state.get("loaded_gp") != gp:
        st.warning("⚠️ Has canviat el GP seleccionat. Torna a clicar **Carregar dades del GP** per actualitzar.")

    data = st.session_state.weekend_data
    event_name = st.session_state.event_name
    st.subheader(f"🏁 {event_name}")

    # Show actual results — one collapsible expander per session
    st.subheader("📊 Resultats reals")
    session_labels = {"Qualifying": "Qualifying", "Race": "Race", "Sprint": "Sprint", "SS": "Sprint Shootout / Sprint Qualifying"}
    for session_name in ["SS", "Sprint", "Qualifying", "Race"]:
        if data[session_name] is not None:
            df = data[session_name].sort_values('Position').reset_index(drop=True)
            with st.expander(f"**{session_labels[session_name]}**", expanded=False):
                st.dataframe(df, use_container_width=True, hide_index=True)

    # Determine available sessions
    available_sessions = [s for s in ["SS", "Sprint", "Qualifying", "Race"] if data[s] is not None]

    # Get driver list sorted alphabetically
    for s in available_sessions:
        if data[s] is not None:
            all_drivers = sorted(data[s]['Abbreviation'].tolist())
            break
    else:
        all_drivers = []

    st.subheader("🎯 Prediccions")
    st.caption("Selecciona els pilots en ordre (P1, P2, P3…)")

    predictions = {}
    user_cols = st.columns(len(USER_NAMES))
    
    # Default drivers for easier selection
    default_drivers = ["RUS", "ANT", "LEC", "HAM", "VER"]

    for idx, col in enumerate(user_cols):
        user = USER_NAMES[idx]
        predictions[user] = {}

        with col:
            st.markdown(f"### {user}")
            for session in available_sessions:
                st.markdown(f"**{session}**")

                if session in ("Race", "Sprint"):
                    # Top 5
                    picks = []
                    for j in range(5):
                        # Determine default index based on preferred drivers
                        def_idx = min(j, len(all_drivers)-1)
                        if j < len(default_drivers):
                            target = default_drivers[j]
                            if target in all_drivers:
                                def_idx = all_drivers.index(target)
                        
                        pick = st.selectbox(
                            f"P{j+1}", all_drivers,
                            key=f"{user}_{session}_p{j+1}",
                            index=def_idx
                        )
                        picks.append(pick)
                    predictions[user][session] = {"top5": picks}
                else:
                    # Top 3 (Qualifying, SS)
                    picks = []
                    for j in range(3):
                        # Determine default index based on preferred drivers
                        def_idx = min(j, len(all_drivers)-1)
                        if j < len(default_drivers):
                            target = default_drivers[j]
                            if target in all_drivers:
                                def_idx = all_drivers.index(target)

                        pick = st.selectbox(
                            f"P{j+1}", all_drivers,
                            key=f"{user}_{session}_p{j+1}",
                            index=def_idx
                        )
                        picks.append(pick)
                    predictions[user][session] = {"top3": picks}

                # ── Extra point ──
                extra_options = ["Cap", "Posició exacta", "SC/VSC/RF", "DNF"]
                if extra_type := st.session_state.get(f"{user}_{session}_extra_type", "Cap"):
                    pass  # read current value before rendering columns

                if extra_type in ("Posició exacta", "SC/VSC/RF"):
                    xcol1, xcol2, xcol3 = st.columns(3)
                elif extra_type == "DNF":
                    xcol1, xcol2 = st.columns(2)
                else:
                    xcol1 = st.container()
                    xcol2 = xcol3 = None

                with xcol1:
                    extra_type = st.selectbox(
                        "🎲 Punt extra",
                        extra_options,
                        key=f"{user}_{session}_extra_type"
                    )

                if extra_type == "Posició exacta":
                    with xcol2:
                        extra_driver = st.selectbox(
                            "Pilot", all_drivers,
                            key=f"{user}_{session}_extra_driver"
                        )
                    with xcol3:
                        extra_pos = st.number_input(
                            "Posició", min_value=6, max_value=20, value=6, step=1,
                            key=f"{user}_{session}_extra_pos"
                        )
                    predictions[user][session]["extra"] = {
                        "type": "position", "driver": extra_driver, "position": extra_pos
                    }
                elif extra_type == "SC/VSC/RF":
                    with xcol2:
                        extra_event = st.selectbox(
                            "Tipus", ["SC", "VSC", "RF"],
                            key=f"{user}_{session}_extra_event"
                        )
                    with xcol3:
                        extra_count = st.number_input(
                            "Quantitat", min_value=0, max_value=10, value=0, step=1,
                            key=f"{user}_{session}_extra_count"
                        )
                    predictions[user][session]["extra"] = {
                        "type": "sc_vsc_rf", "event_type": extra_event, "count": extra_count
                    }
                elif extra_type == "DNF":
                    with xcol2:
                        extra_driver = st.selectbox(
                            "Pilot DNF", all_drivers,
                            key=f"{user}_{session}_extra_dnf_driver"
                        )
                    predictions[user][session]["extra"] = {
                        "type": "dnf", "driver": extra_driver
                    }
                else:
                    predictions[user][session]["extra"] = {"type": "none"}

    # Calculate
    st.divider()
    if st.button("🧮 Calcular punts!", type="primary", use_container_width=True):
        st.session_state.log_messages = []

        all_results = {}
        for user, user_preds in predictions.items():
            all_results[user] = calculate_weekend_points(user, user_preds, data)

        # ─── Results table ────────────────────────────────────────────
        st.subheader("🏆 Classificació")

        rows = []
        for user, res in all_results.items():
            row = {"Participant": user}
            for session in available_sessions:
                if session in res:
                    row[session] = res[session]["total"]
                else:
                    row[session] = 0
            row["TOTAL"] = res["total"]
            rows.append(row)

        results_df = pd.DataFrame(rows).sort_values("TOTAL", ascending=False).reset_index(drop=True)
        results_df.index = results_df.index + 1  # Start ranking at 1
        results_df.index.name = "Pos"

        st.dataframe(results_df, use_container_width=True)

        # ─── Detailed breakdown per user ──────────────────────────────
        REASON_LABELS = {
            'exact_top5':      'Top 5 exacte (ordre correcte)',
            'exact_top3':      'Top 3 exacte (ordre correcte)',
            'top3_no_order':   'Pilots del top 3 correctes (sense ordre)',
            'top5_no_order':   'Pilots del top 5 correctes (sense ordre)',
            'extra_position':  'Punt extra: posició exacta encertada',
            'extra_sc_vsc_rf': 'Punt extra: SC/VSC/RF encertat',
            'extra_dnf':       'Punt extra: DNF encertat',
        }

        with st.expander("📋 Detall per participant"):
            for user, res in all_results.items():
                st.markdown(f"**{user}** — Total: **{res['total']} pts**")
                for session in available_sessions:
                    if session in res:
                        pts = res[session]['total']
                        reasons = [REASON_LABELS.get(k, k) for k in res[session] if k != 'total']
                        if reasons:
                            reason_str = ", ".join(reasons)
                            st.write(f"  - {session}: **{pts} pts** ({reason_str})")
                        else:
                            st.write(f"  - {session}: 0 pts")

        # ─── Logs ─────────────────────────────────────────────────────
        st.subheader("📝 Logs")
        if "log_messages" in st.session_state and st.session_state.log_messages:
            log_text = "\n".join(st.session_state.log_messages)
            st.code(log_text, language="text")
        else:
            st.info("No hi ha logs.")
