from django.test import SimpleTestCase

from .ai import analyze_resume_against_job, extract_skills_from_resume, match_skills


class SkillMatchingTests(SimpleTestCase):
    def test_extract_skills_normalizes_aliases(self):
        resume = "Experienced in JS, Py, NodeJS, and Javascnpt frameworks"
        vocab = {"javascript", "python", "node.js"}

        skills = extract_skills_from_resume(resume, vocab)

        self.assertIn("javascript", skills)
        self.assertIn("python", skills)
        self.assertIn("node.js", skills)

    def test_match_skills_supports_semantic_and_missing(self):
        match = match_skills("js, py, docker", "JavaScript, Python, AWS")

        self.assertEqual(sorted(match["matched_skills"]), ["javascript", "python"])
        self.assertEqual(match["missing_skills"], ["aws"])
        self.assertAlmostEqual(match["match_percentage"], 66.67, places=2)

    def test_resume_analysis_returns_expected_schema(self):
        resume = """\
Jane Doe
Full Stack Developer
5 years of experience building APIs with Django and NodeJS.
Skills: JS, Py, Docker, Communication
Education: BS Computer Science, Sample University
"""
        job = "Python, JavaScript, Docker, AWS, REST API"

        result = analyze_resume_against_job(resume, job, {"python", "javascript", "docker", "aws", "rest"})

        self.assertEqual(set(result.keys()), {"clean_text", "candidate_profile", "job_match"})
        self.assertIn("skills", result["candidate_profile"])
        self.assertIn("matched_skills", result["job_match"])
        self.assertIn("missing_skills", result["job_match"])
        self.assertTrue(0 <= result["job_match"]["match_score"] <= 100)
