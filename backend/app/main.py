from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.config import get_settings
from app.models import (
    CreateSessionResponse, AnalyzeRequest, AnswerRequest, 
    GenerateRequest, SessionStatus, GapAnalysis
)
from app.session_store import create_session, get_session, update_session, delete_session
from app.services.pdf_parser import extract_text_from_pdf
from app.services.ai_service import (
    parse_cv_with_ai, analyze_gaps, generate_questions_from_gaps, 
    transcribe_audio, generate_optimized_cv_with_comparison
)
from app.services.cv_generator import create_cv_docx, create_cv_pdf
from app.services.storage import upload_file, get_file

app = FastAPI(title="CV Optimizer API", version="1.0.0")

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.allowed_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/v1/session/create", response_model=CreateSessionResponse)
async def create_new_session():
    """Create a new session."""
    session = create_session()
    return CreateSessionResponse(session_id=session.id)


@app.post("/api/v1/cv/upload")
async def upload_cv(session_id: str = Form(...), file: UploadFile = File(...)):
    """Upload and parse CV."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    pdf_bytes = await file.read()
    
    # Extract text from PDF
    try:
        cv_text = extract_text_from_pdf(pdf_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Store original file
    file_url = await upload_file(pdf_bytes, file.filename, "application/pdf")
    
    # Parse CV with AI
    parsed_cv = await parse_cv_with_ai(cv_text)
    
    # Update session
    session.original_cv_url = file_url
    session.parsed_cv = parsed_cv
    session.status = SessionStatus.CV_UPLOADED
    update_session(session)
    
    return {
        "success": True,
        "parsed_cv": parsed_cv.model_dump(),
        "message": "CV uploaded and parsed successfully"
    }


@app.post("/api/v1/analyze")
async def analyze_cv(request: AnalyzeRequest):
    """Analyze gaps between CV and job description."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.parsed_cv:
        raise HTTPException(status_code=400, detail="Please upload a CV first")
    
    # Analyze gaps
    gap_analysis = await analyze_gaps(session.parsed_cv, request.job_description)
    
    # Generate questions
    questions = generate_questions_from_gaps(gap_analysis)
    
    # Update session
    session.job_description = request.job_description
    session.gap_analysis = gap_analysis
    session.questions = questions
    session.status = SessionStatus.ANALYZED
    update_session(session)
    
    return {
        "success": True,
        "gap_analysis": gap_analysis.model_dump(),
        "total_questions": len(questions),
        "message": "Analysis complete"
    }


@app.get("/api/v1/interview/questions")
async def get_questions(session_id: str):
    """Get interview questions."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.questions:
        raise HTTPException(status_code=400, detail="Please analyze CV first")
    
    return {
        "questions": [q.model_dump() for q in session.questions],
        "current_index": session.current_question_index,
        "total": len(session.questions)
    }


@app.post("/api/v1/interview/answer")
async def submit_answer(request: AnswerRequest):
    """Submit answer to a question."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Find and update question
    for q in session.questions:
        if q.id == request.question_id:
            q.answer = request.answer_text
            q.answered = True
            break
    
    # Update current index
    answered_count = sum(1 for q in session.questions if q.answered)
    session.current_question_index = answered_count
    session.status = SessionStatus.INTERVIEWING
    update_session(session)
    
    return {
        "success": True,
        "answered": answered_count,
        "total": len(session.questions),
        "complete": answered_count >= len(session.questions)
    }


