---
name: form-access-workflow-audit
description: The default, mandatory architecture for access control, workflow and audit trail on EVERY module built on this platform — not an optional add-on. Load this automatically at the start of any new module/form/router development, or when auditing/hardening an existing one against platform standards, without waiting to be told "use the workflow designer" or "wire up access control like Expenditure/DGGI." Covers role_permissions+FORM_CODE access control, the cfg_workflows/cfg_workflow_transitions Workflow Designer engine (config-driven "GLOBAL" shape, or a module-owned chain built on the SAME transitions table), segregation-of-duties enforcement, and audit_log/trigger-based audit trail. Proven end-to-end on Budget > Masters > Demand Master and the DGGI module.
---

# Form Access + Workflow + Audit Trail

**This is the platform's standing architecture, not a suggestion to weigh
per module.** Every new module built on this platform — regardless of
domain — wires into the SAME three mechanisms described below: the
existing `role_permissions`/`FORM_CODE` access-control tables, the
existing `cfg_workflows`/`cfg_workflow_transitions` Workflow Designer
engine (the thing Expenditure and DGGI both actually run on — DGGI does
NOT have its own bespoke workflow engine, it just has its own per-table
status vocabulary feeding the same transitions table), and the platform's
audit trail (`audit_log`, or a per-module trigger like DGGI's
`fn_dggi_write_audit()` — see Step 3). Default to this shape automatically
for any new module/form/router — don't propose a bespoke access-control,
approval-chain, or logging mechanism, and don't wait to be told to reuse
Expenditure's/DGGI's pattern; that instruction is standing, not per-task.
The only real per-module decision is which workflow *shape* (A/B/C below)
a given form needs — not whether to use the platform's engine at all.

This skill is the checklist + exact code shape for adding whichever layer
is missing, without reinventing the pattern per module. It was authored
against a real gap: Demand Master
(`backend/app/routers/budget_masters/demand_master_router.py`) had access
control and workflow correctly wired, but no audit trail at all — and
extended against DGGI's full rebuild, which added the segregation-of-duties
guard and the trigger-based audit variant (see below).

## The three layers

1. **Access control** — every endpoint gated by `role_permissions` for a
   `FORM_CODE`, via a `get_permissions`/`require_permission` pair.
2. **Workflow control** — maker/checker/approver transitions, either
   config-driven (`cfg_workflows`/`cfg_workflow_transitions`/`cfg_stage_role`
   — the platform-wide "GLOBAL" engine) or a module's own simpler
   status-machine, exposed as `GET .../{id}/available-actions` +
   `POST .../{id}/action`.
3. **Audit trail** — every mutating endpoint (create/update/toggle/workflow
   action) writes one `bm_audit_log` row, and a `GET .../{id}/audit`
   endpoint (+ frontend history UI) reads them back.

Before changing anything, check which layers already exist — most modules
built this session already have (1) and (2); (3) is the one most often
missing or, worse, silently broken (see the warning below).

## Step 1 — Access control

Look for a `_get_permissions`/`_require_permission` pair (router-local) or an
imported `get_permissions`/`require_permission` from a module `_common.py`.
Shape (identical everywhere in this codebase — DGGI, Accounts, Material
Management, Project-Works, Budget Masters all use this exact trio):

```python
PERM_COLS = ("can_view", "can_create", "can_edit", "can_delete", "can_approve", "can_export")

async def get_permissions(db, user, form_code) -> dict:
    if user.is_superuser:
        return {k: True for k in PERM_COLS}
    merged = {k: False for k in PERM_COLS}
    role_codes = list(user.role_codes or [])
    if not role_codes:
        return merged
    placeholders = ", ".join("%s" for _ in role_codes)
    rows = await run_sql_query(db, f"""
        SELECT rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_approve, rp.can_export
        FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
        WHERE r.role_code IN ({placeholders}) AND rp.form_code = %s
    """, [*role_codes, form_code])
    for row in rows or []:
        for k in PERM_COLS:
            merged[k] = merged[k] or bool(row.get(k))
    return merged

async def require_permission(db, user, form_code, key) -> None:
    perms = await get_permissions(db, user, form_code)
    if not perms[key]:
        raise HTTPException(status_code=403, detail=f"Not permitted: {key} on {form_code}")
```

