using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.infrastructure;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    public class CreateTenantRequest
    {
        public long? ExistingId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public TenantPlan Plan { get; set; } = TenantPlan.Trial;
        public string? Notes { get; set; }
        public string? LogoUrl { get; set; }
        public string? FaviconUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? CustomDomain { get; set; }
        public string? Language { get; set; }
        public string? Currency { get; set; }
        public bool IsSalingWood { get; set; }
        public bool IsManagingConstructions { get; set; }

        public string? Description { get; set; }
        public string? MobileOne { get; set; }
        public string? MobileTwo { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? Devise { get; set; }
        public string? SiegeAddress { get; set; }
        public string? CommercialRegister { get; set; }
        public string? Capital { get; set; }

        public string? NameResponsable { get; set; }
        public string? SurnameResponsable { get; set; }
        public string? PositionResponsable { get; set; }
        public string? AdminSurname { get; set; }

        public List<SiteProvisionItem>? Sites { get; set; }

        public string AdminUsername { get; set; } = "admin";
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
        public decimal? PlanPrice { get; set; }
    }

    public class UpdateEnterpriseRequest
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
        public string? SecondaryColor { get; set; }
        public string? CustomDomain { get; set; }
        public string? Language { get; set; }
        public string? Currency { get; set; }
        public bool IsSalingWood { get; set; }
        public bool IsManagingConstructions { get; set; }
        public decimal? PlanPrice { get; set; }
    }

    public class TenantAppUserDto
    {
        public int Id { get; set; }
        public string? Login { get; set; }
        public string? Email { get; set; }
        public bool IsActive { get; set; }
        public string? FullName { get; set; }
        public string? Role { get; set; }
        public string? PhoneNumber { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class ResetTenantUserPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
    }


    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class EnterpriseController : ControllerBase
    {
        private readonly IEnterpriseRepository _enterpriseRepository;
        private readonly ITenantProvisioningService _provisioningService;
        private readonly MasterDbContext _context;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public EnterpriseController(
            IEnterpriseRepository enterpriseRepository, 
            ITenantProvisioningService provisioningService, 
            MasterDbContext context,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _enterpriseRepository = enterpriseRepository;
            _provisioningService = provisioningService;
            _context = context;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var enterprises = await _enterpriseRepository.GetAllAsync();
            return Ok(enterprises);
        }

        [HttpGet("pending")]
        public async Task<IActionResult> GetPending()
        {
            var enterprises = await _context.Enterprises
                .Where(e => e.Status == TenantStatus.Pending)
                .ToListAsync();
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
            while (await _context.Enterprises.AnyAsync(e => e.Slug == uniqueSlug && (!request.ExistingId.HasValue || e.Id != request.ExistingId.Value)))
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

            MasterEnterprise created;
            if (request.ExistingId.HasValue)
            {
                var existing = await _enterpriseRepository.GetByIdAsync(request.ExistingId.Value);
                if (existing == null)
                {
                    return NotFound("Existing pending enterprise request not found.");
                }
                existing.Name = request.Name;
                existing.Slug = slug;
                existing.Email = request.Email;
                existing.Phone = request.Phone;
                existing.SchemaName = schemaName;
                existing.Plan = request.Plan;
                existing.Notes = request.Notes;
                existing.LogoUrl = request.LogoUrl;
                existing.FaviconUrl = request.FaviconUrl;
                existing.PrimaryColor = request.PrimaryColor;
                existing.SecondaryColor = request.SecondaryColor;
                existing.CustomDomain = request.CustomDomain;
                existing.Language = request.Language ?? "fr";
                existing.Currency = request.Currency ?? "TND";
                existing.IsSalingWood = request.IsSalingWood;
                existing.IsManagingConstructions = request.IsManagingConstructions;
                existing.PlanPrice = request.PlanPrice ?? (request.Plan switch
                {
                    TenantPlan.Starter => 90.00m,
                    TenantPlan.Pro => 99.00m,
                    TenantPlan.Enterprise => 299.00m,
                    _ => 0.00m
                });
                existing.Status = TenantStatus.Pending;

                await _enterpriseRepository.UpdateAsync(existing);
                created = existing;
            }
            else
            {
                decimal planPrice = request.PlanPrice ?? (request.Plan switch
                {
                    TenantPlan.Starter => 90.00m,
                    TenantPlan.Pro => 99.00m,
                    TenantPlan.Enterprise => 299.00m,
                    _ => 0.00m
                });

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
                    SecondaryColor = request.SecondaryColor,
                    CustomDomain = request.CustomDomain,
                    Language = request.Language ?? "fr",
                    Currency = request.Currency ?? "TND",
                    IsSalingWood = request.IsSalingWood,
                    IsManagingConstructions = request.IsManagingConstructions,
                    PlanPrice = planPrice
                };

                created = await _enterpriseRepository.AddAsync(enterprise);
            }

            // 4. Automatic non-interactive database provisioning
            var adminUsername = string.IsNullOrWhiteSpace(request.AdminUsername) ? "admin" : request.AdminUsername;
            var adminEmail = string.IsNullOrWhiteSpace(request.AdminEmail) ? (request.Email ?? $"admin@{slug}.acya.site") : request.AdminEmail;
            var adminPassword = string.IsNullOrWhiteSpace(request.AdminPassword) ? GenerateRandomPassword() : request.AdminPassword;

            var provisionDetails = new TenantProvisionDetails
            {
                AdminUsername = adminUsername,
                AdminEmail = adminEmail,
                AdminPassword = adminPassword,
                AdminSurname = request.AdminSurname,
                Description = request.Description,
                MobileOne = request.MobileOne,
                MobileTwo = request.MobileTwo,
                MatriculeFiscal = request.MatriculeFiscal,
                Devise = request.Devise,
                SiegeAddress = request.SiegeAddress,
                CommercialRegister = request.CommercialRegister,
                Capital = request.Capital,
                NameResponsable = request.NameResponsable,
                SurnameResponsable = request.SurnameResponsable,
                PositionResponsable = request.PositionResponsable,
                Sites = request.Sites ?? new List<SiteProvisionItem>()
            };

            var provisionSuccess = await _provisioningService.ProvisionTenantAsync(
                created,
                provisionDetails
            );

            if (!provisionSuccess)
            {
                if (request.ExistingId.HasValue)
                {
                    created.IsActive = false;
                    created.Status = TenantStatus.Pending;
                    await _enterpriseRepository.UpdateAsync(created);
                    return StatusCode(500, "Database provisioning failed. Registry reset to Pending.");
                }
                else
                {
                    // Rollback central registry entry
                    await _enterpriseRepository.DeleteAsync(created);
                    return StatusCode(500, "Database provisioning failed. Registry rollback initiated.");
                }
            }

            // 5. Activate Registry details
            created.IsActive = true;
            created.Status = request.Plan == TenantPlan.Trial ? TenantStatus.Trial : TenantStatus.Active;
            created.ActivatedAt = DateTime.UtcNow;
            await _enterpriseRepository.UpdateAsync(created);

            // 6. Create Initial Subscription Record
            var subscription = new TenantSubscription
            {
                TenantId = created.Id,
                Plan = created.Plan,
                Status = "Active",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(created.Plan == TenantPlan.Trial ? 30 : 365),
                Price = created.PlanPrice,
                CreatedAt = DateTime.UtcNow
            };
            await _context.TenantSubscriptions.AddAsync(subscription);

            // 7. Generate Initial Invoice if paid plan
            if (created.Plan != TenantPlan.Trial)
            {
                var invoice = new TenantInvoice
                {
                    TenantId = created.Id,
                    InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{created.Id}",
                    Amount = created.PlanPrice,
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

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateEnterpriseRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("Enterprise Name is required.");
            }

            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Slug))
            {
                string newSlug = Slugify(request.Slug);
                var reservedSlugs = new[] { "admin", "api", "www", "preprod", "mail", "app", "dev", "staging" };
                if (reservedSlugs.Contains(newSlug))
                {
                    return BadRequest("The requested slug is reserved.");
                }

                if (await _context.Enterprises.AnyAsync(e => e.Slug == newSlug && e.Id != id))
                {
                    return BadRequest($"The subdomain slug '{request.Slug}' is already taken.");
                }
                enterprise.Slug = newSlug;
            }

            enterprise.Name = request.Name;
            enterprise.Email = request.Email;
            enterprise.Phone = request.Phone;
            enterprise.Plan = request.Plan;
            enterprise.Notes = request.Notes;
            enterprise.LogoUrl = request.LogoUrl;
            enterprise.FaviconUrl = request.FaviconUrl;
            enterprise.PrimaryColor = request.PrimaryColor;
            enterprise.SecondaryColor = request.SecondaryColor;
            enterprise.CustomDomain = request.CustomDomain;
            enterprise.Language = request.Language ?? "fr";
            enterprise.Currency = request.Currency ?? "TND";
            enterprise.IsSalingWood = request.IsSalingWood;
            enterprise.IsManagingConstructions = request.IsManagingConstructions;
            enterprise.PlanPrice = request.PlanPrice ?? (request.Plan switch
            {
                TenantPlan.Starter => 90.00m,
                TenantPlan.Pro => 99.00m,
                TenantPlan.Enterprise => 299.00m,
                _ => 0.00m
            });

            await _enterpriseRepository.UpdateAsync(enterprise);

            var auditLog = new MasterAuditLog
            {
                TenantId = enterprise.Id,
                Action = "Tenant Settings Updated",
                Details = $"Tenant '{enterprise.Name}' settings updated by Super Admin.",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            return Ok(enterprise);
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
                var connStr = _configuration.GetConnectionString("MasterConnection");
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

        [HttpGet("{id}/users")]
        public async Task<IActionResult> GetUsers(long id, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound("Enterprise not found.");

            if (!enterprise.IsActive)
            {
                return BadRequest("Cannot fetch users for an inactive tenant.");
            }

            var users = new System.Collections.Generic.List<TenantAppUserDto>();
            int totalCount = 0;

            try
            {
                var connStr = _configuration.GetConnectionString("MasterConnection");
                using (var conn = new Npgsql.NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // 1. Get total count
                    var countSql = $"SELECT COUNT(*) FROM {enterprise.SchemaName}.tbl_app_user";
                    using (var countCmd = new Npgsql.NpgsqlCommand(countSql, conn))
                    {
                        totalCount = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
                    }

                    // 2. Get paginated list of users
                    var sql = $@"
                        SELECT u.id, u.login, u.email, u.isactive, p.fullname, p.idrole, p.phonenumber, p.creationdate
                        FROM {enterprise.SchemaName}.tbl_app_user u
                        JOIN {enterprise.SchemaName}.tbl_person p ON u.idperson = p.id
                        ORDER BY p.creationdate DESC
                        LIMIT @Limit OFFSET @Offset;";

                    using (var cmd = new Npgsql.NpgsqlCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@Limit", pageSize);
                        cmd.Parameters.AddWithValue("@Offset", (page - 1) * pageSize);

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                int roleValue = reader.IsDBNull(5) ? 30 : reader.GetInt32(5);
                                string roleName = roleValue switch
                                {
                                    10 => "SuperAdmin",
                                    20 => "Admin",
                                    30 => "User",
                                    40 => "Conductor",
                                    45 => "Driver",
                                    50 => "Seller",
                                    60 => "InvoiceAgent",
                                    70 => "StoreManager",
                                    _ => $"Role {roleValue}"
                                };

                                users.Add(new TenantAppUserDto
                                {
                                    Id = reader.GetInt32(0),
                                    Login = reader.IsDBNull(1) ? null : reader.GetString(1),
                                    Email = reader.IsDBNull(2) ? null : reader.GetString(2),
                                    IsActive = reader.GetBoolean(3),
                                    FullName = reader.IsDBNull(4) ? null : reader.GetString(4),
                                    Role = roleName,
                                    PhoneNumber = reader.IsDBNull(6) ? null : reader.GetString(6),
                                    CreatedAt = reader.IsDBNull(7) ? null : (DateTime?)reader.GetDateTime(7)
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to query tenant users: {ex.Message}");
            }

            return Ok(new { TotalCount = totalCount, Users = users });
        }

        [HttpPut("{id}/users/{userId}/reset-password")]
        public async Task<IActionResult> ResetUserPassword(long id, int userId, [FromBody] ResetTenantUserPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest("New password is required.");
            }

            var enterprise = await _enterpriseRepository.GetByIdAsync(id);
            if (enterprise == null) return NotFound("Enterprise not found.");

            if (!enterprise.IsActive)
            {
                return BadRequest("Cannot reset passwords for inactive tenants.");
            }

            string userLogin = string.Empty;
            string userEmail = string.Empty;

            try
            {
                var connStr = _configuration.GetConnectionString("MasterConnection");
                using (var conn = new Npgsql.NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // Verify user existence and get user info
                    var verifySql = $"SELECT login, email FROM {enterprise.SchemaName}.tbl_app_user WHERE id = @UserId";
                    using (var verifyCmd = new Npgsql.NpgsqlCommand(verifySql, conn))
                    {
                        verifyCmd.Parameters.AddWithValue("@UserId", userId);
                        using (var reader = await verifyCmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                userLogin = reader.IsDBNull(0) ? "" : reader.GetString(0);
                                userEmail = reader.IsDBNull(1) ? "" : reader.GetString(1);
                            }
                            else
                            {
                                return NotFound($"User with ID {userId} not found in this tenant.");
                            }
                        }
                    }

                    // Compute hash and salt using HMACSHA512
                    using var hmac = new System.Security.Cryptography.HMACSHA512();
                    var passwordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(request.NewPassword));
                    var passwordSalt = hmac.Key;

                    // Update user password
                    var updateSql = $@"
                        UPDATE {enterprise.SchemaName}.tbl_app_user
                        SET passwordhash = @PasswordHash, passwordsalt = @PasswordSalt
                        WHERE id = @UserId;";

                    using (var updateCmd = new Npgsql.NpgsqlCommand(updateSql, conn))
                    {
                        updateCmd.Parameters.AddWithValue("@UserId", userId);
                        updateCmd.Parameters.AddWithValue("@PasswordHash", passwordHash);
                        updateCmd.Parameters.AddWithValue("@PasswordSalt", passwordSalt);

                        await updateCmd.ExecuteNonQueryAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to reset user password: {ex.Message}");
            }

            // Log Master Audit Log event
            var auditLog = new MasterAuditLog
            {
                TenantId = enterprise.Id,
                Action = "User Password Reset",
                Details = $"Super Admin reset password for tenant user ID: {userId} (login: {userLogin}, email: {userEmail}).",
                PerformedBy = "Super Admin",
                Timestamp = DateTime.UtcNow
            };
            await _context.MasterAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();

            return NoContent();
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
