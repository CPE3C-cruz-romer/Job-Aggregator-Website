import re
from difflib import SequenceMatcher


SKILL_ALIASES = {
    "js": "javascript",
    "nodejs": "node.js",
    "node": "node.js",
    "ts": "typescript",
    "py": "python",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "aws cloud": "aws",
    "gcp": "google cloud",
    "ci cd": "ci/cd",
    "rest api": "rest",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "nlp": "natural language processing",
    "javascnpt": "javascript",
}

SOFT_SKILL_KEYWORDS = {
    "communication",
    "leadership",
    "teamwork",
    "collaboration",
    "problem solving",
    "adaptability",
    "time management",
    "critical thinking",
    "mentoring",
    "stakeholder management",
}

TOOL_KEYWORDS = {
    "git",
    "github",
    "gitlab",
    "jira",
    "docker",
    "kubernetes",
    "jenkins",
    "figma",
    "postman",
    "linux",
    "bash",
    "aws",
    "azure",
    "google cloud",
    "terraform",
}

SECTION_HINTS = {
    "skills": ["skills", "technical skills", "competencies"],
    "experience": ["experience", "work history", "employment", "projects"],
    "education": ["education", "academic", "certifications"],
}


def _collapse_whitespace(text):
    lines = [re.sub(r"\s+", " ", line).strip() for line in (text or "").splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines).strip()


def _clean_ocr_noise(text):
    normalized = text or ""
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "|": " ",
    }
    for old, new in replacements.items():
        normalized = normalized.replace(old, new)

    fixed_words = {
        "Javascnpt": "JavaScript",
        "Javascnpt": "JavaScript",
        "Pyth0n": "Python",
        "Djanqo": "Django",
    }
    for old, new in fixed_words.items():
        normalized = re.sub(old, new, normalized, flags=re.IGNORECASE)

    return normalized


def _tokenize_skills(text):
    parts = re.split(r"[\n,;/|]+", (text or "").lower())
    return [part.strip() for part in parts if part.strip()]


def _normalize_skill(skill):
    compact = re.sub(r"[^a-z0-9+.#/\-\s]", "", (skill or "").lower()).strip()
    compact = re.sub(r"\s+", " ", compact)
    return SKILL_ALIASES.get(compact, compact)


def _normalize_skill_set(skills):
    return {normalized for skill in skills for normalized in [_normalize_skill(skill)] if normalized}


def _fuzzy_match(skill, candidates):
    if skill in candidates:
        return skill
    best_score = 0
    best = ""
    for candidate in candidates:
        score = SequenceMatcher(None, skill, candidate).ratio()
        if score > best_score:
            best_score = score
            best = candidate
    if best_score >= 0.84:
        return best
    return ""


def _infer_role(clean_text):
    text = clean_text.lower()
    role_map = {
        "data scientist": ["data scientist", "machine learning engineer"],
        "backend developer": ["backend", "django", "flask", "api development"],
        "frontend developer": ["frontend", "react", "vue", "angular"],
        "full stack developer": ["full stack", "frontend", "backend"],
        "devops engineer": ["devops", "kubernetes", "terraform", "ci/cd"],
    }
    best_role = "Software Developer"
    best_hits = 0
    for role, keywords in role_map.items():
        hits = sum(1 for keyword in keywords if keyword in text)
        if hits > best_hits:
            best_hits = hits
            best_role = role.title()
    return best_role


def _extract_experience_years(clean_text):
    patterns = [
        r"(\d+)\+?\s+years?\s+of\s+experience",
        r"experience\s+of\s+(\d+)\+?\s+years?",
        r"(\d+)\+?\s+yrs?\s+experience",
    ]
    for pattern in patterns:
        match = re.search(pattern, clean_text.lower())
        if match:
            return int(match.group(1))
    return 0


def _extract_education_lines(clean_text):
    lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
    markers = ("b.s", "bs", "bachelor", "m.s", "ms", "master", "phd", "degree", "university", "college")
    return [line for line in lines if any(marker in line.lower() for marker in markers)]


def _extract_name(clean_text):
    lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
    if not lines:
        return ""
    first = lines[0]
    if len(first.split()) <= 4 and not any(char.isdigit() for char in first):
        return first
    return ""


def _detect_sections(clean_text):
    lowered = clean_text.lower()
    detected = {}
    for section, hints in SECTION_HINTS.items():
        detected[section] = any(hint in lowered for hint in hints)
    return detected


