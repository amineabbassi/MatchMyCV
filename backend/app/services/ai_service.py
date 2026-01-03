import json
import uuid
from openai import AsyncOpenAI
from app.config import get_settings
from app.models import ParsedCV, GapAnalysis, Gap, InterviewQuestion, CVComparison
import re

settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)

_PLACEHOLDER_VALUES = {
    "string",
    "none",
    "n/a",
    "na",
    "null",
    "undefined",
    "tbd",
}


def _clean_str_list(values: list[str] | None) -> list[str]:
    """Clean lists coming from the model: remove placeholders, empties, de-dupe (stable)."""
    if not values:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for v in values:
        if not v:
            continue
        s = str(v).strip()
        if not s:
            continue
        # Collapse whitespace
        s = re.sub(r"\s{2,}", " ", s)
        if s.lower() in _PLACEHOLDER_VALUES:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out


async def parse_cv_with_ai(cv_text: str) -> ParsedCV:
    """Parse CV text into structured format using GPT with regex fallback for contact info."""
    import re
    
    system_prompt = """You are a CV parser. Extract and structure the CV text into JSON format.

IMPORTANT: Extract ALL contact information carefully:
- Phone numbers (any format: +1-234-567-8900, (234) 567-8900, etc.)
- Email addresses
- LinkedIn URLs (linkedin.com/in/username)
- Location/City

Return ONLY valid JSON with this exact structure:
{
    "personal_info": {
        "name": "string or null",
        "email": "string or null", 
        "phone": "string or null",
        "location": "string or null",
        "linkedin": "string or null"
    },
    "summary": "string or null",
    "experience": [
        {
            "company": "string",
            "title": "string",
            "start_date": "string or null",
            "end_date": "string or null",
            "responsibilities": ["string"],
            "achievements": ["string"]
        }
    ],
    "education": [
        {
            "institution": "string",
            "degree": "string",
            "field": "string or null",
            "graduation_date": "string or null"
        }
    ],
    "skills": ["string"],
    "certifications": ["string"],
    "languages": ["string"]
}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Parse this CV:\n\n{cv_text}"}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    
    # REGEX FALLBACK: Ensure contact info wasn't missed
    personal_info = result.get("personal_info", {})
    
    # Phone regex fallback
    if not personal_info.get("phone"):
        phone_pattern = r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}'
        phone_match = re.search(phone_pattern, cv_text)
        if phone_match:
            personal_info["phone"] = phone_match.group().strip()
    
    # Email regex fallback
    if not personal_info.get("email"):
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_match = re.search(email_pattern, cv_text)
        if email_match:
            personal_info["email"] = email_match.group().strip()
    
    # LinkedIn regex fallback
    if not personal_info.get("linkedin"):
        linkedin_pattern = r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+'
        linkedin_match = re.search(linkedin_pattern, cv_text, re.IGNORECASE)
        if linkedin_match:
            personal_info["linkedin"] = linkedin_match.group().strip()
    
    result["personal_info"] = personal_info
    result["raw_text"] = cv_text
    return ParsedCV(**result)


async def analyze_gaps(parsed_cv: ParsedCV, job_description: str) -> GapAnalysis:
    """Analyze gaps between CV and job description with trackable gap IDs."""
    
    system_prompt = """You are a career advisor analyzing CV-to-job fit.

Analyze the CV against the job description and identify SPECIFIC, ACTIONABLE gaps.

SCORING GUIDELINES:
- Base score on how well the CV demonstrates required skills
- Give credit for transferable skills and related experience
- Be fair: quality experience matters more than years
- Score range: 50-95% (nobody is perfect, but good candidates score 70-85%)

GAP IDENTIFICATION RULES:
- Each gap must be specific and addressable
- Only list gaps that could realistically be filled with more information
- Don't list gaps for things the candidate clearly doesn't have (e.g., 10 years experience for a junior)
- Focus on gaps where the candidate MIGHT have experience but didn't mention it

Return ONLY valid JSON:
{
    "skills_gaps": [
        {"id": "skill_1", "gap_type": "skill", "description": "specific skill missing", "importance": "high|medium|low", "question_to_ask": "question to extract this info"}
    ],
    "experience_gaps": [...],
    "keywords_gaps": [...],
    "metrics_gaps": [...],
    "match_score": 50-95
}

Each gap MUST have a unique id (skill_1, exp_1, keyword_1, metric_1, etc.)"""

    cv_summary = f"""
