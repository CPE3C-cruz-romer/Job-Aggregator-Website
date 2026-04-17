import re


def _normalize_skills(text):
    parts = re.split(r"[\n,;/|]+", (text or "").lower())
    return {part.strip() for part in parts if part.strip()}


def extract_skills_from_resume(resume_text, skill_vocabulary):
    resume_lower = (resume_text or "").lower()
    return [
        skill for skill in sorted(skill_vocabulary)
        if skill and skill in resume_lower
    ]


def match_skills(user_skills, job_skills):
    user_set = _normalize_skills(user_skills)
    job_set = _normalize_skills(job_skills)

    match = user_set.intersection(job_set)
    score = len(match) / len(job_set) * 100 if job_set else 0

    return {
        "match_percentage": round(score, 2),
        "matched_skills": list(match)
    }
