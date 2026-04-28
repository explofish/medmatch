/**
 * Comprehensive Seed Data for MedMatch
 * Realistic DACH medical market data
 * 
 * @author MedMatch CTO
 * @version 1.0.0
 */

// Real German first names
const FIRST_NAMES = {
  male: ['Alexander', 'Benjamin', 'Christian', 'Daniel', 'David', 'Elias', 'Felix', 'Finn', 'Florian', 
    'Gabriel', 'Henry', 'Jakob', 'Jonas', 'Julian', 'Leon', 'Lukas', 'Maximilian', 'Michael', 
    'Moritz', 'Niklas', 'Noah', 'Oliver', 'Paul', 'Philipp', 'Sebastian', 'Simon', 'Thomas'],
  female: ['Anna', 'Charlotte', 'Clara', 'Elisa', 'Emilia', 'Emma', 'Frieda', 'Hannah', 'Isabella',
    'Johanna', 'Julia', 'Laura', 'Lea', 'Lena', 'Lia', 'Lilly', 'Lina', 'Lisa', 'Luca', 'Luisa',
    'Marie', 'Mia', 'Nele', 'Nora', 'Olivia', 'Paula', 'Sarah', 'Sophia', 'Sophie', 'Zoe']
};

// Real German last names
const LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz',
  'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz',
  'Krause', 'Meier', 'Lehmann', 'Köhler', 'Maier', 'Herrmann', 'König', 'Walter', 'Mayer', 'Huber',
  'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz', 'Möller', 'Weiß', 'Jung', 'Hahn', 'Schubert',
  'Vogel', 'Friedrich', 'Keller', 'Günther', 'Frank', 'Berger', 'Winkler', 'Roth', 'Beck', 'Lorenz'];

// Medical specialties in Germany
const SPECIALTIES = [
  { name: 'Innere Medizin', demand: 'high' },
  { name: 'Kardiologie', demand: 'high' },
  { name: 'Chirurgie', demand: 'high' },
  { name: 'Orthopädie', demand: 'medium' },
  { name: 'Pädiatrie', demand: 'high' },
  { name: 'Neurologie', demand: 'high' },
  { name: 'Anästhesiologie', demand: 'high' },
  { name: 'Dermatologie', demand: 'medium' },
  { name: 'Gynäkologie', demand: 'medium' },
  { name: 'Radiologie', demand: 'medium' },
  { name: 'Psychiatrie', demand: 'high' },
  { name: 'Urologie', demand: 'medium' },
  { name: 'HNO', demand: 'medium' },
  { name: 'Augenheilkunde', demand: 'medium' },
  { name: 'Unfallchirurgie', demand: 'high' },
  { name: 'Gastroenterologie', demand: 'medium' },
  { name: 'Nephrologie', demand: 'medium' },
  { name: 'Onkologie', demand: 'high' },
  { name: 'Endokrinologie', demand: 'medium' },
  { name: 'Hämatologie', demand: 'high' },
  { name: 'Pneumologie', demand: 'medium' },
  { name: 'Rheumatologie', demand: 'low' },
  { name: 'Plastische Chirurgie', demand: 'low' },
  { name: 'Neurochirurgie', demand: 'high' },
  { name: 'Gefäßchirurgie', demand: 'medium' },
  { name: 'Thoraxchirurgie', demand: 'medium' }
];

// German cities with major hospitals
const CITIES = [
  { name: 'Berlin', state: 'BE', type: 'capital', hospitals: 45 },
  { name: 'München', state: 'BY', type: 'major', hospitals: 38 },
  { name: 'Hamburg', state: 'HH', type: 'major', hospitals: 32 },
  { name: 'Köln', state: 'NW', type: 'major', hospitals: 28 },
  { name: 'Frankfurt', state: 'HE', type: 'major', hospitals: 25 },
  { name: 'Stuttgart', state: 'BW', type: 'major', hospitals: 22 },
  { name: 'Düsseldorf', state: 'NW', type: 'major', hospitals: 20 },
  { name: 'Leipzig', state: 'SN', type: 'major', hospitals: 18 },
  { name: 'Dresden', state: 'SN', type: 'major', hospitals: 17 },
  { name: 'Hannover', state: 'NI', type: 'major', hospitals: 19 },
  { name: 'Nürnberg', state: 'BY', type: 'medium', hospitals: 15 },
  { name: 'Heidelberg', state: 'BW', type: 'medium', hospitals: 8 },
  { name: 'Freiburg', state: 'BW', type: 'medium', hospitals: 12 },
  { name: 'Mannheim', state: 'BW', type: 'medium', hospitals: 14 },
  { name: 'Karlsruhe', state: 'BW', type: 'medium', hospitals: 13 },
  { name: 'Augsburg', state: 'BY', type: 'medium', hospitals: 11 },
  { name: 'Wiesbaden', state: 'HE', type: 'medium', hospitals: 10 },
  { name: 'Bonn', state: 'NW', type: 'medium', hospitals: 12 },
  { name: 'Münster', state: 'NW', type: 'medium', hospitals: 13 },
  { name: 'Kiel', state: 'SH', type: 'medium', hospitals: 9 },
  { name: 'Saarbrücken', state: 'SL', type: 'small', hospitals: 8 },
  { name: 'Rostock', state: 'MV', type: 'small', hospitals: 7 },
  { name: 'Magdeburg', state: 'ST', type: 'small', hospitals: 8 },
  { name: 'Erfurt', state: 'TH', type: 'small', hospitals: 7 },
  { name: 'Mainz', state: 'RP', type: 'small', hospitals: 9 }
];

