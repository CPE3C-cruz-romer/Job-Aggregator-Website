import logging
import re
import zipfile
from xml.etree import ElementTree as ET
from io import BytesIO

import requests
from django.conf import settings
from PIL import Image, ImageEnhance, ImageFilter
from PyPDF2 import PdfReader

from .models import Job

logger = logging.getLogger(__name__)

KNOWN_SKILLS = {
    'python', 'django', 'flask', 'fastapi', 'javascript', 'typescript', 'react', 'nextjs', 'node', 'express',
    'java', 'spring', 'c#', '.net', 'php', 'laravel', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
    'html', 'css', 'tailwind', 'bootstrap', 'rest', 'graphql', 'api', 'aws', 'azure', 'gcp',
    'docker', 'kubernetes', 'git', 'linux', 'ci/cd', 'pytest', 'selenium',
    # Marketing / sales / business
    'seo', 'sem', 'digital marketing', 'content marketing', 'email marketing', 'social media marketing',
    'google ads', 'meta ads', 'copywriting', 'branding', 'crm', 'lead generation', 'sales', 'negotiation',
    'market research', 'analytics', 'campaign management',
    # Construction / engineering / field
    'construction management', 'autocad', 'revit', 'civil engineering', 'structural analysis',
    'quantity surveying', 'project planning', 'site supervision', 'safety compliance', 'estimation',
    'blueprint reading', 'building codes', 'procurement', 'contract management',
    # Design / media
    'figma', 'adobe photoshop', 'adobe illustrator', 'adobe premiere', 'ui design', 'ux design',
    # Operations / support / office
    'customer service', 'technical support', 'inventory management', 'supply chain', 'logistics',
    'microsoft excel', 'power bi', 'tableau', 'bookkeeping', 'payroll',
}

SKILL_ALIASES = {
    'js': 'javascript',
    'ts': 'typescript',
    'node.js': 'node',
    'nodejs': 'node',
    'postgres': 'postgresql',
    'gcp': 'google cloud',
    'ml': 'machine learning',
    'ai': 'artificial intelligence',
    'hr': 'human resources',
    'ux/ui': 'ui/ux',
}

INFERRED_SKILLS = {
    'react': {'frontend development', 'ui development'},
    'angular': {'frontend development'},
    'vue': {'frontend development'},
    'html': {'frontend development'},
    'css': {'frontend development'},
    'django': {'backend development', 'api development'},
    'flask': {'backend development', 'api development'},
    'fastapi': {'backend development', 'api development'},
    'node': {'backend development', 'api development'},
    'spring': {'backend development'},
    'sql': {'database skills'},
    'postgresql': {'database skills'},
    'mysql': {'database skills'},
    'mongodb': {'database skills'},
    'aws': {'cloud computing'},
    'azure': {'cloud computing'},
    'google cloud': {'cloud computing'},
    'docker': {'devops'},
    'kubernetes': {'devops'},
    'git': {'version control'},
    'pytest': {'testing'},
    'selenium': {'testing', 'quality assurance'},
}

