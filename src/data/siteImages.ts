import type { ImageMetadata } from 'astro';
import selected from './editor/images.json';

const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/site/**/*.{jpg,jpeg,png,webp,avif}', { eager: true });

export function siteImage(key: keyof typeof selected): ImageMetadata {
  const path = selected[key];
  const image = images[path]?.default;
  if (!image) throw new Error(`Missing site image for ${key} at ${path}`);
  return image;
}