// Hospital types in Germany
const HOSPITAL_TYPES = ['University Hospital', 'City Hospital', 'Regional Hospital', 'Specialty Clinic', 'Teaching Hospital'];
const HOSPITAL_SIZES = ['Small (<200 beds)', 'Medium (200-500 beds)', 'Large (500-1000 beds)', 'Very Large (>1000 beds)'];

// Real German hospital names
const HOSPITAL_NAME_PREFIXES = ['Universitätsklinikum', 'Klinikum', 'Städtisches Klinikum', 'Krankenhaus', 'Kliniken'];
const HOSPITAL_NAME_SUFFIXES = ['Städtisch', 'Universitär', 'Evangelisch', 'Katholisch', 'Landes'];

// Sample job descriptions
const JOB_DESCRIPTION_TEMPLATES = [
  'Wir suchen engagierte Mediziner für unser modern ausgestattetes {department}.',
  'Bei uns erwartet Sie ein kollegiales Team mit ausgezeichneter Weiterbildungsermöglichung.',
  'Wir bieten eine anspruchsvolle Position in einem dynamischen Umfeld.',
  'Unser Haus ist bekannt für exzellente Patientenversorgung und Forschung.',
  'Wir ermöglichen Work-Life-Balance mit flexiblen Arbeitszeitmodellen.'
];

const REQUIREMENT_TEMPLATES = [
  'Facharztanerkennung oder im Weiterbildungsverfahren',
  'Deutsche Approbation oder in Erwerbung',
  'Teamfähigkeit und Kommunikationsstärke',
  'Interesse an Lehre und Forschung',
  'Deutschkenntnisse mindestens auf B2-Niveau'
];

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.de', 'outlook.de', 'web.de', 'gmx.de', 't-online.de', 'uni-klinik.de'];
  const formats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()[0]}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}`
  ];
  const email = randomElement(formats) + '@' + randomElement(domains);
  return email.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

// Generate employers (20+)
function generateEmployers(count = 25) {
  const employers = [];
  const usedNames = new Set();
  
  // Real major hospitals (always included)
  const majorHospitals = [
    { name: 'Charité - Universitätsmedizin Berlin', location: 'Berlin', hospitalType: 'University Hospital', size: 'Very Large (>1000 beds)', description: 'Europas größte Universitätsklinik' },
    { name: 'Universitätsklinikum Heidelberg', location: 'Heidelberg', hospitalType: 'University Hospital', size: 'Large (500-1000 beds)', description: 'Führendes Universitätsklinikum mit Exzellenzstatus' },
    { name: 'Universitätsklinikum Hamburg-Eppendorf', location: 'Hamburg', hospitalType: 'University Hospital', size: 'Very Large (>1000 beds)', description: 'Forschungsstarkes Klinikum mit internationaler Reputation' },
    { name: 'Klinikum rechts der Isar (TUM)', location: 'München', hospitalType: 'University Hospital', size: 'Large (500-1000 beds)', description: 'Hochmodernes Klinikum der TU München' },
    { name: 'Universitätsklinikum Köln', location: 'Köln', hospitalType: 'University Hospital', size: 'Large (500-1000 beds)', description: 'Hochspezialisierte Medizin in NRW' },
    { name: 'Universitätsklinikum Freiburg', location: 'Freiburg', hospitalType: 'University Hospital', size: 'Large (500-1000 beds)', description: 'Exzellente Forschung und Lehre' },
    { name: 'Universitätsklinikum Düsseldorf', location: 'Düsseldorf', hospitalType: 'University Hospital', size: 'Large (500-1000 beds)', description: 'Innovative Patientenversorgung' }
  ];
  
  employers.push(...majorHospitals);
  majorHospitals.forEach(h => usedNames.add(h.name));
  
  // Generate additional hospitals
  while (employers.length < count) {
    const city = randomElement(CITIES);
    const type = randomElement(HOSPITAL_TYPES);
    const size = randomElement(HOSPITAL_SIZES);
    const prefix = randomElement(HOSPITAL_NAME_PREFIXES);
    
    let name;
    if (Math.random() > 0.7) {
      name = `${prefix} ${city.name}`;
    } else {
      const suffix = randomElement(HOSPITAL_NAME_SUFFIXES);
      name = `${suffix}es Krankenhaus ${city.name}`;
    }
    
    if (!usedNames.has(name)) {
      usedNames.add(name);
      employers.push({
        name,
        location: city.name,
        hospitalType: type,
        size,
        description: `Medizinische Versorgung in ${city.name} mit Schwerpunkt ${randomElement(SPECIALTIES).name}`,
        website: `https://www.${name.toLowerCase().replace(/[^a-z]/g, '')}.de`
      });
    }
  }
  
  return employers;
}

