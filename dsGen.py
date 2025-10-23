import pandas as pd
import numpy as np
import random
import json

# -----------------------------
# 🔹 Synthetic Engagement Data Generator
# -----------------------------

def generate_video_session():
    """Generate one synthetic VIDEO session"""
    engagement_level = np.clip(np.random.normal(0.7, 0.15), 0, 1)

    # Correlated values
    video_duration = np.random.uniform(60, 1800)  # 1–30 min
    video_watched_percentage = np.clip(
        np.random.normal(engagement_level * 90, 10), 0, 100
    )
    video_current_time = (video_watched_percentage / 100) * video_duration
    reading_time = video_current_time + np.random.randint(0, 30)
    idle_time = np.clip(
        reading_time * np.random.uniform(0.05, 0.3) * (1 - engagement_level), 0, reading_time
    )
    scroll_depth = np.random.uniform(0.0, 0.3)
    max_scroll_depth = np.clip(scroll_depth + np.random.uniform(0.0, 0.2), 0, 1.0)
    total_scrolls = np.random.randint(0, 10)
    tab_switches = np.random.randint(0, 5)
    tab_away_time = np.random.uniform(0, 60 * tab_switches)
    pause_count = np.random.randint(0, int(8 * engagement_level + 2))
    seek_count = np.random.randint(0, int(6 * (1 - engagement_level) + 1))
    seek_positions = sorted([round(np.random.uniform(0, 100), 2) for _ in range(seek_count)])
    is_video_playing = random.choice([True, False])

    return {
        "content_type": "video",
        "reading_time": int(reading_time),
        "idle_time": int(idle_time),
        "scroll_depth": round(scroll_depth, 2),
        "max_scroll_depth": round(max_scroll_depth, 2),
        "total_scrolls": int(total_scrolls),
        "tab_switches": int(tab_switches),
        "tab_away_time": round(tab_away_time, 2),
        "video_watched_percentage": round(video_watched_percentage, 1),
        "video_duration": int(video_duration),
        "video_current_time": int(video_current_time),
        "is_video_playing": is_video_playing,
        "pause_count": int(pause_count),
        "seek_count": int(seek_count),
        "seek_positions": json.dumps(seek_positions),
        "engagement_level": round(engagement_level, 3),
        "is_video": 1,
    }


def generate_non_video_session():
    """Generate one synthetic NON-VIDEO (article / page) session"""
    engagement_level = np.clip(np.random.normal(0.4, 0.2), 0, 1)

    # reading time: keep as original range
    reading_time = np.random.uniform(20, 600)

    # idle time inversely proportional to engagement
    idle_time = np.clip(
        reading_time * np.random.uniform(0.1, 0.5) * (1 - engagement_level), 0, reading_time
    )

    # max scroll depth scales with engagement
    max_scroll_depth = np.clip(
        np.random.normal(0.4 + 0.5 * engagement_level, 0.1), 0, 1.0
    )

    # scroll depth ≤ max_scroll_depth
    scroll_depth = np.random.uniform(0, max_scroll_depth)

    # total scrolls more realistic, scales with engagement
    total_scrolls = np.random.randint(
        max(1, int(3 + engagement_level * 10)),
        max(3, int(5 + engagement_level * 15))
    )

    # tab switches and away time
    tab_switches = np.random.randint(0, 10)
    tab_away_time = np.random.uniform(0, 60 * tab_switches)

    return {
        "content_type": "non_video",
        "reading_time": int(reading_time),
        "idle_time": int(idle_time),
        "scroll_depth": round(scroll_depth, 2),
        "max_scroll_depth": round(max_scroll_depth, 2),
        "total_scrolls": int(total_scrolls),
        "tab_switches": int(tab_switches),
        "tab_away_time": round(tab_away_time, 2),
        "video_watched_percentage": 0,
        "video_duration": 0,
        "video_current_time": 0,
        "is_video_playing": False,
        "pause_count": 0,
        "seek_count": 0,
        "seek_positions": json.dumps([]),
        "engagement_level": round(engagement_level, 3),
        "is_video": 0,
    }

def generate_synthetic_sessions(num_samples=10000, video_ratio=0.5, save_csv=True):
    """Generate dataset of synthetic engagement sessions"""
    num_video = int(num_samples * video_ratio)
    num_non_video = num_samples - num_video

    dataset = []
    for _ in range(num_video):
        dataset.append(generate_video_session())
    for _ in range(num_non_video):
        dataset.append(generate_non_video_session())

    random.shuffle(dataset)
    df = pd.DataFrame(dataset)

    if save_csv:
        filename = "synthetic_engagement_dataset.csv"
        df.to_csv(filename, index=False)
        print(f"✅ Dataset saved to {filename}")
        print(f"Shape: {df.shape}")
        print(df["content_type"].value_counts())
        print(df["engagement_level"].describe())

    return df


# Example usage
if __name__ == "__main__":
    df = generate_synthetic_sessions(num_samples=100000, video_ratio=0.55)
    print(df.head(3).to_string())