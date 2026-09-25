from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.core_models import AuditLog, GenWorkflowHistory
from app.models.material_models import MtrlNotif

def log_audit(
    db: Session,
    table_code: str,
    record_id: int,
    action: str,
    changed_by_id: int = 1,
    changed_by_name: str = "Anil Katwale (Procurement Officer)",
    changes: Optional[Dict[str, Any]] = None,
    remarks: Optional[str] = None,
    ip_address: str = "127.0.0.1",
    stage_from: Optional[str] = None,
    stage_to: Optional[str] = None
):
    """
    Writes an audit entry into ifms_jk.audit_log (also readable via audit_change_log view).
    """
    try:
        audit_entry = AuditLog(
            table_code=table_code,
            record_id=record_id,
            action=action,
            changed_by_id=changed_by_id,
            changed_by_name=changed_by_name,
            changed_at=datetime.now(),
            stage_from=stage_from,
            stage_to=stage_to,
            changes=changes or {},
            ip_address=ip_address,
            remarks=remarks or f"{action} performed on {table_code} #{record_id}"
        )
        db.add(audit_entry)
        db.flush()
        return audit_entry
    except Exception as e:
        print(f"[WARN] Failed to write audit_log: {e}")
        return None

def log_workflow(
    db: Session,
    table_code: str,
    record_id: int,
    action_code: str,
    action_label: Optional[str] = None,
    from_status: Optional[str] = None,
    to_status: str = "Submitted",
    action_by: int = 1,
    action_by_name: str = "Anil Katwale (Procurement Officer)",
    remarks: Optional[str] = None
):
    """
    Writes a workflow step into ifms_jk.gen_workflow_history (also readable via workflow_log view).
    """
    try:
        wf_entry = GenWorkflowHistory(
            table_code=table_code,
            record_id=record_id,
            action_code=action_code,
            action_label=action_label or action_code.replace("_", " ").title(),
            from_status=from_status,
            to_status=to_status,
            action_by=action_by,
            action_by_name=action_by_name,
            remarks=remarks or f"{action_code} transitioned to {to_status}",
            action_at=datetime.now()
        )
        db.add(wf_entry)
        db.flush()
        return wf_entry
    except Exception as e:
        print(f"[WARN] Failed to write workflow_history: {e}")
        return None

def log_notification(
    db: Session,
    title: str,
    message: str,
    event_type: str = "MATERIAL",
    target_role: str = "Procurement Officer",
    user_id: int = 1,
    action_route: Optional[str] = None,
    dept_id: int = 1,
    office_id: int = 2
):
    """
    Writes a notification into ifms_jk.mtrl_notif (also readable via notification_log view).
    """
    try:
        notif = MtrlNotif(
            tenant_id=1,
            branch_id=1,
            entity_id=2,
            department_id=dept_id,
            office_id=office_id,
            user_id=user_id,
            target_role=target_role,
            event_type=event_type,
            title=title,
            message=message,
            action_route=action_route,
            is_read=False
        )
        db.add(notif)
        db.flush()
        return notif
    except Exception as e:
        print(f"[WARN] Failed to write notification: {e}")
        return None
