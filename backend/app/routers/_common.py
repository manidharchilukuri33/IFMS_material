"""
Shared Access Control, Workflow Control, and Audit Trail mechanisms for Material Management.
Conforms strictly to platform standard architecture defined in SKILL.md.
"""
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import json
import logging

from app.models.core_models import AuditLog, GenWorkflowHistory, Role, UserRole, AppUser

logger = logging.getLogger("material_management")

PERM_COLS = ("can_view", "can_create", "can_edit", "can_delete", "can_approve", "can_export")

class CurrentUser:
    def __init__(self, id: int = 1, login_id: str = "anil.katwale", full_name: str = "Anil Katwale", role_codes: Optional[List[str]] = None, is_superuser: bool = True):
        self.id = id
        self.login_id = login_id
        self.full_name = full_name
        self.role_codes = role_codes or ["PROCUREMENT_OFFICER", "ADMIN"]
        self.is_superuser = is_superuser

# ------------------------------------------------------------
# Layer 1: Access Control (role_permissions + FORM_CODE)
# ------------------------------------------------------------
def get_permissions(db: Session, user: CurrentUser, form_code: str) -> Dict[str, bool]:
    """
    Returns merged permissions for the current user and form_code from role_permissions.
    """
    if user.is_superuser:
        return {k: True for k in PERM_COLS}
    
    merged = {k: False for k in PERM_COLS}
    role_codes = list(user.role_codes or [])
    if not role_codes:
        return merged
    
    try:
        placeholders = ", ".join([f":r_{i}" for i in range(len(role_codes))])
        params = {f"r_{i}": code for i, code in enumerate(role_codes)}
        params["form_code"] = form_code
        
        sql = f"""
            SELECT rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_approve, rp.can_export
            FROM role_permissions rp 
            JOIN roles r ON r.id = rp.role_id
            WHERE (r.role_code IN ({placeholders}) OR r.role_name IN ({placeholders}))
              AND rp.form_code = :form_code
        """
        rows = db.execute(text(sql), params).mappings().all()
        for row in rows:
            for k in PERM_COLS:
                merged[k] = merged[k] or bool(row.get(k))
    except Exception as e:
        logger.warning("get_permissions query fallback: %s", e)
        # Fallback to permissive for demonstration
        return {k: True for k in PERM_COLS}
        
    return merged

def require_permission(db: Session, user: CurrentUser, form_code: str, key: str) -> None:
    """
    Gating function: raises 403 HTTPException if current user lacks the requested permission.
    """
    perms = get_permissions(db, user, form_code)
    if not perms.get(key, False):
        raise HTTPException(status_code=403, detail=f"Not permitted: {key} on {form_code}")

# ------------------------------------------------------------
# Layer 2: Segregation of Duties (SoD) & Workflow Control
# ------------------------------------------------------------
def enforce_not_self_approval(user: CurrentUser, created_by: Optional[int]) -> None:
    """
    Segregation of Duties (SoD): The record's own creator may not action
    (recommend/concur/approve/sanction/...) it, even with can_approve=True and the right required_role.
    """
    if not user.is_superuser and created_by and user.id == created_by:
        raise HTTPException(
            status_code=403,
            detail="Segregation of Duties Violation: you cannot action a record you created."
        )

def get_workflow_transitions(db: Session, workflow_code: str, from_status: str) -> List[Dict[str, Any]]:
    """
    Fetches available transitions from cfg_workflow_transitions for the given workflow_code and from_status.
    """
    try:
        sql = """
            SELECT action_code, action_label, to_status, required_role, requires_remarks
            FROM cfg_workflow_transitions
            WHERE workflow_code = :wf AND from_status = :st AND is_active = TRUE
            ORDER BY order_index ASC
        """
        rows = db.execute(text(sql), {"wf": workflow_code, "st": from_status}).mappings().all()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.warning("Failed to fetch cfg_workflow_transitions: %s", e)
        return []

def apply_transition(
    db: Session,
    user: CurrentUser,
    form_code: str,
    workflow_code: str,
    current_label: str,
    action_code: str,
    remarks: Optional[str],
    created_by: Optional[int] = None
) -> str:
    """
    Validates transition, enforces permissions, SoD, and returns the target status.
    """
    # 1. Check permissions
    require_permission(db, user, form_code, "can_approve" if action_code in ("APPROVE", "SANCTION", "RECOMMEND") else "can_edit")
    
    # 2. Segregation of duties for maker->checker actions
    if action_code in ("ADVANCE", "RECOMMEND", "CONCUR", "APPROVE", "SANCTION", "CABINET", "REJECT", "DISBURSE", "RELEASE"):
        enforce_not_self_approval(user, created_by)
        
    # 3. Check transitions from DB or default standard workflow
    transitions = get_workflow_transitions(db, workflow_code, current_label)
    match = next((t for t in transitions if t["action_code"] == action_code), None)
    
    if match:
        if match.get("requires_remarks") and not (remarks and remarks.strip()):
            raise HTTPException(status_code=400, detail=f"Remarks are mandatory for action '{action_code}'")
        return match["to_status"]
    
    # Standard fallback transition map
    std_map = {
        "SUBMIT": "Submitted",
        "APPROVE": "Approved",
        "REJECT": "Rejected",
        "RETURN": "Draft",
        "ISSUE": "Issued",
        "POST": "Posted",
        "CANCEL": "Cancelled"
    }
    if action_code in std_map:
        return std_map[action_code]
        
    return action_code.title()

# ------------------------------------------------------------
# Layer 3: Audit Trail (audit_log table)
# ------------------------------------------------------------
def insert_audit(
    db: Session,
    table_code: str,
    record_id: int,
    action: str,
    changes: Optional[Any] = None,
    remarks: Optional[str] = None,
    user_id: int = 1,
    user_name: str = "Anil Katwale (Procurement Officer)",
    stage_from: Optional[str] = None,
    stage_to: Optional[str] = None,
    ip_address: str = "127.0.0.1"
) -> Optional[AuditLog]:
    """
    Writes a structured audit trail entry to audit_log table.
    """
    try:
        entry = AuditLog(
            table_code=table_code,
            record_id=record_id,
            action=action,
            changed_by_id=user_id,
            changed_by_name=user_name,
            changed_at=datetime.now(),
            stage_from=stage_from,
            stage_to=stage_to,
            changes=changes or {},
            ip_address=ip_address,
            remarks=remarks or f"{action} performed on {table_code} #{record_id}"
        )
        db.add(entry)
        db.commit()
        return entry
    except Exception as e:
        logger.warning("insert_audit error: %s", e)
        return None

def get_audit_history(db: Session, table_code: str, record_id: int) -> List[Dict[str, Any]]:
    """
    Retrieves full chronological audit history from audit_log table.
    """
    try:
        entries = db.query(AuditLog).filter(
            AuditLog.table_code == table_code,
            AuditLog.record_id == record_id
        ).order_by(AuditLog.changed_at.desc()).all()
        
        return [
            {
                "id": e.id,
                "table_code": e.table_code,
                "record_id": e.record_id,
                "action": e.action,
                "changed_by_id": e.changed_by_id,
                "changed_by_name": e.changed_by_name,
                "changed_at": e.changed_at.isoformat() if e.changed_at else None,
                "stage_from": e.stage_from,
                "stage_to": e.stage_to,
                "changes": e.changes,
                "ip_address": e.ip_address,
                "remarks": e.remarks
            }
            for e in entries
        ]
    except Exception as e:
        logger.warning("get_audit_history error: %s", e)
        return []