JOB_MATCH_KEYWORDS = {
    keyword.strip().lower()
    for keyword in """
job, work, career, employment, hiring, recruitment, vacancy, opening, opportunity, position, profession, occupation, role, full-time, part-time, contract, freelance, internship, entry-level, junior, mid-level, senior, remote, onsite, hybrid, flexible, shift work, day shift, night shift, office job, field work, corporate, startup, multinational, government, private sector, public sector, ngo, tech job, it job, software engineer, software developer, web developer, frontend developer, backend developer, full stack developer, mobile developer, android developer, ios developer, app developer, game developer, embedded systems engineer, data scientist, data analyst, business analyst, machine learning engineer, ai engineer, deep learning engineer, data engineer, cloud engineer, devops engineer, site reliability engineer, cybersecurity analyst, security engineer, penetration tester, ethical hacker, it support specialist, help desk technician, system administrator, network engineer, database administrator, qa engineer, qa tester, automation tester, manual tester, product manager, project manager, scrum master, technical lead, solutions architect, ui designer, ux designer, graphic designer, web designer, content designer, creative designer, video editor, animator, multimedia artist, python developer, java developer, c++ developer, c# developer, javascript developer, typescript developer, php developer, ruby developer, go developer, kotlin developer, swift developer, react developer, angular developer, vue developer, node.js developer, django developer, flask developer, spring boot developer, laravel developer, asp.net developer, html, css, sass, bootstrap, tailwind, material ui, rest api, graphql, microservices, monolith, docker, kubernetes, ci/cd, jenkins, git, github, gitlab, bitbucket, aws, azure, google cloud, firebase, heroku, vercel, netlify, mysql, postgresql, mongodb, sqlite, redis, elasticsearch, marketing specialist, digital marketing, seo specialist, sem, social media manager, content creator, copywriter, brand manager, email marketing, influencer marketing, sales representative, sales associate, sales executive, account manager, business development, customer success manager, customer service representative, call center agent, telemarketer, support agent, hr manager, hr officer, recruiter, talent acquisition specialist, training officer, payroll specialist, office administrator, administrative assistant, executive assistant, secretary, receptionist, operations manager, operations analyst, logistics coordinator, supply chain manager, warehouse staff, inventory manager, procurement officer, purchasing agent, driver, delivery rider, courier, dispatcher, production worker, factory worker, technician, electrician, mechanical technician, maintenance worker, civil engineer, mechanical engineer, electrical engineer, electronics engineer, industrial engineer, chemical engineer, project engineer, site engineer, structural engineer, architect, draftsman, surveyor, nurse, doctor, physician, medical technologist, pharmacist, healthcare assistant, caregiver, therapist, physical therapist, occupational therapist, teacher, instructor, professor, lecturer, tutor, education assistant, school administrator, chef, cook, baker, waiter, waitress, barista, hotel staff, housekeeping, tourism officer, travel agent, flight attendant, pilot, seafarer, communication skills, teamwork, leadership, problem solving, critical thinking, decision making, adaptability, creativity, innovation, time management, organization, multitasking, attention to detail, interpersonal skills, negotiation, conflict resolution, emotional intelligence, analytical thinking, fast learner, self-motivated, goal-oriented, proactive, reliable, responsible, punctual, professional, hardworking, dedicated, results-driven, performance, kpi, productivity, efficiency, collaboration, brainstorming, presentation skills, public speaking, report writing, documentation, research, analysis, strategy, planning, execution, monitoring, evaluation, optimization, troubleshooting, debugging, testing, deployment, maintenance, scalability, security, performance tuning, user experience, customer satisfaction, stakeholder management, risk management, budgeting, forecasting, auditing, compliance, regulations, policies, procedures, onboarding, training, mentoring, coaching, career growth, promotion, salary, benefits, compensation, bonus, incentives, health insurance, work-life balance, company culture, diversity, inclusion, innovation, sustainability, digital transformation, automation, artificial intelligence, big data, analytics, cloud computing, internet of things, blockchain, fintech, e-commerce, startups, entrepreneurship, freelancing, consulting, outsourcing, remote work, virtual teams, global workforce, international jobs, local jobs, job search, job application, resume, cv, cover letter, interview, hiring process, screening, assessment, technical interview, hr interview, job offer, onboarding process, employee engagement, retention, turnover, career development, upskilling, reskilling, certification, training programs, workshops, seminars, networking, professional growth, job matching, skill matching, recommendation system, job filtering, job ranking, job listing, job portal, job aggregator, employment platform, talent marketplace, workforce management, human capital, digital skills, soft skills, hard skills, technical skills, transferable skills, industry experience, fresh graduate, experienced professional, career switcher, job readiness, employability, productivity tools, collaboration tools, remote tools, communication platforms, workplace technology, innovation hubs, tech ecosystem, business environment, competitive market, industry trends, future jobs, emerging careers, high-demand jobs, job stability, career success
    """.split(',')
    if keyword.strip()
}

ALL_MATCH_TERMS = KNOWN_SKILLS.union(JOB_MATCH_KEYWORDS)

SKILL_ALIASES = {
    'js': 'javascript',
    'ts': 'typescript',
    'node.js': 'node',
    'nodejs': 'node',
    'postgres': 'postgresql',
    'gcp': 'google cloud',
    'ml': 'machine learning',
    'ai': 'artificial intelligence',
    'hr': 'human resources',
    'ux/ui': 'ui/ux',
}

INFERRED_SKILLS = {
    'react': {'frontend development', 'ui development'},
    'angular': {'frontend development'},
    'vue': {'frontend development'},
    'html': {'frontend development'},
    'css': {'frontend development'},
    'django': {'backend development', 'api development'},
    'flask': {'backend development', 'api development'},
    'fastapi': {'backend development', 'api development'},
    'node': {'backend development', 'api development'},
    'spring': {'backend development'},
    'sql': {'database skills'},
    'postgresql': {'database skills'},
    'mysql': {'database skills'},
    'mongodb': {'database skills'},
    'aws': {'cloud computing'},
    'azure': {'cloud computing'},
    'google cloud': {'cloud computing'},
    'docker': {'devops'},
    'kubernetes': {'devops'},
    'git': {'version control'},
    'pytest': {'testing'},
    'selenium': {'testing', 'quality assurance'},
}