Every mutating/reading endpoint calls `require_permission(db, user,
FORM_CODE, "can_view"/"can_create"/"can_edit"/"can_delete"/"can_approve")`
as its first line. A `GET /permissions/mine` endpoint exposes the merged
dict so the frontend can gate buttons.

**When registering the page as a `CfgCustomPage` row, also set its
`form_code` column to the router's exact `FORM_CODE`** (added this
session — see `config_models.py`'s `CfgCustomPage.form_code` and
`custom_page_router.py`'s `_to_dict`). Without it, `Sidebar.tsx` can't
filter this page precisely and falls back to module-level access — which
means ANY user with `can_view` on ANY form in the same module sees this
page in the sidebar too, regardless of whether they were actually granted
it. This was a real, confirmed bug: granting one role `can_view` on
Major Head alone made every other Masters-module page appear in their
sidebar. **Verify the exact `FORM_CODE` from the router/component before
setting it** — don't assume `form_code == page_code`; two real
counter-examples exist in this exact module (`mst-form`'s router uses
`FORM_CODE = "budget-form-master"`, `mst-workflow`'s uses
`"budget-workflow-config"`) alongside several where they do match
(`mst-demand`, `mst-org`, `mst-head`, `mst-fund`, and the
`HeadHierarchyMaster`-based pages, which pass an explicit `formCode` prop
you can read directly). If a page has no real per-form access control
router-side yet (e.g. `mst-scheme` — `scheme_router.py` has no `FORM_CODE`
or `require_permission` calls at all), leave `form_code` `NULL` rather
than inventing one — the module-level fallback is accurate in that case,
since nothing gates it more precisely at the API layer either. That
router itself is exactly the kind of gap this skill's three-layer
checklist is for.

**If missing entirely**: register the form's `FORM_CODE` so it exists as a
grantable target (e.g. it shows up wherever the platform's own Access
Control admin screen — `frontend/src/admin/AccessControl/AccessControl.tsx`
— lists forms). **Do NOT write a one-off `seed_<form>_permissions.py`
script that inserts a default role/permission matrix yourself** — that
was tried for Major Head (a script copying Demand Master's own
MAKER/CHECKER/APPROVER/AUDITOR defaults) and was explicitly rejected:
it silently granted access nobody had actually reviewed or asked for,
and the fix was deleting the script and revoking every row it created.
Which roles get which permissions on a new form is an access-control
decision for a real admin to make through the platform's own UI — it is
not this skill's or this agent's call to make by seeding a "sensible
default." Leave `role_permissions` empty for a new form (only
superusers can access it) until a human explicitly grants roles through
Access Control.

## Step 2 — Workflow control

Three established shapes — decide which one a NEW form actually needs before
building it; don't default to A just because it's the most common:

**A. Config-driven "GLOBAL" engine** (Demand Master, every generated form) —
statuses/transitions/required-roles live in `cfg_workflows` /
`cfg_workflow_transitions` / `cfg_stage_role`, nothing hardcoded in Python.
Read `backend/app/routers/budget_masters/demand_master_router.py` in full
for the reference implementation: `_stage_for_status`, `_can_perform`,
`_get_transitions`, `GET /{id}/available-actions`, `POST /{id}/action`.
Editing is gated by BOTH `role_permissions.can_edit` (can this role edit
this kind of form at all) AND `cfg_stage_role` (does this role own the
record's CURRENT stage right now) — both must pass. If a role has
`can_edit=True` but no `cfg_stage_role` entry for the relevant stage
(Admin → Stage Roles, not Workflow Designer's "Form Assignments" — see
warning below), editing 409s even though the role "has edit rights."
That's not a bug, it's shape A's whole point: maker-checker-approver
discipline means form-level capability isn't the same as record-level
stage ownership.

**B. Module-owned simple chain** (DGGI/Accounts/Material Management/
Project-Works) — each module's own `_common.py` defines the stage order and
an `apply_action`/`available_actions` pair against its own status
vocabulary. Still backed by the SAME `cfg_workflow_transitions` table as
shape A — the difference is per-table status vocabulary (each transactional
table has its own dedicated `code_master` group instead of one shared
group) rather than a different storage mechanism. Full worked reference:
`backend/app/routers/dggi/_common.py`'s `visible_actions()`/
`apply_transition()` pair — read it directly rather than re-deriving this
shape, and see the SoD subsection immediately below for the one piece not
obvious from Expenditure's shape-A version.

### Segregation of duties (SoD) — a required sub-layer of workflow control

`required_role` in `cfg_workflow_transitions` answers "is this role allowed
to perform this transition" — it does NOT answer "did THIS SPECIFIC USER
create the record they're now trying to advance." Without a second check,
one account holding the right role can walk a record through multiple
stages alone (a single Checker recommends AND approves their own proposal).
This was a confirmed real gap in DGGI's first attempt (Finding #2 in the
DGGI rebuild plan) — fixed with a small, reusable guard, not a bigger
workflow engine:

