import { BRAND_NAME } from "@/lib/brand";

export function CinematicLoader() {
  return (
    <div className="cinematic-loader no-print" role="status" aria-label="Preparing your journey">
      <div className="cinematic-loader-content">
        <div className="cinematic-loader-mark" aria-hidden="true">
          <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeOpacity=".45" />
            <path className="cinematic-loader-plane" d="M10 27.5 37 13a1 1 0 0 1 1.35 1.35L25 39l-3.2-11.1L10 27.5Z" fill="currentColor" />
          </svg>
        </div>
        <p aria-hidden="true" className="serif cinematic-loader-name">{BRAND_NAME}</p>
        <div className="cinematic-loader-progress" aria-hidden="true"><span /></div>
        <p aria-hidden="true" className="eyebrow cinematic-loader-caption">Preparing your journey</p>
      </div>
    </div>
  );
}
