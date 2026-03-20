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

    if weekend_data["Qualifying"] is not None and "Qualifying" in user_predictions:
        q = calculate_quali_points(user, user_predictions["Qualifying"]["top3"], weekend_data["Qualifying"])
        results["Qualifying"] = q
        total_points += q["total"]

    if weekend_data["Race"] is not None and "Race" in user_predictions:
        r = calculate_race_points(user, user_predictions["Race"]["top5"], weekend_data["Race"])
        results["Race"] = r
        total_points += r["total"]

    if weekend_data["Sprint"] is not None and "Sprint" in user_predictions:
        s = calculate_sprint_points(user, user_predictions["Sprint"]["top5"], weekend_data["Sprint"])
        results["Sprint"] = s
        total_points += s["total"]

    if weekend_data["SS"] is not None and "SS" in user_predictions:
        ss = calculate_sprint_shootout_points(user, user_predictions["SS"]["top3"], weekend_data["SS"])
        results["SS"] = ss
        total_points += ss["total"]

    results["total"] = total_points
    logger.info(f"🏁 {user} — TOTAL CAP DE SETMANA: {total_points} pts")
    logger.info("")
    return results
