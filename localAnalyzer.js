function extractTextValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return extractTextValue(value).toLowerCase();
}

function detectSkillKeywords(text) {
  const skillMap = {
    'React': ['react', 'jsx', 'frontend', 'ui'],
    'JavaScript': ['javascript', 'js', 'es6'],
    'TypeScript': ['typescript', 'ts'],
    'Node.js': ['node', 'node.js', 'express', 'backend'],
    'Python': ['python', 'django', 'flask'],
    'AWS': ['aws', 'ec2', 's3', 'lambda'],
    'Docker': ['docker', 'containers'],
    'Kubernetes': ['kubernetes', 'k8s'],
    'SQL': ['sql', 'postgres', 'mysql', 'database'],
    'MongoDB': ['mongodb', 'mongo'],
    'Git': ['git', 'github', 'version control'],
    'Java': ['java', 'spring'],
    'C#': ['c#', 'dotnet', 'asp.net'],
    'UI/UX': ['ux', 'ui', 'design systems', 'accessibility'],
    'Leadership': ['leadership', 'mentorship', 'team lead'],
    'Project Management': ['project management', 'stakeholder', 'roadmap']
  };

  const found = [];
  Object.entries(skillMap).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => text.includes(pattern))) {
      found.push(skill);
    }
  });

  return found;
}

function inferMissingSkills(roleText, presentSkills) {
  const roleLower = normalizeText(roleText);
  const domainHints = {
    'software engineer': ['JavaScript', 'React', 'Git', 'SQL'],
    'frontend': ['React', 'JavaScript', 'TypeScript', 'UI/UX'],
    'backend': ['Node.js', 'SQL', 'AWS', 'Docker'],
    'full stack': ['React', 'Node.js', 'SQL', 'AWS'],
    'data': ['Python', 'SQL', 'AWS'],
    'devops': ['Docker', 'Kubernetes', 'AWS', 'Git'],
    'product': ['Project Management', 'Leadership', 'SQL'],
    'designer': ['UI/UX', 'Figma', 'JavaScript']
  };

  const matchedDomain = Object.entries(domainHints).find(([key]) => roleLower.includes(key));
  const expectedSkills = matchedDomain ? matchedDomain[1] : ['JavaScript', 'Git', 'SQL'];
  const missing = expectedSkills.filter(skill => !presentSkills.includes(skill));
  return Array.from(new Set(missing)).slice(0, 6);
}

function buildLocalAnalysis(payload) {
  const resumeText = extractTextValue(payload?.resumeText || '');
  const jobRole = extractTextValue(payload?.jobRole || '');
  const jobDesc = extractTextValue(payload?.jobDesc || '');

  const presentSkills = detectSkillKeywords(resumeText.toLowerCase());
  const missingSkills = inferMissingSkills(jobRole, presentSkills);

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(resumeText);
  const hasExperience = /\b(\d+\+?\s*years?|experience|worked|engineer|developer|analyst)\b/i.test(resumeText);
  const hasEducation = /\b(b\.s|bachelor|master|degree|university|college|education)\b/i.test(resumeText);
  const hasProjects = /\b(projects?|portfolio|built|developed|implemented)\b/i.test(resumeText);

  const atsScore = Math.min(100, Math.max(35, Math.round(
    25 +
    (hasEmail ? 15 : 0) +
    (hasExperience ? 20 : 0) +
    (hasEducation ? 15 : 0) +
    (hasProjects ? 15 : 0) +
    (presentSkills.length > 0 ? 10 : 0)
  )));

  const jobMatchScore = Math.min(100, Math.max(20, Math.round(
    30 + (presentSkills.length * 9) - (missingSkills.length * 6) + (jobDesc ? 10 : 0)
  )));

  const strengths = [];
  if (presentSkills.length) strengths.push(`Strong technical foundation in ${presentSkills.slice(0, 3).join(', ')}`);
  if (hasExperience) strengths.push('Clear professional experience and measurable achievements');
  if (hasProjects) strengths.push('Project work demonstrates practical implementation skills');
  if (!strengths.length) strengths.push('Solid foundation with room to strengthen impact statements');

  const weaknesses = [];
  if (!hasEmail) weaknesses.push('Add a professional email address for ATS friendliness and recruiter contact');
  if (!hasExperience) weaknesses.push('Include clearer work experience dates and responsibilities');
  if (missingSkills.length) weaknesses.push(`Missing role-critical skills: ${missingSkills.join(', ')}`);
  if (!weaknesses.length) weaknesses.push('Improve keyword alignment with the target role and quantify outcomes more explicitly');

  const improvements = [
    'Add measurable achievements with numbers, scope, and business impact.',
    'Align your top skills directly to the target job title and key responsibilities.',
    'Add a concise summary that immediately shows fit for the target role.'
  ];

  const enhancements = [
    'Refine the summary headline to match the target role exactly.',
    'Put the most relevant technical skills near the top of the resume.',
    'Convert responsibilities into measurable results with metrics and outcomes.'
  ];

  const learningRecommendations = missingSkills.length
    ? missingSkills.map(skill => `Learn or strengthen ${skill} to better align with ${jobRole || 'the target role'}.`)
    : ['Continue building domain-specific depth and broader cross-functional skills to increase role flexibility.'];

  const careerSuggestions = [
    `Focus on ${jobRole || 'the target role'} by highlighting relevant projects and measurable outcomes.`,
    'Build a portfolio or case studies that demonstrate direct use of the most important role skills.',
    'Target role-specific certifications or hands-on projects to improve match quality.'
  ];

  return {
    ats_score: atsScore,
    job_match_score: jobMatchScore,
    skills: {
      present: presentSkills.length ? presentSkills : ['Career-relevant skills need clearer positioning'],
      missing: missingSkills.length ? missingSkills : ['Role-specific depth and quantifiable impact']
    },
    experience_analysis: `The resume shows ${hasExperience ? 'clear professional experience' : 'limited experience visibility'} with ${presentSkills.length ? 'relevant technical strength' : 'room to improve clarity and role alignment'}. Focus on job-specific impact and stronger evidence of expertise in the target domain.`,
    project_feedback: `The resume includes ${hasProjects ? 'project evidence and implementation work' : 'limited project depth'}; adding measurable results and a clearer link to the target role would improve recruiter perception and ATS relevance.`,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    improvements: improvements,
    enhancements: enhancements,
    learning_recommendations: learningRecommendations,
    rewritten_sections: {
      summary: `${jobRole || 'Target Role'} candidate with ${presentSkills.slice(0, 2).join(', ') || 'core technical skills'} and a strong record of building impactful solutions, solving real-world problems, and driving measurable outcomes.`,
      experience: `Experienced professional with hands-on involvement in ${presentSkills.slice(0, 2).join(', ') || 'core technical systems'} and a focus on delivering measurable business value, improving quality, and supporting team success in ${jobRole || 'the target role'}.`
    },
    career_suggestions: careerSuggestions
  };
}

module.exports = {
  buildLocalAnalysis
};
