# Job Aggregator (Django + React)

A full-stack job aggregator platform with JWT authentication, Google Sign-In, employer direct posting, job search/filtering, saved jobs, application tracking, resume upload, and resume-to-job skill matching.

## Project Structure

```text
.
├── backend/
│   ├── job_aggregator/
│   ├── jobs/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── team/
│   ├── src/
│   ├── package.json
│   └── .env.example
└── README.md
```

## Requirements

### Backend
- Python 3.10+
- pip
- virtualenv (recommended)

### Frontend
- Node.js 18+
- npm 9+

### Python packages
Listed in `backend/requirements.txt` including Django, DRF, SimpleJWT, `google-auth`, `PyPDF2`, `Pillow`.

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

For production frontend deployments (for example Vercel), set:

```env
REACT_APP_API_URL=https://job-aggregator-website.onrender.com/api
```

If you migrate to Vite later, use `VITE_API_URL` instead.

## Team images

Put your real JPEGs in `frontend/public/team/` using these names:

- `romer-cholo-cruz.jpeg`
- `eisen-liam-palsat.jpeg`
- `allan-allan-paul-valenzuela.jpeg`
- `hugh-ariff-aserit.jpeg`

If an image is missing, a default circular avatar will be shown.

## Troubleshooting

### 1) Google auth popup error (`flowName=GeneralOAuthFlow`)
In Google Cloud Console, add these **Authorized JavaScript origins**:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

Also ensure `REACT_APP_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` match.
Use the Google OAuth **Client ID** only (`...apps.googleusercontent.com`), not `GOCSPX-...` client secrets.
If deployed on Vercel, set `REACT_APP_GOOGLE_CLIENT_ID` in Vercel Environment Variables and redeploy.

### 2) "Could not refresh jobs" from Adzuna
Set these in `backend/.env`:

```env
ADZUNA_APP_ID=aba5a62a
ADZUNA_APP_KEY=75f0ba2c5c175d657c947ab1e219a92b
ADZUNA_COUNTRY=us
```

Backend now returns the exact API failure reason in the frontend message.

### 3) Registration failed/password rules
Django password policy applies:
- at least 8 characters
- not too similar to username/email
- not a common password
- not numeric-only

The frontend now shows detailed backend validation errors.


### 4) Google login error `Error 401: invalid_client`
This means Google OAuth client settings are not matching your local URL.

In Google Cloud Console -> Credentials -> OAuth Client:
- Add **Authorized JavaScript origins**:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
- Ensure the same client ID is set in both:
  - `frontend/.env` -> `REACT_APP_GOOGLE_CLIENT_ID`
  - `backend/.env` -> `GOOGLE_CLIENT_ID`

Username/password registration/login will work even when Google is misconfigured.

### 5) Frontend deployed but API calls fail
If your React frontend is on Vercel and backend is on Render:

1. In Vercel project settings, set:
   - `REACT_APP_API_URL=https://job-aggregator-website.onrender.com/api`
2. In Render backend environment, set:
   - `ALLOWED_HOSTS=job-aggregator-website.onrender.com,...`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,...`

If you use Vercel preview deployments, allow `https://*.vercel.app` with Django `CORS_ALLOWED_ORIGIN_REGEXES`.
