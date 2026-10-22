# Badminton Coach — Project Handoff

Last updated: 2026-10-21  
Project path: `/Users/dolbydot/dot-mono/cc-ds/badminton-coach` (inside the `dot-mono` git repository)

This document is the continuation guide for moving the project to another machine or another
developer session. The product implementation and its current caveats are summarized below.

---

## 1. What this project is

A local-first badminton technique review web app.

A user uploads a 10–60 second solo clip and selects camera view (`side` or `front`), racket hand,
and mirror status. The app:

1. Validates and normalizes the video.
2. Runs YOLO pose estimation and ByteTrack to extract a 17-point skeleton for one athlete.
3. Smoothes keypoints and finds **movement episodes**: overhead motion, lunge/deep step, and ready
   stance.
4. Measures 2D angles/positions and compares them against versioned coaching thresholds.
5. Renders an annotated skeleton video with an issue timeline.
6. Produces a coaching review grounded in the measured findings.
7. Recommends exercises from a curated catalog.

### Critical product boundary

**YOLO pose does not detect badminton shots or "moves" by itself.** It detects people and body
keypoints. The app's temporal rules layer is what recognizes movement episodes and form faults.
The product deliberately does **not** classify smash/clear/drop/serve, analyze tactics, diagnose
injuries, or provide medical advice.

### Current product decisions

- Web app first; responsive, no mobile app.
- Badminton-specific form analysis for short technique clips.
- Solo athlete only; multiple people produce a blocking capture-quality failure.
- 2D pose form indicators only; no 3D kinematics.
- v1 has no stroke classification and no tactical analysis.
- Review uses Claude when configured, with a deterministic local template fallback.
- Local single-user MVP; no authentication and no public deployment hardening yet.

---

## 2. Current status

### Implemented and working

- Next.js landing page, upload flow, analysis progress, results, history, and mobile layout.
- FastAPI API with upload validation, job status, result retrieval, Range-enabled annotated video,
  thumbnails, pose debug JSON, report retry, and delete.
- SQLite-backed job queue plus a separate worker process.
- Video normalization with ffmpeg to 15 fps, max 1280 px, H.264, browser-compatible MP4.
- Ultralytics YOLO pose backend with ByteTrack tracking.
- Fake deterministic pose backend for offline development and tests.
- One-athlete track selection, mirror correction, short-gap interpolation, One Euro smoothing.
- Episode segmentation, 2D metrics, quality gates, and nine fault rules.
- Annotated skeleton video and thumbnail rendering through ffmpeg.
- Grounded Claude report generation, strict validation, server-side refusal fallback, and local
  template fallback.
- Curated exercise catalog and fault-to-exercise selection.
- Versioned Pydantic/JSON Schema/TypeScript contract with drift checking.
- 21 backend tests, all passing.
- Production web build passing.
- Full browser flow tested with the synthetic backend: upload → worker → result → video seeking →
  findings → exercise plan → history, desktop and mobile.

### Not yet verified on this machine

These are environment limitations, not known code defects:

- **Real Ultralytics weights were never loaded.** GitHub was unreachable, so
  `yolo11n-pose.pt` could not be downloaded. The real backend code exists but has not been
  exercised against live model weights here.
- **No live Claude call was made.** No Anthropic API key/credential was available. The SDK call is
  unit-tested with a fake client, and the deterministic template fallback was exercised
  end-to-end.
- **No real solo badminton clip has been analyzed.** Thresholds are heuristic and need validation
  against real footage and ideally a coach-labeled set.

---

## 3. Repository and stack

The project is inside a larger git repository:

- Git root: `/Users/dolbydot/dot-mono`
- Project path within it: `cc-ds/badminton-coach`
- **Nothing has been committed.** At the time of handoff, the `cc-ds` directory is untracked in
  the parent repository. If switching devices, commit/push the project deliberately from the
  parent repo; do not commit `.env`, `data/`, model weights, `.venv`, or `node_modules`.

### Runtime and libraries

Installed and locked in this workspace:

