using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.OpenApi.Models;
using Microsoft.VisualBasic;
using System.Text.Json.Serialization;
using ms.webapp.api.acya.api.Extentions;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// Add services to the container.
builder.Services.AddApplicationServices(config);
builder.Services.AddHostedService<NotificationRetryService>();
//builder.Services.AddControllers();
//configure JSON serialization to ignore circular references.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
      options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
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
app.UseAuthorization();
app.MapControllers();
// Add to app configuration (after app.UseRouting() and before app.UseEndpoints())
app.MapHub<NotificationHub>("/api/notificationHub");


app.Run();