```python
def enforce_not_self_approval(user: AuthUser, created_by: Optional[int]) -> None:
    """The record's own creator may not action (recommend/concur/approve/
    sanction/...) it, even with can_approve=True and the right required_role."""
    if not user.is_superuser and created_by and user.id == created_by:
        raise HTTPException(
            status_code=403,
            detail="Segregation of Duties Violation: you cannot action a record you created.",
        )
```

Call it inside `apply_transition()`, gated to the action codes that actually
represent a maker→checker handoff (not every transition needs it — a plain
`SUBMIT` or `CANCEL` by the creator is fine):

```python
if action_code in ("ADVANCE", "RECOMMEND", "CONCUR", "APPROVE", "SANCTION", "CABINET", "REJECT", "DISBURSE", "RELEASE"):
    enforce_not_self_approval(user, created_by)
```

`created_by` is whatever the record's own creator-id column holds — pass it
into `apply_transition()` from the router, which already has the row loaded.
**This is expected, correct behavior, not a bug to route around during
testing**: if a quick-login test environment only has one account per role,
that account will be blocked from actioning its own record — the fix is to
test against a record created by a *different* user (an existing seed row,
or a superuser-created one), not to weaken or bypass the check. A 403 with
this exact message during testing is the feature working, not a defect.

Fold this into `apply_transition()`'s existing checks — form-level
permission (the floor), `required_role` (the specific-stage gate), SoD
(the specific-user gate), then `requires_remarks` — all four in one place
so no router can forget one:

```python
async def apply_transition(db, user, form_code, workflow_code, current_label, action_code, remarks, created_by=None) -> str:
    # 1. re-validate the transition itself against cfg_workflow_transitions
    #    (never trust the frontend's available-actions response)
    # 2. form-level floor: require_permission(db, user, form_code, ACTION_PERMISSION[action_code])
    # 3. stage gate: required_role from the matched transition row
    # 4. user gate: enforce_not_self_approval(...) for maker->checker action codes
    # 5. enforce_remarks: requires_remarks and not remarks.strip() -> 400
    ...
    return match["to_status"]  # caller resolves the label to a code_mst_id and does the UPDATE
```

