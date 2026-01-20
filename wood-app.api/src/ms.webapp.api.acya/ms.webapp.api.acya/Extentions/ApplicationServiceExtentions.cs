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
      services.AddScoped<IStockService, StockService>();
      services.AddScoped<IPaymentRepository, PaymentRepository>();
      services.AddScoped<IPaymentService, PaymentService>();
      

      services.AddDbContext<WoodAppContext>(options =>
      {
        options.UseNpgsql(config.GetConnectionString("WoodAppContextConnection"));
        // To avoid error Cannot write DateTime with Kind
        // = Local to PostgreSQL type 'timestamp with time zone',
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
      });

      services.AddControllers().AddJsonOptions(options =>
      {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
        options.JsonSerializerOptions.WriteIndented = true;
      });

      return services;
    }
  }
}
