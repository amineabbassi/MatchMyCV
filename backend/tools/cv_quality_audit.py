"""
CV Quality Audit (heuristics)
============================

Goal:
- Generate an optimized CV (if OPENAI_API_KEY is set) from either:
  - a ParsedCV JSON OR
  - a PDF resume (incl. Canva PDFs) via the same extractor as the app
  plus a Job Description text
- Produce a quick heuristic report to judge whether output is "impressive" enough for a demo:
  - Jobs/dates preserved
  - Bullet quality (action verbs, metrics)
  - Buzzwords / weak phrases
  - Keyword coverage (lightweight)

Usage (from repo root):
  python backend/tools/cv_quality_audit.py --parsed-cv backend/tools/sample_parsed_cv.json --job backend/tools/sample_job.txt
  python backend/tools/cv_quality_audit.py --pdf "backend/tools/your_resume.pdf" --job backend/tools/job.txt

Outputs:
  backend/tools/qa_outputs/
    - optimized_cv.json
    - comparison.json
    - optimized_cv.pdf
    - optimized_cv.docx
    - report.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Allow "from app..." imports when running as a script
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.models import ParsedCV, InterviewQuestion  # noqa: E402
from app.services.cv_generator import create_cv_docx, create_cv_pdf  # noqa: E402
from app.services.pdf_parser import extract_text_from_pdf  # noqa: E402

def _load_dotenv_if_present() -> None:
    """
    Load .env files locally without ever printing secrets.
    Supports:
    - backend/.env (ROOT/.env)
    - project root .env (ROOT.parent/.env)
    """
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return

    # backend/.env
    load_dotenv(dotenv_path=str(ROOT / ".env"), override=False)
    # repo root .env
    load_dotenv(dotenv_path=str(ROOT.parent / ".env"), override=False)


ACTION_VERBS = {
    "led", "built", "developed", "implemented", "architected", "optimized", "designed", "delivered",
    "improved", "reduced", "increased", "launched", "automated", "migrated", "owned", "created",
    "scaled", "refactored", "shipped", "deployed", "integrated", "managed", "mentored", "coordinated",
}

BANNED_PHRASES = [
    "responsible for",
    "worked on",
    "results-oriented",
    "passionate",
    "driven",
]

METRIC_RE = re.compile(r"(\b\d+(\.\d+)?\b|\b\d{1,3}%\b|\$\s?\d+|\b\d+\s?(ms|s|sec|secs|minutes|hrs|hours)\b|\b\d+\s?(k|m|b)\b)", re.I)


def load_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def cv_to_text(cv: ParsedCV) -> str:
    """Flatten ParsedCV into a text blob for simple keyword checks."""
    parts: list[str] = []
    if cv.summary:
        parts.append(cv.summary)
    parts.extend(cv.skills or [])
    parts.extend(cv.certifications or [])
    parts.extend(cv.languages or [])
    for exp in cv.experience:
        parts.append(f"{exp.title} {exp.company}")
        parts.extend(exp.achievements or [])
        parts.extend(exp.responsibilities or [])
    for edu in cv.education:
        parts.append(f"{edu.degree} {edu.field or ''} {edu.institution}")
    return "\n".join([p for p in parts if p and str(p).strip()])


def extract_keywords(job_description: str, top_n: int = 25) -> list[str]:
    """
    Very lightweight keyword extraction:
    - keep words 3+ chars
    - remove common stopwords
    - rank by frequency
    """
    stop = {
        "the","and","for","with","you","your","our","are","will","this","that","from","have","has","had","not",
        "but","all","any","can","may","able","must","should","role","team","work","skills","experience","years",
        "using","use","we","they","their","within","across","including","provide","ensure","build","design",
        "about","into","over","under","etc","such","as","a","an","to","of","in","on","at","by","or","is","be",
    }
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9\.\+#/-]{2,}", job_description.lower())
    freq: dict[str, int] = {}
    for t in tokens:
        t = t.strip(".,;:()[]{}")
        if t in stop:
            continue
        if len(t) < 3:
            continue
        freq[t] = freq.get(t, 0) + 1
    return [k for k, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))[:top_n]]


def audit_bullets(cv: ParsedCV) -> dict[str, Any]:
    bullets: list[str] = []
    for exp in cv.experience:
        bullets.extend([b for b in (exp.achievements or []) if b and b.strip()])
        bullets.extend([b for b in (exp.responsibilities or []) if b and b.strip()])

    if not bullets:
        return {
            "total_bullets": 0,
            "action_verb_ratio": 0.0,
            "metric_ratio": 0.0,
            "banned_phrase_hits": [],
        }

    action_hits = 0
    metric_hits = 0
    banned_hits: list[dict[str, str]] = []

    for b in bullets:
        first = re.split(r"\s+", b.strip().lower(), maxsplit=1)[0].strip(".,:;()[]{}")
        if first in ACTION_VERBS:
            action_hits += 1
        if METRIC_RE.search(b):
            metric_hits += 1
        lower = b.lower()
        for phrase in BANNED_PHRASES:
            if phrase in lower:
                banned_hits.append({"phrase": phrase, "bullet": b})

    return {
        "total_bullets": len(bullets),
        "action_verb_ratio": round(action_hits / len(bullets), 3),
        "metric_ratio": round(metric_hits / len(bullets), 3),
        "banned_phrase_hits": banned_hits[:10],
    }


def audit_integrity(original: ParsedCV, optimized: ParsedCV) -> dict[str, Any]:
    orig_jobs = [(e.company or "", e.title or "", e.start_date or "", e.end_date or "") for e in original.experience]
    opt_jobs = [(e.company or "", e.title or "", e.start_date or "", e.end_date or "") for e in optimized.experience]

    # Company/title matching (case-insensitive)
    orig_set = {("|".join([c.lower().strip(), t.lower().strip()])) for c, t, _, _ in orig_jobs}
    opt_set = {("|".join([c.lower().strip(), t.lower().strip()])) for c, t, _, _ in opt_jobs}

    missing_jobs = sorted(list(orig_set - opt_set))

    # Date changes: match by company+title when possible
    date_changes: list[dict[str, str]] = []
    opt_map = {("|".join([c.lower().strip(), t.lower().strip()])): (s, e) for c, t, s, e in opt_jobs}
    for c, t, s, e in orig_jobs:
        k = "|".join([c.lower().strip(), t.lower().strip()])
        if k in opt_map:
            s2, e2 = opt_map[k]
            if (s or "") != (s2 or "") or (e or "") != (e2 or ""):
                date_changes.append({"job": f"{t} @ {c}", "original": f"{s}–{e}", "optimized": f"{s2}–{e2}"})

    # Contact info preserved?
    contact = {
        "name": (original.personal_info.name, optimized.personal_info.name),
        "email": (original.personal_info.email, optimized.personal_info.email),
        "phone": (original.personal_info.phone, optimized.personal_info.phone),
        "location": (original.personal_info.location, optimized.personal_info.location),
        "linkedin": (original.personal_info.linkedin, optimized.personal_info.linkedin),
    }
    contact_mismatches = {k: v for k, v in contact.items() if (v[0] or "").strip() != (v[1] or "").strip()}

    return {
        "original_jobs": len(orig_jobs),
        "optimized_jobs": len(opt_jobs),
        "missing_jobs": missing_jobs,
        "date_changes": date_changes,
        "contact_mismatches": contact_mismatches,
    }


def audit_keywords(job_description: str, optimized: ParsedCV) -> dict[str, Any]:
    keywords = extract_keywords(job_description)
    blob = cv_to_text(optimized).lower()
    present = [k for k in keywords if k in blob]
    missing = [k for k in keywords if k not in blob]
    return {
        "top_keywords": keywords,
        "present_count": len(present),
        "missing_count": len(missing),
        "present": present[:25],
        "missing": missing[:25],
        "coverage_ratio": round(len(present) / max(1, len(keywords)), 3),
    }


async def generate_and_audit(parsed_cv_path: str | None, pdf_path: str | None, job_path: str, out_dir: Path) -> dict[str, Any]:
    job_description = load_text(job_path)

    # Import AI pipeline lazily so we can show a clean error when OPENAI_API_KEY is missing.
    from app.services.ai_service import (  # noqa: WPS433,E402
        analyze_gaps,
        generate_questions_from_gaps,
        generate_optimized_cv_with_comparison,
        parse_cv_with_ai,
    )

    if parsed_cv_path:
        parsed_cv = ParsedCV(**load_json(parsed_cv_path))
    elif pdf_path:
        pdf_bytes = Path(pdf_path).read_bytes()
        cv_text = extract_text_from_pdf(pdf_bytes)
        parsed_cv = await parse_cv_with_ai(cv_text)
    else:
        raise ValueError("Provide either --parsed-cv or --pdf")

    # Build gaps + questions (answers empty by default)
    gap_analysis = await analyze_gaps(parsed_cv, job_description)
    questions = generate_questions_from_gaps(gap_analysis)

    # Mark all questions as unanswered (audit baseline)
    answers: list[InterviewQuestion] = [q for q in questions]

    optimized_cv, comparison = await generate_optimized_cv_with_comparison(
        parsed_cv, job_description, gap_analysis, answers
    )

    # Save outputs
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "parsed_cv.json").write_text(parsed_cv.model_dump_json(indent=2), encoding="utf-8")
    (out_dir / "optimized_cv.json").write_text(optimized_cv.model_dump_json(indent=2), encoding="utf-8")
    (out_dir / "comparison.json").write_text(comparison.model_dump_json(indent=2), encoding="utf-8")
    (out_dir / "optimized_cv.pdf").write_bytes(create_cv_pdf(optimized_cv))
    (out_dir / "optimized_cv.docx").write_bytes(create_cv_docx(optimized_cv))

    # Heuristic report
    integrity = audit_integrity(parsed_cv, optimized_cv)
    bullets = audit_bullets(optimized_cv)
    keywords = audit_keywords(job_description, optimized_cv)

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "integrity": integrity,
        "bullets": bullets,
        "keywords": keywords,
        "comparison": comparison.model_dump(),
        "verdict": {
            # Rough heuristic: tune as needed
            "passes_integrity": (len(integrity["missing_jobs"]) == 0 and len(integrity["date_changes"]) == 0 and len(integrity["contact_mismatches"]) == 0),
            "good_bullets": (bullets["action_verb_ratio"] >= 0.4 and bullets["metric_ratio"] >= 0.25 and len(bullets["banned_phrase_hits"]) == 0),
            "good_keyword_coverage": (keywords["coverage_ratio"] >= 0.35),
        },
    }
    report["verdict"]["passes_demo_bar"] = (
        report["verdict"]["passes_integrity"]
        and report["verdict"]["good_keyword_coverage"]
    )

    (out_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parsed-cv", required=False, help="Path to ParsedCV JSON (matches app.models.ParsedCV)")
    parser.add_argument("--pdf", required=False, help="Path to resume PDF (Canva PDFs supported)")
    parser.add_argument("--job", required=True, help="Path to job description text file")
    parser.add_argument("--out", default=str(Path(__file__).parent / "qa_outputs"), help="Output directory")
    args = parser.parse_args()

    _load_dotenv_if_present()

    if not os.environ.get("OPENAI_API_KEY") and not os.environ.get("openai_api_key"):
        print("ERROR: OPENAI_API_KEY is not set. This script needs it to call the model.")
        print("Set it in your shell, or put it in backend/.env (or repo root .env).")
        return 2

    if not args.parsed_cv and not args.pdf:
        print("ERROR: You must provide either --parsed-cv or --pdf")
        return 2
    if args.parsed_cv and args.pdf:
        print("ERROR: Provide only one input: --parsed-cv OR --pdf")
        return 2

    report = asyncio.run(generate_and_audit(args.parsed_cv, args.pdf, args.job, Path(args.out)))
    print("=== CV QUALITY AUDIT ===")
    print(json.dumps(report["verdict"], indent=2))
    print(f"Outputs written to: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


