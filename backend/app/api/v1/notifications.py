from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Notification).where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc()).limit(100)
    ).scalars().all()
    unread = sum(1 for n in rows if not n.is_read)
    return {
        "unread": unread,
        "notifications": [
            {
                "id": n.id, "type": n.type, "title": n.title, "body": n.body,
                "ref_type": n.ref_type, "ref_id": n.ref_id,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            } for n in rows
        ],
    }


@router.post("/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))
    ).scalars().all()
    for n in rows:
        n.is_read = True
    db.commit()
    return {"ok": True, "marked": len(rows)}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        return {"ok": False}
    n.is_read = True
    db.commit()
    return {"ok": True}
