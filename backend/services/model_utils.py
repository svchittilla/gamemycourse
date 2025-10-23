# services/model_utils.py
import xgboost as xgb
import numpy as np
import os

# Paths to your saved model JSON files
VIDEO_MODEL_PATH = os.path.join("ml", "xgb_video.json")
NONVIDEO_MODEL_PATH = os.path.join("ml", "xgb_nonvideo.json")

# Load the models once on import
video_model = xgb.XGBRegressor()
video_model.load_model(VIDEO_MODEL_PATH)

nonvideo_model = xgb.XGBRegressor()
nonvideo_model.load_model(NONVIDEO_MODEL_PATH)


def predict_engagement(payload: dict) -> float:
    """
    Runs prediction on engagement payload using the appropriate model.
    """
    content_type = payload.get("content_type", "webpage")
    engagement = payload.get("engagement", {})

    if content_type == "video":
        # Only use video-specific features
        features = np.array([[
            engagement.get("video_watched_percentage", 0),
            engagement.get("pause_count", 0),
            engagement.get("seek_count", 0)
        ]])
        pred = video_model.predict(features)[0]

    else:
        # Non-video features
        features = np.array([[
            engagement.get("reading_time", 0),
            engagement.get("idle_time", 0),
            engagement.get("total_scrolls", 0),
            engagement.get("max_scroll_depth", 0)
        ]])
        pred = nonvideo_model.predict(features)[0]

    # Clip between 0 and 1 to be safe
    return float(np.clip(pred, 0, 1))
