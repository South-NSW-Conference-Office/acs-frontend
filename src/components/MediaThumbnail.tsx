'use client';

import Image from 'next/image';
import { PhotoIcon } from '@heroicons/react/24/outline';

// next/image does not degrade when it cannot resolve a src — it throws, during
// render, which React turns into an unhandled exception and Next.js renders as
// "Application error: a client-side exception has occurred". The whole admin page
// goes down. Two ways a media row can trigger that: an empty url, or a host absent
// from images.remotePatterns in next.config.ts — a legacy record from another
// bucket, say.
//
// One malformed row should not be able to take the media library with it, and this
// is not hypothetical: listings are scoped per user, so a single bad file among one
// person's uploads breaks the page for them while everyone else sees nothing wrong.
//
// Recognised hosts keep the optimiser; anything else renders through a plain <img>,
// unoptimised but harmless; a row with no usable url gets a placeholder tile rather
// than being handed to the framework at all.

const OPTIMISED_IMAGE_PATHS = [
  // Mirrors images.remotePatterns in next.config.ts. Deliberately narrow: this
  // decides only whether the optimiser is used, never whether an image renders, so
  // drifting out of sync costs image quality rather than crashing a page.
  {
    hostname: 's3.ap-southeast-2.wasabisys.com',
    prefix: '/adventistcommunityservices/',
  },
  { hostname: 's3.ap-southeast-2.wasabisys.com', prefix: '/alertison/' },
];

export function canOptimise(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      OPTIMISED_IMAGE_PATHS.some(
        (p) => url.hostname === p.hostname && url.pathname.startsWith(p.prefix)
      )
    );
  } catch {
    // Relative or malformed — next/image cannot take it either way.
    return false;
  }
}

interface MediaThumbnailProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
}

export default function MediaThumbnail({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
}: MediaThumbnailProps) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 ${
          fill ? 'absolute inset-0' : 'h-64 w-full'
        }`}
        title="This file has no image address stored"
      >
        <PhotoIcon className="h-12 w-12 text-gray-300" />
      </div>
    );
  }

  if (canOptimise(src)) {
    return fill ? (
      <Image src={src} alt={alt} fill className={className} sizes={sizes} />
    ) : (
      <Image
        src={src}
        alt={alt}
        width={width ?? 800}
        height={height ?? 600}
        className={className}
      />
    );
  }

  // Deliberately a plain <img>: next/image throws on hosts it does not know, and a
  // crash is a far worse outcome here than an unoptimised image. Only unrecognised
  // hosts reach this line, so the usual LCP argument does not apply.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={
        fill
          ? `absolute inset-0 h-full w-full ${className ?? ''}`
          : className
      }
    />
  );
}
