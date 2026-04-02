import fastf1 as f1
import pandas as pd
import streamlit as st


def format_timedelta(td):
    """Convert a timedelta to a readable lap time string: m:ss.mmm"""
    if pd.isnull(td):
        return None
    total_seconds = td.total_seconds()
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    if minutes > 0:
        return f"{minutes}:{seconds:06.3f}"
    return f"{seconds:.3f}"


def clean_session_data(session_df):
    cols_to_drop = [c for c in ['BroadcastName', 'DriverId', 'TeamColor', 'TeamId',
                                 'FirstName', 'LastName', 'HeadshotUrl', 'CountryCode']
                    if c in session_df.columns]
    session_df = session_df.drop(columns=cols_to_drop)

    # Format timedelta columns to readable strings
    time_cols = [c for c in ['Q1', 'Q2', 'Q3', 'Time'] if c in session_df.columns]
    for col in time_cols:
        session_df[col] = session_df[col].apply(format_timedelta)

    return session_df


def _count_race_control_events(session):
    """Count SC, VSC and Red Flag deployments from race control messages."""
    counts = {"SC": 0, "VSC": 0, "RF": 0}
    try:
        rcm = session.race_control_messages
        if rcm is not None and not rcm.empty:
            for _, msg in rcm.iterrows():
                message = str(msg.get('Message', '')).upper()
                if 'VIRTUAL SAFETY CAR DEPLOYED' in message:
                    counts["VSC"] += 1
                elif 'SAFETY CAR DEPLOYED' in message:
                    counts["SC"] += 1
                elif 'RED FLAG' in message:
                    counts["RF"] += 1
    except Exception:
        pass
    return counts


@st.cache_data(show_spinner="Carregant dades del cap de setmana…")
def load_weekend_data(year, gp_number):
    gp = f1.get_event(year, gp_number)

    if gp.EventFormat == 'conventional':
        ss, sprint = None, None
        qualy = gp.get_session('Qualifying')
        race = gp.get_session('Race')
    else:
        # Sprint Shootout was renamed to Sprint Qualifying in 2026
        ss = None
        for ss_name in ('Sprint Shootout', 'Sprint Qualifying'):
            try:
                ss = gp.get_session(ss_name)
                break
            except Exception:
                pass
        try:
            sprint = gp.get_session('Sprint')
        except Exception:
            sprint = None
        qualy = gp.get_session('Qualifying')
        race = gp.get_session('Race')

    result = {}
    race_control = {}
    for name, session in [("SS", ss), ("Sprint", sprint), ("Qualifying", qualy), ("Race", race)]:
        if session is not None:
            session.load(laps=False, telemetry=False, weather=False, messages=True)
            result[name] = clean_session_data(session.results)
            race_control[name] = _count_race_control_events(session)
        else:
            result[name] = None
            race_control[name] = None
    result["RaceControl"] = race_control

    return result, gp.EventName, gp.EventFormat
