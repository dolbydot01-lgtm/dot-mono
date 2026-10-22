import Link from "next/link";
import HistoryView from "@/components/HistoryView";

export const metadata = {
  title: "Analysis history — Badminton Coach",
};

export default function AnalysesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Session archive</p>
          <h1 className="display mt-2 text-4xl font-extrabold tracking-[-0.05em] sm:text-6xl">
            Analysis history
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Reopen a session to watch the skeleton overlay, inspect measured faults, or
            revisit the exercise plan.
          </p>
        </div>
        <Link href="/#upload" className="button-primary self-start sm:self-auto">
          New analysis
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <div className="mt-10">
        <HistoryView />
      </div>
    </div>
  );
}