| Layer | Technology |
|---|---|
| Web | Next.js 16.4.2 (App Router, Turbopack), React 19.3.1, TypeScript 5.9.3 |
| Styling | Tailwind CSS 4.3.3 plus custom CSS in `apps/web/src/app/globals.css` |
| Data fetching | TanStack Query 5.104.5 |
| API | FastAPI 0.156.5, Python 3.12 via uv, Uvicorn 0.54.0 |
| Database | SQLite via SQLAlchemy 2.1.5 |
| CV | Ultralytics 8.4.183, OpenCV 5.0, NumPy 2.5.4, `lap`/ByteTrack |
| LLM | Anthropic Python SDK 1.17.0 |
| Media | ffmpeg/ffprobe 9.0.2 |
| Local tools | Node 24.16.0, uv 0.13.4 |

The system Python on the original machine was 3.9; the API intentionally uses a uv-managed
Python 3.12. Lockfiles that matter:

- `package-lock.json`
- `apps/api/uv.lock`

---

## 4. Setup on another machine

### macOS

```bash
# Prerequisites
brew install ffmpeg uv
node --version   # need Node 22+

# Install
npm install
cd apps/api && uv sync && cd ../..

# Optional local config
cp .env.example .env
# If the API origin changes:
cp apps/web/.env.example apps/web/.env.local

# Run the real app
npm run dev
```

Open `http://localhost:3000`. API docs: `http://127.0.0.1:8000/docs`.

### Linux/Windows notes

- Install ffmpeg/ffprobe and uv through the platform package manager.
- `POSE_DEVICE=auto` picks MPS/CUDA/CPU. On Linux, CUDA is used if Torch reports it; otherwise CPU.
- The app binds the API to `127.0.0.1` by default.
- The `dev:demo` script uses Unix-style environment assignments. Run the equivalent env vars on
  Windows or add a cross-platform script if Windows support matters.

### Offline/synthetic demo

This needs no model weights, API key, or network:

```bash
npm run dev:demo
```

Upload [fixtures/synthetic-athlete.mp4](fixtures/synthetic-athlete.mp4). The fake athlete has an
intentional ready-stance fault (knee angle ~174° against a 168° guide) so findings and exercises
appear. Capture quality is intentionally "poor" because the fixture is only 640×360, and the view
estimator warns that the synthetic side-view pose looks front-facing. Both are expected.

Demo runtime data lives in `data-demo/` and is gitignored.

### Required real-model step

The first real analysis will try to download `yolo11n-pose.pt` from Ultralytics. If GitHub is
blocked:

1. Obtain the weights through an approved source.
2. Put them somewhere outside git, for example:
   `apps/api/weights/yolo11n-pose.pt` (do not commit weights).
3. Set `POSE_MODEL=/absolute/path/to/yolo11n-pose.pt` in `.env`.
4. Keep `POSE_BACKEND=ultralytics`.

The backend reports `POSE_MODEL_UNAVAILABLE` when weight download/network fails.

### Enabling Claude-written reviews

```bash
ANTHROPIC_API_KEY=...
REPORT_PROVIDER=anthropic
COACH_ANTHROPIC_MODEL=claude-opus-5-5
COACH_ANTHROPIC_EFFORT=medium
```

Important: the app uses `COACH_ANTHROPIC_MODEL`, not `ANTHROPIC_MODEL`. The Claude Code shell in
the original environment exports `ANTHROPIC_MODEL` for its own routing; reading that variable
would have pointed the app at the wrong model.

The Claude call uses:

- Structured output through the Python SDK's `beta.messages.parse(...)` with `ReportDraft`.
- Adaptive thinking.
- Server-side refusal fallback beta (`server-side-fallback-2026-07-01`, `fallbacks="default"`).
- A local template fallback if credentials, request, refusal fallback, or validation fail.

If no key is available, `REPORT_PROVIDER=template` avoids the failed provider attempt entirely.
With the default `REPORT_PROVIDER=anthropic`, the app falls back to the template automatically.

---

## 5. How to run and verify

### Standard commands

