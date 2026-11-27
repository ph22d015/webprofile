import identity from './data/editor/identity.json';
// Single source of truth for identity, links and SEO defaults.
// Empty strings hide the corresponding link/icon everywhere on the site.

// Prefix site-local URLs safely for project hosting (/webprofile/) or root hosting.
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '');
export const sitePath = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Some Astro-generated URLs may already contain the configured base path.
  if (BASE_PATH && (normalized === BASE_PATH || normalized.startsWith(`${BASE_PATH}/`))) {
    return normalized;
  }
  if (!BASE_PATH) return normalized;
  return normalized === '/' ? `${BASE_PATH}/` : `${BASE_PATH}${normalized}`;
};

export const { site: SITE, email: EMAIL } = identity;

export const SOCIAL: Partial<Record<'github' | 'scholar' | 'researchgate' | 'orcid' | 'linkedin', string>> = identity.social;
// Profile links shown in the footer and on the About page; entries with an empty href are hidden.
export const PROFILES = [
  { href: SOCIAL.linkedin, label: 'LinkedIn', icon: 'linkedin' },
  { href: SOCIAL.scholar, label: 'Google Scholar', icon: 'scholar' },
  { href: SOCIAL.researchgate, label: 'ResearchGate', icon: 'researchgate' },
  { href: SOCIAL.orcid, label: 'ORCID', icon: 'orcid' },
  { href: SOCIAL.github, label: 'GitHub', icon: 'github' },
] as const;

export const NAV = [
  { href: '/', label: 'Home', desc: 'Home' },
  { href: '/about/', label: 'About', desc: 'About me, languages, hobbies and contact' },
  { href: '/research/', label: 'Research', desc: 'Research themes, expertise and interactive thin-film demo' },
  { href: '/publications/', label: 'Publications', desc: 'Journal and conference publications with BibTeX' },
  { href: '/cv/', label: 'CV', desc: 'Education, research, teaching, conferences and awards' },
  { href: '/blog/', label: 'Blog', desc: 'All blog posts' },
  { href: '/quotes/', label: 'Quotes', desc: 'Favourite quotes and personal reflections' },
  { href: '/gallery/', label: 'Gallery', desc: 'Photography' },
] as const;

// Put a phone-free PDF of your CV at public/cv/Sourav_Mondal_CV.pdf to enable the download button.
export const CV_PDF_PATH = '/cv/Sourav_Mondal_CV.pdf';
