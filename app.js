document.addEventListener('DOMContentLoaded', () => {
    // --- State & DOM Elements ---
    let resumeText = "";
    let resumeImage = null;
    
    // UI Elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resumeTextarea = document.getElementById('resume-text');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const sampleResumeBtn = document.getElementById('load-sample-btn');
    const sampleStatus = document.getElementById('sample-status');
    
    // Setting Elements
    const settingsModal = document.getElementById('settings-modal');
    const openSettingsBtn = document.getElementById('open-settings');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiKeyInput = document.getElementById('api-key-input');
    const keysStatus = document.getElementById('keys-status');

    // Job Modal Elements
    const jobModal = document.getElementById('job-modal');
    const closeJobModalBtn = document.getElementById('close-job-modal');
    const jobRoleInput = document.getElementById('job-role-input');
    const jobDescInput = document.getElementById('job-desc-input');
    const startAnalysisBtn = document.getElementById('start-analysis-btn');
    const jobRoleError = document.getElementById('job-role-error');
    const cancelAnalysisBtn = document.getElementById('cancel-analysis-btn');
    const copyReportBtn = document.getElementById('copy-report-btn');
    const downloadReportBtn = document.getElementById('download-report-btn');
    const resultsActions = document.getElementById('results-actions');
    const countdownEl = document.getElementById('retry-countdown');
    const loadingMsg = document.getElementById('loading-message');

    // Sections
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');

    let currentAbortController = null;
    let retryInterval = null;
    let currentReportText = '';

    // --- Local analysis mode ---
    function getActiveKey() { return ''; }

    if (apiKeyInput) {
        apiKeyInput.value = 'No key required';
    }

    // Load other settings
    jobRoleInput.value = localStorage.getItem('target_job_role') || '';
    if (jobDescInput) jobDescInput.value = localStorage.getItem('target_job_desc') || '';
    if (startAnalysisBtn) startAnalysisBtn.disabled = !jobRoleInput.value.trim();

    // --- Settings Logic ---
    openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    saveSettingsBtn.addEventListener('click', () => {
        keysStatus.style.color = 'var(--success)';
        keysStatus.textContent = '✅ Local analysis mode is active — no API key required.';
        setTimeout(() => settingsModal.classList.add('hidden'), 1000);
    });

    closeJobModalBtn.addEventListener('click', () => {
        jobModal.classList.add('hidden');
        if (jobRoleError) jobRoleError.textContent = '';
    });

    // --- Tab Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
            checkEnableButton();
        });
    });

    // --- Input Logic (Text) ---
    resumeTextarea.addEventListener('input', () => {
        resumeText = resumeTextarea.value.trim();
        resumeImage = null;
        if (sampleStatus) sampleStatus.textContent = '';
        checkEnableButton();
    });

    if (jobRoleInput) {
        jobRoleInput.addEventListener('input', () => {
            const role = jobRoleInput.value.trim();
            if (jobRoleError) jobRoleError.textContent = role ? '' : 'Please enter a target job role before analyzing.';
            if (startAnalysisBtn) startAnalysisBtn.disabled = !role;
        });
    }

    if (sampleResumeBtn) {
        sampleResumeBtn.addEventListener('click', () => {
            const sampleResume = `Johnathan Reed\nSenior Frontend Engineer\n\nProfile\nStrong frontend engineer with 6+ years of experience building scalable web applications with React, TypeScript, Node.js, and cloud-native tooling. Skilled in performance optimization, accessibility, and cross-functional collaboration with product and design teams.\n\nExperience\nSenior Frontend Engineer | Northstar Labs | 2021 - Present\n- Built responsive web experiences using React, TypeScript, and Next.js for enterprise dashboards used by 25,000+ users.\n- Improved page performance by 38% by optimizing bundle splitting, caching, and rendering strategies.\n- Partnered with backend engineers to design REST APIs and event-driven integrations.\n- Led accessibility and UX improvements, increasing Lighthouse scores from 72 to 96.\n\nFrontend Engineer | PixelForge Studio | 2018 - 2021\n- Developed React and Vue components for marketing and product platforms.\n- Created reusable design-system patterns that reduced implementation time by 30%.\n- Collaborated with QA to improve test coverage and reduce production regressions.\n\nSkills\nReact, TypeScript, JavaScript, HTML, CSS, Next.js, Redux, Node.js, REST APIs, Git, AWS, Docker, CI/CD, Jest, Testing Library, Accessibility.\n\nEducation\nB.S. Computer Science, University of Washington`; 

            tabs[1].click();
            resumeTextarea.value = sampleResume;
            resumeText = sampleResume.trim();
            resumeImage = null;
            if (sampleStatus) sampleStatus.textContent = 'Sample resume loaded and ready to analyze.';
            checkEnableButton();
        });
    }

    // --- PDF Upload Logic ---
    // Make sure pdf.js worker is set
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // --- Clipboard Paste Logic (Screenshots) ---
    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image/') === 0) {
                const file = item.getAsFile();
                if (file) {
                    tabs[0].click(); // Activate Upload Tab visually
                    handleFiles([file]);
                    e.preventDefault();
                    break;
                }
            }
        }
    });

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        
        if (file.type === 'application/pdf') {
            dropZone.innerHTML = `<h3>Processing ${file.name}...</h3><p>Extracting text from PDF</p>`;
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const typedarray = new Uint8Array(this.result);
                resumeImage = null;
                extractText(typedarray);
            };
            fileReader.readAsArrayBuffer(file);
        } else if (file.type === 'image/jpeg' || file.type === 'image/png') {
            dropZone.innerHTML = `<h3>Processing ${file.name}...</h3><p>Preparing image</p>`;
            const fileReader = new FileReader();
            fileReader.onload = function() {
                const base64Data = this.result.split(',')[1];
                resumeImage = {
                    mimeType: file.type,
                    data: base64Data
                };
                resumeText = ""; 
                dropZone.innerHTML = `<div class="upload-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><h3>Image Loaded Successfully</h3><p>Ready to analyze</p>`;
                checkEnableButton();
            };
            fileReader.readAsDataURL(file);
        } else {
            alert('Please upload a PDF, JPG, or PNG file.');
        }
    }

    async function extractText(pdfData) {
        try {
            const pdf = await pdfjsLib.getDocument(pdfData).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }
            resumeText = fullText;
            dropZone.innerHTML = `<div class="upload-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><h3>PDF Loaded Successfully</h3><p>Ready to analyze</p>`;
            checkEnableButton();
        } catch (error) {
            console.error(error);
            dropZone.innerHTML = `<h3>Error Extracting Text</h3><p>Please try pasting text instead.</p>`;
        }
    }

    function checkEnableButton() {
        if (resumeText.length > 50 || resumeImage !== null) {
            analyzeBtn.disabled = false;
        } else {
            analyzeBtn.disabled = true;
        }
    }

    function clearRetryState() {
        if (retryInterval) {
            clearInterval(retryInterval);
            retryInterval = null;
        }
        if (countdownEl) {
            countdownEl.style.display = 'none';
            countdownEl.textContent = '';
        }
    }

    function buildReportText(data) {
        const ensureArray = (item) => Array.isArray(item) ? item : (item ? [item] : []);
        const skills = data?.skills || { present: [], missing: [] };
        const lines = [
            'AI Resume Analyzer Report',
            '========================',
            `ATS Score: ${data?.ats_score ?? 0}/100`,
            `Job Match Score: ${data?.job_match_score ?? 0}/100`,
            '',
            'Strengths:',
            ...ensureArray(data?.strengths).map(item => `- ${item}`),
            '',
            'Areas for Improvement:',
            ...ensureArray(data?.improvements || data?.weaknesses).map(item => `- ${item}`),
            '',
            'Present Skills:',
            ...ensureArray(skills.present).map(item => `- ${item}`),
            '',
            'Missing Skills:',
            ...ensureArray(skills.missing).map(item => `- ${item}`),
            '',
            'Experience & Projects Analysis:',
            data?.experience_analysis || '',
            '',
            'Project Feedback:',
            data?.project_feedback || '',
            '',
            'Recommended Learning:',
            ...ensureArray(data?.learning_recommendations).map(item => `- ${item}`),
            '',
            'Career Suggestions:',
            ...ensureArray(data?.career_suggestions).map(item => `- ${item}`)
        ];
        return lines.join('\n');
    }

    if (copyReportBtn) {
        copyReportBtn.addEventListener('click', async () => {
            if (!currentReportText) return;
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(currentReportText);
                } else {
                    const helper = document.createElement('textarea');
                    helper.value = currentReportText;
                    helper.setAttribute('readonly', '');
                    helper.style.position = 'fixed';
                    helper.style.opacity = '0';
                    document.body.appendChild(helper);
                    helper.select();
                    document.execCommand('copy');
                    document.body.removeChild(helper);
                }
                copyReportBtn.textContent = 'Copied!';
                setTimeout(() => { copyReportBtn.textContent = 'Copy Report'; }, 1200);
            } catch (error) {
                console.error(error);
                alert('Copy failed. Please try again or use the download button instead.');
            }
        });
    }

    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', () => {
            if (!currentReportText) return;
            const blob = new Blob([currentReportText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'resume-analysis-report.txt';
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    // --- API & Analysis Logic ---
    analyzeBtn.addEventListener('click', () => {
        if (!(resumeText.length > 50 || resumeImage !== null)) {
            alert('Please add a resume first before analyzing.');
            return;
        }
        jobModal.classList.remove('hidden');
        if (jobRoleInput) {
            if (jobRoleError) jobRoleError.textContent = jobRoleInput.value.trim() ? '' : 'Please enter a target job role before analyzing.';
            if (startAnalysisBtn) startAnalysisBtn.disabled = !jobRoleInput.value.trim();
        }
    });

    cancelAnalysisBtn.addEventListener('click', () => {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
        clearRetryState();
        loadingSection.classList.add('hidden');
        if (loadingMsg) loadingMsg.textContent = 'AI is deeply analyzing your resume...';
        analyzeBtn.disabled = false;
    });

    startAnalysisBtn.addEventListener('click', async () => {
        const jobRole = jobRoleInput.value.trim();
        if (!jobRole) {
            if (jobRoleError) jobRoleError.textContent = 'Please enter a target job role before analyzing.';
            if (startAnalysisBtn) startAnalysisBtn.disabled = true;
            return;
        }

        const jobDesc = jobDescInput ? jobDescInput.value.trim() : "";
        
        localStorage.setItem('target_job_role', jobRole);
        if (jobDescInput) localStorage.setItem('target_job_desc', jobDesc);

        if (jobRoleError) jobRoleError.textContent = '';
        jobModal.classList.add('hidden');
        clearRetryState();
        currentAbortController = new AbortController();

        // UI Reset
        resultsSection.classList.add('hidden');
        if (resultsActions) resultsActions.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        if (loadingMsg) loadingMsg.textContent = 'AI is deeply analyzing your resume...';

        try {
            const response = await fetch('http://localhost:3000/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resumeText,
                    resumeImage,
                    jobRole,
                    jobDesc
                }),
                signal: currentAbortController.signal
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to analyze resume on the backend.');
            }

            currentAbortController = null;
            displayResults(responseData);

        } catch (error) {
            currentAbortController = null;
            if (error.name === 'AbortError') {
                loadingSection.classList.add('hidden');
                return;
            }

            console.error(error);
            const msg = error.message || '';
            const isServerUnavailable = msg.includes('Failed to fetch') || msg.includes('fetch');
            const finalMsg = isServerUnavailable
                ? 'Backend server unavailable. Start it with "node server.js".'
                : msg;
            const isQuotaError = msg.toLowerCase().includes('quota') || msg.includes('429');

            if (isQuotaError) {
                const retryMatch = msg.match(/retry in (\d+(\.\d+)?)s/i);
                const retryAfter = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;
                if (countdownEl) countdownEl.style.display = 'block';
                if (loadingMsg) loadingMsg.textContent = '⚠️ Quota limit hit. Auto-retrying...';
                let secs = retryAfter;
                retryInterval = setInterval(() => {
                    if (countdownEl) countdownEl.textContent = `Retrying in ${secs}s...`;
                    secs--;
                    if (secs < 0) {
                        clearInterval(retryInterval);
                        retryInterval = null;
                        if (countdownEl) countdownEl.textContent = '🔄 Retrying now...';
                        if (loadingMsg) loadingMsg.textContent = 'AI is deeply analyzing your resume...';
                        startAnalysisBtn.click();
                    }
                }, 1000);
            } else {
                alert("Error analyzing resume: " + finalMsg);
                loadingSection.classList.add('hidden');
                analyzeBtn.disabled = false;
            }
        }
    });

    function displayResults(data) {
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        if (resultsActions) resultsActions.classList.remove('hidden');
        analyzeBtn.disabled = false;
        currentReportText = buildReportText(data);

        // Setup scores
        const atsScore = data.ats_score || 0;
        const matchScore = data.job_match_score || 0;

        function updateProgress(idPrefix, score) {
            const progressCircle = document.querySelector(`#${idPrefix}-progress .progress`);
            const scoreNumber = document.getElementById(`${idPrefix}-score-number`);
            const verdict = document.getElementById(`${idPrefix}-score-verdict`);
            const offset = 283 - (283 * score) / 100;
            
            setTimeout(() => {
                progressCircle.style.strokeDashoffset = offset;
                if (score > 80) {
                    progressCircle.style.stroke = 'var(--success)';
                    verdict.style.color = 'var(--success)';
                    verdict.textContent = "Excellent Match";
                } else if (score > 60) {
                    progressCircle.style.stroke = 'var(--warning)';
                    verdict.style.color = 'var(--warning)';
                    verdict.textContent = "Good - Needs Tweaks";
                } else {
                    progressCircle.style.stroke = 'var(--danger)';
                    verdict.style.color = 'var(--danger)';
                    verdict.textContent = "Needs Major Revision";
                }
                animateValue(scoreNumber, 0, score, 1500);
            }, 100);
        }

        updateProgress('ats', atsScore);
        updateProgress('match', matchScore);

        // Helper to ensure array
        const ensureArray = (item) => Array.isArray(item) ? item : (item ? [item] : []);

        // Populate Lists
        document.getElementById('strengths-list').innerHTML = ensureArray(data.strengths).map(s => `<li>${s}</li>`).join('');
        document.getElementById('improvements-list').innerHTML = ensureArray(data.improvements || data.weaknesses).map(s => `<li>${s}</li>`).join('');

        // Populate Skills
        const skillsObj = data.skills || { present: [], missing: [] };
        document.getElementById('skills-present-container').innerHTML = ensureArray(skillsObj.present).map(k => {
            return `<span class="keyword-tag">${k}</span>`;
        }).join('');
        
        document.getElementById('skills-missing-container').innerHTML = ensureArray(skillsObj.missing).map(k => {
            return `<span class="keyword-tag missing">${k}</span>`;
        }).join('');

        // Parse Markdown Helper
        const parseMd = str => (str || "").replace(/\n/g, '<br/>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Detailed Feedback
        document.getElementById('experience-feedback').innerHTML = parseMd(data.experience_analysis);
        document.getElementById('project-feedback').innerHTML = parseMd(data.project_feedback);
        
        const rewriteSummary = data.rewritten_sections?.summary ? `<h4>Summary</h4><p>${parseMd(data.rewritten_sections.summary)}</p>` : '';
        const rewriteExp = data.rewritten_sections?.experience ? `<h4>Experience</h4><p>${parseMd(data.rewritten_sections.experience)}</p>` : '';
        document.getElementById('rewrite-feedback').innerHTML = rewriteSummary + rewriteExp;

        // Future Growth & Enhancements
        document.getElementById('enhancements-list').innerHTML = ensureArray(data.enhancements).map(s => `<li>${s}</li>`).join('');
        document.getElementById('learning-list').innerHTML = ensureArray(data.learning_recommendations).map(s => `<li>${s}</li>`).join('');
        
        // Career Insights
        document.getElementById('career-feedback').innerHTML = ensureArray(data.career_suggestions).map(s => `<li>${s}</li>`).join('');
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
