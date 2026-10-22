import Link from "next/link";

function CourtMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/[0.045]">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7.2 3.2h9.6c1.1 0 2 .9 2 2v3.1c0 4.3-2.9 7.2-6.8 7.3-3.9-.1-6.8-3-6.8-7.3V5.2c0-1.1.9-2 2-2Z"
          stroke="#cbf56a"
          strokeWidth="1.35"
        />
        <path d="M3.7 5.1h2.2M3.7 8.2h2.2M18.1 5.1h2.2M18.1 8.2h2.2" stroke="#63e4c6" strokeWidth="1.35" />
        <path d="m12 7.1 2.1 3.2-2.1 2-2.1-2L12 7.1Z" fill="#cbf56a" />
        <path d="m10.2 13.8-1.1 7.1h5.8l-1.1-7.1" stroke="#63e4c6" strokeWidth="1.35" />
      </svg>
    </span>
  );
}

export default function SiteHeader() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Badminton Coach home">
          <CourtMark />
          <span className="leading-none">
            <span className="display block text-[1.02rem] font-extrabold tracking-[-0.03em]">
              BADMINTON COACH
            </span>
            <span className="mt-1 block text-[0.56rem] font-bold tracking-[0.19em] text-[var(--muted)]">
              MOVEMENT INTELLIGENCE
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <Link
            href="/analyses"
            className="hidden rounded-full px-3 py-2 text-[0.7rem] font-bold tracking-[0.09em] text-[var(--muted)] uppercase transition-colors hover:text-[var(--paper)] sm:block"
          >
            History
          </Link>
          <Link href="/#upload" className="button-secondary">
            New analysis
          </Link>
        </nav>
      </div>
    </header>
  );
}
