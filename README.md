# sourav-mondal-site

Personal and academic website. Astro 7 (static) + React islands + MDX.

- **Fast:** pages are pre-rendered HTML. JavaScript loads only for the interactive parts
  (thin-film demo, publication filter, CV timeline, search, gallery lightbox).
- **SEO:** per-page titles/descriptions, canonical URLs, Open Graph/Twitter cards, JSON-LD
  (`Person`, `WebSite`, `BlogPosting`, `ScholarlyArticle`), `sitemap-index.xml`, `robots.txt`, RSS.
- **Secure:** no server, no database, no login. Strict per-page Content-Security-Policy with SHA-256
  hashes (no `unsafe-inline`), security headers in `public/_headers`, self-hosted fonts, no third-party
  requests, EXIF stripped from every image, e-mail never present as plain text in the HTML.

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321  (CSP is not applied in dev mode)
npm run build      # type-check + build + safety checks → dist/
npm run preview    # serve dist/ to test the real build, including the CSP
```

`npm run build` fails if any page has an inline style/event handler (would be blocked by the CSP),
an image with EXIF metadata, a plain e-mail address, or a phone number.

## Edit your content

| What | Where |
|---|---|
| Name, tagline, department, social links | `src/consts.ts` |
| Education, publications, timeline, skills, research themes | `src/data/cv.ts` |
| Blog posts | `src/content/blog/*.mdx` (front-matter schema in `src/content.config.ts`) |
| Photos | drop files into `src/assets/gallery/<album-name>/` |
| Homepage images | `src/assets/site/` (keep file names, or update imports in `src/pages/index.astro`) |
| CV PDF download | add a **phone-free** PDF at `public/cv/Sourav_Mondal_CV.pdf`; the button appears automatically |

### New blog post

Create `src/content/blog/my-post.mdx`:

```mdx
---
title: My post title
description: One-sentence summary (shown on cards and in search results).
pubDate: 2026-11-05
category: Research        # Lab Notes | Research | Life
tags: [thin films, ellipsometry]
cover: ../../assets/blog/my-cover.jpg
coverAlt: What the cover image shows
draft: false              # true = visible only in `npm run dev`
---

Text, **Markdown**, and LaTeX: inline $\delta = 2\pi N d/\lambda$ or display

$$ R = |r|^2 $$
```

Math renders as native MathML (no KaTeX CSS or fonts needed).

## Deploy (Cloudflare Pages, free)

1. Push this folder to a GitHub repository.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build command `npm run build`, output directory `dist`, environment variable
   `SITE_URL=https://your-domain` (and `NODE_VERSION=22`).
4. Add your custom domain in the Pages project. `public/_headers` is applied automatically.

After deploying: check https://securityheaders.com and https://developer.mozilla.org/en-US/observatory,
submit `https://your-domain/sitemap-index.xml` in Google Search Console, and link the site from your
Google Scholar, LinkedIn and ResearchGate profiles.

Turn on 2-factor authentication on GitHub, Cloudflare and your domain registrar — for a static
site, account takeover is the realistic attack.

## Before going live — checklist

- [ ] `src/consts.ts`: replace placeholder LinkedIn / GitHub / Scholar / ResearchGate URLs; add ORCID.
- [ ] `src/data/cv.ts`: add DOIs; check the B.Sc./M.Sc. start years (inferred from completion years).
- [ ] Replace the three starter blog posts with your own writing.
- [ ] Replace images with full-resolution originals (current homepage images are ~665 px crops and look soft on large screens).
- [ ] `public/.well-known/security.txt` and `SITE_URL`: set your real domain.
- [ ] Once on your own domain and sure HTTPS is permanent, consider adding `; preload` to HSTS in `public/_headers`.

## Thin-film demo

`src/lib/tmm.ts` implements normal-incidence transfer-matrix optics (Macleod's characteristic-matrix
form, N = n − ik). It was checked against an independent Airy-formula implementation
(N = n + ik convention) for bare, quarter-wave, absorbing-film, absorbing-substrate and three-layer
cases; R, T and A agree to ~1e-16. Default PCM indices are illustrative — replace them with your
own ellipsometry data in `src/components/TmmDemo.tsx`.
