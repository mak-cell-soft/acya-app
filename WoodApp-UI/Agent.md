# Frontend Agent Context (WoodApp-UI)

## 1. Project Overview
- **Project Name:** wood-app-ui
- **Type:** Frontend Application
- **Tech Stack:** Angular 18 (with SSR), TypeScript, RxJS
- **State Management:** NgRx (Store, Effects, Entity)
- **UI Frameworks:** Angular Material, FontAwesome, Chart.js
- **Real-time:** Microsoft SignalR
- **Primary Purpose:** A comprehensive web-based Enterprise Resource Planning (ERP) or management dashboard for wood/merchandise handling, covering stock, articles, customers, providers, billing, and system configuration.

## 2. Folder Structure
- `src/app/` - Main application source code
  - `auth-web-app/` - Layouts and wrappers specifically tailored for authentication views
  - `authentication/` - Sign-in and authentication logic components
  - `components/` - Feature-specific standalone and grouped modular components (e.g., articles, providers, customers, merchandise, stock)
  - `dashboard/` - Core application shell elements including header, footer, navigation, home view, and various interactive modals
  - `enterprise/` - Components related to enterprise information management
  - `guards/` - Angular route guards for protecting authenticated routes
  - `interceptor/` - Global HTTP interceptors (e.g., injecting JWT tokens)
  - `models/` - TypeScript interfaces, Data Transfer Objects (DTOs), and print templates
  - `services/` - Angular Injectables handling communication with the backend APIs via HTTP
  - `shared/` - Reusable UI components and shared modules across the app
  - `store/` - NgRx implementation including actions, reducers, and effects for application state management
  - `utils/` - Helper and utility functions

## 3. Key Files & Entry Points
- **`package.json`**: Lists all NPM dependencies, scripts (`ng serve`, `ng build`, `serve:ssr`), and configurations.
- **`angular.json`**: Workspace configuration, builder setups for dev, prod, and SSR.
- **`src/app/app.module.ts`**: The root application module where core modules, NgRx stores/effects, Angular Material components, routing, and HTTP interceptors are registered.
- **`src/app/app-routing.module.ts`**: The primary route registry defining the navigation paths and attaching guards.
- **`src/main.ts` / `server.ts`**: Application bootstrapping entry points for client-side and Server-Side Rendering (SSR).

## 4. Architecture & Patterns
- **Component-Based Architecture:** Uses Angular's component model with smart/dumb components separation across features.
- **State Management (NgRx):** Centralized state for global shared entities (e.g., App Variables, Banks) managed via Reducers and Effects.
- **Reactive Programming:** Extensive use of RxJS observables for HTTP requests, state selection, and event handling.
- **Service-Oriented App:** API calls abstracted away in `services/`, injected into components and NgRx Effects.
- **Interceptor Pattern:** HTTP headers (like Authorization Bearer tokens) are attached transparently using Angular Interceptors.

## 5. Dependencies & Integrations
- **Core Angular:** `@angular/core`, `@angular/router`, `@angular/forms`, `@angular/ssr`
- **UI Components:** `@angular/material`, `@angular/cdk`, `ngx-toastr`, `font-awesome`
- **Charting:** `chart.js`, `ng2-charts`
- **State Management:** `@ngrx/store`, `@ngrx/effects`, `@ngrx/entity`
- **Real-time & APIs:** `@microsoft/signalr` for web sockets, `jwt-decode` for token handling.
- **Date/Time:** `date-fns` for time manipulation.

## 6. Conventions & Rules
- **Component Naming:** PascalCase for class names, kebab-case for file names and selectors (e.g., `AddSupplierOrderComponent` -> `add-supplier-order.component.ts`).
- **Feature Grouping:** Components are organized logically under `src/app/components/` by feature domain (e.g., `customers`, `merchandise`, `stock`).
- **Modals:** UI overlay dialogs are kept in `src/app/dashboard/modals/` for centralization.
- **Styling:** CSS variables and Angular Material theming.
- **RxJS Subscriptions:** Managed via the `@ngneat/until-destroy` library to prevent memory leaks from dangling subscriptions.

