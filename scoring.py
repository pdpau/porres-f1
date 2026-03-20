import logging

logger = logging.getLogger("porres_f1")


def calculate_race_points(user, user_top5, actual_results):
    """
    CURSA: 10pts top5 exacte | 5pts top3 exacte | 1pt top3 sense ordre | 1pt top5 sense ordre
    """
    user_top3 = user_top5[:3]
    points = 0
    breakdown = {}

    sorted_results = actual_results.sort_values('Position')
    actual_top3 = sorted_results['Abbreviation'].iloc[:3].tolist()
    actual_top5 = sorted_results['Abbreviation'].iloc[:5].tolist()

    logger.info(f"[CURSA] {user} — Predicció top5: {user_top5}")
    logger.info(f"[CURSA] Resultat real top3: {actual_top3} | top5: {actual_top5}")

    if user_top5 == actual_top5:
        points += 10
        breakdown['exact_top5'] = 10
        logger.info(f"[CURSA] {user} — ✅ Top 5 exacte! +10 pts")
    elif user_top3 == actual_top3:
        points += 5
        breakdown['exact_top3'] = 5
        logger.info(f"[CURSA] {user} — ✅ Top 3 exacte! +5 pts")
    else:
        top3_hit = sum(1 for d in user_top3 if d in actual_top3)
        if top3_hit == 3:
            points += 1
            breakdown['top3_no_order'] = 1
            logger.info(f"[CURSA] {user} — 🔀 Pilots del top 3 correctes (sense ordre) +1 pt")

        top5_hit = sum(1 for d in user_top5 if d in actual_top5)
        if top5_hit == 5:
            points += 1
            breakdown['top5_no_order'] = 1
            logger.info(f"[CURSA] {user} — 🔀 Pilots del top 5 correctes (sense ordre) +1 pt")

        if points == 0:
            logger.info(f"[CURSA] {user} — ❌ Cap encert")

    breakdown['total'] = points
    logger.info(f"[CURSA] {user} — Total cursa: {points} pts")
    return breakdown


def calculate_quali_points(user, user_top3, actual_results, session_tag="QUALI"):
    """
    QUALI / SS: 3pts top3 exacte | 1pt top3 sense ordre
    """
    points = 0
    breakdown = {}

    sorted_results = actual_results.sort_values('Position')
    actual_top3 = sorted_results['Abbreviation'].iloc[:3].tolist()

    logger.info(f"[{session_tag}] {user} — Predicció top3: {user_top3}")
    logger.info(f"[{session_tag}] Resultat real top3: {actual_top3}")

    if user_top3 == actual_top3:
        points += 3
        breakdown['exact_top3'] = 3
        logger.info(f"[{session_tag}] {user} — ✅ Top 3 exacte! +3 pts")
    else:
        top3_hit = sum(1 for d in user_top3 if d in actual_top3)
        if top3_hit == 3:
            points += 1
            breakdown['top3_no_order'] = 1
            logger.info(f"[{session_tag}] {user} — 🔀 Pilots del top 3 correctes (sense ordre) +1 pt")
        else:
            logger.info(f"[{session_tag}] {user} — ❌ Cap encert")

    breakdown['total'] = points
    logger.info(f"[{session_tag}] {user} — Total: {points} pts")
    return breakdown


