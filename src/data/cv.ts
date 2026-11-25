import academic from './editor/academic.json';
import papers from './editor/papers.json';
import expertise from './editor/expertise.json';
import interests from './editor/interests.json';

// Typed views of the content managed in the portfolio editor.

export type Education = {
  degree: string;
  field: string;
  institution: string;
  place: string;
  score?: string;
  period: string;
  status?: 'ongoing';
};

export const education = academic.education as Education[];

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

export const publications = papers.publications as Publication[];

export const myNameVariants = papers.myNameVariants;

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

export const timeline = academic.timeline as TimelineItem[];

export const timelineLabels = academic.timelineLabels as Record<TimelineKind, string>;

export type SkillGroup = { group: string; icon: 'flask' | 'microscope' | 'laser' | 'code' | 'cube'; items: string[] };

export const skills = expertise.skills as SkillGroup[];

export const researchThemes = expertise.researchThemes as { title: string; body: string; image: 'research-card' | 'spectrum' | 'photonic-stack' }[];

export const coursework = academic.coursework;

export const languages = interests.languages;
export const hobbies = interests.hobbies;
