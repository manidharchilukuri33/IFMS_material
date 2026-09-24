from sqlalchemy import Column, Integer, BigInteger, String, Boolean, Text, Date, DateTime, Numeric, ForeignKey
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
