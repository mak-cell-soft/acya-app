# WoodApp

This repository contains the source code for the WoodApp application, which includes a frontend built with Angular and a backend powered by C# and .NET. This README provides a comprehensive analysis of the codebase, including project structure, architecture, dependencies, and setup instructions for developers.

## Frontend Analysis

The frontend of the WoodApp application is built using the Angular framework.

### Framework/Library Used

- **Angular Version:** 18.0.0
- **Key Dependencies:**
  - **@angular/material:** For UI components.
  - **@ngrx/store:** For state management.
  - **@fortawesome/angular-fontawesome:** For icons.
  - **ngx-toastr:** For notifications.
  - **@microsoft/signalr:** For real-time communication.

### Project Structure and Architecture Patterns

The project follows the standard Angular project structure, with the main source code located in the `src/app` directory. The architecture is component-based, with a clear separation of concerns between components, services, and models.

- **Components:** Reusable UI elements responsible for rendering views and handling user interactions.
- **Services:** Singleton classes that provide shared functionality, such as API integration and data management.
- **Models:** Data structures that define the shape of the application's data.
- **Guards:** Services that control access to routes based on authentication and authorization.
- **Interceptors:** Middleware that intercepts and modifies HTTP requests and responses.

### Key Components and Their Purposes

- **`app.component`:** The root component of the application.
- **`sign-in.component`:** Handles user authentication.
- **`home.component`:** The main dashboard of the application.
- **`add-article.component`:** A form for adding new articles.
- **`list-article.component`:** A list of all articles.

### Routing Configuration

Routing is configured in the `app-routing.module.ts` file. The application uses a nested routing structure, with the main routes being `/login`, `/register`, and `/home`. The `/home` route has several child routes for different features of the application.

```typescript
const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: WebAppComponent,
  },
  {
    path: 'register',
    component: EnterpriseComponent
  },
  {
    path: 'login',
    component: SignInComponent,
  },
  {
    path: 'home',
    component: HomeComponent,
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
    children: [
      // ... child routes
    ]
  }
];
```

### State Management Approach

The application uses NgRx for state management. This allows for a predictable state container that helps manage the application's state in a consistent way.

- **Actions:** Describe unique events that happen in the application.
- **Reducers:** Functions that take the current state and an action and return a new state.
- **Selectors:** Functions that retrieve data from the state.
- **Effects:** Middleware for handling side effects, such as API calls.

### API Integration Methods

API integration is handled by services that use the `HttpClient` module to make HTTP requests to the backend. The base URL for the API is configured in the `environment.ts` file.

```typescript
// article.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Article } from '../../models/components/article';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  AddArticle(model: Article) {
    return this.http.post<Article>(this.baseUrl + 'Article/Add', model);
  }

  GetAll() {
    return this.http.get<Article[]>(this.baseUrl + 'Article');
  }
}
```

### Build and Deployment Configuration

The build and deployment configuration is defined in the `angular.json` file. The project is configured to build for both development and production environments. The output of the build is placed in the `dist/wood-app-ui` directory.

## Backend Analysis

The backend of the WoodApp application is built using C# and the .NET framework.

### Technology Stack

- **C# Version:** .NET 7.0
- **Framework:** ASP.NET Core
- **Database:** Entity Framework Core

### Project Architecture

The backend follows a clean architecture pattern, with the code organized into three main projects:

- **`ms.webapp.api.acya`:** The presentation layer, which contains the API controllers.
- **`ms.webapp.api.acya.core`:** The domain layer, which contains the entities and business logic.
- **`ms.webapp.api.acya.infrastructure`:** The infrastructure layer, which contains the database context and repositories.

### API Endpoints and Their Purposes

The API endpoints are defined in the `Controllers` directory. Each controller is responsible for a specific resource, such as articles, providers, or customers.

- **`ArticleController`:** Handles CRUD operations for articles.
- **`AuthenticationController`:** Handles user authentication and authorization.
- **`DocumentController`:** Handles document management.

### Database Integration and Data Models

Database integration is handled by Entity Framework Core. The database context is defined in the `WoodAppContext.cs` file, and the data models are defined in the `Entities` directory.

```csharp
// WoodAppContext.cs
public class WoodAppContext : DbContext
{
    public WoodAppContext(DbContextOptions<WoodAppContext> options) : base(options)
    {
    }

    public virtual DbSet<Article> Articles { get; set; }
    public virtual DbSet<Provider> Providers { get; set; }
    // ... other DbSets
}
```

### Authentication/Authorization Mechanisms

Authentication is handled using JSON Web Tokens (JWT). The `IdentityServiceExtentions.cs` file configures the JWT authentication scheme. Authorization is implemented using roles, with different roles having access to different API endpoints.

### Middleware and Services

The `Program.cs` file configures the middleware and services for the application. This includes services for authentication, authorization, and database access.

### Configuration Management

Configuration is managed using the `appsettings.json` file. This file contains settings for the database connection string, JWT secret, and other application settings.

## Additional Findings

### Dependencies and Third-Party Libraries

- **Frontend:**
  - `@angular/material`
  - `@ngrx/store`
  - `ngx-toastr`
- **Backend:**
  - `Microsoft.AspNetCore.Authentication.JwtBearer`
  - `Microsoft.EntityFrameworkCore`
  - `Swashbuckle.AspNetCore`

### Environment Setup Requirements

- **Frontend:**
  - Node.js
  - Angular CLI
- **Backend:**
  - .NET 7.0 SDK
  - A database server (e.g., SQL Server)

### CI/CD Configurations

No CI/CD configurations were found in the repository.

### Testing Approach and Coverage

- **Frontend:** A few unit tests were found for the frontend, but the overall test coverage is low.
- **Backend:** No unit tests were found for the backend.

### Code Quality Observations

The code quality is generally good, with a clear separation of concerns and consistent coding style. However, the lack of tests is a concern.

### Potential Areas for Improvement

- **Add more tests:** The test coverage for both the frontend and backend should be improved.
- **Improve documentation:** The documentation for the API endpoints and components could be improved.
- **Implement CI/CD:** A CI/CD pipeline should be set up to automate the build and deployment process.

## Setup Instructions

### Frontend Setup

1. Navigate to the `WoodApp-UI` directory.
2. Run `npm install` to install the dependencies.
3. Run `ng serve` to start the development server.

### Backend Setup

1. Open the `ms.webapp.api.acya.sln` solution in Visual Studio.
2. Configure the database connection string in the `appsettings.json` file.
3. Run the application.

### Database Setup

1. Create a new database.
2. Run the SQL scripts in the `db` directory to create the database schema.
