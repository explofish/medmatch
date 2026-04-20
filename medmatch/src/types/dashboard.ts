// Dashboard and candidate types

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'GRADUATE' | 'EMPLOYER' | 'ADMIN';
  image: string | null;
  createdAt: string;
}

export interface GraduateProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  location: string | null;
  specialization: string | null;
  graduationYear: number | null;
  university: string | null;
  bio: string | null;
  skills: string[];
  cvUrl: string | null;
  preferences: {
    desiredLocations?: string[];
    desiredSpecializations?: string[];
    salaryMin?: number;
    salaryMax?: number;
    remotePreference?: 'remote' | 'hybrid' | 'onsite' | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  specialization: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  employmentType: string;
  experienceLevel: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'FILLED';
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    location: string | null;
  } | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  status: 'PENDING' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'ACCEPTED' | 'WITHDRAWN';
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  shortlistedCount: number;
  newJobsThisWeek: number;
}

export interface JobFilters {
  specialization?: string;
  location?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  searchQuery?: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  specialization?: string;
  graduationYear?: number;
  university?: string;
  bio?: string;
  skills?: string[];
  preferences?: GraduateProfile['preferences'];
}
