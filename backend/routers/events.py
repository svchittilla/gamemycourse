from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import Session as SessionModel
from services.schema import IngestEvent
from services.model_utils import predict_engagement
from sqlalchemy import func

router = APIRouter(prefix="/events", tags=["Events"])

@router.post("/ingest")
def ingest_final_session(payload: IngestEvent, db: Session = Depends(get_db)):
    """
    Ingest final session data when user presses End.
    Stores session + immediately runs engagement prediction.
    """
    # Check for duplicate ingestion
    existing = db.query(SessionModel).filter(SessionModel.session_id == payload.session_id).first()
    if existing:
        return {
            "session_id": payload.session_id,
            "predicted_engagement": existing.last_pred_engagement,
            "status": "already_ingested"
        }

    # Create a new session row
    sess = SessionModel(
        session_id=payload.session_id,
        user_id=payload.user_id,
        mission_id=payload.mission_id,
        url=payload.url,
        content_type=payload.content_type,
        is_video=(payload.content_type == "video"),
        ended=True
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)

    # ✅ Run prediction immediately
    pred = predict_engagement(payload.model_dump())
    sess.last_pred_engagement = pred
    sess.last_seen_at = func.now()

    db.commit()

    return {
        "session_id": payload.session_id,
        "predicted_engagement": pred,
        "status": "ended"
    }
