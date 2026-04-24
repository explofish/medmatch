/**
 * Unit tests for Job Matching Algorithm
 */

const {
  calculateMatchScore,
  calculateSpecialtyMatch,
  calculateLocationMatch,
  calculateExperienceMatch,
  calculateSalaryMatch,
  rankJobsForCandidate,
  filterByMinimumScore,
  formatSalary
} = require('../src/matching/engine');

describe('Job Matching Algorithm', () => {
  
  // Test data
  const mockCandidate = {
    id: 1,
    specialty: 'Cardiology',
    location: 'Berlin',
    experienceYears: 3,
    desiredSalaryMin: 80000,
    desiredSalaryMax: 100000,
    preferredJobType: 'full-time',
    preferredLocations: 'Berlin, Munich'
  };

  const mockJob = {
    id: 1,
    title: 'Kardiologe',
    specialty: 'Cardiology',
    location: 'Berlin',
    salaryMin: 85000,
    salaryMax: 110000,
    jobType: 'full-time',
    experienceRequired: 2
  };

  describe('Specialty Matching', () => {
    test('exact specialty match returns full score', () => {
      const result = calculateSpecialtyMatch('Cardiology', 'Cardiology');
      expect(result.score).toBe(40);
      expect(result.matched).toBe(true);
    });

    test('related specialty returns partial score', () => {
      const result = calculateSpecialtyMatch('Internal Medicine', 'Cardiology');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(40);
      expect(result.matched).toBe(true);
    });

    test('unrelated specialty returns zero', () => {
      const result = calculateSpecialtyMatch('Dermatology', 'Cardiology');
      expect(result.score).toBe(0);
      expect(result.matched).toBe(false);
    });

    test('missing specialty returns zero', () => {
      const result = calculateSpecialtyMatch(null, 'Cardiology');
      expect(result.score).toBe(0);
      expect(result.matched).toBe(false);
    });
  });

  describe('Location Matching', () => {
    test('exact location match returns full score', () => {
      const result = calculateLocationMatch('Berlin', 'Berlin', null);
      expect(result.score).toBe(30);
      expect(result.matched).toBe(true);
    });

    test('location in preferred list returns partial score', () => {
      const result = calculateLocationMatch('Hamburg', 'Berlin', 'Berlin, Munich');
      expect(result.score).toBe(15);
      expect(result.matched).toBe(true);
    });

    test('no location match returns zero', () => {
      const result = calculateLocationMatch('Hamburg', 'Berlin', 'Munich, Cologne');
      expect(result.score).toBe(0);
      expect(result.matched).toBe(false);
    });

    test('case insensitive matching', () => {
      const result = calculateLocationMatch('BERLIN', 'berlin', null);
      expect(result.score).toBe(30);
    });
  });

  describe('Experience Matching', () => {
    test('meets requirement returns full score', () => {
      const result = calculateExperienceMatch(5, 3);
      expect(result.score).toBe(20);
      expect(result.matched).toBe(true);
    });

    test('close to requirement returns partial score', () => {
      const result = calculateExperienceMatch(1, 3);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(20);
    });

    test('overqualified returns reduced score', () => {
      const result = calculateExperienceMatch(10, 3);
      expect(result.score).toBe(5);
    });

    test('no requirement returns full score', () => {
      const result = calculateExperienceMatch(0, 0);
      expect(result.score).toBe(20);
    });

    test('significantly underqualified returns zero', () => {
      const result = calculateExperienceMatch(1, 10);
      expect(result.score).toBe(0);
      expect(result.matched).toBe(false);
    });
  });

  describe('Salary Matching', () => {
    test('salary within desired range returns full score', () => {
      const result = calculateSalaryMatch(80000, 100000, 85000, 95000);
      expect(result.score).toBe(10);
      expect(result.matched).toBe(true);
    });

    test('job salary above desired range returns full score', () => {
      const result = calculateSalaryMatch(80000, 100000, 110000, 130000);
      expect(result.score).toBe(10);
    });

    test('partial overlap returns partial score', () => {
      const result = calculateSalaryMatch(90000, 110000, 80000, 95000);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(10);
    });

    test('no salary data returns neutral score', () => {
      const result = calculateSalaryMatch(null, null, 80000, 100000);
      expect(result.score).toBe(5);
    });
  });

  describe('Full Match Score Calculation', () => {
    test('perfect match returns high score', () => {
      const candidate = { ...mockCandidate };
      const job = { ...mockJob };
      const result = calculateMatchScore(candidate, job);
      
      expect(result.score).toBeGreaterThan(70);
      expect(result.matchReasons.length).toBeGreaterThan(0);
    });

    test('complete mismatch returns low score', () => {
      const candidate = {
        specialty: 'Dermatology',
        location: 'Hamburg',
        experienceYears: 1
      };
      const job = {
        specialty: 'Cardiology',
        location: 'Berlin',
        experienceRequired: 5
      };
      const result = calculateMatchScore(candidate, job);
      
      expect(result.score).toBeLessThan(40);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    test('includes match details', () => {
      const result = calculateMatchScore(mockCandidate, mockJob);
      
      expect(result.details).toHaveProperty('specialtyScore');
      expect(result.details).toHaveProperty('locationScore');
      expect(result.details).toHaveProperty('experienceScore');
      expect(result.details).toHaveProperty('salaryScore');
    });
  });

  describe('Job Ranking', () => {
    test('ranks jobs by match score', () => {
      const jobs = [
        { ...mockJob, id: 1, specialty: 'Dermatology' },
        { ...mockJob, id: 2, specialty: 'Cardiology' },
        { ...mockJob, id: 3, specialty: 'Surgery' }
      ];
      
      const ranked = rankJobsForCandidate(mockCandidate, jobs);
      
      expect(ranked[0].id).toBe(2); // Cardiology match should be first
      expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
    });

    test('includes match metadata in results', () => {
      const jobs = [mockJob];
      const ranked = rankJobsForCandidate(mockCandidate, jobs);
      
      expect(ranked[0]).toHaveProperty('matchScore');
      expect(ranked[0]).toHaveProperty('matchReasons');
      expect(ranked[0]).toHaveProperty('matchDetails');
    });
  });

  describe('Filter by Minimum Score', () => {
    test('filters out low scores', () => {
      const matches = [
        { matchScore: 90 },
        { matchScore: 60 },
        { matchScore: 30 },
        { matchScore: 10 }
      ];
      
      const filtered = filterByMinimumScore(matches, 50);
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(m => m.matchScore >= 50)).toBe(true);
    });

    test('returns empty array when no matches meet threshold', () => {
      const matches = [
        { matchScore: 30 },
        { matchScore: 20 }
      ];
      
      const filtered = filterByMinimumScore(matches, 50);
      
      expect(filtered.length).toBe(0);
    });
  });

  describe('Salary Formatting', () => {
    test('formats salary range correctly', () => {
      expect(formatSalary(80000, 100000)).toBe('€80,000 - €100,000');
    });

    test('formats minimum only', () => {
      expect(formatSalary(80000, null)).toBe('€80,000+');
    });

    test('formats maximum only', () => {
      expect(formatSalary(null, 100000)).toBe('Up to €100,000');
    });

    test('handles missing data', () => {
      expect(formatSalary(null, null)).toBe('Not specified');
    });
  });
});
