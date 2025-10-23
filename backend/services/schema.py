from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EngagementPayload(BaseModel):
    scroll_depth: float
    max_scroll_depth: float
    idle_time: int
    reading_time: int
    total_scrolls: int
    tab_switches: int
    tab_away_time: float
    video_watched_percentage: float
    video_duration: int
    video_current_time: int
    is_video_playing: bool
    pause_count: int
    seek_count: int
    seek_positions: List[float]

class IngestEvent(BaseModel):
    session_id: str
    url: str
    timestamp: datetime
    content_type: str
    engagement: EngagementPayload

    # Optional: additional fields from your app (e.g., logged in user)
    user_id: Optional[int] = None
    mission_id: Optional[int] = None