## 7. Quick Context Tags
#angular #frontend #ngrx #angular-material #typescript #rxjs #signalr #erp #stock-management #ssr

## 8. Component Tree

```text
src/app/
├── app.component.ts        # [Smart]
│   ├── app.component.html
│   └── app.component.css
├── auth-web-app/
│   └── web-app.component.ts        # [Dumb]
│       ├── web-app.component.html
│       └── web-app.component.css
├── authentication/
│   └── sign-in.component.ts        # [Smart]
│       ├── sign-in.component.html
│       └── sign-in.component.css
├── components/
│   ├── articles/
│   │   ├── add-article/
│   │   │   └── add-article.component.ts        # [Smart]
│   │   │       ├── add-article.component.html
│   │   │       └── add-article.component.css
│   │   └── list-article/
│   │       └── list-article.component.ts        # [Smart]
│   │           ├── list-article.component.html
│   │           └── list-article.component.css
│   ├── customers/
│   │   ├── add-customer/
│   │   │   └── add-customer.component.ts        # [Smart]
│   │   │       ├── add-customer.component.html
│   │   │       └── add-customer.component.css
│   │   ├── customer-account-modal/
│   │   │   └── customer-account-modal.component.ts        # [Smart]
│   │   │       ├── customer-account-modal.component.html
│   │   │       └── customer-account-modal.component.css
│   │   ├── customer-details-modal/
│   │   │   └── customer-details-modal.component.ts        # [Dumb]
│   │   │       ├── customer-details-modal.component.html
│   │   │       └── customer-details-modal.component.css
│   │   ├── customer-edit-modal/
│   │   │   └── customer-edit-modal.component.ts        # [Smart]
│   │   │       ├── customer-edit-modal.component.html
│   │   │       └── customer-edit-modal.component.css
│   │   └── list-customers/
│   │       └── list-customers.component.ts        # [Smart]
│   │           ├── list-customers.component.html
│   │           └── list-customers.component.css
│   ├── merchandise/
│   │   ├── customer/
│   │   │   ├── add-document/
│   │   │   │   └── customer-add-document.component.ts        # [Smart]
│   │   │   │       ├── customer-add-document.component.html
│   │   │   │       └── customer-add-document.component.css
│   │   │   ├── add-invoice/
│   │   │   │   └── add-invoice.component.ts        # [Smart]
│   │   │   │       ├── add-invoice.component.html
│   │   │   │       └── add-invoice.component.css
│   │   │   ├── list-customer-documents/
│   │   │   │   ├── customer-batch-conversion-modal/
│   │   │   │   │   └── customer-batch-conversion-modal.component.ts        # [Smart]
│   │   │   │   │       ├── customer-batch-conversion-modal.component.html
│   │   │   │   │       └── customer-batch-conversion-modal.component.css
│   │   │   │   ├── document-conversion-modal/
│   │   │   │   │   └── document-conversion-modal.component.ts        # [Smart]
│   │   │   │   │       ├── document-conversion-modal.component.html
│   │   │   │   │       └── document-conversion-modal.component.css
│   │   │   │   ├── document-detail-modal/
│   │   │   │   │   └── document-detail-modal.component.ts        # [Dumb]
│   │   │   │   │       ├── document-detail-modal.component.html
│   │   │   │   │       └── document-detail-modal.component.css
│   │   │   │   └── list-customer-documents.component.ts        # [Smart]
│   │   │   │       ├── list-customer-documents.component.html
│   │   │   │       └── list-customer-documents.component.css
│   │   │   └── list-customer-invoices/
│   │   │       └── list-customer-invoices.component.ts        # [Smart]
│   │   │           ├── list-customer-invoices.component.html
│   │   │           └── list-customer-invoices.component.css
│   │   └── provider/
│   │       ├── add-document/
│   │       │   └── add-document.component.ts        # [Smart]
│   │       │       ├── add-document.component.html
│   │       │       └── add-document.component.css
│   │       ├── list-documents/
│   │       │   └── list-documents.component.ts        # [Smart]
│   │       │       ├── list-documents.component.html
│   │       │       └── list-documents.component.css
│   │       ├── list-invoices/
│   │       │   └── list-invoices.component.ts        # [Smart]
│   │       │       ├── list-invoices.component.html
│   │       │       └── list-invoices.component.css
│   │       └── supplier-order/
│   │           ├── add-supplier-order/
│   │           │   └── add-supplier-order.component.ts        # [Smart]
│   │           │       ├── add-supplier-order.component.html
│   │           │       └── add-supplier-order.component.css
│   │           └── list-supplier-order/
│   │               └── list-supplier-order.component.ts        # [Smart]
│   │                   ├── list-supplier-order.component.html
│   │                   └── list-supplier-order.component.css
│   ├── providers/
│   │   ├── add-provider/
│   │   │   └── add-provider.component.ts        # [Smart]
│   │   │       ├── add-provider.component.html
│   │   │       └── add-provider.component.css
│   │   ├── list-provider/
│   │   │   └── list-provider.component.ts        # [Smart]
│   │   │       ├── list-provider.component.html
│   │   │       └── list-provider.component.css
│   │   ├── provider-details-modal/
│   │   │   └── provider-details-modal.component.ts        # [Dumb]
│   │   │       ├── provider-details-modal.component.html
│   │   │       └── provider-details-modal.component.css
│   │   └── provider-edit-modal/
│   │       └── provider-edit-modal.component.ts        # [Smart]
│   │           ├── provider-edit-modal.component.html
│   │           └── provider-edit-modal.component.css
│   └── stock/
│       ├── stock-inventory/
│       │   └── stock-inventory.component.ts        # [Dumb]
│       │       ├── stock-inventory.component.html
│       │       └── stock-inventory.component.css
│       ├── stock-list/
│       │   └── stock-list.component.ts        # [Smart]
│       │       ├── stock-list.component.html
│       │       └── stock-list.component.css
│       ├── stock-mouvement/
│       │   └── stock-mouvement.component.ts        # [Smart]
│       │       ├── stock-mouvement.component.html
│       │       └── stock-mouvement.component.css
│       ├── stock-transfer/
│       │   └── transfert-stock.component.ts        # [Smart]
│       │       ├── transfert-stock.component.html
│       │       └── transfert-stock.component.css
│       ├── stock-transfer-list/
│       │   └── stock-transfer-list.component.ts        # [Smart]
│       │       ├── stock-transfer-list.component.html
│       │       └── stock-transfer-list.component.css
│       ├── transfer-confirm-code-dialog/
│       │   └── transfer-confirm-code-dialog.component.ts        # [Smart]
│       │       ├── transfer-confirm-code-dialog.component.html
│       │       └── transfer-confirm-code-dialog.component.css
│       ├── transfer-confirmation/
│       │   └── transfer-confirmation.component.ts        # [Smart]
│       │       ├── transfer-confirmation.component.html
│       │       └── transfer-confirmation.component.css
│       └── transfer-details-dialog/
│           └── transfer-details-dialog.component.ts        # [Dumb]
│               ├── transfer-details-dialog.component.html
│               └── transfer-details-dialog.component.css
├── dashboard/
│   ├── admin-dashboard/
│   │   └── admin-dashboard.component.ts        # [Smart]
│   │       ├── admin-dashboard.component.html
│   │       └── admin-dashboard.component.css
│   ├── configuration/
│   │   └── configuration.component.ts        # [Smart]
│   │       ├── configuration.component.html
│   │       └── configuration.component.css
│   ├── footer/
│   │   └── footer.component.ts        # [Dumb]
│   │       ├── footer.component.html
│   │       └── footer.component.css
│   ├── header/
│   │   └── header.component.ts        # [Smart]
│   │       ├── header.component.html
│   │       └── header.component.css
│   ├── home/
│   │   └── home.component.ts        # [Smart]
│   │       ├── home.component.html
│   │       └── home.component.css
│   ├── home-dashboard/
│   │   └── home-dashboard.component.ts        # [Smart]
│   │       ├── home-dashboard.component.html
│   │       └── home-dashboard.component.css
│   └── modals/
│       ├── add-app-variable-modal/
│       │   └── app-variable-modal.component.ts        # [Smart]
│       │       ├── app-variable-modal.component.html
│       │       └── app-variable-modal.component.css
│       ├── add-bank-modal/
│       │   └── add-bank-modal.component.ts        # [Smart]
│       │       ├── add-bank-modal.component.html
│       │       └── add-bank-modal.component.css
│       ├── add-categories-modal/
│       │   └── add-categories-modal.component.ts        # [Smart]
│       │       ├── add-categories-modal.component.html
│       │       └── add-categories-modal.component.css
│       ├── add-employees-modal/
│       │   └── add-employees-modal.component.ts        # [Smart]
│       │       ├── add-employees-modal.component.html
│       │       └── add-employees-modal.component.css
│       ├── add-lengths-modal/
│       │   └── add-lengths-modal.component.ts        # [Smart]
│       │       ├── add-lengths-modal.component.html
│       │       └── add-lengths-modal.component.css
│       ├── add-sales-site-modal/
│       │   └── add-sales-site-modal.component.ts        # [Smart]
│       │       ├── add-sales-site-modal.component.html
│       │       └── add-sales-site-modal.component.css
│       ├── add-sub-categories-modal/
│       │   └── add-sub-categories-modal.component.ts        # [Smart]
│       │       ├── add-sub-categories-modal.component.html
│       │       └── add-sub-categories-modal.component.css
│       ├── add-transporter-modal/
│       │   └── add-transporter-modal.component.ts        # [Smart]
│       │       ├── add-transporter-modal.component.html
│       │       └── add-transporter-modal.component.css
│       ├── advance-management-modal/
│       │   └── advance-management-modal.component.ts        # [Smart]
│       │       ├── advance-management-modal.component.html
│       │       └── advance-management-modal.component.css
│       ├── confirm-delete-modal/
│       │   └── confirm-delete-modal.component.ts        # [Dumb]
│       │       ├── confirm-delete-modal.component.html
│       │       └── confirm-delete-modal.component.css
│       ├── edit-document-modal/
│       │   └── edit-document-modal.component.ts        # [Smart]
│       │       ├── edit-document-modal.component.html
│       │       └── edit-document-modal.component.css
│       ├── invoice/
│       │   └── generate-invoice-modal/
│       │       └── generate-invoice-modal.component.ts        # [Smart]
│       │           ├── generate-invoice-modal.component.html
│       │           └── generate-invoice-modal.component.css
│       ├── leave-management-modal/
│       │   └── leave-management-modal.component.ts        # [Smart]
│       │       ├── leave-management-modal.component.html
│       │       └── leave-management-modal.component.css
│       ├── payment-modal/
│       │   ├── payment-forms/
│       │   │   ├── cheque-payment-form/
│       │   │   │   └── cheque-payment-form.component.ts        # [Dumb]
│       │   │   │       ├── cheque-payment-form.component.html
│       │   │   │       └── cheque-payment-form.component.css
│       │   │   └── traite-payment-form/
│       │   │       └── traite-payment-form.component.ts        # [Dumb]
│       │   │           ├── traite-payment-form.component.html
│       │   │           └── traite-payment-form.component.css
│       │   └── payment-modal.component.ts        # [Dumb]
│       │       ├── payment-modal.component.html
│       │       └── payment-modal.component.css
│       ├── payslip-modal/
│       │   └── payslip-modal.component.ts        # [Smart]
│       │       ├── payslip-modal.component.html
│       │       └── payslip-modal.component.css
│       ├── permissions-modal/
│       │   └── permissions-modal.component.ts        # [Smart]
│       │       ├── permissions-modal.component.html
│       │       └── permissions-modal.component.css
│       └── sales-site-modal/
│           └── sales-site-modal.component.ts        # [Smart]
│               ├── sales-site-modal.component.html
│               └── sales-site-modal.component.css
├── enterprise/
│   └── enterprise.component.ts        # [Smart]
│       ├── enterprise.component.html
│       └── enterprise.component.css
└── models/
    └── print-templates/
        ├── delivery-note-print/
        │   └── delivery-note-print.component.ts        # [Dumb]
        │       ├── delivery-note-print.component.html
        │       └── delivery-note-print.component.css
        └── supplier-order-print/
            └── supplier-order-print.component.ts        # [Dumb]
                ├── supplier-order-print.component.html
                └── supplier-order-print.component.css
```


