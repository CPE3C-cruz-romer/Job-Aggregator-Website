def match_skills(user_skills, job_skills):
    user_set = set(user_skills.lower().split(","))
    job_set = set(job_skills.lower().split(","))

    match = user_set.intersection(job_set)
    score = len(match) / len(job_set) * 100 if job_set else 0

    return {
        "match_percentage": round(score, 2),
        "matched_skills": list(match)
    }