@app.post("/api/v1/interview/voice")
async def submit_voice_answer(
    session_id: str = Form(...),
    question_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """Submit voice answer - transcribe and save."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    audio_bytes = await audio.read()
    
    # Transcribe audio
    transcription = await transcribe_audio(audio_bytes, audio.filename)
    
    # Find and update question
    for q in session.questions:
        if q.id == question_id:
            q.answer = transcription
            q.answered = True
            break
    
    answered_count = sum(1 for q in session.questions if q.answered)
    session.current_question_index = answered_count
    session.status = SessionStatus.INTERVIEWING
    update_session(session)
    
    return {
        "success": True,
        "transcription": transcription,
        "answered": answered_count,
        "total": len(session.questions)
    }


@app.post("/api/v1/transcribe")
async def transcribe_only(audio: UploadFile = File(...)):
    """Transcribe audio without saving - returns text only."""
    audio_bytes = await audio.read()
    transcription = await transcribe_audio(audio_bytes, audio.filename)
    return {"transcription": transcription}


@app.post("/api/v1/cv/generate")
async def generate_cv(request: GenerateRequest):
    """Generate optimized CV with comparison."""
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.parsed_cv or not session.job_description or not session.gap_analysis:
        raise HTTPException(status_code=400, detail="Missing CV, job description, or analysis")
    
    session.status = SessionStatus.GENERATING
    update_session(session)
    
    # Generate optimized CV with comparison
    optimized_cv, comparison = await generate_optimized_cv_with_comparison(
        session.parsed_cv,
        session.job_description,
        session.gap_analysis,
        session.questions
    )
    
    # Create files
    docx_bytes = create_cv_docx(optimized_cv)
    pdf_bytes = create_cv_pdf(optimized_cv)
    
    # Upload files
    docx_url = await upload_file(docx_bytes, "optimized_cv.docx", 
                                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    pdf_url = await upload_file(pdf_bytes, "optimized_cv.pdf", "application/pdf")
    
    session.generated_cv_url = pdf_url
    session.generated_docx_url = docx_url
    session.optimized_cv = optimized_cv
    session.cv_comparison = comparison
    session.status = SessionStatus.COMPLETED
    update_session(session)
    
    return {
        "success": True,
        "pdf_url": pdf_url,
        "docx_url": docx_url,
        "optimized_cv": optimized_cv.model_dump(),
        "comparison": comparison.model_dump()
    }


@app.get("/api/v1/cv/download/{file_type}")
async def download_cv(session_id: str, file_type: str):
    """Download generated CV."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if file_type == "pdf":
        if not session.generated_cv_url:
            raise HTTPException(status_code=404, detail="PDF not generated yet")
        file_bytes = await get_file(session.generated_cv_url)
        return Response(
            content=file_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=optimized_cv.pdf"}
        )
    elif file_type == "docx":
        if not session.generated_docx_url:
            raise HTTPException(status_code=404, detail="DOCX not generated yet")
        file_bytes = await get_file(session.generated_docx_url)
        return Response(
            content=file_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=optimized_cv.docx"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")


@app.delete("/api/v1/session/{session_id}")
async def delete_user_session(session_id: str):
    """Delete session and all user data (GDPR)."""
    success = delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True, "message": "All data deleted"}


@app.get("/api/v1/session/{session_id}")
async def get_session_status(session_id: str):
    """Get current session status."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": session.id,
        "status": session.status,
        "has_cv": session.parsed_cv is not None,
        "has_analysis": session.gap_analysis is not None,
        "questions_answered": sum(1 for q in session.questions if q.answered),
        "total_questions": len(session.questions),
        "has_generated_cv": session.generated_cv_url is not None
    }


@app.get("/api/v1/session/{session_id}/data")
async def get_session_data(session_id: str):
    """
    Get session data needed to restore UI state after refresh.
    Note: protected only by session_id (UUID). If you add auth later, lock this down.
    """
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": session.id,
        "status": session.status,
        "job_description": session.job_description,
        "gap_analysis": session.gap_analysis.model_dump() if session.gap_analysis else None,
        "questions": [q.model_dump() for q in (session.questions or [])],
        "current_question_index": session.current_question_index,
        "has_generated_cv": session.generated_cv_url is not None,
        "generated_cv_url": session.generated_cv_url,
        "generated_docx_url": session.generated_docx_url,
        "comparison": session.cv_comparison.model_dump() if session.cv_comparison else None,
    }
