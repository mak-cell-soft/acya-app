curl -X POST http://localhost:8080/api/Payments/instruments/disburse \
-H "Content-Type: application/json" \
-d '{
  "bankId": 2,
  "instrumentIds": [12],
  "disburseDate": "2026-06-06T12:00:00Z",
  "notes": "test",
  "salesSiteId": 1,
  "createdByUserId": 1
}'
