// All CV content lives here. Every page (Home, About, Research, Publications, CV) reads from this file,
// so updating one entry updates the whole site.

export type Education = {
  degree: string;
  field: string;
  institution: string;
  place: string;
  score?: string;
  period: string;
  status?: 'ongoing';
};

export const education: Education[] = [
  { degree: 'PhD', field: 'Physics', institution: 'Indian Institute of Technology Madras', place: 'Chennai', score: 'CGPA 9.20', period: '2022 – present', status: 'ongoing' },
  { degree: 'M.Sc.', field: 'Physics', institution: 'Jadavpur University', place: 'Kolkata', score: 'CGPA 8.90', period: '2018 – 2020' },
  { degree: 'B.Sc.', field: 'Physics', institution: 'Jadavpur University', place: 'Kolkata', score: 'CGPA 7.53', period: '2015 – 2018' },
];

export type PubType = 'journal' | 'conference';
export type Publication = {
  id: string;
  title: string;
  authors: string; // as listed; your own name is highlighted automatically
  venue: string;
  details?: string;
  year: number;
  type: PubType;
  doi?: string; // TODO: add DOIs — they enable links and correct BibTeX
  url?: string;
  tags: string[];
};

export const publications: Publication[] = [
  {
    id: 'singh2026statistical',
    title: 'Statistical encoding of light with reconfigurable non-volatile disorder metasurfaces',
    authors: 'R. K. Singh et al.',
    venue: 'Optics and Photonics for Information Processing XX',
    details: '14216',
    year: 2026,
    type: 'conference',
    tags: ['Metasurfaces', 'Phase-change materials'],
  },
  {
    id: 'mandal2026anisotropic',
    title: 'Unveiling Anisotropic in-Plane Thermal Conductivity and Thermal Expansion Coefficient in Low-Symmetry Few-Layer ReS₂',
    authors: 'M. Mandal et al.',
    venue: 'Advanced Science',
    year: 2026,
    type: 'journal',
    tags: ['2D materials', 'Thermal transport'],
  },
  {
    id: 'mandal2024low',
    title: 'Low thermal conductivity in 2H-polytype SnSe₂',
    authors: 'M. Mandal et al.',
    venue: 'Physical Review B',
    details: '110, 195404',
    year: 2024,
    type: 'journal',
    tags: ['2D materials', 'Thermal transport'],
  },
];

export const myNameVariants = ['S. Mondal', 'Sourav Mondal', 'Mondal, S.'];

export type TimelineKind = 'education' | 'research' | 'teaching' | 'talk' | 'award';
export type TimelineItem = {
  kind: TimelineKind;
  start: string; // YYYY-MM, used for sorting
  when: string; // display label
  title: string;
  org: string;
  detail?: string;
  points?: string[];
};

export const timeline: TimelineItem[] = [
  // Education
  { kind: 'education', start: '2022-07', when: '2022 – present', title: 'PhD, Physics', org: 'IIT Madras', detail: 'CGPA 9.20 · Chalcogenide phase-change materials and reconfigurable nanophotonics' },
  { kind: 'education', start: '2018-07', when: '2018 – 2020', title: 'M.Sc., Physics', org: 'Jadavpur University, Kolkata', detail: 'CGPA 8.90' },
  { kind: 'education', start: '2015-07', when: '2015 – 2018', title: 'B.Sc., Physics', org: 'Jadavpur University, Kolkata', detail: 'CGPA 7.53' },

  // Research & service
  {
    kind: 'research', start: '2025-07', when: 'Jul 2025 – present', title: 'SQUID-VSM Tool Operator', org: 'IIT Madras · Prof. K. Sethupathi',
    points: ['High-precision magnetic property measurements for advanced materials characterization.'],
  },
  {
    kind: 'research', start: '2023-07', when: 'Jul 2023 – May 2026', title: 'Project Mentor', org: 'IIT Madras · Prof. Anbarasu M. & Prof. K. Sethupathi',
    points: ['Mentored 13 students (4 M.Tech, 8 M.Sc., 1 B.Sc.) through course projects and research internships.'],
  },
  {
    kind: 'research', start: '2024-01', when: '2024 – 2026', title: 'Research Exhibitor, Institute Open House', org: 'IIT Madras · Prof. K. Sethupathi',
    points: ['Showcased laboratory instrumentation and research workflows to the public.'],
  },
  {
    kind: 'research', start: '2023-01', when: 'Jan – Mar 2023', title: 'OptiStack Solver (personal project)', org: 'Transfer-matrix thin-film optics',
    points: [
      'MATLAB implementation of the transfer-matrix method and Fresnel equations for reflectance, transmittance and absorptance of N-layer stacks.',
      'Interactive web front end for material parameters and layer thicknesses.',
    ],
  },
  {
    kind: 'research', start: '2020-02', when: 'Feb – Jun 2020', title: 'M.Sc. Project: 2D nanomaterials for plasmonic sensing', org: 'Jadavpur University · Prof. Joydeep Chowdhury',
    points: [
      'Reviewed synthesis routes (top-down and bottom-up) of graphene and TMDs.',
      'Analysed integration of 2D materials into LSPR, SPR and SERS sensors.',
    ],
  },

  // Teaching
  { kind: 'teaching', start: '2024-07', when: 'Jul – Nov 2024', title: 'Teaching Assistant, PH2050 & EP2090', org: 'Physics Lab III / Engineering Physics Lab I · Prof. Sivarama Krishnan', points: ['Guided B.Tech lab sessions on Michelson interferometry; assessed reports and examinations.'] },
  { kind: 'teaching', start: '2024-01', when: 'Jan – May 2024', title: 'Teaching Assistant, PH1010 Physics II', org: 'Electromagnetism · Prof. Prahlad Pradhan', points: ['Tutorials, assignments and exam grading.'] },
  { kind: 'teaching', start: '2023-07', when: 'Jul – Nov 2023', title: 'Teaching Assistant, PH1030 Physics Laboratory I', org: 'Prof. V. Srinivas & Dr. Praveen', points: ["First-year experiments: Newton's rings, sonometer, cathode-ray oscilloscope."] },

  // Talks & conferences
  { kind: 'talk', start: '2026-09', when: '20 – 23 Sep 2026', title: 'European Phase-Change and Ovonics Symposium 2026', org: 'KU Leuven & imec · Leuven, Belgium', detail: 'Poster presentation' },
  { kind: 'talk', start: '2026-08', when: '30 – 31 Aug 2026', title: 'International Conference on Chalcogenides and Applied Photonics 2026', org: 'IISc Bengaluru & IIT Madras · Bengaluru', detail: 'Poster presentation' },
  { kind: 'talk', start: '2025-03', when: '6 – 8 Mar 2025', title: 'International Conference on Laser & other Deposition Techniques', org: 'IIT Hyderabad & IIT Madras · Hyderabad', detail: 'Poster presentation' },
  { kind: 'talk', start: '2023-07', when: '11 – 15 Jul 2023', title: 'Summer School on Materials Characterization', org: 'NFAPT · IIT Madras' },
  { kind: 'talk', start: '2023-07', when: '6 – 8 Jul 2023', title: 'International Conference on Thin Films & Nanotechnology', org: 'IIT Madras & IIT Delhi' },

  // Awards
  { kind: 'award', start: '2022-07', when: '2022 – 2027', title: 'Half-Time Research Assistantship (HTRA)', org: 'IIT Madras' },
  { kind: 'award', start: '2022-06', when: 'Jun 2022', title: 'CSIR-UGC NET-JRF (Physics), All India Rank 124', org: 'CSIR / UGC' },
  { kind: 'award', start: '2021-02', when: '2021', title: 'Qualified GATE (Physics)', org: 'Graduate Aptitude Test in Engineering' },
  { kind: 'award', start: '2021-02', when: '2021', title: 'Qualified JEST (Physics)', org: 'Joint Entrance Screening Test' },
  { kind: 'award', start: '2015-07', when: '2015 – 2020', title: 'DST INSPIRE Scholarship', org: 'Department of Science & Technology, Govt. of India' },
];