```bash
npm run dev          # web + API + worker
npm run dev:demo     # same, fake pose backend + template reports + data-demo
npm run check        # web typecheck + backend tests
npm run test:api     # backend tests only
npm run build        # production Next.js build
npm run contracts    # regenerate JSON Schema + TypeScript types
npm run contracts:check
```

If you start the API manually, also start the worker or queued analyses will never process:

```bash
cd apps/api
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# separate terminal:
uv run python -m app.worker
```

### What the 21 tests cover

Tests live in `apps/api/tests/` and use the fake pose backend plus a real ffmpeg render:

- media validation, smoothing, interpolation
- episode detection on a deterministic athlete
- quality gates and missing-athlete blocking
- fault thresholds, view gating, duplicate-fault handling
- catalog coverage and exercise targeting
- report schema/ID/banned-term/unsupported-number validation
- Anthropic structured-output call shape with a fake SDK client
- upload → queue → worker → completed result
- Range video, thumbnail, history
- report retry
- JSON Schema drift

Run:

```bash
cd apps/api && uv run pytest -q
uv run ruff check app tests
```

### Browser verification already performed

- Uploaded the synthetic clip through the UI.
- Waited for worker processing.
- Confirmed result rendering, deduplicated fault card, exercise cards, and template review.
- Confirmed the annotated video loads (`readyState=4`) and timeline clicks seek the video.
- Confirmed history rendering.
- Confirmed mobile layout at 390 px with no horizontal overflow.
- Checked for console/page errors (none after the Next dev origin fix).

There is currently **no committed Playwright E2E test**. Playwright was used temporarily for manual
verification and then removed from dependencies. Add `@playwright/test` if you want CI browser
tests.

---

## 6. Key architecture and files

```text
badminton-coach/
├── apps/web/                         Next.js UI
│   ├── src/app/page.tsx              upload / landing
│   ├── src/app/analyses/page.tsx     history
│   ├── src/app/analyses/[id]/page.tsx
│   ├── src/components/upload/        upload + capture guide
│   ├── src/components/analysis/      progress and query orchestration
│   ├── src/components/results/       video, timeline, faults, report, exercises
│   ├── src/lib/api.ts                browser API client / XHR upload
│   ├── src/lib/format.ts
│   └── src/lib/generated/            generated contract types
├── apps/api/
│   ├── app/main.py                   FastAPI app, CORS, health
│   ├── app/routers/analyses.py       HTTP endpoints
│   ├── app/worker.py                 claim jobs, recovery, report retry
│   ├── app/models.py, db.py          SQLite job table
│   ├── app/contracts/                Pydantic contract + schema export
│   ├── app/pipeline/
│   │   ├── media.py                  probe / normalize
│   │   ├── pose/                     YOLO, fake, shared interface
│   │   ├── subject.py                one-athlete track selection
│   │   ├── smoothing.py              gap fill + One Euro
│   │   ├── segmentation + metrics    movement episodes, angles
│   │   ├── quality.py                capture gates
│   │   ├── faults.py + faults.yaml   threshold rules
│   │   ├── render.py                 annotated video + thumbnail
│   │   └── orchestrator.py           full job lifecycle
│   ├── app/coaching/
│   │   ├── exercises.json            curated exercise catalog
│   │   ├── input.py                  report grounding, fault dedupe
│   │   ├── prompt.py                 system prompt
│   │   ├── llm.py                    Claude structured call
│   │   ├── validate.py               ID/term/number validation
│   │   ├── fallback.py               deterministic report
│   │   └── service.py                report outcome orchestration
│   └── tests/
├── contracts/                        generated JSON Schemas
├── fixtures/                         synthetic clip + notes
├── scripts/                          contract generation/check
├── README.md
└── HANDOFF.md                        this file
```

### Runtime flow

```text
POST /api/v1/analyses
  -> save upload -> ffprobe -> validate -> insert queued row
worker
  -> normalize -> YOLO/fake pose -> select athlete -> smooth
  -> segment episodes -> metrics -> quality -> faults/observations
  -> render annotated MP4 + thumbnail
  -> write result.json, mark completed
  -> generate Claude/template report, update result.json
browser
  -> polls status -> fetches result.json -> plays Range video
```

