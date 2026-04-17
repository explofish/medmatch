-- Database Schema for Job Matching Platform
-- Medical Graduate Job Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (base table for both graduates and employers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('graduate', 'employer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Medical Specializations lookup table
CREATE TABLE specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Graduate profiles
CREATE TABLE graduate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Deutschland',
    education_level VARCHAR(50), -- 'student', 'graduate', 'resident', 'specialist'
    university VARCHAR(255),
    graduation_year INTEGER,
    profile_summary TEXT,
    cv_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    is_open_to_work BOOLEAN DEFAULT true,
    preferred_job_types VARCHAR(50)[], -- 'full_time', 'part_time', 'locum', 'remote'
    preferred_locations VARCHAR(100)[],
    expected_salary_min INTEGER,
    expected_salary_max INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Graduate specializations (many-to-many)
CREATE TABLE graduate_specializations (
    graduate_id UUID REFERENCES graduate_profiles(id) ON DELETE CASCADE,
    specialization_id UUID REFERENCES specializations(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
    years_experience INTEGER DEFAULT 0,
    PRIMARY KEY (graduate_id, specialization_id)
);

-- Employer profiles
CREATE TABLE employer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_description TEXT,
    company_website VARCHAR(500),
    company_size VARCHAR(50), -- '1-10', '11-50', '51-200', '201-1000', '1000+'
    industry VARCHAR(100),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Deutschland',
    contact_person_name VARCHAR(200),
    contact_phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job postings
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'Deutschland',
    is_remote BOOLEAN DEFAULT false,
    is_hybrid BOOLEAN DEFAULT false,
    job_type VARCHAR(50) NOT NULL, -- 'full_time', 'part_time', 'locum', 'contract', 'internship'
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'EUR',
    salary_period VARCHAR(20) DEFAULT 'yearly', -- 'hourly', 'monthly', 'yearly'
    status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'paused', 'closed', 'filled'
    application_deadline DATE,
    start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job specializations required (many-to-many)
CREATE TABLE job_specializations (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    specialization_id UUID REFERENCES specializations(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true,
    PRIMARY KEY (job_id, specialization_id)
);

-- Job applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    graduate_id UUID REFERENCES graduate_profiles(id) ON DELETE CASCADE,
    cover_letter TEXT,
    cv_url VARCHAR(500),
    status VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'viewed', 'shortlisted', 'rejected', 'interview_scheduled', 'offer_made', 'hired', 'withdrawn'
    employer_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, graduate_id)
);

-- Matches (algorithm-generated matches between graduates and jobs)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    graduate_id UUID REFERENCES graduate_profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    match_reasons JSONB, -- Array of reasons why this match was made
    is_viewed_by_graduate BOOLEAN DEFAULT false,
    is_saved_by_graduate BOOLEAN DEFAULT false,
    is_viewed_by_employer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(graduate_id, job_id)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_match', 'application_viewed', 'interview_scheduled', 'job_posted', 'application_received'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_entity_type VARCHAR(50), -- 'job', 'application', 'match', 'employer'
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_graduate_profiles_user_id ON graduate_profiles(user_id);
CREATE INDEX idx_graduate_profiles_location ON graduate_profiles(location_city, location_state);
CREATE INDEX idx_employer_profiles_user_id ON employer_profiles(user_id);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_location ON jobs(location_city, location_state);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_graduate_id ON applications(graduate_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_matches_graduate_id ON matches(graduate_id);
CREATE INDEX idx_matches_job_id ON matches(job_id);
CREATE INDEX idx_matches_score ON matches(match_score DESC);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Insert common medical specializations for German market
INSERT INTO specializations (name, category, description) VALUES
-- Clinical specializations
('Allgemeinmedizin', 'clinical', 'Allgemeine Medizin und Hausarztmedizin'),
('Innere Medizin', 'clinical', 'Interne Medizin'),
('Kardiologie', 'clinical', 'Herz- und Kreislauferkrankungen'),
('Neurologie', 'clinical', 'Nervenerkrankungen'),
('Onkologie', 'clinical', 'Krebsmedizin'),
('Pädiatrie', 'clinical', 'Kinder- und Jugendmedizin'),
('Psychiatrie', 'clinical', 'Psychische Gesundheit'),
('Radiologie', 'clinical', 'Bildgebende Verfahren'),
('Anästhesiologie', 'clinical', 'Anästhesie und Intensivmedizin'),
('Chirurgie', 'clinical', 'Allgemeine Chirurgie'),
('Orthopädie', 'clinical', 'Bewegungsapparat'),
('Gynäkologie', 'clinical', 'Frauenheilkunde'),
('Dermatologie', 'clinical', 'Hauterkrankungen'),
('Augenheilkunde', 'clinical', 'Augenerkrankungen'),
('Hals-Nasen-Ohrenheilkunde', 'clinical', 'HNO-Heilkunde'),
('Urologie', 'clinical', 'Urologische Medizin'),
('Gastroenterologie', 'clinical', 'Verdauungserkrankungen'),
('Nephrologie', 'clinical', 'Nierenerkrankungen'),
('Pneumologie', 'clinical', 'Lungenerkrankungen'),
('Rheumatologie', 'clinical', 'Rheumatische Erkrankungen'),
('Endokrinologie', 'clinical', 'Hormonerkrankungen'),
('Infektiologie', 'clinical', 'Infektionskrankheiten'),
('Geriatrie', 'clinical', 'Altersmedizin'),
('Notfallmedizin', 'clinical', 'Akutmedizin und Notfallversorgung'),

-- Non-clinical specializations
('Medizinische Forschung', 'non_clinical', 'Klinische Forschung und Studien'),
('Pharmaindustrie', 'non_clinical', 'Pharmazeutische Industrie'),
('Medizinisches Schreiben', 'non_clinical', 'Medical Writing und Kommunikation'),
('Gesundheitsmanagement', 'non_clinical', 'Klinisches Management'),
('Öffentlicher Gesundheitsdienst', 'non_clinical', 'Public Health'),
('Medizintechnik', 'non_clinical', 'Medizinische Technologie und IT'),
('Beratung', 'non_clinical', 'Healthcare Consulting'),
('Regulatorische Angelegenheiten', 'non_clinical', 'Regulatory Affairs'),
('Qualitätsmanagement', 'non_clinical', 'Qualitätssicherung im Gesundheitswesen'),
('Medizinische Bildung', 'non_clinical', 'Lehre und Ausbildung'),
('Telemedizin', 'non_clinical', 'Digitale Gesundheitsversorgung');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graduate_profiles_updated_at BEFORE UPDATE ON graduate_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employer_profiles_updated_at BEFORE UPDATE ON employer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
