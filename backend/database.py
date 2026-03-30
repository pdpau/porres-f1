from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./porres_f1.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    gp_number = Column(Integer, nullable=False)
    user = Column(String, nullable=False)
    session = Column(String, nullable=False)  # Race, Qualifying, Sprint, SS
    picks = Column(JSON, nullable=False)       # ["VER", "NOR", "LEC", ...]
    extra = Column(JSON, nullable=True)        # {"type": "dnf", "driver": "PER"}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("year", "gp_number", "user", "session", name="uq_prediction"),
    )


class GPResult(Base):
    __tablename__ = "gp_results"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    gp_number = Column(Integer, nullable=False)
    event_name = Column(String, nullable=False)
    event_format = Column(String, nullable=False)
    results_json = Column(JSON, nullable=False)   # {Race: [...], Qualifying: [...], ...}
    race_control_json = Column(JSON, nullable=True)
    loaded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("year", "gp_number", name="uq_gp_result"),
    )


class SeasonScore(Base):
    __tablename__ = "season_scores"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    gp_number = Column(Integer, nullable=False)
    user = Column(String, nullable=False)
    points_breakdown = Column(JSON, nullable=False)  # {Race: 5, Qualifying: 3, total: 8}
    total_points = Column(Float, nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("year", "gp_number", "user", name="uq_season_score"),
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