**C. Save-only / no workflow** (pure master data — the actual right choice
for most COA-hierarchy-style masters, e.g. Major Head Master) — editing is
gated ONLY by `role_permissions.can_edit`, no stage-role check at all;
`available-actions` always returns an empty list; any `POST /{id}/action`
attempt is rejected outright. Generated forms get this for free from a
NULL `cfg_gen_tables.workflow_code` (see `router.py.j2`'s
`if _wf: ... elif record.status in _READONLY: ...` branch, and its own
comment "FILTER_GRID without a workflow is a master-data / directory grid
— records stay editable").

**Make this admin-toggleable, not a hardcoded constant.** A bare
`WORKFLOW_CODE = None` Python constant works but means flipping shape C
on/off needs a code deploy every time — not good enough once an admin
actually wants to turn workflow on for a form, then back off, on their
own schedule. Instead: `CfgCustomPage` now carries its own nullable
`workflow_code` column (same convention as `cfg_gen_tables.workflow_code`,
added this session), with a dedicated endpoint —
`PUT /admin/custom-pages/{page_code}/workflow-code` body
`{"workflow_code": "GLOBAL"}` or `{"workflow_code": null}` — kept
deliberately SEPARATE from `update_page`'s general content-save `PUT`, so
saving a page's source code in the Monaco editor never silently resets it.
⚠️ **Route registration order matters**: this specific-path route must be
registered BEFORE `update_page`'s catch-all `PUT "/{page_code:path}"` in
`custom_page_router.py` — FastAPI matches in registration order, and the
`:path` converter greedily matches `"mst-x/workflow-code"` too, so the
wrong order silently shadows this endpoint entirely (confirmed live: every
call landed on `update_page` instead, returning a confusing 422 about
missing `page_title`). The router then reads it LIVE per-request instead
of a constant:
```python
async def _get_workflow_code(db) -> str | None:
    rows = await run_sql_query(db, "SELECT workflow_code FROM cfg_custom_pages WHERE page_code = %s", [FORM_CODE])
    return rows[0]["workflow_code"] if rows else None
```
— call this at the top of `_can_edit`, `_get_transitions`, and
`workflow_action` instead of referencing a module-level constant. See
`major_head_router.py` for the full worked example — it went through all
three states this session: shape A (matching Demand Master by default) →
hardcoded shape C (once it became clear this is plain COA master data) →
admin-toggleable shape A/C (once the actual ask was "let an admin flip
this whenever, not me editing code each time").

**Don't redefine these per router — call the shared versions in
`bud_masters/_common.py`.** `major_head_router.py` originally had its own
local copies of `_get_workflow_code`, `_stage_for_status`,
`_stage_role_allowed`, `_can_perform`, `_can_edit`, `_get_transitions` (~90
lines) — all six were extracted into `_common.py` as
`get_workflow_code(db, page_code)`, `stage_for_status(status)`,
`stage_role_allowed(db, user, stage_code)`,
`can_perform(db, user, required_role_csv, stage)`,
`can_edit_record(db, user, status, workflow_code)`,
`get_workflow_transitions(db, workflow_code, from_status)`. A new router
should import these directly rather than copy-pasting the bodies again;
`major_head_router.py` now keeps only thin one-line bindings to its own
`FORM_CODE`:
```python
from ._common import get_workflow_code, stage_for_status, can_perform, can_edit_record, get_workflow_transitions

async def _get_workflow_code(db): return await get_workflow_code(db, FORM_CODE)
_stage_for_status = stage_for_status  # no db lookup, plain alias
async def _can_edit(db, user, status): return await can_edit_record(db, user, status, await _get_workflow_code(db))
async def _get_transitions(db, from_status): return await get_workflow_transitions(db, await _get_workflow_code(db), from_status)
```
Only `MAJOR_HEAD_SELECT`-equivalent SQL and `_get_or_404` stay genuinely
per-table — everything workflow/stage-related is shared. This is the same
"factory, not copy-paste" principle as the frontend's `createFormApi.ts`.

**If missing entirely**: ask whether the form is genuinely a
maker-checker-approver process (shape A, needs `cfg_stage_role` entries
for whoever will use it) or plain master data (shape C, no stage
questions at all) — don't assume shape A by default just because it's
what Demand Master uses. Use shape B only when building a brand-new
module with its own bespoke status vocabulary that doesn't fit the GLOBAL
3-stage model.

⚠️ **"Workflow Designer → Form Assignments" is a decoy for this decision.**
It writes to `cfg_gen_tables.active_stages` + `cfg_workflow_forms` — a
real, saved, but **completely orphaned** mechanism confirmed (by grep)
unused by `_can_edit_record`/`_stage_role_allowed` in either
`router.py.j2` or any custom router. It only drives form visibility
inside a separate "Applications" case-management feature. Checking or
unchecking a form there has **zero effect** on whether that form's edit/
workflow-action gates apply — don't spend time on it when diagnosing an
edit-permission issue; go straight to `cfg_stage_role` (shape A) or the
router's own `WORKFLOW_CODE` constant (shape C).

## Step 3 — Audit trail (the layer most often missing)

⚠️ **`bm_audit_log` no longer exists** — it was dropped along with every
other `bm_*` table this session. It turned out to be a platform-wide
shared audit table (used by 27 files across DGGI/Revenue/Expenditure/
Accounts/Material Management/Project-Works/Budget Authorization/Execution/
Modification/Advances-CSS/Refund-of-Revenue/Contingency, each just writing
its own discriminator into `module`), not something scoped to Budget
Masters — dropping it broke audit trail platform-wide, not just in one
module. Those 27 files still reference it and are currently broken; that's
a tracked follow-up, not something to fix inline while building a new
form.

**The real target now is `audit_log`** — a separate, still-live,
already-existing platform-wide table with a different shape:
`id, table_code, record_id, action, changed_by_id, changed_by_name,
changed_at, stage_from, stage_to, changes (jsonb), ip_address, remarks,
record_uuid`. Verify this against the live table before trusting it
(`SELECT column_name FROM information_schema.columns WHERE
table_name='audit_log'`) — schemas drift, don't assume from this doc alone.

⚠️ **UUID-keyed tables need `record_uuid`, not `record_id`.** Every
bud_masters table up through Scheme Master has an integer PK, so
`record_id bigint` (now nullable) was fine. `chart_of_account` (Account
Head Master) was the first with a UUID PK, and writing its id straight
into `record_id` fails outright (`'str' object cannot be interpreted as
an integer`). Fixed by adding a nullable `record_uuid UUID` column and
dropping `record_id`'s NOT NULL constraint — `insert_audit`/
`get_audit_history` in `bud_masters/_common.py` now route to whichever
column matches the id's actual Python type (`_is_uuid_id`: anything not
a plain `int` is treated as a UUID string) rather than each router having
to say which column to use. If you add another UUID-PK table, this
already works — no per-router change needed, just don't reintroduce a
NOT NULL on `record_id` or a router that hardcodes the old two-column
INSERT shape.

Add `insert_audit` to the module's `_common.py` (create one if it doesn't
exist yet):