| Component | Type | Module | Routed? | Description |
|-----------|------|--------|---------|-------------|
| AppComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| WebAppComponent | Dumb | AppModule | ✅ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| SignInComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| AddArticleComponent | Smart | AppModule (Articles) | ✅ | Handles logic, API calls, and state selection. |
| ListArticleComponent | Smart | AppModule (Articles) | ✅ | Handles logic, API calls, and state selection. |
| AddCustomerComponent | Smart | AppModule (Customers) | ✅ | Handles logic, API calls, and state selection. |
| CustomerAccountModalComponent | Smart | AppModule (Customers) | ❌ | Handles logic, API calls, and state selection. |
| CustomerDetailsModalComponent | Dumb | AppModule (Customers) | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| CustomerEditModalComponent | Smart | AppModule (Customers) | ❌ | Handles logic, API calls, and state selection. |
| ListCustomersComponent | Smart | AppModule (Customers) | ✅ | Handles logic, API calls, and state selection. |
| CustomerAddDocumentComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| AddInvoiceComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| CustomerBatchConversionModalComponent | Smart | AppModule (Merchandise) | ❌ | Handles logic, API calls, and state selection. |
| DocumentConversionModalComponent | Smart | AppModule (Merchandise) | ❌ | Handles logic, API calls, and state selection. |
| DocumentDetailModalComponent | Dumb | AppModule (Merchandise) | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| ListCustomerDocumentsComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| ListCustomerInvoicesComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| AddDocumentComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| ListDocumentsComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| ListInvoicesComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| AddSupplierOrderComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| ListSupplierOrderComponent | Smart | AppModule (Merchandise) | ✅ | Handles logic, API calls, and state selection. |
| AddProviderComponent | Smart | AppModule (Providers) | ✅ | Handles logic, API calls, and state selection. |
| ListProviderComponent | Smart | AppModule (Providers) | ✅ | Handles logic, API calls, and state selection. |
| ProviderDetailsModalComponent | Dumb | AppModule (Providers) | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| ProviderEditModalComponent | Smart | AppModule (Providers) | ❌ | Handles logic, API calls, and state selection. |
| StockInventoryComponent | Dumb | AppModule (Stock) | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| StockListComponent | Smart | AppModule (Stock) | ✅ | Handles logic, API calls, and state selection. |
| StockMouvementComponent | Smart | AppModule (Stock) | ✅ | Handles logic, API calls, and state selection. |
| TransfertStockComponent | Smart | AppModule (Stock) | ✅ | Handles logic, API calls, and state selection. |
| StockTransferListComponent | Smart | AppModule (Stock) | ✅ | Handles logic, API calls, and state selection. |
| TransferConfirmCodeDialogComponent | Smart | AppModule (Stock) | ❌ | Handles logic, API calls, and state selection. |
| TransferConfirmationComponent | Smart | AppModule (Stock) | ❌ | Handles logic, API calls, and state selection. |
| TransferDetailsDialogComponent | Dumb | AppModule (Stock) | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| AdminDashboardComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| ConfigurationComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| FooterComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| HeaderComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| HomeComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| HomeDashboardComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| AppVariableModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddBankModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddCategoriesModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddEmployeesModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddLengthsModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddSalesSiteModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddSubCategoriesModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AddTransporterModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| AdvanceManagementModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| ConfirmDeleteModalComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| EditDocumentModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| GenerateInvoiceModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| LeaveManagementModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| ChequePaymentFormComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| TraitePaymentFormComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| PaymentModalComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| PayslipModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| PermissionsModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| SalesSiteModalComponent | Smart | AppModule | ❌ | Handles logic, API calls, and state selection. |
| EnterpriseComponent | Smart | AppModule | ✅ | Handles logic, API calls, and state selection. |
| DeliveryNotePrintComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
| SupplierOrderPrintComponent | Dumb | AppModule | ❌ | Pure presentation component, receives data via @Input() and emits via @Output(). |
