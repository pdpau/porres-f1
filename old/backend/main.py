from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import json

from config import YEAR, USER_NAMES, GP_CALENDAR_2026
from data import load_weekend_data
from scoring import calculate_weekend_points
from database import get_db, init_db, Prediction, GPResult, SeasonScore

app = FastAPI(title="Porres F1 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In prod: set your Vercel/CF Pages URL
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ─── Config ──────────────────────────────────────────────────────────────────

@app.get("/config")
def get_config():
    return {
        "year": YEAR,
        "users": USER_NAMES,
        "calendar": [
            {"number": num, "name": name}
            for num, name in GP_CALENDAR_2026.items()
        ]
    }


# ─── GP Data ─────────────────────────────────────────────────────────────────

@app.get("/gp/{gp_number}/data")
def get_gp_data(gp_number: int, db: Session = Depends(get_db)):
    """Load GP data from cache or fetch from FastF1."""
    existing = db.query(GPResult).filter_by(year=YEAR, gp_number=gp_number).first()
    if existing:
        return {
            "event_name": existing.event_name,
            "event_format": existing.event_format,
            "results": existing.results_json,
            "race_control": existing.race_control_json,
        }

    # Fetch from FastF1
    try:
        data, event_name, event_format = load_weekend_data(YEAR, gp_number)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Serialize DataFrames to JSON
    results_json = {}
    race_control_json = {}
    for key in ["SS", "Sprint", "Qualifying", "Race"]:
        df = data.get(key)
        results_json[key] = df.to_dict(orient="records") if df is not None else None
    race_control_json = data.get("RaceControl", {})

    gp_result = GPResult(
        year=YEAR,
        gp_number=gp_number,
        event_name=event_name,
        event_format=event_format,
        results_json=results_json,
        race_control_json=race_control_json,
    )
    db.add(gp_result)
    db.commit()

    return {
        "event_name": event_name,
        "event_format": event_format,
        "results": results_json,
        "race_control": race_control_json,
    }


# ─── Predictions ─────────────────────────────────────────────────────────────

class PredictionPayload(BaseModel):
    picks: list[str]
    extra: Optional[dict] = None


@app.put("/gp/{gp_number}/predictions/{user}/{session}")
def upsert_prediction(
    gp_number: int,
    user: str,
    session: str,
    payload: PredictionPayload,
    db: Session = Depends(get_db),
):
    if user not in USER_NAMES:
        raise HTTPException(status_code=400, detail=f"Unknown user: {user}")

    existing = db.query(Prediction).filter_by(
        year=YEAR, gp_number=gp_number, user=user, session=session
    ).first()

    if existing:
        existing.picks = payload.picks
        existing.extra = payload.extra
    else:
        db.add(Prediction(
            year=YEAR,
            gp_number=gp_number,
            user=user,
            session=session,
            picks=payload.picks,
            extra=payload.extra,
        ))
    db.commit()
    return {"status": "ok"}


@app.get("/gp/{gp_number}/predictions")
def get_predictions(gp_number: int, db: Session = Depends(get_db)):
    rows = db.query(Prediction).filter_by(year=YEAR, gp_number=gp_number).all()
    result = {}
    for row in rows:
        result.setdefault(row.user, {})[row.session] = {
            "picks": row.picks,
            "extra": row.extra,
        }
    return result


# ─── Calculate ───────────────────────────────────────────────────────────────

@app.post("/gp/{gp_number}/calculate")
def calculate(gp_number: int, db: Session = Depends(get_db)):
    gp_row = db.query(GPResult).filter_by(year=YEAR, gp_number=gp_number).first()
    if not gp_row:
        raise HTTPException(status_code=404, detail="GP data not loaded yet")

    # Reconstruct weekend_data with DataFrames
    weekend_data = {}
    for key in ["SS", "Sprint", "Qualifying", "Race"]:
        raw = gp_row.results_json.get(key)
        weekend_data[key] = pd.DataFrame(raw) if raw else None
    weekend_data["RaceControl"] = gp_row.race_control_json or {}

    predictions_rows = db.query(Prediction).filter_by(year=YEAR, gp_number=gp_number).all()
    if not predictions_rows:
        raise HTTPException(status_code=400, detail="No predictions found for this GP")

    # Build predictions dict in the format scoring.py expects
    user_preds = {}
    for row in predictions_rows:
        user_preds.setdefault(row.user, {})[row.session] = {
            "picks": row.picks,
            "extra": row.extra or {"type": "none"},
        }

    # Adapt to scoring format (top3 / top5 keys)
    def adapt(session_name, session_data):
        picks = session_data.get("picks", [])
        if session_name in ("Race", "Sprint"):
            return {"top5": picks, "extra": session_data.get("extra", {"type": "none"})}
        else:
            return {"top3": picks[:3], "extra": session_data.get("extra", {"type": "none"})}

    all_results = {}
    for user in USER_NAMES:
        preds = {}
        for session, sdata in user_preds.get(user, {}).items():
            preds[session] = adapt(session, sdata)
        all_results[user] = calculate_weekend_points(user, preds, weekend_data)

    # Persist scores (upsert)
    for user, res in all_results.items():
        existing = db.query(SeasonScore).filter_by(
            year=YEAR, gp_number=gp_number, user=user
        ).first()
        breakdown = {k: v for k, v in res.items() if k != "total"}
        if existing:
            existing.points_breakdown = breakdown
            existing.total_points = res["total"]
        else:
            db.add(SeasonScore(
                year=YEAR,
                gp_number=gp_number,
                user=user,
                points_breakdown=breakdown,
                total_points=res["total"],
            ))
    db.commit()

    return all_results


# ─── Season standings ─────────────────────────────────────────────────────────

@app.get("/season/standings")
def season_standings(db: Session = Depends(get_db)):
    rows = db.query(SeasonScore).filter_by(year=YEAR).all()
    totals = {u: 0.0 for u in USER_NAMES}
    per_gp = {}
    for row in rows:
        totals[row.user] = totals.get(row.user, 0) + row.total_points
        per_gp.setdefault(row.gp_number, {})[row.user] = row.total_points
    return {
        "totals": totals,
        "per_gp": per_gp,
        "calendar": GP_CALENDAR_2026,
    }