### Job states

```text
analysis: queued -> processing -> completed | failed
report:   pending -> generating -> generated | template | failed | skipped
```

`completed` can still mean `capture_quality.analyzable=false`; that is an intentional quality
failure, not a processing crash. Such clips skip rendering/reporting and show re-record guidance.

### Storage

- SQLite DB: `data/app.db` (or `data-demo/app.db`)
- Per analysis: `data/analyses/<uuid>/`
  - `source.mp4` normalized input
  - `annotated.mp4`
  - `thumbnail.jpg`
  - `result.json`
  - `pose.json` debug keypoints
- `data/` and `data-demo/` are gitignored.

### API endpoints

- `POST /api/v1/analyses`
- `GET /api/v1/analyses`
- `GET /api/v1/analyses/{id}`
- `GET /api/v1/analyses/{id}/result`
- `GET /api/v1/analyses/{id}/video` (Range)
- `GET /api/v1/analyses/{id}/thumbnail`
- `GET /api/v1/analyses/{id}/pose`
- `POST /api/v1/analyses/{id}/report/retry`
- `DELETE /api/v1/analyses/{id}`
- `GET /api/v1/health`

### Data contract

`apps/api/app/contracts/analysis_result.py` is the source of truth. It defines:

- pipeline/source metadata
- capture quality and subject metrics
- episodes and per-episode metrics
- faults with evidence/time ranges/confidence
- grounded observations
- artifact URLs
- coaching report and exercises

Generate/check:

```bash
npm run contracts
npm run contracts:check
```

The generated TypeScript types are in `apps/web/src/lib/generated/analysis-result.ts`.

---

## 7. Analysis details and tuning points

### Pose backends

`POSE_BACKEND`:

- `ultralytics` — real YOLO pose (`yolo11n-pose.pt` by default), ByteTrack tracking.
- `fake` — deterministic synthetic athlete used for offline demo/tests.

The shared interface is in `apps/api/app/pipeline/pose/base.py`. This is the intended seam for an
eventual RTMPose or MediaPipe fallback if the Ultralytics AGPL license is a problem.

### Quality gates

Blocking failures make a clip `unusable` and prevent analysis/reporting:

- subject coverage < 60%
- mean keypoint confidence < 0.45
- athlete bounding-box height < 30% of the frame
- more than 30% of frames with a significant second person
- duration outside 5–65 s, native fps < 15, resolution < 360p

Warnings do not block. Soft failures (for example 360–480p) reduce overall quality to `poor` but
can still produce a review. Details are in `apps/api/app/pipeline/quality.py`.

### Movement episodes

Rules in `apps/api/app/pipeline/metrics.py`:

- `overhead_motion`: dominant wrist rises above the shoulder, peaks, returns.
- `lunge`: deep knee flexion, or moderate flexion plus a visibly widened stance.
- `ready_stance`: both knees moderately bent, feet apart, hands below/near shoulders.

There is no stroke classification.

### Fault rules

Thresholds live in `apps/api/app/pipeline/faults.yaml` (versioned). Current codes:

- `READY_KNEES_TOO_STRAIGHT`
- `READY_STANCE_NARROW`
- `READY_STANCE_ASYMMETRIC`
- `LUNGE_SHALLOW`
- `LUNGE_TRUNK_LEAN_EXCESSIVE`
- `LUNGE_KNEE_TRACKS_INWARD`
- `OVERHEAD_LOW_REACH`
- `OVERHEAD_ELBOW_BENT`
- `BALANCE_OUTSIDE_BASE`

These are coaching heuristics, not clinically validated biomechanics. Tune them against real
footage. Repeated occurrences of the same fault are deduplicated for reporting and grouped in the
UI, while the timeline still shows every occurrence.

### Exercise catalog

