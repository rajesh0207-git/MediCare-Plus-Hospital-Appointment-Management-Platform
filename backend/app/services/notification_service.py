import asyncio
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from app.models.notification import Notification

class NotificationService:
    def __init__(self):
        # Maps user_id -> list of asyncio.Queues
        self.active_connections: Dict[int, List[asyncio.Queue]] = {}

    def subscribe(self, user_id: int) -> asyncio.Queue:
        queue = asyncio.Queue()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(queue)
        return queue

    def unsubscribe(self, user_id: int, queue: asyncio.Queue):
        if user_id in self.active_connections:
            if queue in self.active_connections[user_id]:
                self.active_connections[user_id].remove(queue)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def push_notification(
        self, db: Session, user_id: int, message: str, notification_type: str = "SYSTEM"
    ):
        # 1. Persist in database
        db_notif = Notification(
            user_id=user_id,
            message=message,
            notification_type=notification_type,
            is_read=False
        )
        db.add(db_notif)
        db.commit()
        db.refresh(db_notif)

        # 2. Push to active live SSE connections
        if user_id in self.active_connections:
            payload = {
                "id": db_notif.id,
                "message": db_notif.message,
                "notification_type": db_notif.notification_type,
                "is_read": db_notif.is_read,
                "created_at": db_notif.created_at.isoformat() if db_notif.created_at else ""
            }
            # Put notification in all active queues for this user
            for queue in self.active_connections[user_id]:
                await queue.put(payload)
                
        return db_notif

notification_service = NotificationService()
