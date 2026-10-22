import Link from "next/link";
import RecentAnalyses from "@/components/RecentAnalyses";
import UploadPanel from "@/components/upload/UploadPanel";

const steps = [
  {
    number: "01",
    title: "Track the body",
    detail: "YOLO pose extracts 17 body keypoints through every frame and keeps one athlete identity.",
  },
  {
    number: "02",
    title: "Read the movement",
    detail: "A temporal rules layer finds overhead, lunge, and ready-stance episodes, then measures them.",
  },
  {
    number: "03",
    title: "Build the next rep",
    detail: "Grounded coaching cues and a curated exercise plan target the patterns worth changing.",
  },
];

const guide = [
  ["Whole body", "Head to toes, with space around the racket arm and feet."],
  ["One athlete", "Solo clips only. A second person makes the analysis unreliable."],
  ["Stable frame", "Tripod or propped phone. No cuts, zooms, or camera movement."],
  ["Clear light", "Fitted clothing, even light, and a plain background help pose confidence."],
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
      <section className="relative grid items-start gap-10 pt-8 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-lime">Pose-driven coaching</span>
            <span className="badge">Badminton · technique</span>
          </div>

          <h1 className="display mt-7 max-w-2xl text-[clamp(3.2rem,8vw,6.6rem)] font-extrabold leading-[0.88] tracking-[-0.065em]">
            See the movement.
            <span className="block text-[var(--lime)]">Fix the pattern.</span>
          </h1>

          <p className="mt-7 max-w-xl text-[0.98rem] leading-7 text-[var(--muted)]">
            Upload a short technique clip. The app tracks your skeleton, finds the movement
            episodes inside it, and turns measured form into a review you can actually coach
            from.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.67rem] font-bold tracking-[0.08em] text-[var(--muted)] uppercase">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--aqua)]" /> 17 keypoints
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" /> 3 movement lanes
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" /> timeline evidence
            </span>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/#upload" className="button-primary">
              Analyze a clip
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/analyses" className="button-secondary">
              Open history
            </Link>
          </div>

          <div className="mt-12 grid max-w-lg grid-cols-3 gap-3 border-t border-[var(--line)] pt-5">
            <div>
              <p className="mono text-lg text-[var(--paper)]">2D</p>
              <p className="mt-0.5 text-[0.63rem] leading-tight text-[var(--muted)]">
                pose estimates, not 3D lab data
              </p>
            </div>
            <div>
              <p className="mono text-lg text-[var(--paper)]">60s</p>
              <p className="mt-0.5 text-[0.63rem] leading-tight text-[var(--muted)]">
                maximum clip length for reliable processing
              </p>
            </div>
            <div>
              <p className="mono text-lg text-[var(--paper)]">0</p>
              <p className="mt-0.5 text-[0.63rem] leading-tight text-[var(--muted)]">
                stroke guesses; this reads movement form
              </p>
            </div>
          </div>
        </div>

        <div className="lg:pt-4">
          <UploadPanel />
          <p className="mt-3 px-2 text-center text-[0.62rem] leading-relaxed text-[var(--muted)]">
            By uploading, you confirm you have permission to use the clip. Files stay in the
            local data directory.
          </p>
        </div>
      </section>

      <section className="section-rule grid gap-8 pt-10 sm:grid-cols-3" aria-labelledby="how-heading">
        <div className="sm:col-span-3">
          <p className="eyebrow">How it works</p>
          <h2 id="how-heading" className="display mt-2 max-w-2xl text-3xl font-extrabold sm:text-4xl">
            From raw video to a useful next session.
          </h2>
        </div>
        {steps.map((step) => (
          <article key={step.number} className="border-t border-[var(--line)] pt-4">
            <span className="mono text-[0.7rem] text-[var(--lime)]">{step.number}</span>
            <h3 className="mt-3 text-base font-bold">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-20 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="capture-heading">
        <div>
          <p className="eyebrow">Before you record</p>
          <h2 id="capture-heading" className="display mt-2 text-3xl font-extrabold sm:text-4xl">
            Give the pose model a fair look.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
            A clean capture is the difference between a useful review and a list of caveats.
            Use a tripod, keep one full-body athlete in frame, and show one or two clear
            repetitions.
          </p>
          <div className="mt-6 grid gap-2">
            <div className="panel-quiet p-3.5">
              <p className="text-[0.68rem] font-bold tracking-[0.08em] text-[var(--aqua)] uppercase">
                Side angle
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Best for lunge depth, torso lean, and overhead reach.
              </p>
            </div>
            <div className="panel-quiet p-3.5">
              <p className="text-[0.68rem] font-bold tracking-[0.08em] text-[var(--lime)] uppercase">
                Front angle
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Best for stance width and knee-over-foot alignment.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {guide.map(([title, detail], index) => (
            <div key={title} className="panel-quiet p-5">
              <span className="mono text-[0.62rem] text-[var(--muted)]">0{index + 1}</span>
              <h3 className="mt-4 text-sm font-bold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <RecentAnalyses />
    </div>
  );
}