def calculate_sprint_points(user, user_top5, actual_results):
    """
    SPRINT: 6pts top5 exacte | 3pts top3 exacte | 1pt top3 sense ordre | 1pt top5 sense ordre
    """
    user_top3 = user_top5[:3]
    points = 0
    breakdown = {}

    sorted_results = actual_results.sort_values('Position')
    actual_top3 = sorted_results['Abbreviation'].iloc[:3].tolist()
    actual_top5 = sorted_results['Abbreviation'].iloc[:5].tolist()

    logger.info(f"[SPRINT] {user} — Predicció top5: {user_top5}")
    logger.info(f"[SPRINT] Resultat real top3: {actual_top3} | top5: {actual_top5}")

    if user_top5 == actual_top5:
        points += 6
        breakdown['exact_top5'] = 6
        logger.info(f"[SPRINT] {user} — ✅ Top 5 exacte! +6 pts")
    elif user_top3 == actual_top3:
        points += 3
        breakdown['exact_top3'] = 3
        logger.info(f"[SPRINT] {user} — ✅ Top 3 exacte! +3 pts")
    else:
        top3_hit = sum(1 for d in user_top3 if d in actual_top3)
        if top3_hit == 3:
            points += 1
            breakdown['top3_no_order'] = 1
            logger.info(f"[SPRINT] {user} — 🔀 Pilots del top 3 correctes (sense ordre) +1 pt")

        top5_hit = sum(1 for d in user_top5 if d in actual_top5)
        if top5_hit == 5:
            points += 1
            breakdown['top5_no_order'] = 1
            logger.info(f"[SPRINT] {user} — 🔀 Pilots del top 5 correctes (sense ordre) +1 pt")

        if points == 0:
            logger.info(f"[SPRINT] {user} — ❌ Cap encert")

    breakdown['total'] = points
    logger.info(f"[SPRINT] {user} — Total sprint: {points} pts")
    return breakdown


def calculate_sprint_shootout_points(user, user_top3, actual_results):
    """
    SPRINT SHOOTOUT: mateixa lògica que la Quali.
    """
    return calculate_quali_points(user, user_top3, actual_results, session_tag="SS")


def _is_dnf(status):
    """Check if a result status indicates a DNF."""
    if not status:
        return False
    status_str = str(status).strip().lower()
    if status_str in ('finished', '', 'nan', 'none'):
        return False
    if status_str.startswith('+') and 'lap' in status_str:
        return False
    return True


def calculate_extra_point(user, extra_pred, actual_results, race_control_counts, session_tag):
    """Calculate the extra point for a session prediction."""
    breakdown = {}
    if not extra_pred or extra_pred.get("type") == "none":
        breakdown['total'] = 0
        return breakdown

    points = 0
    pred_type = extra_pred["type"]
    sorted_results = actual_results.sort_values('Position')

    if pred_type == "position":
        driver = extra_pred["driver"]
        predicted_pos = int(extra_pred["position"])
        driver_row = sorted_results[sorted_results['Abbreviation'] == driver]
        if not driver_row.empty:
            actual_pos = int(driver_row['Position'].iloc[0])
            logger.info(f"[{session_tag}] {user} — Extra (posició): {driver} predit P{predicted_pos}, real P{actual_pos}")
            if actual_pos == predicted_pos:
                points += 1
                breakdown['extra_position'] = 1
                logger.info(f"[{session_tag}] {user} — ✅ Posició exacta encertada! +1 pt extra")
            else:
                logger.info(f"[{session_tag}] {user} — ❌ Posició no encertada")
        else:
            logger.info(f"[{session_tag}] {user} — ❌ Pilot {driver} no trobat als resultats")

    elif pred_type == "sc_vsc_rf":
        event_type = extra_pred["event_type"]
        predicted_count = int(extra_pred["count"])
        actual_count = race_control_counts.get(event_type, 0) if race_control_counts else 0
        event_labels = {"SC": "Safety Cars", "VSC": "Virtual Safety Cars", "RF": "Banderes Roges"}
        logger.info(f"[{session_tag}] {user} — Extra ({event_labels[event_type]}): predit {predicted_count}, real {actual_count}")
        if predicted_count == actual_count:
            points += 1
            breakdown['extra_sc_vsc_rf'] = 1
            logger.info(f"[{session_tag}] {user} — ✅ Nombre de {event_labels[event_type]} encertat! +1 pt extra")
        else:
            logger.info(f"[{session_tag}] {user} — ❌ Nombre no encertat")

    elif pred_type == "dnf":
        driver = extra_pred["driver"]
        driver_row = sorted_results[sorted_results['Abbreviation'] == driver]
        if not driver_row.empty:
            status = driver_row['Status'].iloc[0]
            dnf = _is_dnf(status)
            logger.info(f"[{session_tag}] {user} — Extra (DNF): {driver}, status real: {status}")
            if dnf:
                points += 1
                breakdown['extra_dnf'] = 1
                logger.info(f"[{session_tag}] {user} — ✅ DNF encertat! +1 pt extra")
            else:
                logger.info(f"[{session_tag}] {user} — ❌ {driver} no ha fet DNF")
        else:
            logger.info(f"[{session_tag}] {user} — ❌ Pilot {driver} no trobat als resultats")

    breakdown['total'] = points
    return breakdown


