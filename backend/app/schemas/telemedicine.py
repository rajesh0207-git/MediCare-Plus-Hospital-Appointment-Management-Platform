from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class VideoSessionBase(BaseModel):
    appointment_id: int
    room_id: str
    status: str = "WAITING"

class VideoSessionCreate(VideoSessionBase):
    pass

class VideoSessionUpdate(BaseModel):
    status: Optional[str] = None
    is_recording: Optional[bool] = None
    recording_path: Optional[str] = None

class VideoSessionResponse(VideoSessionBase):
    id: int
    is_recording: bool
    recording_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
