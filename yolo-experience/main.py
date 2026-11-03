"""Webcam hand keypoint detection + gesture recognition with YOLO-Pose (21 keypoints/hand).

Needs hand weights: run `uv run python train_hand.py` first (-> runs/hand/train/weights/best.pt).
Keys: q / ESC quit, s save screenshot, m toggle mirror.
"""
import argparse
import time
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

DEFAULT_WEIGHTS = "runs/hand/train/weights/best.pt"

# 21-point hand layout: 0 wrist; thumb 1-4; index 5-8; middle 9-12; ring 13-16; pinky 17-20
WRIST = 0
FINGERS = {  # name -> (mcp, pip, dip, tip)
    "index": (5, 6, 7, 8),
    "middle": (9, 10, 11, 12),
    "ring": (13, 14, 15, 16),
    "pinky": (17, 18, 19, 20),
}
FINGER_COLORS = {
    "thumb": (0, 0, 255), "index": (0, 165, 255), "middle": (0, 255, 255),
    "ring": (0, 255, 0), "pinky": (255, 128, 0), "palm": (200, 200, 200),
}
BONES = (
    [("thumb", a, a + 1) for a in range(1, 4)] + [("palm", 0, 1)]
    + [(n, a, b) for n, (m, p, d, t) in FINGERS.items() for a, b in ((m, p), (p, d), (d, t))]
    + [("palm", 0, 5), ("palm", 5, 9), ("palm", 9, 13), ("palm", 13, 17), ("palm", 0, 17)]
)
CONF = 0.3


def angle(a, b, c):
    v1, v2 = a - b, c - b
    cos = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cos, -1, 1))))


def finger_states(pts):
    """Return dict finger -> extended(bool) using joint angles + tip/wrist distance."""
    st = {}
    for name, (m, p, d, t) in FINGERS.items():
        straight = angle(pts[m], pts[p], pts[d]) > 150 and angle(pts[p], pts[d], pts[t]) > 140
        farther = np.linalg.norm(pts[t] - pts[WRIST]) > np.linalg.norm(pts[p] - pts[WRIST])
        st[name] = bool(straight and farther)
    # thumb: straight and tip far from the palm side (pinky MCP)
    straight = angle(pts[1], pts[2], pts[3]) > 150 and angle(pts[2], pts[3], pts[4]) > 140
    far = np.linalg.norm(pts[4] - pts[17]) > np.linalg.norm(pts[3] - pts[17])
    st["thumb"] = bool(straight and far)
    return st


def classify(pts):
    """pts: (21,2). Returns (gesture, finger_states, pinch_ratio)."""
    st = finger_states(pts)
    palm = np.linalg.norm(pts[0] - pts[9]) + 1e-6  # wrist -> middle MCP
    pinch = float(np.linalg.norm(pts[4] - pts[8]) / palm)
    up = [n for n, v in st.items() if v]
    n_up = len(up)
    others_up = [n for n in ("middle", "ring", "pinky") if st[n]]

    if pinch < 0.35 and len(others_up) >= 2:
        g = "OK"
    elif pinch < 0.35:
        g = "Pinch"
    elif n_up == 0:
        g = "Fist"
    elif up == ["thumb"]:
        g = "Thumbs up" if pts[4][1] < pts[WRIST][1] else "Thumbs down"
    elif up == ["index"]:
        g = "Point"
    elif set(up) == {"index", "middle"}:
        g = "Peace / Two"
    elif set(up) == {"index", "pinky"}:
        g = "Rock"
    elif set(up) == {"thumb", "pinky"}:
        g = "Call me"
    elif set(up) == {"thumb", "index"}:
        g = "L / Gun"
    elif n_up == 5:
        g = "Open palm"
    else:
        g = f"{n_up} fingers"
    return g, st, pinch


def draw_hand(img, kp):
    for name, a, b in BONES:
        if kp[a, 2] > CONF and kp[b, 2] > CONF:
            cv2.line(img, tuple(kp[a, :2].astype(int)), tuple(kp[b, :2].astype(int)),
                     FINGER_COLORS[name], 3, cv2.LINE_AA)
    for x, y, c in kp:
        if c > CONF:
            cv2.circle(img, (int(x), int(y)), 4, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(img, (int(x), int(y)), 4, (0, 0, 0), 1, cv2.LINE_AA)


def put_text(img, text, org, scale=0.7, color=(255, 255, 255)):
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (0, 0, 0), 4, cv2.LINE_AA)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, color, 2, cv2.LINE_AA)


def pick_device():
    import torch
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return 0
    return "cpu"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--camera", type=int, default=0)
    p.add_argument("--model", default=DEFAULT_WEIGHTS, help="hand-keypoint YOLO weights")
    p.add_argument("--imgsz", type=int, default=416)
    p.add_argument("--conf", type=float, default=0.35)
    p.add_argument("--no-mirror", action="store_true")
    args = p.parse_args()

    if not Path(args.model).exists():
        raise SystemExit(f"{args.model} not found. Train first: uv run python train_hand.py")

    device = pick_device()
    model = YOLO(args.model)
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit(
            "Cannot open camera. On macOS grant camera permission to your terminal/app in "
            "System Settings > Privacy & Security > Camera."
        )
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    mirror = not args.no_mirror
    fps, t0 = 0.0, time.time()
    print(f"device={device}  model={args.model}  (q/ESC quit, s screenshot, m mirror)")

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if mirror:
            frame = cv2.flip(frame, 1)

        res = model.predict(frame, imgsz=args.imgsz, device=device, conf=args.conf, verbose=False)[0]
        n = 0
        if res.keypoints is not None and len(res.keypoints):
            kps = res.keypoints.data.cpu().numpy()
            boxes = res.boxes.xyxy.cpu().numpy()
            n = len(kps)
            for kp, box in zip(kps, boxes):
                if kp.shape[0] != 21:
                    continue
                draw_hand(frame, kp)
                gesture, st, pinch = classify(kp[:, :2])
                x1, y1, x2, y2 = (int(v) for v in box)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (80, 80, 80), 1)
                put_text(frame, gesture, (x1, max(24, y1 - 8)), 0.9, (0, 255, 255))
                flags = "".join(n_[0].upper() if v else "-" for n_, v in st.items())
                put_text(frame, f"[{flags}] pinch:{pinch:.2f}", (x1, y2 + 22), 0.55)

        now = time.time()
        fps = 0.9 * fps + 0.1 / max(now - t0, 1e-6)
        t0 = now
        put_text(frame, f"FPS {fps:.0f}  hands {n}", (10, 28), 0.7, (0, 255, 0))
        cv2.imshow("YOLO Hand", frame)

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), 27):
            break
        if key == ord("m"):
            mirror = not mirror
        if key == ord("s"):
            name = f"shot_{int(time.time())}.jpg"
            cv2.imwrite(name, frame)
            print("saved", name)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
