from pypdf import PdfReader
import pdfplumber
from io import BytesIO
import re
from statistics import median


def _looks_like_spaced_letters(text: str) -> bool:
    """
    Detect PDFs where extraction returns words split into single letters like:
    'M O H A M E D  A M I N E'
    """
    if not text or len(text) < 200:
        return False
    # Count lines that contain long runs of single-letter tokens
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return False
    spaced_lines = 0
    checked = 0
    pattern = re.compile(r"(?:\b[A-Za-z0-9]\b\s+){6,}\b[A-Za-z0-9]\b")
    for ln in lines[:60]:
        checked += 1
        if pattern.search(ln):
            spaced_lines += 1
    # If many early lines are like this, treat extraction as low-quality
    return checked >= 10 and (spaced_lines / checked) >= 0.2


def _extract_text_pdfplumber_chars(pdf_bytes: bytes) -> str:
    """
    Canva PDFs often place text as individually positioned characters.
    pdfplumber provides character boxes; we can reconstruct lines by geometry.
    """
    lines_out: list[str] = []

    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            chars = page.chars or []
            if not chars:
                continue

            # Group chars into lines by "top" coordinate.
            # We bucket by rounding the top value to reduce jitter.
            buckets: dict[int, list[dict]] = {}
            for ch in chars:
                txt = ch.get("text", "")
                if not txt or not txt.strip():
                    continue
                top = ch.get("top", 0.0)
                key = int(round(top / 3.0))  # 3pt vertical tolerance
                buckets.setdefault(key, []).append(ch)

            for _, line_chars in sorted(buckets.items(), key=lambda kv: kv[0]):
                # Sort chars left-to-right
                line_chars.sort(key=lambda c: c.get("x0", 0.0))

                # Compute typical gap between consecutive chars
                gaps: list[float] = []
                prev_x1 = None
                for c in line_chars:
                    x0 = float(c.get("x0", 0.0))
                    if prev_x1 is not None:
                        gaps.append(max(0.0, x0 - prev_x1))
                    prev_x1 = float(c.get("x1", x0))

                # Space threshold:
                # Canva often uses very small inter-letter gaps (~0.2) and larger word gaps (~2-3).
                # We detect this by splitting gaps into "small" and "large" bands.
                pos = [g for g in gaps if 0.05 < g < 50.0]  # ignore zeros and huge jumps (columns)
                small = [g for g in pos if g <= 0.8]
                large = [g for g in pos if g >= 1.6]
                if small and large:
                    space_threshold = (max(small) + min(large)) / 2.0
                elif pos:
                    space_threshold = max(1.0, median(pos) * 1.5)
                else:
                    space_threshold = 4.0

                buf: list[str] = []
                prev = None
                for c in line_chars:
                    ch = c.get("text", "")
                    x0 = float(c.get("x0", 0.0))
                    if prev is not None:
                        gap = max(0.0, x0 - float(prev.get("x1", prev.get("x0", 0.0))))
                        prev_ch = prev.get("text", "")

                        # Don't insert spaces around punctuation even if gap is large.
                        if gap > space_threshold:
                            if ch in {".", ",", ":", ";", "/", ")", "]", "}", "-", "–", "—"}:
                                pass
                            elif prev_ch in {"(", "[", "{", "/", "-", "–", "—", "@", "."}:
                                pass
                            else:
                                buf.append(" ")

                    buf.append(ch)
                    prev = c

                line = "".join(buf).strip()
                if line:
                    lines_out.append(line)

    return "\n".join(lines_out)


