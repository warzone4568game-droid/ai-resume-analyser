const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const rootDir = __dirname;

function loadDotEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON payload.'));
      }
    });

    req.on('error', reject);
  });
}

function buildPrompt(jobRole, jobDesc, resumeText, resumeImage) {
  const promptParam = jobDesc ? `Target Role: "${jobRole}"\nJob Description:\n${jobDesc}` : `Target Role: "${jobRole}"`;

  return `Act as an advanced AI Resume Analyzer designed for modern recruitment and career growth.
Your task is to analyze resumes in a highly intelligent, structured, and actionable way.

1. Evaluate the resume for ATS (Applicant Tracking System) compatibility.
2. Analyze skills, experience, education, and projects.
3. Match the resume with a given job description or target role:
${promptParam}
4. Provide clear scoring, concrete enhancement steps to further improve the resume.
5. Generate actionable insights for career growth, and specify what exact things need to be learned extra for the user's chosen target domain/role.

Return ONLY a raw JSON object (no markdown, no quotes around the output) with the exact structure:
{
  "ats_score": 85,
  "job_match_score": 78,
  "skills": {
    "present": ["React", "Node.js"],
    "missing": ["Docker", "AWS"]
  },
  "experience_analysis": "...",
  "project_feedback": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "improvements": ["...", "..."],
  "enhancements": ["...", "..."],
  "learning_recommendations": ["...", "..."],
  "rewritten_sections": {
    "summary": "...",
    "experience": "..."
  },
  "career_suggestions": ["...", "..."]
}

${resumeImage ? 'Analyze the resume content from the provided image.' : `RESUME TEXT:\n${resumeText.substring(0, 3000)}`}
`;
}

const { buildLocalAnalysis } = require('./localAnalyzer');

async function analyzeResume(payload) {
  const { resumeText = '', resumeImage = null, jobRole = '', jobDesc = '' } = payload || {};

  if (!jobRole || !jobRole.trim()) {
    throw new Error('Target job role is required.');
  }

  const hasResumeText = typeof resumeText === 'string' && resumeText.trim().length > 50;
  const hasResumeImage = resumeImage && typeof resumeImage.data === 'string' && resumeImage.data.length > 0;

  if (!hasResumeText && !hasResumeImage) {
    throw new Error('Please provide a resume with meaningful content.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.trim() === 'dummy-key' || apiKey.trim() === 'your_gemini_api_key_here') {
    return buildLocalAnalysis({ resumeText, resumeImage, jobRole, jobDesc });
  }

  const parts = [{ text: buildPrompt(jobRole.trim(), jobDesc || '', resumeText || '', resumeImage) }];

  if (resumeImage) {
    parts.push({
      inlineData: {
        mimeType: resumeImage.mimeType || 'image/png',
        data: resumeImage.data
      }
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    const textData = await response.json();

    if (!response.ok) {
      const message = textData?.error?.message || 'Gemini request failed.';
      if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('invalid')) {
        return buildLocalAnalysis({ resumeText, resumeImage, jobRole, jobDesc });
      }
      throw new Error(message);
    }

    const resultText = textData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Gemini returned an empty response.');
    }

    const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    const msg = error && error.message ? error.message : '';
    if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
      return buildLocalAnalysis({ resumeText, resumeImage, jobRole, jobDesc });
    }
    throw error;
  }
}

function serveStaticFile(req, res) {
  let requestPath = req.url.split('?')[0];
  if (requestPath === '/') {
    requestPath = '/index.html';
  }

  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const targetPath = path.join(rootDir, safePath);

  if (!targetPath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(targetPath, (error, file) => {
    if (error) {
      sendJson(res, 404, { error: 'File not found.' });
      return;
    }

    const extension = path.extname(targetPath).toLowerCase();
    const mimeType = mimeTypes[extension] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(file);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (requestUrl.pathname === '/api/analyze' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const result = await analyzeResume(body);
      sendJson(res, 200, result);
    } catch (error) {
      const message = error && error.message ? error.message : 'Unknown server error.';
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (requestUrl.pathname === '/api/analyze' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  serveStaticFile(req, res);
});

server.listen(PORT, () => {
  console.log(`Resume analyzer server running on http://localhost:${PORT}`);
});
