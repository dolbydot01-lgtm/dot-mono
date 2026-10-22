"use client";

import type { AnalysisResult } from "@/lib/generated/analysis-result";

type Exercise = AnalysisResult["report"]["exercise_plan"][number];
type Fault = AnalysisResult["faults"][number];

export default function ExercisePlan({
  exercises,
  faults,
  reportStatus,
}: {
  exercises: Exercise[];
  faults: Fault[];
  reportStatus: string;
}) {
  const faultTitles = new Map(faults.map((fault) => [fault.id, fault.title]));
  const pending = reportStatus === "pending" || reportStatus === "generating";

  return (
    <section aria-labelledby="exercises-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Next session</p>
          <h2 id="exercises-heading" className="display mt-1 text-3xl font-extrabold sm:text-4xl">
            Your exercise plan
          </h2>
        </div>
        <p className="max-w-md text-right text-[0.68rem] leading-5 text-[var(--muted)]">
          Dosage and instructions come from a fixed catalog; the review only selects and frames
          the exercises.
        </p>
      </div>

      {pending ? (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="panel-quiet p-5">
              <div className="shimmer h-8 w-8 rounded-full" />
              <div className="shimmer mt-4 h-4 w-2/3 rounded-full" />
              <div className="shimmer mt-3 h-3 w-full rounded-full" />
              <div className="shimmer mt-2 h-3 w-5/6 rounded-full" />
            </div>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="panel-quiet mt-6 p-6">
          <p className="text-sm font-semibold">No exercises were assigned this time.</p>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-[var(--muted)]">
            The analyzer did not find a clear form fault above its confidence threshold, so it
            avoided inventing corrective work. Record another clip from the other camera angle
            to get a fuller picture.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {exercises.map((exercise, index) => (
            <article key={exercise.exercise_id} className="exercise-card">
              <div className="flex items-start gap-3">
                <span className="exercise-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-base font-bold leading-snug">{exercise.name}</h3>
                  <p className="mt-1 text-[0.68rem] leading-5 text-[var(--muted)]">{exercise.focus}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="badge">{exercise.dosage}</span>
                <span className="badge">{exercise.equipment}</span>
              </div>

              <ol className="space-y-2">
                {exercise.instructions.map((instruction, step) => (
                  <li key={instruction} className="flex gap-2.5 text-[0.72rem] leading-5 text-[var(--muted)]">
                    <span className="mono mt-0.5 text-[0.58rem] text-[var(--lime)]">{step + 1}</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-auto border-t border-[var(--line)] pt-3">
                <p className="text-[0.6rem] leading-5 text-[var(--amber)]">{exercise.safety_note}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {exercise.related_fault_ids.map((faultId) => (
                    <span key={faultId} className="badge">
                      {faultTitles.get(faultId) ?? "Form focus"}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
