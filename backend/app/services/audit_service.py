import json
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Optional, Any

class AuditService:
    @staticmethod
    def log_activity(
        db: Session,
        user_id: Optional[int],
        action: str,
        details: Any = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        # Convert dict/list details to string if necessary
        details_str = None
        if details is not None:
            if isinstance(details, (dict, list)):
                try:
                    details_str = json.dumps(details)
                except Exception:
                    details_str = str(details)
            else:
                details_str = str(details)

        db_log = AuditLog(
            user_id=user_id,
            action=action,
            details=details_str,
            ip_address=ip_address
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

audit_service = AuditService()
