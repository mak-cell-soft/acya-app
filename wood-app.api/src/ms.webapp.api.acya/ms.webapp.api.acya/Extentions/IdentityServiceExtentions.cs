using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace ms.webapp.api.acya.api.Extentions
{
  public static class IdentityServiceExtentions
  {
    public static IServiceCollection AddIdentityServices(this IServiceCollection services, IConfiguration config)
    {
      var JWTSetting = config.GetSection("JWTSettings");

      services.AddAuthentication(options =>
      {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
      }).AddJwtBearer(opt =>
      {
        opt.SaveToken = true;
        opt.RequireHttpsMetadata = config["ASPNETCORE_ENVIRONMENT"] == "Production" ? true : false;
        opt.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
          ValidateIssuer = true,
          ValidateAudience = true,
          ValidateLifetime = true,
          ValidateIssuerSigningKey = true,
          ValidAudience = JWTSetting["ValidAudience"],
          ValidIssuer = JWTSetting["ValidIssuer"],
          IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["JWTSettings:securityKey"] ?? config["TokenKey"]!)),
        };
      });

      services.AddAuthorization(options =>
      {
          options.AddPolicy("RequireAdminRole", policy => policy.RequireRole("SuperAdmin", "Admin"));
          options.AddPolicy("MobileApp.CanView", policy => policy.Requirements.Add(new ms.webapp.api.acya.PermissionsHelper.PermissionRequirement("MobileApp", "CanView")));
          options.AddPolicy("MobileApp.CanDownload", policy => policy.Requirements.Add(new ms.webapp.api.acya.PermissionsHelper.PermissionRequirement("MobileApp", "CanDownload")));
          options.AddPolicy("MobileApp.CanManage", policy => policy.Requirements.Add(new ms.webapp.api.acya.PermissionsHelper.PermissionRequirement("MobileApp", "CanManage")));
          options.AddPolicy("MobileApp.CanBuild", policy => policy.Requirements.Add(new ms.webapp.api.acya.PermissionsHelper.PermissionRequirement("MobileApp", "CanBuild")));
      });

      services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, ms.webapp.api.acya.PermissionsHelper.PermissionHandler>();

      return services;
    }
  }
}
