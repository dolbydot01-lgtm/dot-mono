"""Fine-tune YOLO11-pose on the Ultralytics 21-keypoint hand dataset (auto-downloaded).

Result: runs/hand/train/weights/best.pt
"""
import argparse

from ultralytics import YOLO

from main import pick_device

p = argparse.ArgumentParser()
p.add_argument("--epochs", type=int, default=15)
p.add_argument("--imgsz", type=int, default=416)
p.add_argument("--batch", type=int, default=32)
args = p.parse_args()

model = YOLO("yolo11n-pose.pt")
model.train(
    data="hand-keypoints.yaml",
    epochs=args.epochs,
    imgsz=args.imgsz,
    batch=args.batch,
    device=pick_device(),
    workers=4,
    project="runs/hand",
    name="train",
    exist_ok=True,
)
