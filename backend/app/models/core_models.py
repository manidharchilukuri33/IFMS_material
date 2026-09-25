from sqlalchemy import Column, Integer, BigInteger, String, Boolean, Text, Date, DateTime, Numeric, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TenantMaster(Base):
    __tablename__ = "tenant_master"
    tenant_id = Column(BigInteger, primary_key=True)
    tenant_code = Column(String(50))
    tenant_name = Column(String(255))
    tenant_status = Column(String(50))
    subscription_plan = Column(String(50))

class EntityMaster(Base):
    __tablename__ = "entity_master"
    entity_id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger, ForeignKey("tenant_master.tenant_id"))
    entity_code = Column(String(50))
    entity_name = Column(String(255))
    legal_name = Column(String(255))
    short_name = Column(String(50))
    is_active = Column(Boolean, default=True)

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    dept_code = Column(String(50), nullable=False)
    dept_name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

class Office(Base):
    __tablename__ = "offices"
    id = Column(Integer, primary_key=True)
    office_code = Column(String(50), nullable=False)
    office_name = Column(String(255), nullable=False)
    office_type = Column(String(50))
    parent_office_id = Column(Integer)
    department_id = Column(Integer, ForeignKey("departments.id"))

class FinancialYear(Base):
    __tablename__ = "financial_years"
    id = Column(Integer, primary_key=True)
    year_code = Column(String(50), nullable=False)
    year_name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)

class BudgetHead(Base):
    __tablename__ = "budget_heads"
    id = Column(Integer, primary_key=True)
    head_code = Column(String(100), nullable=False)
    head_name = Column(String(255), nullable=False)
    head_type = Column(String(50))
    parent_head_id = Column(Integer)
    is_active = Column(Boolean, default=True)

class CodeMaster(Base):
    __tablename__ = "code_master"
    code_mst_id = Column(BigInteger, primary_key=True)
    code_group_id = Column(Integer)
    code_sub_group_id = Column(Integer)
    code_desc = Column(String(255))
    display_code = Column(String(50))

class BranchMaster(Base):
    __tablename__ = "branch_master"
    branch_id = Column(BigInteger, primary_key=True)
    branch_code = Column(String(50))
    branch_name = Column(String(255))
    bank_code = Column(String(50))
    ifsc_code = Column(String(20))
    city = Column(String(100))

class BmScheme(Base):
    __tablename__ = "bm_scheme"
    id = Column(Integer, primary_key=True)
    code = Column(String(50))
    name = Column(String(255))
    department_id = Column(Integer)
    active = Column(Boolean, default=True)

class BmProject(Base):
    __tablename__ = "bm_project"
    id = Column(Integer, primary_key=True)
    code = Column(String(50))
    name = Column(String(255))
    scheme_id = Column(Integer)
    active = Column(Boolean, default=True)

class BudgetSnapshot(Base):
    __tablename__ = "tb_budget_balance_snapshots"
    id = Column(BigInteger, primary_key=True)
    tenant_id = Column(BigInteger)
    financial_year_id = Column(BigInteger)
    department_id = Column(BigInteger)
    office_id = Column(BigInteger)
    account_head_id = Column(BigInteger)
    allotted_amount = Column(Numeric(18, 2), default=0)
    expenditure_amount = Column(Numeric(18, 2), default=0)
    committed_amount = Column(Numeric(18, 2), default=0)
    available_balance = Column(Numeric(18, 2), default=0)

class AppUser(Base):
    __tablename__ = "app_users"
    id = Column(Integer, primary_key=True, index=True)
    login_id = Column(String(100), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    mobile = Column(String(50))
    password_hash = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    user_type = Column(String(50))
    department_id = Column(Integer, ForeignKey("departments.id"))
    office_id = Column(Integer, ForeignKey("offices.id"))
    tenant_id = Column(Integer)
    entity_id = Column(Integer)
    branch_id = Column(Integer)
    employee_id = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))

    department = relationship("Department")
    office = relationship("Office")
    roles = relationship("UserRole", back_populates="user")

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    role_code = Column(String(100), nullable=False, unique=True)
    role_name = Column(String(255), nullable=False)
    role_category = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user_mappings = relationship("UserRole", back_populates="role")

class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("app_users.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("AppUser", back_populates="roles")
    role = relationship("Role", back_populates="user_mappings")

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    table_code = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)
    changed_by_id = Column(Integer)
    changed_by_name = Column(String(255))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    stage_from = Column(String(100))
    stage_to = Column(String(100))
    changes = Column(JSON)
    ip_address = Column(String(100))
    remarks = Column(Text)

class GenWorkflowHistory(Base):
    __tablename__ = "gen_workflow_history"
    id = Column(Integer, primary_key=True, index=True)
    table_code = Column(String(100), nullable=False)
    record_id = Column(Integer, nullable=False)
    action_code = Column(String(50), nullable=False)
    action_label = Column(String(255))
    from_status = Column(String(100))
    to_status = Column(String(100), nullable=False)
    action_by = Column(Integer)
    action_by_name = Column(String(255))
    remarks = Column(Text)
    action_at = Column(DateTime(timezone=True), server_default=func.now())
