from pydantic import BaseModel
from datetime import datetime

class NotificationBase(BaseModel):
    message: str
    notification_type: str  # APPOINTMENT, PRESCRIPTION, LAB_TEST, BILLING, SYSTEM
    is_read: bool

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