def calculate_weekend_points(user, user_predictions, weekend_data):
    """
    Calcula els punts totals d'un usuari per tot el cap de setmana.

    user_predictions example:
    {
        "Qualifying": {"top3": ["VER", "NOR", "LEC"]},
        "Race":        {"top5": ["VER", "NOR", "LEC", "SAI", "HAM"]},
        "Sprint":      {"top5": ["VER", "NOR", "LEC", "SAI", "HAM"]},
        "SS":          {"top3": ["VER", "NOR", "LEC"]}
    }
    """
    total_points = 0
    results = {}

    logger.info(f"{'='*50}")
    logger.info(f"Calculant punts pel cap de setmana — {user}")
    logger.info(f"{'='*50}")

    rc = weekend_data.get("RaceControl", {})

    if weekend_data["Qualifying"] is not None and "Qualifying" in user_predictions:
        q = calculate_quali_points(user, user_predictions["Qualifying"]["top3"], weekend_data["Qualifying"])
        if "extra" in user_predictions["Qualifying"]:
            extra = calculate_extra_point(user, user_predictions["Qualifying"]["extra"],
                                          weekend_data["Qualifying"], rc.get("Qualifying"), "QUALI")
            q["total"] += extra["total"]
            q.update({k: v for k, v in extra.items() if k != "total"})
        results["Qualifying"] = q
        total_points += q["total"]

    if weekend_data["Race"] is not None and "Race" in user_predictions:
        r = calculate_race_points(user, user_predictions["Race"]["top5"], weekend_data["Race"])
        if "extra" in user_predictions["Race"]:
            extra = calculate_extra_point(user, user_predictions["Race"]["extra"],
                                          weekend_data["Race"], rc.get("Race"), "CURSA")
            r["total"] += extra["total"]
            r.update({k: v for k, v in extra.items() if k != "total"})
        results["Race"] = r
        total_points += r["total"]

    if weekend_data["Sprint"] is not None and "Sprint" in user_predictions:
        s = calculate_sprint_points(user, user_predictions["Sprint"]["top5"], weekend_data["Sprint"])
        if "extra" in user_predictions["Sprint"]:
            extra = calculate_extra_point(user, user_predictions["Sprint"]["extra"],
                                          weekend_data["Sprint"], rc.get("Sprint"), "SPRINT")
            s["total"] += extra["total"]
            s.update({k: v for k, v in extra.items() if k != "total"})
        results["Sprint"] = s
        total_points += s["total"]

    if weekend_data["SS"] is not None and "SS" in user_predictions:
        ss = calculate_sprint_shootout_points(user, user_predictions["SS"]["top3"], weekend_data["SS"])
        if "extra" in user_predictions["SS"]:
            extra = calculate_extra_point(user, user_predictions["SS"]["extra"],
                                          weekend_data["SS"], rc.get("SS"), "SS")
            ss["total"] += extra["total"]
            ss.update({k: v for k, v in extra.items() if k != "total"})
        results["SS"] = ss
        total_points += ss["total"]

    results["total"] = total_points
    logger.info(f"🏁 {user} — TOTAL CAP DE SETMANA: {total_points} pts")
    logger.info("")
    return results