def fetch_jobs_from_adzuna(query='software engineer', location='united states', results_per_page=50, pages=3):
    if not settings.ADZUNA_APP_ID or not settings.ADZUNA_APP_KEY:
        return {
            'created': 0,
            'updated': 0,
            'error': 'Missing Adzuna credentials. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in backend/.env',
        }

    created, updated = 0, 0
    for page in range(1, max(1, pages) + 1):
        endpoint = f"https://api.adzuna.com/v1/api/jobs/{settings.ADZUNA_COUNTRY}/search/{page}"
        params = {
            'app_id': settings.ADZUNA_APP_ID,
            'app_key': settings.ADZUNA_APP_KEY,
            'what': query,
            'where': location,
            'results_per_page': results_per_page,
            'content-type': 'application/json',
        }

        try:
            response = requests.get(endpoint, params=params, timeout=15)
            logger.info('Adzuna response status=%s query=%s location=%s page=%s', response.status_code, query, location, page)
            logger.debug('Adzuna response preview=%s', response.text[:400])
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            return {
                'created': created,
                'updated': updated,
                'error': f'Adzuna request failed: {exc}',
            }
        except ValueError:
            return {
                'created': created,
                'updated': updated,
                'error': 'Adzuna returned a non-JSON response.',
            }

        results = data.get('results', [])
        if not results:
            break

        for item in results:
            redirect_url = item.get('redirect_url')
            if not redirect_url:
                continue

            _, was_created = Job.objects.update_or_create(
                url=redirect_url,
                defaults={
                    'title': item.get('title', 'Untitled Position'),
                    'company': item.get('company', {}).get('display_name', 'Unknown Company'),
                    'location': item.get('location', {}).get('display_name', 'Unknown Location'),
                    'description': item.get('description', ''),
                    'source': 'adzuna',
                    'priority_score': 0,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

    return {'created': created, 'updated': updated, 'error': None}


def extract_text_from_pdf(file_obj):
    raw_bytes = file_obj.read()
    if hasattr(file_obj, 'seek'):
        file_obj.seek(0)
    if not raw_bytes:
        return ''

    reader = PdfReader(BytesIO(raw_bytes))
    text = []
    for page in reader.pages:
        text.append(page.extract_text() or '')
    parsed_text = clean_extracted_text('\n'.join(text))
    if has_meaningful_resume_text(parsed_text):
        return parsed_text

    # Fallback for scanned PDFs without embedded text.
    ocr_text = extract_text_from_scanned_pdf(raw_bytes)
    return clean_extracted_text(ocr_text or parsed_text)


def extract_text_from_docx(file_obj):
    try:
        docx_bytes = file_obj.read()
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
        archive = zipfile.ZipFile(BytesIO(docx_bytes))
        xml_data = archive.read('word/document.xml')
        root = ET.fromstring(xml_data)
        namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        text_nodes = root.findall('.//w:t', namespace)
        extracted = ' '.join((node.text or '').strip() for node in text_nodes if (node.text or '').strip())
        return clean_extracted_text(extracted)
    except Exception as exc:
        logger.info('DOCX extraction failed: %s', exc)
        return ''


def _prepare_ocr_variants(image):
    base = image.convert('RGB')
    if base.width > 0 and base.height > 0:
        base = base.resize((int(base.width * 1.6), int(base.height * 1.6)))
    grayscale = base.convert('L')
    contrast = ImageEnhance.Contrast(grayscale).enhance(2.0)
    denoised = contrast.filter(ImageFilter.MedianFilter(size=3))
    thresholded = denoised.point(lambda px: 255 if px > 150 else 0)
    return [base, grayscale, contrast, denoised, thresholded]


def _ocr_text_from_image_obj(image):
    try:
        import pytesseract  # pylint: disable=import-outside-toplevel

        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

        chunks = []
        for variant in _prepare_ocr_variants(image):
            text = pytesseract.image_to_string(variant, config='--oem 3 --psm 6') or ''
            if text.strip():
                chunks.append(text)
        return clean_extracted_text('\n'.join(chunks)) if chunks else ''
    except Exception as exc:
        logger.info('Image OCR unavailable: %s', exc)
        return ''


def extract_text_from_scanned_pdf(pdf_bytes):
    """
    OCR fallback path for scanned PDFs. Requires pypdfium2 + pytesseract.
    """
    try:
        import pypdfium2 as pdfium  # pylint: disable=import-outside-toplevel
    except Exception as exc:
        logger.info('Scanned PDF OCR unavailable: %s', exc)
        return ''

    try:
        document = pdfium.PdfDocument(pdf_bytes)
        pages_text = []
        for index in range(len(document)):
            page = document[index]
            pil_image = page.render(scale=2.0).to_pil()
            pages_text.append(_ocr_text_from_image_obj(pil_image))
        return clean_extracted_text('\n'.join(chunk for chunk in pages_text if chunk))
    except Exception as exc:
        logger.info('Scanned PDF OCR failed: %s', exc)
        return ''


def extract_text_from_image(file_obj):
    """
    OCR is optional: this only works if pytesseract and system tesseract are available.
    Returns empty text when OCR cannot run.
    """
    try:
        original_bytes = file_obj.read()
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
        image = Image.open(BytesIO(original_bytes))
        return _ocr_text_from_image_obj(image)
    except Exception as exc:
        logger.info('Image preprocessing failed: %s', exc)
        return ''


def analyze_resume_image_quality(file_obj):
    """
    Lightweight readability checks for camera/image uploads.
    Returns {readable: bool, reason: str, metrics: dict}.
    """
    try:
        raw = file_obj.read()
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)
        if not raw:
            return {'readable': False, 'reason': 'Image is empty.', 'metrics': {}}

        image = Image.open(BytesIO(raw)).convert('L')
        width, height = image.size
        if width < 900 or height < 900:
            return {
                'readable': False,
                'reason': 'Image resolution is too low. Please retake in good lighting and closer to the document.',
                'metrics': {'width': width, 'height': height},
            }

        histogram = image.histogram()
        total = max(1, width * height)
        dark_pixels = sum(histogram[:35])
        bright_pixels = sum(histogram[220:])
        low_contrast_ratio = (dark_pixels + bright_pixels) / total

        # Simple sharpness proxy: edge intensity average after edge detection.
        edges = image.filter(ImageFilter.FIND_EDGES)
        edge_hist = edges.histogram()
        edge_energy = sum(idx * count for idx, count in enumerate(edge_hist)) / total

        if edge_energy < 5:
            return {
                'readable': False,
                'reason': 'Image appears blurry. Please hold the camera steady and retake.',
                'metrics': {'edge_energy': round(edge_energy, 2), 'width': width, 'height': height},
            }

        if low_contrast_ratio > 0.92:
            return {
                'readable': False,
                'reason': 'Image contrast is too poor. Reduce glare or improve lighting and retake.',
                'metrics': {'contrast_ratio': round(low_contrast_ratio, 3), 'width': width, 'height': height},
            }

        return {
            'readable': True,
            'reason': 'Image quality check passed.',
            'metrics': {
                'edge_energy': round(edge_energy, 2),
                'contrast_ratio': round(low_contrast_ratio, 3),
                'width': width,
                'height': height,
            },
        }
    except Exception as exc:
        logger.info('Image quality analysis failed: %s', exc)
        return {'readable': False, 'reason': 'Could not analyze image quality. Please upload a clearer image.', 'metrics': {}}


def clean_extracted_text(text):
    """Normalize OCR/PDF extraction output for downstream skill matching."""
    if not text:
        return ''

    cleaned = text.replace('\r', '\n')
    cleaned = re.sub(r'[\t\f\v]+', ' ', cleaned)
    cleaned = re.sub(r'\u00a0', ' ', cleaned)

    # Join hyphenated line breaks introduced by OCR/PDF wrapping.
    cleaned = re.sub(r'([A-Za-z])\-\n([A-Za-z])', r'\1\2', cleaned)
    # Keep paragraph intent while preventing fragmented tokens.
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = re.sub(r' +', ' ', cleaned)

    lines = [line.strip() for line in cleaned.split('\n')]
    return '\n'.join([line for line in lines if line])


def has_meaningful_resume_text(text, min_chars=80):
    """
    Guardrail to prevent skill extraction from OCR noise or image-only uploads.
    """
    cleaned = clean_extracted_text(text)
    if not cleaned:
        return False

    alnum_count = len(re.findall(r'[A-Za-z0-9]', cleaned))
    word_count = len(re.findall(r'\b[A-Za-z0-9][A-Za-z0-9+.#/\-]*\b', cleaned))
    return alnum_count >= min_chars and word_count >= 12


def extract_skills_from_text(text):
    if not text:
        return []

    normalized = text.lower().replace('\n', ' ')
    for alias, canonical in SKILL_ALIASES.items():
        normalized = re.sub(rf"\b{re.escape(alias)}\b", canonical, normalized)
    tokens = set(re.findall(r"[a-z0-9+.#/\-]+", normalized))

    found = set()
    for skill in ALL_MATCH_TERMS:
        skill_tokens = skill.lower().split()
        if len(skill_tokens) == 1:
            if skill in tokens or skill in normalized:
                found.add(skill)
        elif all(token in normalized for token in skill_tokens):
            found.add(skill)

    inferred = set()
    for base_skill in list(found):
        inferred.update(INFERRED_SKILLS.get(base_skill, set()))

    found.update(inferred)
    return sorted(found)


def parse_resume_profile(resume_text):
    normalized = (resume_text or '').lower()
    extracted_skills = set(extract_skills_from_text(normalized))

    sections = {
        'skills': [],
        'work_experience': [],
        'projects': [],
        'education': [],
        'certifications': [],
    }

    lines = [line.strip() for line in (resume_text or '').splitlines() if line.strip()]
    for line in lines:
        low = line.lower()
        if any(key in low for key in ['experience', 'worked', 'developer', 'engineer', 'manager']):
            sections['work_experience'].append(line)
        if any(key in low for key in ['project', 'built', 'developed', 'implemented']):
            sections['projects'].append(line)
        if any(key in low for key in ['bachelor', 'master', 'university', 'college', 'degree']):
            sections['education'].append(line)
        if any(key in low for key in ['certified', 'certification', 'certificate']):
            sections['certifications'].append(line)
        if any(skill in low for skill in extracted_skills):
            sections['skills'].append(line)

    return {
        'extracted_skills': sorted(extracted_skills),
        'profile': {key: value[:20] for key, value in sections.items()},
    }


def match_resume_skills(resume_text, job_description):
    resume_profile = parse_resume_profile(resume_text)
    resume_skills = set(resume_profile['extracted_skills'])
    job_skills = set(extract_skills_from_text(job_description))
    overlap = sorted(resume_skills.intersection(job_skills))

    return {
        'matched_skills': overlap,
        'score': round((len(overlap) / max(1, len(resume_skills))) * 100, 2),
        'resume_profile': resume_profile['profile'],
    }


def recommend_jobs_for_skills(resume_text, jobs_queryset, limit=10):
    resume_profile = parse_resume_profile(resume_text)
    resume_skills = set(resume_profile['extracted_skills'])
    recommendations = []

    for job in jobs_queryset:
        combined_job_text = ' '.join([job.title or '', job.description or ''])
        job_skills = set(extract_skills_from_text(combined_job_text))
        matched = sorted(resume_skills.intersection(job_skills))
        match_score = round((len(matched) / max(1, len(resume_skills))) * 100, 2) if matched else 0
        reason_bits = []
        if matched:
            reason_bits.append(f"Matched skills: {', '.join(matched[:6])}")
        if ('frontend development' in resume_skills and any(term in combined_job_text.lower() for term in ['frontend', 'react', 'ui'])):
            reason_bits.append('Your resume indicates strong frontend development experience.')
        if ('backend development' in resume_skills and any(term in combined_job_text.lower() for term in ['backend', 'api', 'django', 'python'])):
            reason_bits.append('Your resume indicates backend/API development experience.')
        if ('database skills' in resume_skills and any(term in combined_job_text.lower() for term in ['sql', 'database', 'postgres', 'mysql'])):
            reason_bits.append('Database experience aligns with this role.')

        relevance = len(matched)
        if not reason_bits:
            reason_bits.append('Closest match based on your experience profile and related technologies.')
            relevance = 0

        recommendations.append({
            'job_id': job.id,
            'title': job.title,
            'company': job.company,
            'location': job.location,
            'matched_skills': matched,
            'match_score': match_score,
            'source': job.source,
            'url': job.url,
            'description': job.description,
            'reason': ' '.join(reason_bits),
            'relevance': relevance,
        })

    recommendations.sort(key=lambda item: (-item['relevance'], -item['match_score'], item['title'].lower()))
    return {
        'extracted_skills': sorted(resume_skills),
        'profile': resume_profile['profile'],
        'recommended_jobs': recommendations[:limit],
    }
