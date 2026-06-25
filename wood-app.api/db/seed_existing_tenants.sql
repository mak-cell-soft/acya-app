-- Seed existing tenants with their default enterprise record (ID = 1) and link the admin user.

-- 1. tenant_socofeb
INSERT INTO tenant_socofeb.tbl_enterprise (
    id, name, enterpriseguid, email, phone, issalingwood, auditretentionmonths, documentnumberingconfig
) VALUES (
    1, 'SOCOFEB', 'c0018f6a-61ee-4cf8-9707-2f8841b9d0ea', 'amine.klabi@gmail.com', '+21699218866', true, 12, '{"prefixes":{"1":"CF","2":"BR","3":"FF","4":"CC","5":"BL","6":"FACT","7":"TR","8":"AVF","9":"AV","10":"INV","11":"DEV"},"yearFormat":2,"incrementLength":3}'
) ON CONFLICT (id) DO NOTHING;

UPDATE tenant_socofeb.tbl_app_user SET enterpriseid = 1 WHERE id = 1;


-- 2. tenant_piqbit
INSERT INTO tenant_piqbit.tbl_enterprise (
    id, name, enterpriseguid, email, phone, issalingwood, logourl, faviconurl, primarycolor, customdomain, language, currency, auditretentionmonths, documentnumberingconfig
) VALUES (
    1, 'piqbit', 'c0018f6a-61ee-4cf8-9707-2f8841b9d0eb', 'mohamed.derbali@piqbit.com', '+216976371', true, 'https://www.piqbit.com/logo.png', 'https://www.piqbit.com/favicon.ico', '#34fe76', 'piqbit.acya.site', 'fr', 'EUR', 12, '{"prefixes":{"1":"CF","2":"BR","3":"FF","4":"CC","5":"BL","6":"FACT","7":"TR","8":"AVF","9":"AV","10":"INV","11":"DEV"},"yearFormat":2,"incrementLength":3}'
) ON CONFLICT (id) DO NOTHING;

UPDATE tenant_piqbit.tbl_app_user SET enterpriseid = 1 WHERE id = 1;


-- 3. tenant_wellness_med
INSERT INTO tenant_wellness_med.tbl_enterprise (
    id, name, enterpriseguid, email, phone, issalingwood, primarycolor, customdomain, language, currency, auditretentionmonths, documentnumberingconfig
) VALUES (
    1, 'Wellnes Medical', 'c0018f6a-61ee-4cf8-9707-2f8841b9d0ec', 'ahmed.ayedi@gmail.com', '+21687554665', true, '#3B82F6', 'wellness-med.acya.site', 'fr', 'EUR', 12, '{"prefixes":{"1":"CF","2":"BR","3":"FF","4":"CC","5":"BL","6":"FACT","7":"TR","8":"AVF","9":"AV","10":"INV","11":"DEV"},"yearFormat":2,"incrementLength":3}'
) ON CONFLICT (id) DO NOTHING;

UPDATE tenant_wellness_med.tbl_app_user SET enterpriseid = 1 WHERE id = 1;
