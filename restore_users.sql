--
-- PostgreSQL database dump
--

\restrict 0Dx5U2MUhnmc9pJH8rWOBA8PpEaaegZgGBadieNhjHhkYhacNpFQmqBOm3Ovn1G

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: tbl_enterprise; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_enterprise (id, name, description, email, phone, mobileone, mobiletwo, enterpriseguid, capital, matriculefiscal, commercialregister, siegeaddress, devise, nameresponsable, surnameresponsable, positionresponsable, issalingwood, auditretentionmonths, documentnumberingconfig, "AuditRetentionMonths") FROM stdin;
1	BMAP	Bois & Matériaux Ain Progrès	contact@bmap-bois.tn	71 438 290	99218866		beac6ced-0944-414b-ba9b-e0f46bcd889d	180 000	1147382P /A/M/ 000	4673B	12, Rue Ibn Khaldoun, Zone Industrielle Ben Arous, 2013	TND	MANSOURI	Karim 	Gérant	t	12	{"yearFormat":2,"incrementLength":4,"prefixes":{"1":"CF","2":"BR","3":"FF","4":"COM","5":"BL","6":"FACT","7":"TS","8":"AVF","9":"AVC","10":"INV","11":"DEV"}}	0
\.


--
-- Data for Name: tbl_person; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_person (id, guid, firstname, lastname, fullname, birthdate, cin, idcnss, idrole, address, birthtown, bankname, bankaccount, phonenumber, isdeleted, isappuser, hiredate, firedate, creationdate, updatedate, idappuser, basesalary, overtimehours) FROM stdin;
2	991103eb-0308-4b59-97aa-14c3abeee06a	Sonia	BELHADJ	Sonia BELHADJ	1992-07-15 23:00:00	08235542	cnss33421	20	Ariana Soghra	2	BNA	56432200006544321458	99218866	f	t	2020-01-15 23:00:00	2039-12-30 23:00:00	2026-04-22 17:43:02.319	2026-04-22 18:21:31.453878	1	0.000	0.000
4	93ccd622-db27-46e4-9245-9d6423ccc45e	Mohamed	DERBALI	Mohamed DERBALI	2010-07-14 23:00:00	12345678	cnss123	20	Riadh Andalous	2	BIAT	5453434634677543	26445887	f	t	2021-01-31 23:00:00	2039-12-30 23:00:00	2026-05-08 09:27:32	2026-05-08 11:13:58.277467	1	1500.000	0.000
3	22c2888a-4d30-4a68-b64c-0ea3df9c819c	Amine	KLABI	Amine KLABI	1988-11-04 23:00:00	04125587	cnss12546	30	Rue Jâafer	2	BNA	051510042154264350	99218866	f	t	2015-12-31 23:00:00	2039-12-30 23:00:00	2026-04-30 22:36:35	2026-05-12 11:28:26.363281	1	0.000	0.000
5	8ce8b421-8f09-4fbe-99c4-4167ec328e84	Najib	JÂAFER	Najib JÂAFER	1982-04-21 00:00:00	07854962	14-225148-25	40	Aichoucha	Makthar	BNA	030231510021541	99218761	f	f	2010-01-01 00:00:00	infinity	2026-05-19 17:20:51.836203	2026-05-19 17:20:51.836228	1	1200.000	0.000
6	e3305017-eff8-4a24-9d33-cbe635fbcb6e	Lamine	LOUATI	Lamine LOUATI	1958-04-22 00:00:00	03554875	14-2251459-25	55	Jarzouna Bizerte	Bizerte	BNA	030231514487421518	99218762	f	f	2010-01-01 00:00:00	infinity	2026-05-19 17:22:46.108775	2026-05-19 17:22:46.108783	1	1500.000	0.000
8	9c0912b0-917e-4e2d-be3a-2078ddc6749a	Boutheina	NASRI	Boutheina NASRI	1984-07-12 00:00:00	07148990	12-45615418-44	30	cité Chaker	Guafsa	BH	03023151458841	58618041	f	f	2018-01-01 00:00:00	infinity	2026-06-04 13:15:10.904863	2026-06-04 13:15:10.904915	1	1500.000	0.000
7	3828d3a8-88e5-4643-9754-840b2ca52e94	Boutheina	NASRI	Boutheina NASRI	1986-07-14 00:00:00	07148896	14-221548-22	30	Cité Chaker	Guafsa	BNA	01231515125151	58618041	t	f	2019-01-01 00:00:00	infinity	2026-05-26 09:28:55.528754	2026-05-26 09:28:55.528788	1	1100.000	0.000
1	48435291-a711-444b-9b7f-4920dc32d5d1	\N	\N	System	\N	\N	\N	0	\N	\N	\N	\N	\N	f	t	\N	\N	\N	\N	\N	0.000	0.000
\.