def _extract_contextual_skills(clean_text, vocabulary):
    lowered = clean_text.lower()
    matched = set()
    for skill in vocabulary:
        normalized_skill = _normalize_skill(skill)
        if not normalized_skill:
            continue
        variants = {normalized_skill, skill.lower()}
        variants.update(alias for alias, canonical in SKILL_ALIASES.items() if canonical == normalized_skill)
        if any(variant in lowered for variant in variants):
            matched.add(normalized_skill)
    return sorted(matched)


def extract_skills_from_resume(resume_text, skill_vocabulary):
    clean_text = _clean_ocr_noise(resume_text)
    vocabulary = _normalize_skill_set(skill_vocabulary or [])
    extracted = _extract_contextual_skills(clean_text, vocabulary)
    if not extracted:
        extracted = sorted(_normalize_skill_set(_tokenize_skills(clean_text)))
    return extracted


def _categorize_skills(skills):
    normalized = sorted(_normalize_skill_set(skills))
    technical = []
    soft = []
    tools = []

    for skill in normalized:
        if skill in SOFT_SKILL_KEYWORDS:
            soft.append(skill)
        elif skill in TOOL_KEYWORDS:
            tools.append(skill)
        else:
            technical.append(skill)

    return {
        "technical": technical,
        "soft": soft,
        "tools": tools,
    }


def match_skills(user_skills, job_skills):
    user_set = _normalize_skill_set(_tokenize_skills(user_skills))
    job_set = _normalize_skill_set(_tokenize_skills(job_skills))

    matched = set()
    for skill in user_set:
        fuzzy = _fuzzy_match(skill, job_set)
        if fuzzy:
            matched.add(fuzzy)

    score = (len(matched) / len(job_set) * 100) if job_set else 0
    missing = sorted(job_set - matched)

    return {
        "match_percentage": round(score, 2),
        "matched_skills": sorted(matched),
        "missing_skills": missing,
    }


def analyze_resume_against_job(resume_text, job_description, skill_vocabulary=None):
    clean_text = _clean_ocr_noise(resume_text)
    clean_text = _collapse_whitespace(clean_text)

    combined_vocab = set(skill_vocabulary or [])
    combined_vocab.update(_tokenize_skills(job_description))

    candidate_skills = _normalize_skill_set(extract_skills_from_resume(clean_text, combined_vocab))
    categorized_skills = _categorize_skills(candidate_skills)

    job_skills = _normalize_skill_set(_tokenize_skills(job_description))

    semantic_matches = set()
    for candidate_skill in candidate_skills:
        maybe = _fuzzy_match(candidate_skill, job_skills)
        if maybe:
            semantic_matches.add(maybe)

    missing_skills = sorted(job_skills - semantic_matches)

    experience_years = _extract_experience_years(clean_text)
    education_lines = _extract_education_lines(clean_text)
    section_presence = _detect_sections(clean_text)

    skill_relevance = (len(semantic_matches) / len(job_skills) * 100) if job_skills else 0
    experience_relevance = min(100, (experience_years / 5) * 100)
    education_relevance = 100 if education_lines else 40
    context_relevance = 100 if all(section_presence.values()) else (sum(section_presence.values()) / 3) * 100

    weighted_score = (
        (skill_relevance * 0.40)
        + (experience_relevance * 0.30)
        + (education_relevance * 0.10)
        + (context_relevance * 0.20)
    )

    strengths = []
    if semantic_matches:
        strengths.append("Strong overlap with required technical skills.")
    if experience_years >= 3:
        strengths.append("Relevant hands-on experience level.")
    if education_lines:
        strengths.append("Education credentials are clearly present.")

    weaknesses = []
    if missing_skills:
        weaknesses.append("Missing several role-specific skills from the job description.")
    if experience_years == 0:
        weaknesses.append("Experience duration is unclear or missing.")
    if not education_lines:
        weaknesses.append("Education details are limited.")

    role = _infer_role(clean_text)
    recommended_roles = [role]
    if "python" in candidate_skills:
        recommended_roles.append("Backend Developer")
    if "javascript" in candidate_skills or "typescript" in candidate_skills:
        recommended_roles.append("Frontend Developer")
    if "machine learning" in candidate_skills or "natural language processing" in candidate_skills:
        recommended_roles.append("Machine Learning Engineer")

    recommended_roles = list(dict.fromkeys(recommended_roles))

    return {
        "clean_text": clean_text,
        "candidate_profile": {
            "name": _extract_name(clean_text),
            "role": role,
            "experience_years": str(experience_years),
            "education": education_lines,
            "skills": categorized_skills,
        },
        "job_match": {
            "match_score": round(weighted_score),
            "matched_skills": sorted(semantic_matches),
            "missing_skills": missing_skills,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommended_roles": recommended_roles,
        },
    }
