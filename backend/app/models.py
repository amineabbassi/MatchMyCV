from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class SessionStatus(str, Enum):
    STARTED = "started"
    CV_UPLOADED = "cv_uploaded"
    ANALYZED = "analyzed"
    INTERVIEWING = "interviewing"
    GENERATING = "generating"
    COMPLETED = "completed"


class PersonalInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None


class Experience(BaseModel):
    company: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: list[str] = []
    achievements: list[str] = []


class Education(BaseModel):
    institution: str
    degree: str
    field: Optional[str] = None
    graduation_date: Optional[str] = None


class ParsedCV(BaseModel):
    personal_info: PersonalInfo = PersonalInfo()
    summary: Optional[str] = None
    experience: list[Experience] = []
    education: list[Education] = []
    skills: list[str] = []
    certifications: list[str] = []
    languages: list[str] = []
    raw_text: str = ""


class Gap(BaseModel):
    id: str = ""
    gap_type: str
    description: str
    importance: str
    question_to_ask: str
    addressed: bool = False


class GapAnalysis(BaseModel):
    skills_gaps: list[Gap] = []
    experience_gaps: list[Gap] = []
    keywords_gaps: list[Gap] = []
    metrics_gaps: list[Gap] = []
    match_score: int = 0


class CVComparison(BaseModel):
    original_score: int = 0
    optimized_score: int = 0
    gaps_addressed: list[str] = []
    gaps_remaining: list[str] = []
    improvements: list[str] = []


class InterviewQuestion(BaseModel):
    id: str
    question: str
    gap_type: str
    answered: bool = False
    answer: Optional[str] = None


class Session(BaseModel):
    id: str
    status: SessionStatus = SessionStatus.STARTED
    original_cv_url: Optional[str] = None
    parsed_cv: Optional[ParsedCV] = None
    job_description: Optional[str] = None
    gap_analysis: Optional[GapAnalysis] = None
    questions: list[InterviewQuestion] = []
    current_question_index: int = 0
    generated_cv_url: Optional[str] = None
    generated_docx_url: Optional[str] = None
    optimized_cv: Optional[ParsedCV] = None
    cv_comparison: Optional[CVComparison] = None
    created_at: datetime = datetime.now()


# Request/Response Models
class CreateSessionResponse(BaseModel):
    session_id: str


class AnalyzeRequest(BaseModel):
    session_id: str
    job_description: str


class AnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str


class GenerateRequest(BaseModel):
    session_id: str
