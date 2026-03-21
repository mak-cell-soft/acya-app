# 🌲 WoodApp ERP System

![WoodApp Banner](https://img.shields.io/badge/WoodApp-ERP--Ready-green?style=for-the-badge&logo=angular&logoColor=white)
![Status](https://img.shields.io/badge/Status-Developing-blue?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-.NET%207%20%7C%20Angular%2018%20%7C%20PostgreSQL-blueviolet?style=for-the-badge)

WoodApp is a modern, full-stack ERP (Enterprise Resource Planning) system specifically designed for wood merchandise management. It features a high-performance .NET backend and a beautifully crafted, domain-driven Angular frontend.

---

## 🏗️ Architecture Overview

The project is structured as a monorepo, separating concerns between the presentation layer (`WoodApp-UI`), the server-side logic (`wood-app.api`), and the database management.

### 🌐 Frontend ([WoodApp-UI](./WoodApp-UI/))
The UI has been recently refactored to follow a **Domain-Driven, Feature-Based Architecture** with Lazy Loading for optimized performance.

- **Framework**: Angular 18.0.0
- **State Management**: NgRx Store & Effects
- **UI Library**: Angular Material & FontAwesome
- **Key Features**: 
  - Modules: `Articles`, `Customers`, `Providers`, `Merchandise`, `Stock`, `Inventory`, `Auth`, and `Dashboard`.
  - Lazy Loading for all major feature modules.
  - Interactive dashboards and real-time notifications via SignalR.

### ⚙️ Backend ([wood-app.api](./wood-app.api/))
A cloud-ready microservice architecture that provides robust data management and security.

- **Framework**: ASP.NET Core (.NET 7.0 / Ready for .NET 8)
- **Persistence**: Entity Framework Core with PostgreSQL
- **Security**: JWT-based Authentication & Role-based Authorization
- **Integration**: SignalR for real-time UI synchronization
- **Documentation**: Swagger/OpenAPI support

---

## 🚀 Quick Start with Docker

The easiest way to get the entire stack up and running is using Docker Compose.

### 🛠️ Common Docker Commands

| Action | Command |
| :--- | :--- |
| **Start Everything** | `docker compose up -d` |
| **Full Build & Restart** | `docker compose up -d --build` |
| **Restart Backend Only** | `docker compose up -d --build api` |
| **Restart Frontend Only** | `docker compose up -d --build ui` |
| **Stop All Services** | `docker compose down` |
| **View Logs** | `docker compose logs -f` |

---

## 📂 Project Structure

```text
acya-app/
├── WoodApp-UI/          # Angular 18 Application
│   ├── src/app/
│   │   ├── features/    # Domain-specific modules (Lazy Loaded)
│   │   ├── core/        # Global singletons
│   │   └── shared/      # Shared components/models
│   └── Dockerfile       # UI container definition
├── wood-app.api/        # .NET Web API
│   ├── src/             # Clean Architecture Layers
│   ├── db/              # SQL Migrations & Seed data
│   └── Dockerfile       # API container definition
└── docker-compose.yml    # Main orchestration file
```

---

## 🛠️ Local Development Setup

### Backend
1. Navigate to `wood-app.api/src/ms.webapp.api.acya/ms.webapp.api.acya/`
2. Run `dotnet restore`
3. Run `dotnet run` or use Visual Studio.

### Frontend
1. Navigate to `WoodApp-UI/`
2. Run `npm install`
3. Run `ng serve` (Available at `http://localhost:4200`)

---

## 📑 Detailed Documentation
- [Frontend Details](./WoodApp-UI/README.md)
- [Backend Details](./wood-app.api/README.md)
- [Infrastructure/Docker Details](./wood-app.api/DOCKER.md)

---
*Developed by the acya-app team.*