Name: {parsed_cv.personal_info.name}
Summary: {parsed_cv.summary}
Skills: {', '.join(parsed_cv.skills)}
Certifications: {', '.join(parsed_cv.certifications) if parsed_cv.certifications else 'None listed'}
Experience ({len(parsed_cv.experience)} positions):
{json.dumps([{
    "company": e.company, 
    "title": e.title, 
    "duration": f"{e.start_date or 'N/A'} - {e.end_date or 'Present'}",
    "responsibilities": e.responsibilities[:4],
    "achievements": e.achievements[:4]
} for e in parsed_cv.experience], indent=2)}
Education: {json.dumps([{"institution": e.institution, "degree": e.degree, "field": e.field} for e in parsed_cv.education])}
"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"CV:\n{cv_summary}\n\nJob Description:\n{job_description}"}
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    
    # Ensure all gaps have IDs
    for i, gap in enumerate(result.get("skills_gaps", [])):
        if not gap.get("id"):
            gap["id"] = f"skill_{i+1}"
    for i, gap in enumerate(result.get("experience_gaps", [])):
        if not gap.get("id"):
            gap["id"] = f"exp_{i+1}"
    for i, gap in enumerate(result.get("keywords_gaps", [])):
        if not gap.get("id"):
            gap["id"] = f"keyword_{i+1}"
    for i, gap in enumerate(result.get("metrics_gaps", [])):
        if not gap.get("id"):
            gap["id"] = f"metric_{i+1}"
    
    return GapAnalysis(**result)


def generate_questions_from_gaps(gap_analysis: GapAnalysis) -> list[InterviewQuestion]:
    """
    Generate interview questions from gap analysis with intelligent grouping.
    Groups related gaps to reduce interview fatigue while covering all important areas.
    """
    questions = []
    
    # Collect all gaps with their importance
    all_gaps = []
    for gap in gap_analysis.skills_gaps:
        all_gaps.append((gap, "high" if gap.importance == "high" else "medium", "skill"))
    for gap in gap_analysis.experience_gaps:
        all_gaps.append((gap, "high" if gap.importance == "high" else "medium", "experience"))
    for gap in gap_analysis.metrics_gaps:
        all_gaps.append((gap, "medium", "metrics"))
    for gap in gap_analysis.keywords_gaps:
        all_gaps.append((gap, "low", "keyword"))
    
    # Sort by importance
    all_gaps.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x[1], 2))
    
    # Group similar gaps to create compound questions
    # This reduces the number of questions while covering more ground
    grouped_gaps = {
        "technical_skills": [],
        "soft_skills": [],
        "experience": [],
        "metrics": [],
        "other": []
    }
    
    technical_keywords = ["python", "java", "aws", "docker", "kubernetes", "react", "node", 
                         "sql", "api", "cloud", "devops", "ci/cd", "testing", "database",
                         "frontend", "backend", "fullstack", "microservices", "agile"]
    soft_keywords = ["leadership", "team", "communication", "management", "collaboration",
                    "stakeholder", "mentor", "cross-functional"]
    
    for gap, importance, gap_category in all_gaps:
        desc_lower = gap.description.lower()
        
        if gap_category == "experience":
            grouped_gaps["experience"].append(gap)
        elif gap_category == "metrics":
            grouped_gaps["metrics"].append(gap)
        elif any(kw in desc_lower for kw in technical_keywords):
            grouped_gaps["technical_skills"].append(gap)
        elif any(kw in desc_lower for kw in soft_keywords):
            grouped_gaps["soft_skills"].append(gap)
        else:
            grouped_gaps["other"].append(gap)
    
    # Generate questions - prioritize high-value grouped questions
    question_count = 0
    max_questions = 8  # Reduced from 10 for better UX
    
    # 1. Technical skills - group up to 3 related skills into one question
    if grouped_gaps["technical_skills"] and question_count < max_questions:
        tech_gaps = grouped_gaps["technical_skills"][:3]
        if len(tech_gaps) > 1:
            skills_list = ", ".join([g.description for g in tech_gaps[:-1]]) + f" and {tech_gaps[-1].description}"
            questions.append(InterviewQuestion(
                id=tech_gaps[0].id,
                question=f"Tell me about your experience with {skills_list}. Which have you used most recently and in what context?",
                gap_type="skill"
            ))
        else:
            questions.append(InterviewQuestion(
                id=tech_gaps[0].id,
                question=tech_gaps[0].question_to_ask,
                gap_type="skill"
            ))
        question_count += 1
        # Add remaining tech skills individually if important
        for gap in grouped_gaps["technical_skills"][3:6]:
            if question_count < max_questions:
                questions.append(InterviewQuestion(
                    id=gap.id,
                    question=gap.question_to_ask,
                    gap_type=gap.gap_type
                ))
                question_count += 1
    
    # 2. Experience gaps - these are usually important, ask individually
    for gap in grouped_gaps["experience"][:3]:
        if question_count < max_questions:
            questions.append(InterviewQuestion(
                id=gap.id,
                question=gap.question_to_ask,
                gap_type=gap.gap_type
            ))
            question_count += 1
    
    # 3. Metrics - group into one question about quantifiable achievements
    if grouped_gaps["metrics"] and question_count < max_questions:
        questions.append(InterviewQuestion(
            id=grouped_gaps["metrics"][0].id,
            question="Can you share specific metrics or numbers from your work? For example: team sizes you've led, percentage improvements, cost savings, or user growth you've achieved.",
            gap_type="metrics"
        ))
        question_count += 1
    
    # 4. Soft skills - group into one question
    if grouped_gaps["soft_skills"] and question_count < max_questions:
        soft_gaps = grouped_gaps["soft_skills"][:2]
        if len(soft_gaps) > 1:
            questions.append(InterviewQuestion(
                id=soft_gaps[0].id,
                question=f"Describe a situation where you demonstrated {soft_gaps[0].description} and {soft_gaps[1].description}.",
                gap_type="experience"
            ))
        else:
            questions.append(InterviewQuestion(
                id=soft_gaps[0].id,
                question=soft_gaps[0].question_to_ask,
                gap_type=soft_gaps[0].gap_type
            ))
        question_count += 1
    
    # 5. Fill remaining slots with other gaps
    for gap in grouped_gaps["other"]:
        if question_count < max_questions:
            questions.append(InterviewQuestion(
                id=gap.id,
                question=gap.question_to_ask,
                gap_type=gap.gap_type
            ))
            question_count += 1
    
    return questions


