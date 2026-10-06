"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Homepage hero background. Plays the admin-uploaded loop (Site Content ->
 * Home -> Hero Video) when set; otherwise — and for visitors who prefer
 * reduced motion — shows the poster still.
 */
export function HeroMedia({ videoUrl, posterUrl }: { videoUrl?: string; posterUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) videoRef.current?.pause();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const showVideo = !!videoUrl && !reducedMotion;

  return (
    <div className="absolute inset-0 overflow-hidden bg-charcoal" aria-hidden="true">
      {showVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={videoUrl}
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <Image
          src={posterUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover ${videoUrl ? "" : "hero-drift"}`}
        />
      )}
      {/* Legibility scrim: strong on the text side, light on the image side */}
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/60 to-charcoal/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-charcoal/60 to-transparent" />
      {/* Phones: text spans the full width, so darken evenly */}
      <div className="absolute inset-0 bg-charcoal/45 md:hidden" />
    </div>
  );
}
