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
