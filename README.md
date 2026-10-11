# AI Resume Analyzer Pro

A modern resume analyzer that helps users review ATS compatibility, skill gaps, strengths, and improvement suggestions for a target role.

This project runs fully in local mode without requiring an API key. If you want to enable Gemini-powered AI analysis, you can optionally set a `GEMINI_API_KEY` in a local `.env` file.

## Features

- Upload PDF resumes
- Paste resume text directly
- Drag-and-drop image support
- Sample resume loader
- ATS score and job match score
- Skill gap analysis
- Strengths, weaknesses, and improvement suggestions
- Downloadable report output
- Local analysis mode with no API key required

## Tech Stack

- HTML / CSS / JavaScript
- Node.js HTTP server
- PDF.js for PDF text extraction

## Project Structure

- `index.html` — app layout and UI
- `style.css` — styling and glassmorphism theme
- `app.js` — browser logic and frontend behavior
- `server.js` — Node.js backend and optional Gemini proxy
- `localAnalyzer.js` — local scoring engine used without API key
- `.env.example` — optional environment configuration template
- `package.json` — scripts for running the backend

## Run Locally

1. Open a terminal in the project folder.
2. Start the app:

   npm start

3. Open this in the browser:

   http://localhost:3000

## Optional Gemini AI Mode

If you want live AI analysis from Gemini:

1. Copy `.env.example` to `.env`
2. Add your key:

   GEMINI_API_KEY=your_key_here
   PORT=3000

3. Restart the server.

The app will automatically use Gemini when a valid key is available; otherwise it falls back to the local analysis engine.

## Notes

- `.env` is ignored by Git and should not be committed.
- This project is intended for local demo and portfolio use.
- For production deployment, add proper backend security, rate limits, and deployment config.
