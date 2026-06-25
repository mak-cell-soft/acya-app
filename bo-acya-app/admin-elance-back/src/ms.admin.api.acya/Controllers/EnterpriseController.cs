using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    public class CreateTenantRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public TenantPlan Plan { get; set; } = TenantPlan.Trial;
        public string? Notes { get; set; }
        public string? LogoUrl { get; set; }
        public string? FaviconUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public string? CustomDomain { get; set; }
        public string? Language { get; set; }
        public string? Currency { get; set; }

        public string AdminUsername { get; set; } = "admin";
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class EnterpriseController : ControllerBase
    {
        private readonly IEnterpriseRepository _enterpriseRepository;
        private readonly ITenantProvisioningService _provisioningService;
        private readonly MasterDbContext _context;

        public EnterpriseController(IEnterpriseRepository enterpriseRepository, ITenantProvisioningService provisioningService, MasterDbContext context)
        {
            _enterpriseRepository = enterpriseRepository;
            _provisioningService = provisioningService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var enterprises = await _enterpriseRepository.GetAllAsync();
            return Ok(enterprises);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();
            return Ok(enterprise);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTenantRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("Enterprise Name is required.");
            }

            // 1. Slugification
            string slug = string.IsNullOrWhiteSpace(request.Slug) 
                ? Slugify(request.Name) 
                : Slugify(request.Slug);

            // Reserve technical subdomains
            var reservedSlugs = new[] { "admin", "api", "www", "preprod", "mail", "app", "dev", "staging" };
            if (reservedSlugs.Contains(slug))
            {
                return BadRequest("The requested slug is reserved.");
            }

            // 2. Slug availability verification
            var attempts = 0;
            var uniqueSlug = slug;
            while (await _context.Enterprises.AnyAsync(e => e.Slug == uniqueSlug))
            {
                if (!string.IsNullOrWhiteSpace(request.Slug))
                {
                    return BadRequest($"The subdomain slug '{request.Slug}' is already taken.");
                }
                attempts++;
                uniqueSlug = $"{slug}-{attempts}";
            }
            slug = uniqueSlug;

            var schemaName = $"tenant_{slug.Replace("-", "_")}";
            var defaultConnectionString = "Host=postgres;Port=5432;Database=wood-app-db;Username=postgres;Password=wood_app_strong_db_password_270326;";

            // 3. Create Tenant in Central registry in Pending state
            var enterprise = new MasterEnterprise
            {
                Name = request.Name,
                Slug = slug,
                Email = request.Email,
                Phone = request.Phone,
                SchemaName = schemaName,
                ConnectionString = defaultConnectionString,
                IsActive = false,
                Plan = request.Plan,
                Status = TenantStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                Notes = request.Notes,
                LogoUrl = request.LogoUrl,
                FaviconUrl = request.FaviconUrl,
                PrimaryColor = request.PrimaryColor,
                CustomDomain = request.CustomDomain,
                Language = request.Language ?? "fr",
                Currency = request.Currency ?? "TND"
            };

            var created = await _enterpriseRepository.AddAsync(enterprise);

            // 4. Automatic non-interactive database provisioning
            var adminUsername = string.IsNullOrWhiteSpace(request.AdminUsername) ? "admin" : request.AdminUsername;
            var adminEmail = string.IsNullOrWhiteSpace(request.AdminEmail) ? (request.Email ?? $"admin@{slug}.acya.site") : request.AdminEmail;
            var adminPassword = string.IsNullOrWhiteSpace(request.AdminPassword) ? GenerateRandomPassword() : request.AdminPassword;

            var provisionSuccess = await _provisioningService.ProvisionTenantAsync(
                created,
                adminUsername,
                adminEmail,
                adminPassword
            );

            if (!provisionSuccess)
            {
                // Rollback central registry entry
                await _enterpriseRepository.DeleteAsync(created);
                return StatusCode(500, "Database provisioning failed. Registry rollback initiated.");
            }

            // 5. Activate Registry details
            created.IsActive = true;
            created.Status = request.Plan == TenantPlan.Trial ? TenantStatus.Trial : TenantStatus.Active;
            created.ActivatedAt = DateTime.UtcNow;
            await _enterpriseRepository.UpdateAsync(created);

            // 6. Create Initial Subscription Record
            decimal planPrice = request.Plan switch
            {
                TenantPlan.Starter => 29.00m,
                TenantPlan.Pro => 99.00m,
                TenantPlan.Enterprise => 299.00m,
                _ => 0.00m
            };

            var subscription = new TenantSubscription
            {
                TenantId = created.Id,
                Plan = request.Plan,
                Status = "Active",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(request.Plan == TenantPlan.Trial ? 30 : 365),
                Price = planPrice,
                CreatedAt = DateTime.UtcNow
            };
            await _context.TenantSubscriptions.AddAsync(subscription);

            // 7. Generate Initial Invoice if paid plan
            if (request.Plan != TenantPlan.Trial)
            {
                var invoice = new TenantInvoice
                {
                    TenantId = created.Id,
                    InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{created.Id}",
                    Amount = planPrice,
                    Currency = created.Currency ?? "TND",
                    Status = "Unpaid",
                    BillingDate = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow.AddDays(7),
                    CreatedAt = DateTime.UtcNow
                };
                await _context.TenantInvoices.AddAsync(invoice);
            }

            // 8. Log Master Audit Event
            var auditLog = new MasterAuditLog
            {
                TenantId = created.Id,
                Action = "Tenant Provisioned",
                Details = $"Tenant '{created.Name}' provisioned automatically. Plan: {request.Plan}. Subdomain: https://{slug}.acya.site",
                PerformedBy = "System / Onboarding",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            // 9. Send welcome email (Log and write to local file directory)
            await WriteWelcomeEmailAsync(created, adminUsername, adminEmail, adminPassword);

            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}/activate")]
        public async Task<IActionResult> Activate(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            enterprise.IsActive = true;
            enterprise.Status = enterprise.Plan == TenantPlan.Trial ? TenantStatus.Trial : TenantStatus.Active;
            enterprise.ActivatedAt = System.DateTime.UtcNow;

            await _enterpriseRepository.UpdateAsync(enterprise);

            var auditLog = new MasterAuditLog
            {
                TenantId = enterprise.Id,
                Action = "Tenant Activated",
                Details = $"Tenant '{enterprise.Name}' activated by Super Admin.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{id}/suspend")]
        public async Task<IActionResult> Suspend(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            enterprise.IsActive = false;
            enterprise.Status = TenantStatus.Suspended;

            await _enterpriseRepository.UpdateAsync(enterprise);

            var auditLog = new MasterAuditLog
            {
                TenantId = enterprise.Id,
                Action = "Tenant Suspended",
                Details = $"Tenant '{enterprise.Name}' suspended by Super Admin.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("{id}/impersonate")]
        public async Task<IActionResult> Impersonate(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            // Load the tenant's admin user credentials directly from the tenant schema
            string adminLogin = "";
            string adminEmail = "";
            string adminFullName = "";
            string permissionsJson = "";

            try
            {
                var connStr = _context.Database.GetDbConnection().ConnectionString;
                using (var conn = new Npgsql.NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();
                    var sql = $@"
                        SELECT u.login, u.email, p.fullname, COALESCE(r.""Permissions""::text, '')
                        FROM {enterprise.SchemaName}.tbl_app_user u
                        JOIN {enterprise.SchemaName}.tbl_person p ON u.idperson = p.id
                        LEFT JOIN {enterprise.SchemaName}.tbl_user_permissions r ON u.id = r.""UserId""
                        LIMIT 1;";
                    
                    using (var cmd = new Npgsql.NpgsqlCommand(sql, conn))
                    {
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                adminLogin = reader.GetString(0);
                                adminEmail = reader.GetString(1);
                                adminFullName = reader.GetString(2);
                                permissionsJson = reader.GetString(3);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to query tenant admin user details: {ex.Message}");
            }

            if (string.IsNullOrEmpty(adminLogin))
            {
                return NotFound("No admin user found for this tenant.");
            }

            // Generate Client JWT Token
            var key = System.Text.Encoding.ASCII.GetBytes("wood_app_super_secret_unguessable_key_For_FrontEnd_$$&&!_xzawwo9985error,ughjjnp21365_##1");
            var claims = new System.Collections.Generic.List<System.Security.Claims.Claim>
            {
                new System.Security.Claims.Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email, adminEmail),
                new System.Security.Claims.Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Name, adminFullName),
                new System.Security.Claims.Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.NameId, "1"), // Placeholder ID
                new System.Security.Claims.Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Aud, "https://acya.site"),
                new System.Security.Claims.Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Iss, "https://acya.site/api/"),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Admin"),
                new System.Security.Claims.Claim("EnterpriseId", "1"),
                new System.Security.Claims.Claim("tenant_slug", enterprise.Slug),
                new System.Security.Claims.Claim("impersonator", "SuperAdmin")
            };

            if (!string.IsNullOrEmpty(permissionsJson))
            {
                claims.Add(new System.Security.Claims.Claim("Permissions", permissionsJson));
            }

            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
            {
                Subject = new System.Security.Claims.ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(2),
                SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                    new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
                    Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256
                )
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var impersonationToken = tokenHandler.WriteToken(token);

            // Log Master Audit Log Impersonation trigger
            var auditLog = new MasterAuditLog
            {
                TenantId = enterprise.Id,
                Action = "Impersonation Triggered",
                Details = $"Super Admin impersonated tenant '{enterprise.Name}' admin user.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            return Ok(new { Token = impersonationToken });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            var deprovisionSuccess = await _provisioningService.DeprovisionTenantAsync(enterprise);
            if (!deprovisionSuccess)
            {
                return StatusCode(500, "Deprovisioning database schema failed. Tenant registry entry was not removed.");
            }

            // Log deletion audit event before removing registry
            var auditLog = new MasterAuditLog
            {
                TenantId = null, // Set null as enterprise registry will be deleted
                Action = "Tenant Deleted",
                Details = $"Tenant '{enterprise.Name}' (Slug: {enterprise.Slug}, Schema: {enterprise.SchemaName}) deleted permanently.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            await _enterpriseRepository.DeleteAsync(enterprise);
            return NoContent();
        }

        private string Slugify(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "tenant";
            
            var s = name.ToLowerInvariant();
            var sb = new System.Text.StringBuilder();
            foreach (char c in s)
            {
                if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))
                {
                    sb.Append(c);
                }
                else if (c == ' ' || c == '-' || c == '_')
                {
                    sb.Append('-');
                }
            }
            var slug = sb.ToString().Replace("--", "-").Trim('-');
            return string.IsNullOrEmpty(slug) ? "tenant" : slug;
        }

        private string GenerateRandomPassword()
        {
            return Guid.NewGuid().ToString("N").Substring(0, 10) + "A1!";
        }

        private async Task WriteWelcomeEmailAsync(MasterEnterprise enterprise, string adminUsername, string adminEmail, string adminPassword)
        {
            try
            {
                var emailDir = "/app/welcome-emails";
                if (!System.IO.Directory.Exists(emailDir))
                {
                    System.IO.Directory.CreateDirectory(emailDir);
                }

                var emailContent = $@"<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Bienvenue chez ACYA ERP</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
    <div style='text-align: center; margin-bottom: 30px;'>
        <h1 style='color: #2563EB; margin: 0;'>ACYA Multi-Tenant Platform</h1>
        <p style='color: #666666; font-size: 14px;'>Votre portail SaaS est opérationnel</p>
    </div>
    
    <div style='background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;'>
        <h2 style='margin-top: 0; color: #1f2937;'>Bienvenue {enterprise.Name} !</h2>
        <p style='margin-bottom: 0;'>Votre espace de travail multi-tenant a été provisionné automatiquement. Vous pouvez y accéder immédiatement.</p>
    </div>

    <h3 style='color: #374151; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;'>Informations de connexion administratives</h3>
    <table style='width: 100%; border-collapse: collapse;'>
        <tr>
            <td style='padding: 8px 0; font-weight: bold; width: 150px;'>Adresse URL :</td>
            <td style='padding: 8px 0;'><a href='https://{enterprise.Slug}.acya.site' style='color: #2563EB; font-weight: bold;'>https://{enterprise.Slug}.acya.site</a></td>
        </tr>
        <tr>
            <td style='padding: 8px 0; font-weight: bold;'>Identifiant :</td>
            <td style='padding: 8px 0; font-family: monospace; font-size: 14px;'>{adminUsername}</td>
        </tr>
        <tr>
            <td style='padding: 8px 0; font-weight: bold;'>Mot de passe :</td>
            <td style='padding: 8px 0; font-family: monospace; font-size: 14px; color: #d97706;'>{adminPassword}</td>
        </tr>
        <tr>
            <td style='padding: 8px 0; font-weight: bold;'>Adresse Email :</td>
            <td style='padding: 8px 0;'>{adminEmail}</td>
        </tr>
    </table>

    <div style='margin-top: 35px; border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 12px; color: #888888; text-align: center;'>
        <p>Cet email a été généré automatiquement par le SaaS Lifecycle System (SLS).</p>
        <p>&copy; 2026 ACYA Consulting. Tous droits réservés.</p>
    </div>
</body>
</html>";

                var emailPath = System.IO.Path.Combine(emailDir, $"{enterprise.Slug}.html");
                await System.IO.File.WriteAllTextAsync(emailPath, emailContent);
            }
            catch (Exception ex)
            {
                // Fail-safe welcome email log error
                Console.WriteLine($"[WelcomeEmailError] Failed to write welcome email file: {ex.Message}");
            }
        }
    }
}