`apps/api/app/coaching/exercises.json`. Every fault code must map to at least one catalog exercise;
this is enforced by tests. The LLM may only choose candidate exercise IDs; dosage, instructions,
equipment, and safety text are always enriched from the catalog server-side.

### Report validation

`apps/api/app/coaching/validate.py` enforces:

- IDs exist in the supplied faults/observations/exercises
- exercise targets match the related fault codes
- list/word limits
- no diagnosis/injury-risk/stroke/tactics/guaranteed-outcome language
- no unit-qualified numbers not present in the measured input

Two attempts are made; otherwise it falls back to `template_report`.

---

## 8. Environment variables

Backend reads the root `.env` (see `.env.example`). Next only reads `NEXT_PUBLIC_*` from
`apps/web/.env.local` (see `apps/web/.env.example`); the code has a local default.

| Variable | Default | Meaning |
|---|---|---|
| `DATA_DIR` | `./data` | Runtime artifacts + SQLite |
| `MAX_UPLOAD_MB` | `200` | Upload limit |
| `ANALYSIS_FPS` | `15` | Inference frame rate |
| `VIDEO_MAX_WIDTH` | `1280` | Normalized width |
| `POSE_BACKEND` | `ultralytics` | `ultralytics` or `fake` |
| `POSE_MODEL` | `yolo11n-pose.pt` | Model name or local path |
| `POSE_DEVICE` | `auto` | `mps`, `cuda`, `cpu` |
| `POSE_CONFIDENCE` | `0.25` | YOLO confidence |
| `REPORT_PROVIDER` | `anthropic` | `anthropic` or `template` |
| `ANTHROPIC_API_KEY` | empty | Enables live reports |
| `COACH_ANTHROPIC_MODEL` | `claude-opus-5-5` | Report model |
| `COACH_ANTHROPIC_EFFORT` | `medium` | Effort level |
| `COACH_ANTHROPIC_MAX_TOKENS` | `16000` | Output/thinking ceiling |
| `CORS_ORIGINS` | localhost/127.0.0.1 :3000 | Allowed web origins |

