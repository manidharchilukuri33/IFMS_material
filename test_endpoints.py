import urllib.request
import json

endpoints = [
    '/dashboard/stats',
    '/materials/items',
    '/materials/categories',
    '/materials/uoms',
    '/materials/uom-conversions',
    '/materials/boq-mappings',
    '/requisitions/',
    '/requisitions/pending-approvals',
    '/procurement/plans',
    '/procurement/tenders',
    '/procurement/quotes',
    '/work-orders/',
    '/work-orders/deliveries/all',
    '/grn/',
    '/grn/inspections',
    '/grn/rtv/all',
    '/inventory/stores',
    '/inventory/stock',
    '/inventory/movements',
    '/inventory/transfers',
    '/inventory/issues',
    '/inventory/tool-issuances',
    '/billing/invoices',
    '/billing/matches',
    '/warranty/assets',
    '/warranty/defects',
    '/disposal/proposals',
    '/audit/schedules',
    '/audit/adjustments',
    '/forecasting/forecasts',
    '/reports/procurement-mis',
    '/reports/inventory-mis',
    '/reports/vendor-performance',
    '/reports/audit-trail',
    '/admin/workflows',
    '/admin/limits',
    '/admin/notifications',
    '/admin/integrations'
]

success = 0
failed = 0
for ep in endpoints:
    url = f"http://127.0.0.1:8002/api/v1{ep}"
    try:
        req = urllib.request.urlopen(url)
        if req.status == 200:
            data = json.loads(req.read().decode('utf-8'))
            count = len(data) if isinstance(data, list) else 'Dict'
            print(f"[OK 200] {ep:35} -> {count}")
            success += 1
        else:
            print(f"[ERR {req.status}] {ep}")
            failed += 1
    except Exception as e:
        print(f"[FAILED] {ep} -> {e}")
        failed += 1

print(f"\nTotal: {len(endpoints)} | Success: {success} | Failed: {failed}")
