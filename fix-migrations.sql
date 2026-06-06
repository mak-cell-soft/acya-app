INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion") VALUES 
('20260415131429_FixHoldingTaxMappingFinal', '7.0.20'),
('20260419151900_AddTransactionalPriceHistory', '7.0.20'),
('20260420085615_AddUserAuditToHistory', '7.0.20'),
('20260429052233_FixSupplierLedgerValues', '7.0.20'),
('20260429052415_RefreshSupplierBalances', '7.0.20'),
('20260430173740_AddApprovalWorkflow', '7.0.20'),
('20260501081326_AddPricingGrid', '7.0.20'),
('20260502062652_AddTransportFees', '7.0.20'),
('20260504084657_AddMultiCurrencySupport', '7.0.20'),
('20260505064255_AddHRFieldsToPerson', '7.0.20'),
('20260505064358_UpdatePayslipFields', '7.0.20'),
('20260505064421_AddCssAmountToPayslip', '7.0.20')
ON CONFLICT DO NOTHING;
