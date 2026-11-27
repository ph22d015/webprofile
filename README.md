# sourav-mondal-site

Personal and academic website. Astro 7 (static) + React islands + MDX, served at
https://msourav.me/webprofile/ from GitHub Pages.

- **Fast:** pages are pre-rendered HTML. JavaScript loads only for the interactive parts
  (thin-film solver, laser-spot calculator, publication filter, CV timeline, search, gallery lightbox).
- **SEO:** per-page titles/descriptions, canonical URLs, Open Graph/Twitter cards, JSON-LD
  (`Person`, `WebSite`, `BlogPosting`, `ScholarlyArticle`), `sitemap-index.xml`, RSS.
- **Secure:** no server, no database, no login. Strict per-page Content-Security-Policy `<meta>` with
  SHA-256 hashes (no `unsafe-inline`), self-hosted fonts, EXIF stripped from every image, e-mail never
  present as plain text in the HTML. GitHub Pages cannot send custom HTTP headers, so HSTS and
  `frame-ancestors` (anti-framing) are not available on this host.
- **Third-party request:** the home page footer loads a view counter from `hits.sh`
  (sent without a referrer; hits.sh still sees the visitor's IP address).

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321/webprofile/  (CSP is not applied in dev mode)
npm test           # physics tests for the thin-film solver and knife-edge fits
npm run build      # type-check + tests + build + safety checks → dist/
npm run preview    # serve dist/ to test the real build, including the CSP
```

`npm run build` fails if a test fails, or if any page has an inline style/event handler (would be blocked
by the CSP), an image with EXIF metadata, a plain e-mail address, or a phone number.

## Edit your content

Content lives in `src/data/editor/` and can be edited in Pages CMS (configured by `.pages.yml`) or by hand.

| What | Where |
|---|---|
| Name, tagline, department, social links, e-mail | `src/data/editor/identity.json` |
| Education, timeline, coursework | `src/data/editor/academic.json` |
| Publications | `src/data/editor/papers.json` |
| Skills, research themes | `src/data/editor/expertise.json` |
| Page texts (home, about, CV, research, blog, gallery, quotes) | the other files in `src/data/editor/` |
| Blog posts | `src/content/blog/*.mdx` (front-matter schema in `src/content.config.ts`) |
| Photos | drop files into `src/assets/gallery/<album-name>/` |
| Site images | `src/assets/site/`, chosen in `src/data/editor/images.json` |
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

## Deploy (GitHub Pages)

Every push to `main` runs `.github/workflows/static.yml`: `npm ci`, `npm run build` with
`SITE_URL=https://msourav.me`, then publishes `dist/` to GitHub Pages. The site lives under
`/webprofile/` (`base` in `astro.config.mjs`).

Files that must sit at the domain root — `robots.txt` (with a `Sitemap:` line pointing to
`https://msourav.me/webprofile/sitemap-index.xml`) and `.well-known/security.txt` — belong in the
repository that serves `https://msourav.me/`, not here. Until then, submit the sitemap in Google
Search Console.

Turn on 2-factor authentication on GitHub and your domain registrar — for a static site, account
takeover is the realistic attack.

## Before going live — checklist

- [ ] `src/data/editor/identity.json`: replace placeholder LinkedIn / GitHub / Scholar / ResearchGate URLs; add ORCID.
- [ ] `src/data/editor/academic.json`: check the B.Sc./M.Sc. start years (inferred from completion years).
- [ ] Replace the three starter blog posts with your own writing.
- [ ] Replace images with full-resolution originals (current homepage images are ~665 px crops and look soft on large screens).

## Thin-film solver

`src/lib/optistack.ts` is a transfer-matrix solver for multilayer stacks at any angle of incidence,
TE or TM (after Byrnes, arXiv:1603.02720; convention N = n + ik). It uses the complex form of Snell's
law, so absorbing layers, metals and frustrated total internal reflection are handled exactly. The
incident medium must be lossless. `src/lib/optistack.test.ts` checks it against the Airy formula,
energy conservation, the Brewster angle and frustrated TIR. The UI is `src/components/OptiStack.tsx`.

## Laser spot calculator

`src/lib/knife-edge.ts` fits a knife-edge scan two ways: an error-function fit to the power, and a
Gaussian fit to its Savitzky-Golay-smoothed derivative. Both report the 1/e² radius w.
`src/lib/knife-edge.test.ts` checks both on a synthetic scan. Sample at least ~5 points per σ
(σ = w/2) across the edge: on coarser scans the default 11-point smoothing window widens the
derivative and the Gaussian fit overestimates w (about 12 % at 2.5 points per σ).
