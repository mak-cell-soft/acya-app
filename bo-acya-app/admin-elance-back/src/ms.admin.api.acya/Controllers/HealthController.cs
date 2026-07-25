using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    public class ServiceHealthDto
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Status { get; set; } = "UNKNOWN"; // UP, DEGRADED, DOWN
        public int? StatusCode { get; set; }
        public long LatencyMs { get; set; }
        public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
        public string? ErrorMessage { get; set; }
    }

    public class ServiceConfigItem
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class HealthController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public HealthController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetServicesHealth()
        {
            var configuredServices = _configuration.GetSection("HealthCheck:Services").Get<List<ServiceConfigItem>>() 
                ?? new List<ServiceConfigItem>();

            // Default fallback if configuration is missing
            if (!configuredServices.Any())
            {
                configuredServices.Add(new ServiceConfigItem 
                { 
                    Name = "elance-app.ui (Frontend)", 
                    Url = "http://migration-ui:3000" 
                });
                configuredServices.Add(new ServiceConfigItem 
                { 
                    Name = "wood-app-api (Backend API)", 
                    Url = "http://wood-app-api:80/api/ApiHealth/HealthCheck" 
                });
            }

            var tasks = configuredServices.Select(svc => ProbeServiceAsync(svc.Name, svc.Url));
            var results = (await Task.WhenAll(tasks)).ToList();

            // Self-check for admin-api
            results.Add(new ServiceHealthDto
            {
                Name = "admin-api (Backoffice API)",
                Url = "Self",
                Status = "UP",
                StatusCode = 200,
                LatencyMs = 0,
                CheckedAt = DateTime.UtcNow,
                ErrorMessage = null
            });

            return Ok(new
            {
                CheckedAt = DateTime.UtcNow,
                Services = results
            });
        }

        private async Task<ServiceHealthDto> ProbeServiceAsync(string name, string url)
        {
            var dto = new ServiceHealthDto
            {
                Name = name,
                Url = url,
                CheckedAt = DateTime.UtcNow
            };

            var sw = Stopwatch.StartNew();
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

            try
            {
                var client = _httpClientFactory.CreateClient();
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);

                sw.Stop();
                dto.LatencyMs = sw.ElapsedMilliseconds;
                dto.StatusCode = (int)response.StatusCode;

                if (response.IsSuccessStatusCode)
                {
                    dto.Status = "UP";
                }
                else if ((int)response.StatusCode >= 300 && (int)response.StatusCode < 500)
                {
                    dto.Status = "DEGRADED";
                    dto.ErrorMessage = $"HTTP {(int)response.StatusCode} {response.ReasonPhrase}";
                }
                else
                {
                    dto.Status = "DOWN";
                    dto.ErrorMessage = $"HTTP {(int)response.StatusCode} {response.ReasonPhrase}";
                }
            }
            catch (TaskCanceledException)
            {
                sw.Stop();
                dto.LatencyMs = sw.ElapsedMilliseconds;
                dto.Status = "DOWN";
                dto.ErrorMessage = "Connection timed out after 5 seconds";
            }
            catch (Exception ex)
            {
                sw.Stop();
                dto.LatencyMs = sw.ElapsedMilliseconds;
                dto.Status = "DOWN";
                dto.ErrorMessage = ex.Message;
            }

            return dto;
        }
    }
}
