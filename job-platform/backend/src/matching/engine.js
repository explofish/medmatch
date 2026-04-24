/**
 * Job Matching Algorithm
 * 
 * Calculates match score (0-100) between a candidate and a job based on:
 * - Specialty match (40 points max)
 * - Location match (30 points max)
 * - Experience match (20 points max)
 * - Salary match (10 points max)
 */

/**
 * Calculate match score between candidate and job
 * @param {Object} candidate - Candidate profile
 * @param {Object} job - Job posting
 * @returns {Object} - Match result with score and reasons
 */
function calculateMatchScore(candidate, job) {
  let score = 0;
  const matchReasons = [];
  const mismatches = [];

  // 1. Specialty Match (40 points)
  const specialtyScore = calculateSpecialtyMatch(candidate.specialty, job.specialty);
  score += specialtyScore.score;
  if (specialtyScore.matched) {
    matchReasons.push(`Specialty match: ${candidate.specialty || 'Not specified'}`);
  } else {
    mismatches.push(`Specialty mismatch: Job requires ${job.specialty}, candidate has ${candidate.specialty || 'none'}`);
  }

  // 2. Location Match (30 points)
  const locationScore = calculateLocationMatch(candidate.location, job.location, candidate.preferredLocations);
  score += locationScore.score;
  if (locationScore.matched) {
    matchReasons.push(`Location match: ${locationScore.matchedLocation || job.location}`);
  } else {
    mismatches.push(`Location mismatch: Job in ${job.location}, candidate prefers ${candidate.preferredLocations || candidate.location || 'not specified'}`);
  }

  // 3. Experience Match (20 points)
  const experienceScore = calculateExperienceMatch(
    candidate.experienceYears || 0,
    job.experienceRequired || 0
  );
  score += experienceScore.score;
  if (experienceScore.matched) {
    matchReasons.push(`Experience match: ${candidate.experienceYears} years (required: ${job.experienceRequired})`);
  } else {
    mismatches.push(`Experience gap: Candidate has ${candidate.experienceYears || 0} years, job requires ${job.experienceRequired}`);
  }

  // 4. Salary Match (10 points)
  const salaryScore = calculateSalaryMatch(
    candidate.desiredSalaryMin,
    candidate.desiredSalaryMax,
    job.salaryMin,
    job.salaryMax
  );
  score += salaryScore.score;
  if (salaryScore.matched) {
    matchReasons.push(`Salary alignment: Job offers ${formatSalary(job.salaryMin, job.salaryMax)}`);
  }

  // 5. Job Type Match (bonus consideration, not scored separately)
  if (candidate.preferredJobType && candidate.preferredJobType.toLowerCase() === job.jobType.toLowerCase()) {
    matchReasons.push(`Job type preference: ${job.jobType}`);
  }

  return {
    score: Math.round(score),
    matchReasons,
    mismatches: mismatches.length > 0 ? mismatches : undefined,
    details: {
      specialtyScore: specialtyScore.score,
      locationScore: locationScore.score,
      experienceScore: experienceScore.score,
      salaryScore: salaryScore.score
    }
  };
}

/**
 * Calculate specialty match score
 * Exact match = 40 points
 * Related specialty = 20 points
 * No match = 0 points
 */
function calculateSpecialtyMatch(candidateSpecialty, jobSpecialty) {
  if (!candidateSpecialty || !jobSpecialty) {
    return { score: 0, matched: false };
  }

  const candidateSpec = candidateSpecialty.toLowerCase().trim();
  const jobSpec = jobSpecialty.toLowerCase().trim();

  // Exact match
  if (candidateSpec === jobSpec) {
    return { score: 40, matched: true };
  }

  // Related specialties mapping
  const relatedSpecialties = {
    'internal medicine': ['general medicine', 'family medicine', 'primary care'],
    'surgery': ['general surgery', 'orthopedic surgery', 'cardiac surgery', 'neurosurgery'],
    'cardiology': ['internal medicine', 'cardiac surgery'],
    'pediatrics': ['neonatology', 'child health'],
    'radiology': ['diagnostic imaging', 'nuclear medicine'],
    'emergency medicine': ['critical care', 'trauma'],
    'anesthesiology': ['critical care', 'pain management'],
    'psychiatry': ['psychology', 'mental health'],
    'obstetrics': ['gynecology', 'ob/gyn'],
    'gynecology': ['obstetrics', 'ob/gyn']
  };

  // Check if specialties are related
  for (const [main, related] of Object.entries(relatedSpecialties)) {
    if ((candidateSpec === main && related.includes(jobSpec)) ||
        (jobSpec === main && related.includes(candidateSpec))) {
      return { score: 20, matched: true };
    }
  }

  // Check for partial match (e.g., "cardiac surgery" and "cardiology")
  if (candidateSpec.includes(jobSpec) || jobSpec.includes(candidateSpec)) {
    return { score: 25, matched: true };
  }

  return { score: 0, matched: false };
}

/**
 * Calculate location match score
 * Exact match = 30 points
 * Same region/city = 20 points
 * In preferred locations = 15 points
 * No match = 0 points
 */
