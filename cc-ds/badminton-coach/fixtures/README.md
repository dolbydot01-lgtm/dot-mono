# Fixtures

- `synthetic-athlete.mp4` is a generated 10-second 640x360 test-pattern clip. It contains no
  person and no third-party footage. The `fake` pose backend supplies a deterministic skeleton
  with a ready stance, a lunge, and an overhead motion, including one intentional ready-stance
  fault. Use it with:

  ```bash
  npm run dev:demo
  ```

  Regenerate the video with:

  ```bash
  ffmpeg -f lavfi -i "testsrc2=size=640x360:rate=30:duration=10" \
    -c:v libx264 -preset veryfast -pix_fmt yuv420p fixtures/synthetic-athlete.mp4
  ```

- Do not commit arbitrary internet videos. A real YOLO smoke test needs a short, licensed,
  full-body clip with one athlete. Record one with consent or use a properly licensed stock clip.