// Generate jobs (30+)
function generateJobs(employers, count = 35) {
  const jobs = [];
  const usedCombinations = new Set();
  
  for (let i = 0; i < count; i++) {
    const employer = randomElement(employers);
    const specialty = randomElement(SPECIALTIES);
    
    // Determine level based on experience required
    let level, minExp, maxExp, titlePrefix;
    const rand = Math.random();
    if (rand < 0.4) {
      level = 'assistant';
      minExp = 0;
      maxExp = 3;
      titlePrefix = 'Assistenzarzt';
    } else if (rand < 0.75) {
      level = 'specialist';
      minExp = 3;
      maxExp = 8;
      titlePrefix = 'Facharzt';
    } else {
      level = 'senior';
      minExp = 8;
      maxExp = 15;
      titlePrefix = 'Oberarzt';
    }
    
    const title = `${titlePrefix} ${specialty.name}`;
    const key = `${employer.name}-${title}`;
    
    if (!usedCombinations.has(key)) {
      usedCombinations.add(key);
      
      // Salary based on level and specialty demand
      const baseSalary = level === 'assistant' ? 52000 : level === 'specialist' ? 70000 : 90000;
      const demandMultiplier = specialty.demand === 'high' ? 1.15 : specialty.demand === 'medium' ? 1.05 : 1.0;
      const salaryMin = Math.round((baseSalary * demandMultiplier) / 1000) * 1000;
      const salaryMax = salaryMin + randomInt(15000, 35000);
      
      jobs.push({
        employerName: employer.name,
        title,
        specialty: specialty.name,
        location: employer.location,
        description: randomElement(JOB_DESCRIPTION_TEMPLATES).replace('{department}', specialty.name),
        requirements: randomElements(REQUIREMENT_TEMPLATES, randomInt(2, 4)).join('. '),
        salaryMin,
        salaryMax,
        jobType: Math.random() > 0.85 ? 'part-time' : 'full-time',
        experienceRequired: randomInt(minExp, maxExp),
        status: Math.random() > 0.1 ? 'active' : 'paused'
      });
    }
  }
  
  return jobs;
}

// Generate candidates (50+)
function generateCandidates(count = 55) {
  const candidates = [];
  const usedEmails = new Set();
  
  for (let i = 0; i < count; i++) {
    const isFemale = Math.random() > 0.5;
    const firstName = isFemale ? randomElement(FIRST_NAMES.female) : randomElement(FIRST_NAMES.male);
    const lastName = randomElement(LAST_NAMES);
    const specialty = randomElement(SPECIALTIES);
    const city = randomElement(CITIES);
    
    // Experience based on realistic career progression
    let experienceYears;
    const expRand = Math.random();
    if (expRand < 0.3) {
      experienceYears = randomInt(0, 3); // Junior
    } else if (expRand < 0.6) {
      experienceYears = randomInt(3, 8); // Mid-level
    } else if (expRand < 0.85) {
      experienceYears = randomInt(8, 15); // Senior
    } else {
      experienceYears = randomInt(15, 30); // Very experienced
    }
    
    // Email generation with deduplication
    let email = generateEmail(firstName, lastName);
    let attempts = 0;
    while (usedEmails.has(email) && attempts < 10) {
      email = generateEmail(firstName, lastName + randomInt(1, 99));
      attempts++;
    }
    usedEmails.add(email);
    
    // Salary expectations based on experience
    const minSalaryExpectation = 45000 + (experienceYears * 2500) + randomInt(-5000, 5000);
    
    candidates.push({
      email,
      firstName,
      lastName,
      location: city.name,
      specialty: specialty.name,
      experienceYears,
      preferences: {
        minSalary: Math.round(minSalaryExpectation / 1000) * 1000,
        willingToRelocate: randomElement(['yes', 'no', 'maybe']),
        jobTypes: Math.random() > 0.9 ? ['part-time'] : ['full-time'],
        preferredLocations: randomElements(CITIES.map(c => c.name), randomInt(1, 3)),
        notes: Math.random() > 0.7 ? `Looking for opportunities in ${specialty.name} with focus on ${randomElement(['research', 'teaching', 'patient care'])}` : undefined
      }
    });
  }
  
  return candidates;
}

// Export seed data
module.exports = {
  employers: generateEmployers(),
  jobs: null, // Will be generated after employers
  candidates: generateCandidates(),
  generateJobs,
  SPECIALTIES,
  CITIES,
  HOSPITAL_TYPES
};

// Generate jobs after employers are defined
module.exports.jobs = generateJobs(module.exports.employers);
