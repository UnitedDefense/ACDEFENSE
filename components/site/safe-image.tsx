"use client";

import Image from "next/image";
import { useState } from "react";

export const IMAGE_PLACEHOLDER = "/images/placeholders/training.svg";

/**
 * Image (course photo, product shot) that falls back to the branded placeholder when the URL is
 * empty or fails to load — several course image_url values point at files
 * that were never copied over from the old Wix site.
 */
export function SafeImage({
  src,
  alt,
  sizes,
  className = "object-cover",
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? IMAGE_PLACEHOLDER : src;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