def _fix_common_tokens(text: str) -> str:
    """Fix common tokenization artifacts (emails, URLs, punctuation spacing)."""
    if not text:
        return ""
    lines = text.splitlines()
    out_lines: list[str] = []

    for ln in lines:
        line = ln.strip()
        if not line:
            out_lines.append("")
            continue

        lower = line.lower()

        # URL lines (Canva often stores LinkedIn as a clickable annotation)
        if "http" in lower or "www." in lower or "linkedin.com" in lower:
            # Remove all spaces in URLs to avoid corrupting them (e.g., "amine - abbassi").
            line = re.sub(r"\s+", "", line)
            # Fix common URL tokenization
            line = re.sub(r"^https?:/{1,2}", "https://", line, flags=re.I)
            out_lines.append(line)
            continue

        # Email-ish lines: preserve spaces elsewhere, but fix around @ and dots.
        if "@" in line:
            line = re.sub(r"\s*@\s*", "@", line)
            line = re.sub(r"(?<=\w)\s*\.\s*(?=\w)", ".", line)
            out_lines.append(re.sub(r"[ \t]{2,}", " ", line).strip())
            continue

        # General text cleanup
        # 1) Insert space after sentence dots if missing: "word.Next" -> "word. Next"
        line = re.sub(r"\.(?=[A-Z])", ". ", line)
        # 2) Insert spaces on camelCase / TitleCase boundaries: "BachelorofComputerScience" -> "Bachelorof Computer Science"
        line = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", line)
        # 2b) Insert space between digits and letters: "25Taher" -> "25 Taher"
        line = re.sub(r"(?<=\d)(?=[A-Za-z])", " ", line)
        # 3) Ensure space after ":" when missing
        line = re.sub(r":(?=\w)", ": ", line)
        # 4) Hyphens: keep hyphenated words as "cross-platform" (no spaces)
        line = re.sub(r"(?<=\w)\s*-\s*(?=\w)", "-", line)
        # 5) En-dash as separator
        line = re.sub(r"\s*–\s*", " – ", line)
        # 6) Fix common split brand/tech tokens seen in Canva exports
        token_fixes = {
            "Bachelorof": "Bachelor of",
            "Masterin": "Master in",
            "Facultyof": "Faculty of",
            "Sciencesof": "Sciences of",
            "Saa S": "SaaS",
            "Mongo DB": "MongoDB",
            "Open AI": "OpenAI",
            "Type Script": "TypeScript",
            "Web Sockets": "WebSockets",
            "Gmb H": "GmbH",
            "Open AIAPI": "OpenAI API",
        }
        for bad, good in token_fixes.items():
            line = line.replace(bad, good)
        # Collapse whitespace
        line = re.sub(r"[ \t]{2,}", " ", line).strip()
        out_lines.append(line)

    out = "\n".join(out_lines)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def _normalize_extracted_text(text: str) -> str:
    """
    Fix common PDF extraction artifacts:
    - Remove stray replacement chars
    - Normalize punctuation spacing
    """
    if not text:
        return ""
    text = text.replace("\u00a0", " ")  # NBSP
    text = text.replace("�", "")  # unknown replacement char

    # Mild normalization only; spaced-letter Canva cases are handled earlier via char reconstruction.
    text = re.sub(r"\s+([.,/–—-])", r"\1", text)
    text = re.sub(r"([(/])\s+", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return _fix_common_tokens(text.strip())


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using pypdf with pdfplumber fallback."""
    text = ""
    
    # Try pypdf first (pure Python, no compilation needed)
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if text.strip():
            candidate = text.strip()
            # If extraction is "spaced letters" garbage, fall back to pdfplumber.
            if not _looks_like_spaced_letters(candidate):
                return _normalize_extracted_text(candidate)
    except Exception:
        pass
    
    # Fallback to pdfplumber.
    # For Canva-like PDFs, reconstruct from character geometry for much better results.
    try:
        reconstructed = _extract_text_pdfplumber_chars(pdf_bytes)
        if reconstructed and reconstructed.strip():
            # Also try to capture hyperlinks (e.g., LinkedIn) which Canva often stores as annotations.
            try:
                reader = PdfReader(BytesIO(pdf_bytes))
                page0 = reader.pages[0]
                annots = page0.get("/Annots") or []
                uris: list[str] = []
                for a in annots:
                    obj = a.get_object()
                    act = obj.get("/A")
                    if act and act.get("/S") == "/URI" and act.get("/URI"):
                        uris.append(str(act.get("/URI")))
                if uris:
                    reconstructed = reconstructed + "\n" + "\n".join(uris)
            except Exception:
                pass

            return _normalize_extracted_text(reconstructed)

        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(x_tolerance=1, y_tolerance=1)
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    if not text.strip():
        raise ValueError("No text could be extracted from the PDF")
    
    return _normalize_extracted_text(text.strip())
