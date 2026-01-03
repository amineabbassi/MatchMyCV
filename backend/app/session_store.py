from app.models import Session, SessionStatus, ParsedCV, GapAnalysis, InterviewQuestion, CVComparison
from app.database import get_supabase
from datetime import datetime
import uuid
import json

# In-memory fallback when Supabase is not configured
_sessions: dict[str, Session] = {}


def _session_to_dict(session: Session) -> dict:
    """Convert session to dict for database storage."""
    return {
        "id": session.id,
        "status": session.status.value,
        "original_cv_url": session.original_cv_url,
        "parsed_cv": session.parsed_cv.model_dump() if session.parsed_cv else None,
        "job_description": session.job_description,
        "gap_analysis": session.gap_analysis.model_dump() if session.gap_analysis else None,
        "questions": [q.model_dump() for q in session.questions],
        "current_question_index": session.current_question_index,
        "generated_cv_url": session.generated_cv_url,
        "generated_docx_url": session.generated_docx_url,
        "optimized_cv": session.optimized_cv.model_dump() if session.optimized_cv else None,
        "cv_comparison": session.cv_comparison.model_dump() if session.cv_comparison else None,
        "created_at": session.created_at.isoformat(),
    }


def _dict_to_session(data: dict) -> Session:
    """Convert database dict to Session object."""
    return Session(
        id=data["id"],
        status=SessionStatus(data["status"]),
        original_cv_url=data.get("original_cv_url"),
        parsed_cv=ParsedCV(**data["parsed_cv"]) if data.get("parsed_cv") else None,
        job_description=data.get("job_description"),
        gap_analysis=GapAnalysis(**data["gap_analysis"]) if data.get("gap_analysis") else None,
        questions=[InterviewQuestion(**q) for q in (data.get("questions") or [])],
        current_question_index=data.get("current_question_index", 0),
        generated_cv_url=data.get("generated_cv_url"),
        generated_docx_url=data.get("generated_docx_url"),
        optimized_cv=ParsedCV(**data["optimized_cv"]) if data.get("optimized_cv") else None,
        cv_comparison=CVComparison(**data["cv_comparison"]) if data.get("cv_comparison") else None,
        created_at=datetime.fromisoformat(data["created_at"]) if isinstance(data.get("created_at"), str) else data.get("created_at", datetime.now()),
    )


def create_session() -> Session:
    """Create a new session."""
    session_id = str(uuid.uuid4())
    session = Session(
        id=session_id,
        created_at=datetime.now()
    )
    
    supabase = get_supabase()
    if supabase:
        supabase.table("sessions").insert(_session_to_dict(session)).execute()
    else:
        _sessions[session_id] = session
    
    return session


def get_session(session_id: str) -> Session | None:
    """Get session by ID."""
    supabase = get_supabase()
    
    if supabase:
        result = supabase.table("sessions").select("*").eq("id", session_id).execute()
        if result.data:
            return _dict_to_session(result.data[0])
        return None
    else:
        return _sessions.get(session_id)


def update_session(session: Session) -> Session:
    """Update session."""
    supabase = get_supabase()
    
    if supabase:
        supabase.table("sessions").update(_session_to_dict(session)).eq("id", session.id).execute()
    else:
        _sessions[session.id] = session
    
    return session


def delete_session(session_id: str) -> bool:
    """Delete session and all associated data."""
    supabase = get_supabase()
    
    if supabase:
        supabase.table("sessions").delete().eq("id", session_id).execute()
        # Also delete files from storage
        try:
            supabase.storage.from_("cv-files").remove([f"{session_id}/"])
        except:
            pass
        return True
    else:
        if session_id in _sessions:
            del _sessions[session_id]
            return True
        return False
