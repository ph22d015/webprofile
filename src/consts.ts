// Single source of truth for identity, links and SEO defaults.
// Empty strings hide the corresponding link/icon everywhere on the site.

// Prefix site-local URLs for GitHub Pages project hosting (/webprofile/).
export const sitePath = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const SITE = {
  name: 'Sourav Mondal',
  shortName: 'Sourav',
  title: 'Sourav Mondal — Phase-Change Photonics, IIT Madras',
  description:
    'PhD researcher at IIT Madras working on chalcogenide phase-change materials, active metasurfaces and reconfigurable nanophotonic devices. Research, publications, CV and personal writing.',
  role: 'PhD Student',
  department: 'Department of Physics',
  institution: 'Indian Institute of Technology Madras',
  institutionUrl: 'https://www.iitm.ac.in',
  location: 'Chennai, India',
  locale: 'en_IN',
  eyebrow: ['PhD Student', 'Photonics', 'Optical Phase Change Materials'],
  tagline: ['Light', 'Materials', 'Devices', 'A Brighter Tomorrow'],
  intro:
    'Exploring light–matter interactions and phase transitions for next-generation photonic devices. Curious about how materials work, and equally curious about life beyond the lab.',
} as const;

// Email is split so it never appears as a plain string in the HTML source (cuts scraper spam).
export const EMAIL = { user: 'sourav.mondal.dongal', domain: 'gmail.com' } as const;

// TODO: replace with your real profile URLs. Leave '' to hide a link.
export const SOCIAL = {
  linkedin: 'https://www.linkedin.com/in/your-handle',
  github: 'https://github.com/your-handle',
  scholar: 'https://scholar.google.com/citations?user=YOUR_ID',
  researchgate: 'https://www.researchgate.net/profile/Your-Profile',
  orcid: '', // e.g. 'https://orcid.org/0000-0000-0000-0000'
} as const;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
  { href: '/research/', label: 'Research' },
  { href: '/publications/', label: 'Publications' },
  { href: '/cv/', label: 'CV' },
  { href: '/blog/', label: 'Blog' },
  { href: '/gallery/', label: 'Gallery' },
] as const;

// Put a phone-free PDF of your CV at public/cv/Sourav_Mondal_CV.pdf to enable the download button.
export const CV_PDF_PATH = '/cv/Sourav_Mondal_CV.pdf';