--
-- Data for Name: tbl_sales_sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_sales_sites (id, isforsale, gouvernorate, address, codepost, isdeleted, enterpriseid) FROM stdin;
1	t	Ben Arous	Rue Ibn Khaldoun	2013	f	1
2	t	Ariana	El Agba	1265	f	1
3	f	Ariana	Raoued Plage	2086	f	1
4	t	Ariana	Cité El Ghazela	2082	f	1
\.


--
-- Data for Name: tbl_app_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_app_user (id, login, email, isactive, passwordhash, passwordsalt, idsalessite, idperson, enterpriseid, "PasswordResetToken", "PasswordResetTokenExpiry") FROM stdin;
3	mohamed.derbali	mohamed.derbali@bmap-bois.tn	t	\\x9b74a5ca074dbe7718296760c225a11b5b3c9bbd59cc44d301a3049cba2b79f9873055f083608e2dd069174856060ebb00995f3263e5cb7aaf1a48403c05a3ba	\\xe53f0faf1292038218f0a737c9cf2d86e59837e6472115b45facc2697ed6c815f27e90143b13ca65c092bc46e8b38d3d658a36d5bfd87c373b0ff0a5752680a25d265d8b2c8d9d48df8f3b48a7a19abcab7c3157e4d6cbc02e5fd8db0f9c3c53ce9b9b04afa05d32f9a1fda854dc0b0c2f0be62c86771ddb959a0aa8c57b53d8	2	4	1	\N	\N
2	amine.klabi	klabiamine@gmail.com	t	\\x8ab39667f53b4c1c75ed2cc3e4770027b893096fdcd009d7f9db5831960f095aec3f359a2ed9a7ccdc26963248204df89302aa951c36f83b02ca2a89c20e5822	\\xedbc77cf5cb9e4b8e9e2b25ce9ad5bedb4131adc7343298ca01a5a15cb063f30b46596e7773a3688a5385e735baf8bc599318bacf72990c24708ed1da571dc71a1d0c5908d8d214649c9e8db88946894631a1add93f045d91b055579c3ab6dea28bae9c2d5e94559d8d3e20c981daae375327ecc77b408a07f6783da3c60731d	2	3	1	\N	\N
1	belhadj.sonia	sonia.belhaj@bmap-bois.tn	t	\\x8530cabe61af2e232147fe6b3912eb16eb3d92626a75aebbb7a2115ad7d30006c1e5c8fe65b170485a6091c75d926fc314ab0402cb273d49d25a73b2684b2562	\\xa0bd62000820f1b244373a567dba1021c0f2862b54c4f2f3a84aafdbd362387e309971d4ad7ced14c460646219fe84c4c752d465e59365de819b6e988d4ba01c3a612f16d0e4d32875e20dc55368d8a015a594d810e8185ff10fc1efe926b3cc925be08f85c0cd6216ea5b76bd323a2d951d45b92d0c829e2dc12204b53f3e6b	1	2	1	CE26D361	2026-06-05 19:20:07.545826
\.


--
-- Data for Name: tbl_user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tbl_user_permissions ("Id", "UserId", "Permissions", "UpdatedAt") FROM stdin;
1	1	{"Hr": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Sales": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Stock": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Articles": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Customers": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Inventory": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Providers": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Purchases": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Accounting": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}, "Configuration": {"CanAdd": true, "CanRead": true, "CanDelete": true, "CanUpdate": true}}	2026-06-04 07:40:21.231488
2	2	{"hr": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "sales": {"canAdd": true, "canRead": true, "canDelete": true, "canUpdate": true}, "stock": {"canAdd": false, "canRead": true, "canDelete": false, "canUpdate": false}, "articles": {"canAdd": false, "canRead": true, "canDelete": false, "canUpdate": false}, "vehicles": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "analytics": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "customers": {"canAdd": true, "canRead": true, "canDelete": true, "canUpdate": true}, "inventory": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "providers": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "purchases": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "accounting": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}, "configuration": {"canAdd": false, "canRead": false, "canDelete": false, "canUpdate": false}}	2026-06-04 17:13:52.810348
\.


--
-- Name: tbl_app_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_app_user_id_seq', 3, true);


--
-- Name: tbl_enterprise_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_enterprise_id_seq', 1, true);


--
-- Name: tbl_person_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_person_id_seq', 8, true);


--
-- Name: tbl_sales_sites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tbl_sales_sites_id_seq', 4, true);


--
-- Name: tbl_user_permissions_Id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."tbl_user_permissions_Id_seq"', 2, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 0Dx5U2MUhnmc9pJH8rWOBA8PpEaaegZgGBadieNhjHhkYhacNpFQmqBOm3Ovn1G

