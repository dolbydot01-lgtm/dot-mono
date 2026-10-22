"use client";

import type { AnalysisResult } from "@/lib/generated/analysis-result";
import { formatTimestamp } from "@/lib/format";

type Episode = AnalysisResult["episodes"][number];
type Fault = AnalysisResult["faults"][number];

const lanes = [
  { type: "overhead_motion", label: "Overhead" },
  { type: "lunge", label: "Lunge" },
  { type: "ready_stance", label: "Ready" },
] as const;

export default function IssueTimeline({
  episodes,
  faults,
  duration,
  currentTime,
  onSeek,
}: {
  episodes: Episode[];
  faults: Fault[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const safeDuration = Math.max(duration, 0.01);
  const episodeType = new Map(episodes.map((episode) => [episode.id, episode.type]));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const playhead = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="timeline-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Issue timeline</p>
          <h2 id="timeline-heading" className="display mt-1 text-lg font-extrabold">
            Movement, measured in time
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[0.58rem] font-bold tracking-[0.08em] text-[var(--muted)] uppercase">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[rgba(99,228,198,0.4)]" /> episode
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[rgba(255,107,100,0.75)]" /> fault
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {lanes.map((lane) => {
          const laneEpisodes = episodes.filter((episode) => episode.type === lane.type);
          const laneFaults = faults.filter((fault) => {
            const type = fault.episode_id ? episodeType.get(fault.episode_id) : null;
            return type === lane.type;
          });
          return (
            <div key={lane.type} className="grid grid-cols-[4.2rem_1fr] items-center gap-2.5">
              <span className="lane-label">{lane.label}</span>
              <div className="timeline-lane">
                {laneEpisodes.map((episode) => {
                  const left = (episode.start_s / safeDuration) * 100;
                  const width = Math.max(0.55, ((episode.end_s - episode.start_s) / safeDuration) * 100);
                  return (
                    <button
                      key={episode.id}
                      type="button"
                      className="timeline-block"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${episode.label} · ${formatTimestamp(episode.start_s)}–${formatTimestamp(episode.end_s)}`}
                      aria-label={`Seek to ${episode.label}, ${formatTimestamp(episode.start_s)}`}
                      onClick={() => onSeek(episode.start_s)}
                    />
                  );
                })}
                {laneFaults.map((fault) => {
                  const left = (fault.time_range.start_s / safeDuration) * 100;
                  const width = Math.max(0.6, ((fault.time_range.end_s - fault.time_range.start_s) / safeDuration) * 100);
                  return (
                    <button
                      key={fault.id}
                      type="button"
                      className="timeline-fault"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${fault.title} · ${formatTimestamp(fault.time_range.start_s)}–${formatTimestamp(fault.time_range.end_s)}`}
                      aria-label={`Seek to ${fault.title}, ${formatTimestamp(fault.time_range.start_s)}`}
                      onClick={() => onSeek(fault.time_range.start_s)}
                    />
                  );
                })}
                <span className="timeline-playhead" style={{ left: `${playhead}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pl-[4.7rem]">
        <div className="relative h-4">
          {ticks.map((fraction) => (
            <span
              key={fraction}
              className="mono absolute top-0 -translate-x-1/2 text-[0.52rem] text-[var(--muted)]"
              style={{ left: `${fraction * 100}%` }}
            >
              {formatTimestamp(fraction * safeDuration)}
            </span>
          ))}
        </div>
      </div>

      {episodes.length === 0 ? (
        <p className="mt-3 text-[0.68rem] leading-relaxed text-[var(--muted)]">
          No movement episodes were recognized in this clip. Try one clear repetition with the
          full body in frame.
        </p>
      ) : null}
    </section>
  );
}