```python
import json

async def insert_audit(
    db, table_code: str, record_id: int, action: str,
    changes: list | dict, remarks: str, user_id: int,
    stage_from: str | None = None, stage_to: str | None = None,
    ip_address: str | None = None,
) -> None:
    try:
        user_row = await run_sql_query(db, "SELECT full_name FROM app_users WHERE id = %s", [user_id])
        changed_by_name = user_row[0]["full_name"] if user_row else None
        await run_sql_query(db, """
            INSERT INTO audit_log
                (table_code, record_id, action, changed_by_id, changed_by_name,
                 stage_from, stage_to, changes, ip_address, remarks)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, [table_code, record_id, action, user_id, changed_by_name,
              stage_from, stage_to, json.dumps(changes), ip_address, remarks or ""])
    except Exception as e:
        logger.warning("audit_log insert skipped: %s", e)
```

Call `insert_audit(...)` as the last line of every mutating endpoint —
create, update, any toggle/status-flip, and every workflow action:

```python
# create: changes=[], stage_from=None, stage_to=None, action="CREATE"
# update: changes=[{"field": "name", "before": old, "after": new}, ...], action="UPDATE"
# toggle: changes=[{"field": "is_active", "before": old, "after": new}], action="TOGGLE_ACTIVE"
# workflow action: stage_from=<from_status>, stage_to=<to_status>, action=<action_code>
```

Then add a read helper (same `_common.py`) and a `GET /{id}/audit` endpoint:

```python
async def get_audit_history(db, table_code: str, record_id: int) -> list:
    try:
        rows = await run_sql_query(db, """
            SELECT id, action, changed_by_id, changed_by_name, changed_at,
                   stage_from, stage_to, changes, ip_address, remarks
            FROM audit_log
            WHERE table_code = %s AND record_id = %s
            ORDER BY changed_at DESC
        """, [table_code, record_id])
        return rows or []
    except Exception as e:
        logger.warning("audit_log read skipped: %s", e)
        return []
```

```python
@router.get("/{id}/audit")
async def audit_history(id: int, db=Depends(get_db), user=Depends(get_current_user)):
    await require_permission(db, user, FORM_CODE, "can_view")
    await _get_or_404(db, id)  # 404 cleanly instead of an empty history for a bad id
    return await get_audit_history(db, "<table_name>", id)
```

### Alternative: trigger-written audit (no `insert_audit()` call needed)

Some modules (DGGI is the reference — `backend/app/routers/dggi/_common.py`)
have a dedicated `AFTER INSERT/UPDATE/DELETE` trigger already attached to
their tables (e.g. `fn_dggi_write_audit()` writing to `dggi_audit_log`,
keyed by `entity_name`/`entity_id`) instead of a shared platform-wide
`audit_log` table. When that trigger already exists for the tables a new
router writes to, don't also call an app-side `insert_audit()` — the row
gets written twice, or the two audit tables disagree. Check for a live
`AFTER ... FOR EACH ROW EXECUTE FUNCTION fn_<module>_write_audit()` trigger
on the target table before adding an insert call; if one exists, the router
only needs a *read* helper:

