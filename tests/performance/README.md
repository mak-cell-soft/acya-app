# Tests de Performance k6 — SaaS ACYA

Ce dossier contient la suite complète de tests de performance k6 pour le SaaS ERP ACYA.

---

## 🚀 Guide d'Exécution Rapide en Local

### 1. Prérequis
- L'API ACYA doit tourner en local (ex: via `docker-compose up` à la racine de `acya-app` ou sur le port `8080`).
- Docker et Docker Compose installés.

### 2. Exécution avec la Stack Monitoring (k6 + InfluxDB + Grafana)

Pour démarrer la stack et lancer un Smoke Test :
```bash
cd tests/performance
docker compose -f docker-compose.k6.yml up
```

Pour visualiser les dashboards en temps réel :
- Accéder à Grafana : `http://localhost:3030` (User: `admin` / Pass: `admin`)
- Configurer InfluxDB comme Datasource (`http://localhost:8086`, Database: `k6`).

---

## ⚡ Exécution sans Docker (si `k6` est installé en local)

### Smoke Test (1 VU, 1 minute)
```bash
k6 run -e K6_ENV=local -e K6_TENANT=socofeb tests/performance/k6/scenarios/01_smoke.js
```

### Load Test (50 VUs, 10 minutes)
```bash
k6 run -e K6_ENV=local -e K6_TENANT=socofeb tests/performance/k6/scenarios/02_load.js
```

### Stress Test (Montee jusqu'a 200 VUs)
```bash
k6 run -e K6_ENV=local -e K6_TENANT=socofeb tests/performance/k6/scenarios/03_stress.js
```

### Spike Test (Pic brutal à 180 VUs en 30s)
```bash
k6 run -e K6_ENV=local -e K6_TENANT=socofeb tests/performance/k6/scenarios/04_spike.js
```

### Soak Test (Endurance 30 minutes)
```bash
k6 run -e K6_ENV=local -e K6_TENANT=socofeb tests/performance/k6/scenarios/05_soak.js
```

---

## 📊 Objectifs & SLOs définis

| Métrique | Seuil SLO |
|---|---|
| Taux d'erreur HTTP | < 1 % |
| Temps de réponse (Auth) | P95 < 300 ms |
| Temps de réponse (Stock / Articles) | P95 < 400 ms |
| Temps de réponse (Documents / Ventes) | P95 < 800 ms |
| Temps de réponse (Analytics / Dashboard) | P95 < 1 200 ms |