function calculateLocationMatch(candidateLocation, jobLocation, preferredLocations) {
  if (!jobLocation) {
    return { score: 0, matched: false };
  }

  const jobLoc = jobLocation.toLowerCase().trim();

  // Check candidate's current location
  if (candidateLocation) {
    const candLoc = candidateLocation.toLowerCase().trim();
    
    // Exact match
    if (candLoc === jobLoc) {
      return { score: 30, matched: true, matchedLocation: jobLocation };
    }

    // Same city/region (one contains the other)
    if (candLoc.includes(jobLoc) || jobLoc.includes(candLoc)) {
      return { score: 20, matched: true, matchedLocation: jobLocation };
    }
  }

  // Check preferred locations
  if (preferredLocations) {
    const prefs = preferredLocations.toLowerCase().split(',').map(s => s.trim());
    for (const pref of prefs) {
      if (pref === jobLoc || jobLoc.includes(pref) || pref.includes(jobLoc)) {
        return { score: 15, matched: true, matchedLocation: jobLocation };
      }
    }
  }

  return { score: 0, matched: false };
}

/**
 * Calculate experience match score
 * Meets requirement = 20 points
 * Within 2 years of requirement = 15 points
 * Within 5 years = 10 points
 * Overqualified (2x requirement) = 5 points
 * Underqualified = 0 points
 */
function calculateExperienceMatch(candidateYears, requiredYears) {
  if (requiredYears === 0 || requiredYears === undefined) {
    return { score: 20, matched: true }; // No requirement = full points
  }

  const candYears = candidateYears || 0;
  const reqYears = requiredYears || 0;

  if (candYears >= reqYears) {
    if (candYears >= reqYears * 2) {
      return { score: 5, matched: true }; // Overqualified
    }
    return { score: 20, matched: true }; // Perfect match
  }

  const gap = reqYears - candYears;
  if (gap <= 2) {
    return { score: 15, matched: true }; // Close to requirement
  }
  if (gap <= 5) {
    return { score: 10, matched: true }; // Within 5 years
  }

  return { score: 0, matched: false }; // Underqualified
}

/**
 * Calculate salary match score
 * Salary within desired range = 10 points
 * Salary above desired max = 10 points
 * Salary below desired min but close = 5 points
 * No overlap = 0 points
 */
function calculateSalaryMatch(desiredMin, desiredMax, jobMin, jobMax) {
  // No salary data = neutral
  if ((!desiredMin && !desiredMax) || (!jobMin && !jobMax)) {
    return { score: 5, matched: null };
  }

  const dMin = desiredMin || 0;
  const dMax = desiredMax || Number.MAX_SAFE_INTEGER;
  const jMin = jobMin || 0;
  const jMax = jobMax || Number.MAX_SAFE_INTEGER;

  // Job salary completely above desired range (good for candidate)
  if (jMin > dMax) {
    return { score: 10, matched: true };
  }

  // Check for overlap
  const hasOverlap = jMin <= dMax && jMax >= dMin;

  if (hasOverlap) {
    // Job salary within desired range
    if (jMin >= dMin && jMax <= dMax) {
      return { score: 10, matched: true };
    }
    // Partial overlap
    return { score: 7, matched: true };
  }

  // Job salary below desired range
  if (jMax < dMin) {
    const gap = dMin - jMax;
    if (gap < 10000) {
      return { score: 5, matched: false }; // Close enough
    }
    return { score: 0, matched: false };
  }

  return { score: 0, matched: false };
}

/**
 * Format salary for display
 */
function formatSalary(min, max) {
  if (!min && !max) return 'Not specified';
  if (!max) return `€${min.toLocaleString()}+`;
  if (!min) return `Up to €${max.toLocaleString()}`;
  return `€${min.toLocaleString()} - €${max.toLocaleString()}`;
}

/**
 * Rank jobs by match score for a candidate
 * @param {Object} candidate - Candidate profile
 * @param {Array} jobs - Array of job postings
 * @returns {Array} - Jobs sorted by match score (highest first)
 */
function rankJobsForCandidate(candidate, jobs) {
  const ranked = jobs.map(job => {
    const match = calculateMatchScore(candidate, job);
    return {
      ...job,
      matchScore: match.score,
      matchReasons: match.matchReasons,
      matchMismatches: match.mismatches,
      matchDetails: match.details
    };
  });

  // Sort by score descending, then by posted date (newest first)
  return ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return new Date(b.postedAt) - new Date(a.postedAt);
  });
}

/**
 * Get top N job matches for a candidate
 */
function getTopMatches(candidate, jobs, limit = 10) {
  const ranked = rankJobsForCandidate(candidate, jobs);
  return ranked.slice(0, limit);
}

/**
 * Filter matches by minimum score threshold
 */
function filterByMinimumScore(matches, minScore = 50) {
  return matches.filter(match => match.matchScore >= minScore);
}

module.exports = {
  calculateMatchScore,
  calculateSpecialtyMatch,
  calculateLocationMatch,
  calculateExperienceMatch,
  calculateSalaryMatch,
  rankJobsForCandidate,
  getTopMatches,
  filterByMinimumScore,
  formatSalary
};
