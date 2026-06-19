using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.OpenApi.Models;
using Microsoft.VisualBasic;
using System.Text.Json.Serialization;
using ms.webapp.api.acya.api.Extentions;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// QuestPDF License
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// Add services to the container.
builder.Services.AddApplicationServices(config);
builder.Services.AddScoped<ms.webapp.api.acya.api.Interfaces.IPdfGenerationService, ms.webapp.api.acya.api.Services.PdfGenerationService>();
builder.Services.AddHostedService<NotificationRetryService>();
builder.Services.AddHostedService<AuditCleanupBackgroundService>();
//builder.Services.AddControllers();
//configure JSON serialization to ignore circular references.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
      options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
      options.JsonSerializerOptions.Converters.Add(new ms.webapp.api.acya.api.Serialization.DateTimeNullableConverter());
      options.JsonSerializerOptions.Converters.Add(new ms.webapp.api.acya.api.Serialization.DateTimeConverter());
    });
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
// Add SignalR 
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();

// Modifi� le 07/11/2024
builder.Services.AddSwaggerGen(c =>
{
  c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
  {
    Description = @"JWT Authorization Example: 'Bearer eminofeyeofthesea",
    Name = "Authorization",
    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
    Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
    Scheme = "Bearer"
  });
  c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement()
  {
    {
      new OpenApiSecurityScheme
      {
        Reference = new OpenApiReference
        {
          Type = ReferenceType.SecurityScheme,
          Id = "Bearer"
        },
        Scheme = "outh2",
        Name = "Bearer",
        In = ParameterLocation.Header,
      },
      new List<string>()
    }
    });
});




//builder.Services.AddCors(options =>
//{
//  options.AddPolicy("CorsPolicy", builder =>
//  {
//    builder.AllowAnyHeader()
//           .AllowAnyMethod()
//           .AllowAnyOrigin();
//           //.WithOrigins("https://localhost:4200");
//    //.AllowAnyOrigin();
//  });
//});



builder.Services.AddIdentityServices(config);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("SignalRCors");
app.UseAuthentication();

// Invoke TenantMiddleware immediately after Authentication (so JWT claims are populated)
// but before Authorization (so database settings and constraints are set up).
app.UseMiddleware<ms.webapp.api.acya.api.Middleware.TenantMiddleware>();

app.UseAuthorization();
app.MapControllers();
// Add to app configuration (after app.UseRouting() and before app.UseEndpoints())
app.MapHub<NotificationHub>("/api/notificationHub");


// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
  var services = scope.ServiceProvider;
  var configuration = services.GetRequiredService<IConfiguration>();
  var isMultiTenant = configuration.GetValue<bool>("MultiTenancy:Enabled");

  if (isMultiTenant)
  {
    // 1. Migrate Master database registry
    try
    {
      var masterContext = services.GetRequiredService<MasterDbContext>();
      masterContext.Database.Migrate();
    }
    catch (Exception ex)
    {
      var logger = services.GetRequiredService<ILogger<Program>>();
      logger.LogError(ex, "An error occurred while migrating the master database registry.");
    }

    // 2. Resolve all active tenants and migrate their schemas
    try
    {
      var masterContext = services.GetRequiredService<MasterDbContext>();
      var tenants = masterContext.TenantRegistries.Where(t => t.IsActive).ToList();

      foreach (var tenant in tenants)
      {
        var optionsBuilder = new DbContextOptionsBuilder<WoodAppContext>();
        var connStr = (string.IsNullOrEmpty(tenant.ConnectionString)
          ? configuration.GetConnectionString("WoodAppContextConnection")
          : tenant.ConnectionString) ?? "";

        optionsBuilder.UseNpgsql(connStr);

        var auditInterceptor = services.GetRequiredService<ms.webapp.api.acya.infrastructure.Configurations.Audit.AuditTrailInterceptor>();
        optionsBuilder.AddInterceptors(auditInterceptor);

        var tempTenantContext = new TenantContext
        {
          IsEnabled = true,
          Slug = tenant.Slug,
          SchemaName = tenant.SchemaName,
          ConnectionString = connStr
        };

        using (var tenantContext = new WoodAppContext(optionsBuilder.Options, tempTenantContext))
        {
          tenantContext.Database.Migrate();
        }
      }
    }
    catch (Exception ex)
    {
      var logger = services.GetRequiredService<ILogger<Program>>();
      logger.LogError(ex, "An error occurred while migrating tenant schemas.");
    }
  }
  else
  {
    // Single Tenant mode: migrate default schema
    try
    {
      var context = services.GetRequiredService<WoodAppContext>();
      context.Database.Migrate();
    }
    catch (Exception ex)
    {
      var logger = services.GetRequiredService<ILogger<Program>>();
      logger.LogError(ex, "An error occurred while migrating the database.");
    }
  }
}

app.Run();
