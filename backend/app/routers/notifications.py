from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
import asyncio
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.services.notification_service import notification_service
from typing import List

router = APIRouter(prefix="/notifications", tags=["In-App Notifications"])

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.put("/{id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.get("/stream")
async def stream_notifications(
    current_user: User = Depends(get_current_user)
):
    queue = notification_service.subscribe(current_user.id)
    
    async def event_generator():
        try:
            # Yield initial connect signal
            yield "data: {\"connected\": true}\n\n"
            while True:
                # Wait for next notification
                notif = await queue.get()
                yield f"data: {json.dumps(notif)}\n\n"
        except asyncio.CancelledError:
            # Clean up on client disconnect
            notification_service.unsubscribe(current_user.id, queue)
            
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering for Nginx if proxying
        }
    )