Next-specific:

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` |

---

## 9. Known issues, gotchas, and constraints

1. **Real YOLO weights are missing here.** No `yolo11n-pose.pt` file is in the repo; weights are
   intentionally gitignored. Provide them to test the real backend.
2. **Real Ultralytics inference is unverified in this workspace.** The code path, device selection,
   tracking, and error handling are implemented, but network access prevented loading weights.
3. **No live Claude response has been seen.** The structured-output call shape is covered by a
   fake-SDK unit test. Use a real key to confirm API behavior, model output quality, and cost.
4. **Thresholds need calibration.** They are sensible starting heuristics, not coach-validated.
   Expect false positives/negatives on real footage, especially with loose clothing, occlusion,
   camera tilt, or poor light.
5. **No auth and no public deployment.** The API binds to localhost. Do not expose user video.
   Add auth, ownership, quotas, retention/deletion, object storage, Postgres, and a real queue
   before public use.
6. **Ultralytics AGPL.** Local/open-source use is lower risk. Public or commercial use normally
   requires an enterprise license or switching the pose backend. The backend interface exists for
   that reason.
7. **Next dev origin gotcha.** The dev server needs `allowedDevOrigins: ["127.0.0.1", "localhost"]`
   in `apps/web/next.config.ts`; without it, Chrome blocks HMR and hydration can stall when
   opening `127.0.0.1` instead of `localhost`. This is already configured.
8. **`ANTHROPIC_MODEL` collision.** Do not rename `COACH_ANTHROPIC_MODEL` to `ANTHROPIC_MODEL`;
   the original shell exports that name for Claude Code itself.
9. **No committed browser tests.** Manual Playwright verification was done, but the dependency was
   removed. Add `@playwright/test` for durable E2E coverage.
10. **Solo-only analysis.** Doubles/waiting players cause warnings or blocking quality failures by
    design. Do not promise multi-player support.
11. **No stroke/tactical claims.** The app intentionally stays within form indicators.
12. **No committed git history for this project.** Check the parent `dot-mono` repository state
    and commit/push intentionally before switching devices.

---

## 10. Suggested next steps

### Highest priority

1. **Run the real YOLO path.** Supply weights, analyze a short solo badminton clip from side and
   front views, inspect `pose.json`, the annotated overlay, and quality metrics. Confirm the model
   works on your hardware and camera setup.
2. **Run a live Claude report.** Set the API key and verify a generated report, exercise selection,
   latency, and cost. Confirm the beta refusal fallback works as expected.
3. **Calibrate thresholds.** Record 5–10 clips of known quality and compare faults against a
   coach's read. Update `faults.yaml` and add fixtures/regression expectations.
4. **Commit the project** from the parent repo if you want to continue on another device. Ensure
   `.env`, `data/`, `data-demo/`, `.venv/`, `node_modules/`, and model weights are excluded.
   `fixtures/synthetic-athlete.mp4` is small and safe to commit.

### Product improvements

- Add a capture-guidance overlay or sample frame selection.
- Add per-fault occurrence markers in the annotated video, not just the UI timeline.
- Add clip deletion/retention controls in the UI (the API already has `DELETE`).
- Add an "AI rewrite" button for template reports after the user configures an API key.
- Add a short coach-labeled calibration fixture set.
- Add Playwright E2E coverage for upload → result in demo mode.
- Consider athlete profile/level inputs for more personalized cue language.
- Consider accepting a second camera angle for missing-plane metrics.

### Deployment hardening, only if going public

- Authentication and per-user analysis ownership.
- Object storage and Postgres.
- Managed queue or a proper worker lease.
- Upload quotas, virus/content checks, and a retention/deletion policy.
- Consent flow for identifiable people, especially minors.
- Resolve Ultralytics AGPL licensing or switch to an Apache-2.0 pose backend.
- HTTPS, rate limits, logging, and observability.

---

## 11. Quick troubleshooting

### Web page is blank / buttons do nothing in dev

Open `http://localhost:3000` rather than `127.0.0.1`; `allowedDevOrigins` should already handle
both, but the Next dev/HMR origin mismatch caused a hydration stall before that config was added.

### Upload succeeds but analysis stays queued

The worker is not running. `npm run dev` starts it. If running Uvicorn manually, also run:

```bash
cd apps/api && uv run python -m app.worker
```

### Analysis fails with `POSE_MODEL_UNAVAILABLE`

The YOLO weights could not be downloaded. Put them locally and set `POSE_MODEL`; keep
`POSE_BACKEND=ultralytics`.

### Analysis completes with `analyzable=false`

Read the capture-quality checks. Common causes: more than one person, athlete too small, low pose
confidence, blur, too-low frame rate/resolution, or a clip outside the supported duration.

### Reports stay as `template`

No working Anthropic credentials, provider error, or LLM validation failure. Check the analysis
row's `report_error` / the result's report status. Set `ANTHROPIC_API_KEY` and retry via the UI
failure action or `POST /api/v1/analyses/{id}/report/retry`. `REPORT_PROVIDER=template` is the
intentional offline mode.

### `npm run dev` starts the web app but not the API

Check that `uv` is installed and `apps/api/.venv` exists. Run `cd apps/api && uv sync` first.
Also check ports 3000 and 8000 are free.

---

## 12. Handoff checklist before switching devices

- [ ] From `/Users/dolbydot/dot-mono`, inspect `git status` and commit the `cc-ds/badminton-coach`
      project deliberately (nothing was committed automatically).
- [ ] Confirm `.env` is not staged; only `.env.example` should be shared.
- [ ] Model weights are not in git; transfer/download them separately if needed.
- [ ] `fixtures/synthetic-athlete.mp4` is present (or regenerate with the command in
      `fixtures/README.md`).
- [ ] Run `npm install`, `cd apps/api && uv sync`, then `npm run check`.
- [ ] Run `npm run dev:demo` and complete one synthetic analysis to confirm the environment.
- [ ] If continuing the real product path, supply YOLO weights, a real solo clip, and optionally an
      Anthropic API key.