export const timelineLabels: Record<TimelineKind, string> = {
  education: 'Education',
  research: 'Research & Service',
  teaching: 'Teaching',
  talk: 'Conferences',
  award: 'Awards',
};

export type SkillGroup = { group: string; icon: 'flask' | 'microscope' | 'laser' | 'code' | 'cube'; items: string[] };

export const skills: SkillGroup[] = [
  { group: 'Thin-film deposition & processing', icon: 'flask', items: ['DC/RF sputtering', 'E-beam evaporation', 'Pulsed laser deposition (PLD)', 'Wet-bench cleaning protocols', 'Cleanroom operations'] },
  { group: 'Structural & morphological', icon: 'microscope', items: ['SEM', 'EDS', 'XRD', 'XPS', 'Ellipsometry', 'Profilometry'] },
  { group: 'Optical & physical properties', icon: 'laser', items: ['Sub-ns optical switching (custom setup)', 'PL', 'UV-Vis-NIR', 'FTIR', 'Ultrafast electrical & optical measurements', 'PPMS', 'SQUID-VSM'] },
  { group: 'Modelling & simulation', icon: 'cube', items: ['COMSOL Multiphysics', 'Lumerical', 'Mathematica', 'CompleteEASE', 'FullProf', 'VESTA', 'X\'Pert HighScore Plus', 'XEI', 'Origin Pro', 'Blender'] },
  { group: 'Programming', icon: 'code', items: ['Python', 'MATLAB', 'Fortran', 'TypeScript / React'] },
];

export const researchThemes = [
  {
    title: 'Chalcogenide phase-change thin films',
    body: 'Deposition and characterization of chalcogenide phase-change materials, whose large, non-volatile change in refractive index between amorphous and crystalline phases is the basis for reconfigurable optics.',
    image: 'research-card',
  },
  {
    title: 'Multi-level states by optical pulse engineering',
    body: 'Shaping sub-nanosecond optical pulses to reach intermediate, partially crystallized states, so one film can store more than two optical levels.',
    image: 'spectrum',
  },
  {
    title: 'Active metasurfaces',
    body: 'Design and optimization of phase-change metasurfaces for reconfigurable nanophotonic devices, including disorder-based statistical encoding of light.',
    image: 'photonic-stack',
  },
] as const;

export const coursework = [
  { title: 'Foundations in Theoretical Physics', body: 'Classical, quantum and statistical mechanics; electromagnetic theory.' },
  { title: 'Foundations in Experimental Physics', body: 'Magnetism; nanomaterial growth and characterization.' },
  { title: 'Physics at Low Temperatures', body: 'Superfluidity, superconductivity, cryogenics and thermometry.' },
  { title: 'Physics & Technology of Thin Films', body: 'Deposition and monitoring, characterization, and film properties for devices.' },
  { title: 'Nanomaterials and Nanotechnology', body: 'Synthesis, nanofabrication and nanoscale characterization.' },
  { title: 'Advanced Memory Technology', body: 'Device physics of PCM, MRAM and RRAM for emerging memory.' },
];

export const languages = ['English', 'Bengali', 'Hindi'];
export const hobbies = ['Reading', 'Cooking', 'Photography'];