```python
async def get_audit_history(db, entity_name: str, entity_id) -> list:
    rows = await run_sql_query(db, """
        SELECT a.audit_id, a.action_code, a.action_by, u.full_name AS action_by_name,
               a.action_at, a.old_data, a.new_data, a.remarks
        FROM dggi_audit_log a
        LEFT JOIN app_users u ON u.id = a.action_by
        WHERE a.entity_name = %s AND a.entity_id = %s
        ORDER BY a.action_at DESC
    """, [entity_name, str(entity_id)])
    return rows or []
```

⚠️ **Don't resolve `action_by` via a session-scoped
`SELECT set_config('app.user_id', ...)` GUC read back by the trigger's
`current_setting('app.user_id')`.** That requires the trigger to fire on
the SAME physical Postgres connection that ran the `set_config` call —
`run_sql_query()`-style helpers that commit after every call return the
connection to the pool in between, so the GUC is gone by the time the
trigger fires. Confirmed live: `action_by` came back NULL under real
traffic even though the row's own `created_by`/`updated_by` columns were
correctly populated. The reliable fix is to have the trigger function read
`action_by` off the row's OWN `created_by`/`updated_by` columns (always
set by the router on every write) instead of a connection-scoped GUC —
keep a `set_config` call as a harmless fallback only, never the primary
mechanism.

## Step 4 — Frontend history UI

**Build the page's API client with `createFormApi`, not by hand.**
`frontend/src/core/api/createFormApi.ts` is a factory that already returns
all 8 standard methods (`list, get, create, update, availableActions,
performAction, myPermissions, auditHistory`) — every new form's client is
just that spread, plus whatever's form-specific:

```ts
import client from './client'
import { createFormApi } from './createFormApi'

const B = '/<module>/<form>'

export const xApi = {
  ...createFormApi(B),
  // form-specific extras only, e.g.:
  // lookups:    () => client.get(`${B}/lookups`).then(r => r.data),
  // deactivate: (id) => client.post(`${B}/${id}/deactivate`).then(r => r.data),
  // listActive: () => client.get(`${B}/active`).then(r => r.data),
}
```

Don't hand-write the 8 standard one-liners again (`masterDemandApi.ts`
still does — it predates this factory and hasn't been migrated; that's
existing debt, not something to copy into a new form). See
`majorHeadApi.ts` for the worked example.

Add a "History" icon button per row (next to View/Edit) opening a modal
that `useQuery`s `auditHistory(id)` and renders a vertical timeline: action
+ timestamp (`changed_at`), `by <changed_by_name>`, `stage_from → stage_to`
when present (workflow actions), a rendered `changes` diff when present
(create/update/toggle), remarks in italics if present. See
`frontend/src/custom-pages/master-demand.jsx`'s `HistoryModal` component
for the overall shape (timeline via a `<ol>` with a left border + dot per
entry — copy the layout, but its field names predate the `audit_log`
migration and need updating to the new column names above when reused).

## Step 5 — Verify (never against the user's own dev server)

1. Syntax-check: `python -c "import ast; ast.parse(open(f).read())"` per
   backend file; `npx esbuild <file>.jsx --bundle=false` per frontend file.
2. Start an **isolated** verification server on a spare port (check nothing
   is listening on it first — `Get-NetTCPConnection -LocalPort <port>`),
   never reuse or kill the port the user's own terminal is running on.