async def generate_optimized_cv_with_comparison(
    original_cv: ParsedCV,
    job_description: str,
    gap_analysis: GapAnalysis,
    answers: list[InterviewQuestion]
) -> tuple[ParsedCV, CVComparison]:
    """Generate optimized CV and compare improvements."""
    
    # Build gap-to-answer mapping
    answered_gaps = {}
    for q in answers:
        if q.answered and q.answer and q.answer.strip():
            answered_gaps[q.id] = {
                "question": q.question,
                "answer": q.answer,
                "gap_type": q.gap_type
            }
    
    # Get all gap descriptions for tracking
    all_gaps = {}
    for gap in gap_analysis.skills_gaps + gap_analysis.experience_gaps + gap_analysis.keywords_gaps + gap_analysis.metrics_gaps:
        all_gaps[gap.id] = gap.description
    
    answered_info = "\n".join([
        f"Gap ID: {gap_id}\nQuestion: {info['question']}\nAnswer: {info['answer']}\n"
        for gap_id, info in answered_gaps.items()
    ])
    
    system_prompt = """You are a senior resume writer and ATS optimization expert.

YOUR TASK: Optimize the CV for the target job while PRESERVING all original information.

CRITICAL RULES - DO NOT VIOLATE:
1. NEVER remove or change contact information (email, phone, LinkedIn, location)
2. NEVER remove any job experience - keep ALL jobs from the original
3. NEVER change dates - use EXACT dates from the original CV
4. NEVER change company names or locations
5. NEVER fabricate information not in the original CV or candidate answers

WHAT YOU CAN DO:
1. REWRITE bullet points to be more impactful (use CAR format: Challenge → Action → Result)
2. ADD information from candidate's interview answers to relevant job sections
3. ADD keywords from job description where they naturally fit
4. QUANTIFY achievements where the candidate provided numbers
5. IMPROVE the professional summary to match the target job
6. REORDER skills to prioritize job-relevant ones first
7. ADD new skills mentioned in candidate answers

BULLET POINT GUIDELINES:
- Start with strong ACTION VERBS (Led, Developed, Implemented, Architected, Optimized)
- Include METRICS when available (%, $, time saved, users, team size)
- Show IMPACT, not just tasks
- Keep each bullet to 1-2 lines
- NO buzzwords like "passionate", "driven", "results-oriented"
- NO generic phrases like "responsible for", "worked on"

SKILLS SECTION:
- Keep ALL original skills
- ADD new skills from candidate answers
- Group by category: Languages | Frameworks | Databases | DevOps | Tools

Return JSON with this EXACT structure:
{
    "cv": {
        "personal_info": {
            "name": "EXACT name from original",
            "email": "EXACT email from original",
            "phone": "EXACT phone from original",
            "location": "EXACT location from original",
            "linkedin": "EXACT linkedin from original"
        },
        "summary": "2-3 sentence professional summary tailored to job",
        "experience": [
            {
                "company": "EXACT company name from original",
                "title": "EXACT title from original",
                "start_date": "EXACT start date from original",
                "end_date": "EXACT end date from original",
                "responsibilities": [],
                "achievements": ["Improved bullet 1", "Improved bullet 2", ...]
            }
        ],
        "education": [EXACT education from original],
        "skills": ["Skill 1", "Skill 2", ...],
        "certifications": [EXACT from original],
        "languages": [EXACT from original]
    },
    "addressed_gap_ids": ["skill_1", "exp_2", ...],
    "improvements_made": ["Rewrote X bullet to show impact", "Added Y skill from interview", ...]
}"""

    response = await client.chat.completions.create(
        model="gpt-4o",  # Using gpt-4o for better instruction following on this critical step
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"""
ORIGINAL CV (PRESERVE ALL DATA):
{original_cv.model_dump_json()}

TARGET JOB DESCRIPTION:
{job_description}

CANDIDATE'S INTERVIEW ANSWERS (use to enhance CV):
{answered_info}

GAPS TO ADDRESS:
{json.dumps(all_gaps)}

IMPORTANT: 
- Keep ALL {len(original_cv.experience)} jobs from the original
- Keep ALL contact info exactly as provided
- Keep ALL dates exactly as provided
- Only IMPROVE bullet points and add information from answers"""}
        ],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    
    # Parse optimized CV
    cv_data = result.get("cv", result)
    cv_data["raw_text"] = original_cv.raw_text

    # Clean model list fields (generic guard against placeholders like "string")
    cv_data["skills"] = _clean_str_list(cv_data.get("skills"))
    cv_data["certifications"] = _clean_str_list(cv_data.get("certifications"))
    cv_data["languages"] = _clean_str_list(cv_data.get("languages"))

    # If original has no certifications, don't let the model invent placeholders.
    if not (original_cv.certifications and any((c or "").strip() for c in original_cv.certifications)):
        cv_data["certifications"] = []
    
    # SAFETY CHECK: Ensure we didn't lose contact info
    if not cv_data.get("personal_info", {}).get("phone") and original_cv.personal_info.phone:
        cv_data["personal_info"]["phone"] = original_cv.personal_info.phone
    if not cv_data.get("personal_info", {}).get("linkedin") and original_cv.personal_info.linkedin:
        cv_data["personal_info"]["linkedin"] = original_cv.personal_info.linkedin
    if not cv_data.get("personal_info", {}).get("email") and original_cv.personal_info.email:
        cv_data["personal_info"]["email"] = original_cv.personal_info.email
    if not cv_data.get("personal_info", {}).get("location") and original_cv.personal_info.location:
        cv_data["personal_info"]["location"] = original_cv.personal_info.location
    
    # SAFETY CHECK: Ensure we didn't lose any jobs
    original_companies = {exp.company.lower().strip() for exp in original_cv.experience}
    optimized_companies = {exp.get("company", "").lower().strip() for exp in cv_data.get("experience", [])}
    
    # If we lost jobs, add them back
    if len(cv_data.get("experience", [])) < len(original_cv.experience):
        for orig_exp in original_cv.experience:
            if orig_exp.company.lower().strip() not in optimized_companies:
                cv_data["experience"].append({
                    "company": orig_exp.company,
                    "title": orig_exp.title,
                    "start_date": orig_exp.start_date,
                    "end_date": orig_exp.end_date,
                    "responsibilities": orig_exp.responsibilities,
                    "achievements": orig_exp.achievements
                })
    
    # SAFETY CHECK: Force original dates on all jobs (AI sometimes changes them)
    for i, orig_exp in enumerate(original_cv.experience):
        # Find matching job in optimized CV by company name
        for opt_exp in cv_data.get("experience", []):
            if orig_exp.company.lower().strip() in opt_exp.get("company", "").lower().strip() or \
               opt_exp.get("company", "").lower().strip() in orig_exp.company.lower().strip():
                opt_exp["start_date"] = orig_exp.start_date
                opt_exp["end_date"] = orig_exp.end_date
                opt_exp["company"] = orig_exp.company  # Keep exact company name
                opt_exp["title"] = orig_exp.title  # Keep exact title
                break
    
    optimized_cv = ParsedCV(**cv_data)
    
    # Build comparison
    addressed_ids = result.get("addressed_gap_ids", [])
    improvements = result.get("improvements_made", [])
    
    gaps_addressed = [all_gaps[gid] for gid in addressed_ids if gid in all_gaps]
    gaps_remaining = [desc for gid, desc in all_gaps.items() if gid not in addressed_ids]
    
    # Calculate new score based on gaps addressed
    total_gaps = len(all_gaps)
    addressed_count = len(gaps_addressed)
    
    original_score = gap_analysis.match_score
    
    if total_gaps > 0:
        improvement = int((addressed_count / total_gaps) * (100 - original_score) * 0.7)
        optimized_score = min(95, original_score + improvement)
    else:
        optimized_score = original_score
    
    comparison = CVComparison(
        original_score=original_score,
        optimized_score=optimized_score,
        gaps_addressed=gaps_addressed,
        gaps_remaining=gaps_remaining,
        improvements=improvements
    )
    
    return optimized_cv, comparison


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Transcribe audio using Whisper."""
    
    response = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(filename, audio_bytes),
        response_format="text"
    )
    
    return response
