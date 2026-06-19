using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using ms.webapp.api.acya.Interfaces;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.infrastructure.Configurations.Audit;
using ms.webapp.api.acya.Services;
using ms.webapp.api.acya.api.Services.tej;

namespace ms.webapp.api.acya.api.Extentions
{
  public static class ApplicationServiceExtentions
  {
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration config)
    {
      #region Cors Policies
      var allowedOrigins = config["AllowedOrigins"]?.Split(';') ?? new[] { "https://localhost:4200" };
      services.AddCors(options => {
        options.AddPolicy("SignalRCors", policy => {
          policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
      });
      #endregion

      services.AddScoped<ITokenService, TokenService>();
      services.AddScoped<NotificationService>();
      services.AddScoped<AppHealthRepository>();
      services.AddScoped<ParentRepository>();
      services.AddScoped<FirstChildRepository>();
      services.AddScoped<SecondChildRepository>();
      services.AddScoped<AppUserRepository>();
      services.AddScoped<PersonRepository>();
      services.AddScoped<BankRepository>();
      services.AddScoped<AppVariableRepository>();
      services.AddScoped<ArticleRepository>();
      services.AddScoped<SellPriceHistoryRepository>();
      services.AddScoped<ProviderRepository>();
      services.AddScoped<EnterpriseRepository>();
      services.AddScoped<CounterPartRepository>();
      services.AddScoped<SalesSitesRepository>();
      services.AddScoped<MerchandiseRepository>();
      services.AddScoped<DocumentRepository>();
      services.AddScoped<DocumentMerchandiseRepository>();
      services.AddScoped<StockRepository>();
      services.AddScoped<DocumentDocumentRelationship>();
      services.AddScoped<TransporterRepository>();
      services.AddScoped<VehicleRepository>();
      services.AddScoped<EmployeeLeaveRepository>();
      services.AddScoped<EmployeePayslipRepository>();
      services.AddScoped<EmployeeAdvanceRepository>();
      services.AddScoped<IStockService, StockService>();
      services.AddScoped<IAccountService, AccountService>();
      services.AddScoped<IPaymentRepository, PaymentRepository>();
      services.AddScoped<IPaymentService, PaymentService>();
      services.AddScoped<IBalanceService, BalanceService>();
      services.AddScoped<IStockMovementService, StockMovementService>();
      services.AddScoped<IBankTransactionService, ms.webapp.api.acya.Services.BankTransactionService>();
      services.AddScoped<IAuditService, AuditService>();
      services.AddScoped<IAnalyticsService, AnalyticsService>();
      services.AddScoped<ISalaryCalculationService, SalaryCalculationService>();
      services.AddScoped<BankDepositRepository>();
      services.AddScoped<BankTransactionRepository>();
      services.AddScoped<CaisseMovementRepository>();
      services.AddScoped<UserPermissionsRepository>();
      services.AddScoped<AuditTrailInterceptor>();

      // Notifications & Reminders (§5.19)
      services.Configure<ms.webapp.api.acya.api.Models.SmtpSettings>(config.GetSection("SmtpSettings"));
      services.AddScoped<IEmailService, EmailService>();
      services.AddScoped<IAppNotificationService, AppNotificationService>();
      services.AddScoped<IApprovalService, ApprovalService>();
      services.AddScoped<IPricingGridService, PricingGridService>();
      services.AddScoped<IImportService, ImportService>();
      services.AddScoped<IReportService, ReportService>();
      services.AddHttpClient<IExchangeRateService, ExchangeRateService>();

      // TEJ Integration Services
      services.Configure<TejConfig>(config.GetSection("Tej"));
      services.AddHttpClient<TejAuthService>(client => 
      {
          client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
          client.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
      });
      services.AddHttpClient<TejApiClient>(client => 
      {
          client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");
          client.DefaultRequestHeaders.Add("Accept", "application/json, text/plain, */*");
      })
      .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
      {
          CookieContainer = new System.Net.CookieContainer(),
          UseCookies = true
      });
      services.AddScoped<TejFacade>();

      // Multi-Tenancy Registration
      var multiTenantEnabled = config.GetValue<bool>("MultiTenancy:Enabled");

      // Scoped services for multi-tenant mapping
      services.AddScoped<TenantContext>();
      services.AddScoped<ITenantResolver, SubdomainTenantResolver>();

      if (multiTenantEnabled)
      {
        services.AddDbContext<MasterDbContext>(options =>
          options.UseNpgsql(config.GetConnectionString("MasterConnection")));
      }

      services.AddDbContext<WoodAppContext>((sp, options) =>
      {
        var tenantCtx = sp.GetRequiredService<TenantContext>();

        // Dynamically select target connection string
        string connectionString;
        if (multiTenantEnabled && tenantCtx.IsEnabled && !string.IsNullOrEmpty(tenantCtx.ConnectionString))
        {
          connectionString = tenantCtx.ConnectionString;
        }
        else
        {
          connectionString = config.GetConnectionString("WoodAppContextConnection")!;
        }

        options.UseNpgsql(connectionString);

        // If multi-tenant is enabled, swap out the cache key factory
        if (multiTenantEnabled)
        {
          options.ReplaceService<Microsoft.EntityFrameworkCore.Infrastructure.IModelCacheKeyFactory, TenantModelCacheKeyFactory>();
        }

        // Externalized audit treatment
        var auditInterceptor = sp.GetRequiredService<AuditTrailInterceptor>();
        options.AddInterceptors(auditInterceptor);

        // To avoid error Cannot write DateTime with Kind
        // = Local to PostgreSQL type 'timestamp with time zone',
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
      });

      return services;
    }
  }
}