3. Mint a JWT directly (`create_access_token` from `app.core.security`,
   built the same way `auth_router.py`'s `_issue_app_user` does) for the
   `admin` app_user — no real login flow needed for this kind of check.
4. Drive the full lifecycle with curl: create → update → toggle → a
   workflow action → `GET .../audit`, and confirm every step appended
   exactly one correctly-shaped audit row, newest first.
5. Kill the verification server when done. Leave any test data you created
   in place (soft-deleted/inactive is fine) — this platform's convention is
   never to hard-delete, so there's nothing to clean up beyond the process.

## API surface (the exact endpoints every form exposes)

This is the standard REST shape every `budget_masters`-style router follows.
Keep these exact paths/methods when adding a new form — the frontend
patterns (Step 4) assume them.

**Layer 1 — Access control**
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/permissions/mine` | Merged `{can_view, can_create, can_edit, can_delete, can_approve, can_export}` for the logged-in user against this form's `FORM_CODE`. Frontend fetches once per page load and gates buttons with it. |

Every other endpoint below calls `require_permission(db, user, FORM_CODE, "<key>")` as
its first line — it is not a separate API, it's a guard inside each one.

**Layer 2 — Workflow control**
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/{id}/available-actions` | Returns `{"actions": [{action_code, action_label, to_status, requires_remarks}], "can_edit": bool}` — computed fresh from `cfg_workflow_transitions` filtered to the record's current status AND the calling user's authorized transitions (`_can_perform`). Query key should include the record's status so it refetches after a transition. |
| `POST` | `/{id}/action` | Body `{"action_code": str, "remarks": str}`. Re-validates the transition and the user's authorization server-side (never trust the frontend's available-actions response), enforces `requires_remarks`, updates `workflow_status`, then writes the audit row (layer 3). |

Standard CRUD endpoints a form also needs (not workflow-specific, but every
mutating one is where layers 1 and 3 attach):
| Method | Path | Permission key | Audit action written |
|---|---|---|---|
| `GET` | `""` | `can_view` (skipped when `operational_only=true`) | — |
| `GET` | `/active` | none (operational lookup for other pages/dropdowns) | — |
| `GET` | `/{id}` | `can_view` | — |
| `POST` | `""` | `can_create` | `CREATE` |
| `PUT` | `/{id}` | `can_edit` (+ `_can_edit` stage check) | `UPDATE` |
| `POST` | `/{id}/toggle-active` | `can_edit` | `TOGGLE_ACTIVE` |

**Layer 3 — Audit trail**
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/{id}/audit` | Gated by `can_view`, 404s via `_get_or_404` first. Returns `get_audit_history(db, "<table_code>", id)` against `audit_log` — newest first, `changed_by_name` already denormalized on the row (no join needed). No separate write endpoint: every mutating endpoint above calls `insert_audit(...)` as its last step instead of exposing audit-write as its own API. |

**Frontend API client shape** (one file per form, e.g. `masterDemandApi.ts`):
```ts
list, listActive, get, create, update, toggleActive,   // CRUD -> layer 1 attaches via require_permission server-side
availableActions, performAction,                        // layer 2
myPermissions,                                           // layer 1 read
auditHistory,                                             // layer 3
```
Each is a one-line `client.<verb>(path).then(r => r.data)` — no logic in
the client itself, it's pure glue to the paths above.

## Reference files (read these, don't guess the shape)

- `backend/app/routers/budget_masters/demand_master_router.py` — the
  canonical access + workflow reference (config-driven GLOBAL engine).
  Its own `insert_audit`/`get_audit_history` (via `budget_masters/_common.py`)
  still target the now-dropped `bm_audit_log` — read it for the access +
  workflow shape only, and build audit against `audit_log` per Step 3 above,
  not by copying its audit calls verbatim.
- `backend/app/routers/budget_masters/budget_form_router.py` — a full
  worked example combining all three layers, same caveat on its audit
  calls as above.
- `frontend/src/custom-pages/master-demand.jsx` — the canonical frontend
  reference for permission-gated buttons and server-driven workflow action
  buttons. Its `HistoryModal` component is the right layout to copy, but
  its field names (`previous_value`/`new_value`/`logged_at`) are the old
  `bm_audit_log` shape — rename to the `audit_log` columns (Step 4) when
  reusing it.
- `frontend/src/core/api/masterDemandApi.ts` — the matching thin API
  client shape (this part is unaffected by the audit-table change).
- `frontend/src/core/api/createFormApi.ts` — shared factory for the 8
  standard methods (`list, get, create, update, availableActions,
  performAction, myPermissions, auditHistory`). Use it for every NEW
  form's API client instead of writing the same 8 one-liners again: `export
  const xApi = { ...createFormApi(basePath), <form-specific extras> }` —
  see `majorHeadApi.ts` for the pattern. Form-specific extras (`lookups`,
  `deactivate` vs `toggleActive`, `listActive`, etc.) get spread on top per
  form since those vary. `masterDemandApi.ts` predates this factory and
  hasn't been migrated to it — leave it as-is unless asked to refactor.
