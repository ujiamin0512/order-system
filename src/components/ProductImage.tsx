/* eslint-disable @next/next/no-img-element */
export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 ${className}`}
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="m21 16-5-5-8 8" />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
}
