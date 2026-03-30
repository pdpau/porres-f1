# ─── Configuration ───────────────────────────────────────────────────────────

YEAR = 2026

USER_NAMES = ["Albert", "David", "Pau"]

GP_CALENDAR_2026 = {
     1: "Australia",
     2: "China",
     3: "Japan",
     4: "Bahrain",
     5: "Saudi Arabia",
     6: "Miami",
     7: "Canada",
     8: "Monaco",
     9: "Spain (Barcelona)",
    10: "Austria",
    11: "Great Britain",
    12: "Belgium",
    13: "Hungary",
    14: "Netherlands",
    15: "Italy",
    16: "Spain (Madrid)",
    17: "Azerbaijan",
    18: "Singapore",
    19: "United States",
    20: "Mexico",
    21: "Brazil",
    22: "Las Vegas",
    23: "Qatar",
    24: "Abu Dhabi",
}

GP_OPTIONS = [f"R{num:02d} · {name}" for num, name in GP_CALENDAR_2026.items()]
