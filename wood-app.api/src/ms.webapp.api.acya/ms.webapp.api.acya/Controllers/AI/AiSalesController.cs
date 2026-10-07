using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.Attributes;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.AI;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.AI
{
    /// <summary>
    /// Dedicated, customer-safe API endpoints consumed by the AI Sales Agent workflows (n8n).
    /// Protected by 'X-AI-Secret' service authentication and isolated by 'X-Tenant-Slug'.
    /// Strictly filters out all internal purchase costs, margins, accounting ledgers, and PII.
    /// </summary>
    [ApiController]
    [Route("api/ai")]
    [RequireAiSecret]
    public class AiSalesController : ControllerBase
    {
        private readonly WoodAppContext _context;
        private readonly ArticleRepository _articleRepository;
        private readonly CounterPartRepository _counterPartRepository;
        private readonly IPricingGridService _pricingGridService;
        private readonly IStockService _stockService;
        private readonly IAppNotificationService _notificationService;
        private readonly TenantContext _tenantContext;
        private readonly ILogger<AiSalesController> _logger;

        public AiSalesController(
            WoodAppContext context,
            ArticleRepository articleRepository,
            CounterPartRepository counterPartRepository,
            IPricingGridService pricingGridService,
            IStockService stockService,
            IAppNotificationService notificationService,
            TenantContext tenantContext,
            ILogger<AiSalesController> logger)
        {
            _context = context;
            _articleRepository = articleRepository;
            _counterPartRepository = counterPartRepository;
            _pricingGridService = pricingGridService;
            _stockService = stockService;
            _notificationService = notificationService;
            _tenantContext = tenantContext;
            _logger = logger;
        }

        /// <summary>
        /// Searches active articles by reference or description.
        /// Returns customer-safe product summaries without prices, costs, or supplier details.
        /// </summary>
        [HttpGet("products/search")]
        public async Task<ActionResult<IEnumerable<AiProductDto>>> SearchProducts(
            [FromQuery] string query,
            [FromQuery] int limit = 10)
        {
            var sw = Stopwatch.StartNew();
            var correlationId = HttpContext.TraceIdentifier;

            if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            {
                return BadRequest(new { message = "Le paramètre 'query' est obligatoire et doit comporter au moins 2 caractères." });
            }

            var safeLimit = Math.Clamp(limit, 1, 20);
            var normalizedQuery = query.Trim().ToLowerInvariant();

            try
            {
                var articlesQuery = _context.Articles
                    .Include(a => a.Parents)
                    .Include(a => a.FirstChildren)
                    .Where(a => !a.IsDeleted && a.Type == ArticleType.Merchandise);

                var queryable = articlesQuery.Where(a =>
                    (a.Reference != null && a.Reference.ToLower().Contains(normalizedQuery)) ||
                    (a.Description != null && a.Description.ToLower().Contains(normalizedQuery)));

                var matches = await queryable
                    .OrderBy(a => a.Reference)
                    .Take(safeLimit)
                    .ToListAsync();

                if (matches.Count < safeLimit)
                {
                    var tokens = normalizedQuery.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (tokens.Length > 1)
                    {
                        var existingIds = matches.Select(m => m.Id).ToHashSet();
                        var candidates = await articlesQuery
                            .Where(a => !existingIds.Contains(a.Id))
                            .Take(50)
                            .ToListAsync();

                        var tokenMatches = candidates
                            .Where(a => tokens.All(t =>
                                (a.Description != null && a.Description.ToLower().Contains(t)) ||
                                (a.Reference != null && a.Reference.ToLower().Contains(t))))
                            .Take(safeLimit - matches.Count);

                        matches.AddRange(tokenMatches);
                    }
                }

                var results = matches.Select(a => new AiProductDto
                {
                    Id = a.Id,
                    Reference = a.Reference ?? string.Empty,
                    Name = a.Description ?? string.Empty,
                    Category = a.Parents?.Description ?? a.Parents?.Reference,
                    Subcategory = a.FirstChildren?.Description ?? a.FirstChildren?.Reference,
                    Unit = a.Unit ?? (a.IsWood ? "m3" : "Pcs"),
                    IsWood = a.IsWood,
                    ImageUrl = a.ImageUrl
                }).ToList();

                sw.Stop();
                _logger.LogInformation("AI API SearchProducts succeeded for tenant '{Tenant}' - Found {Count} items in {ElapsedMs}ms (CorrelationId: {CorrelationId})",
                    _tenantContext.Slug, results.Count, sw.ElapsedMilliseconds, correlationId);

                return Ok(results);
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "AI API SearchProducts error for tenant '{Tenant}' (CorrelationId: {CorrelationId})",
                    _tenantContext.Slug, correlationId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la recherche de produits." });
            }
        }

        /// <summary>
        /// Retrieves customer-safe details of a single product.
        /// Strictly excludes confidential costs, margins, and supplier data.
        /// </summary>
        [HttpGet("products/{id:int}")]
        public async Task<ActionResult<AiProductDetailDto>> GetProduct(int id)
        {
            var sw = Stopwatch.StartNew();
            var correlationId = HttpContext.TraceIdentifier;

            if (id <= 0)
            {
                return BadRequest(new { message = "Identifiant de produit non valide." });
            }

            try
            {
                var article = await _articleRepository.GetById(id);
                if (article == null || article.IsDeleted)
                {
                    return NotFound(new { message = "Produit non trouvé." });
                }

                var dto = new AiProductDetailDto
                {
                    Id = article.Id,
                    Reference = article.Reference ?? string.Empty,
                    Name = article.Description ?? string.Empty,
                    Category = article.Parents?.Description ?? article.Parents?.Reference,
                    Subcategory = article.FirstChildren?.Description ?? article.FirstChildren?.Reference,
                    Unit = article.Unit ?? (article.IsWood ? "m3" : "Pcs"),
                    IsWood = article.IsWood,
                    ImageUrl = article.ImageUrl,
                    Dimensions = new AiProductDimensionsDto
                    {
                        Thickness = article.Thicknesses?.Name,
                        Width = article.Widths?.Name,
                        AvailableLengths = article.Lengths
                    }
                };

                sw.Stop();
                _logger.LogInformation("AI API GetProduct succeeded for product {ProductId} on tenant '{Tenant}' in {ElapsedMs}ms (CorrelationId: {CorrelationId})",
                    id, _tenantContext.Slug, sw.ElapsedMilliseconds, correlationId);

                return Ok(dto);
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "AI API GetProduct error for product {ProductId} on tenant '{Tenant}' (CorrelationId: {CorrelationId})",
                    id, _tenantContext.Slug, correlationId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la récupération du produit." });
            }
        }

        /// <summary>
        /// Resolves the commercial selling price for a product.
        /// Returns the catalog price by default; applies negotiated customer discount
        /// only if a valid customer phone is matched in the tenant database.
        /// </summary>
        [HttpGet("products/{id:int}/price")]
        public async Task<ActionResult<AiPriceDto>> GetPrice(
            int id,
            [FromQuery] string? customerPhone = null)
        {
            var sw = Stopwatch.StartNew();
            var correlationId = HttpContext.TraceIdentifier;

            if (id <= 0)
            {
                return BadRequest(new { message = "Identifiant de produit non valide." });
            }

            try
            {
                var article = await _articleRepository.GetById(id);
                if (article == null || article.IsDeleted)
                {
                    return NotFound(new { message = "Produit non trouvé." });
                }

                double catalogHT = Math.Round(article.SellPriceHT ?? 0.0, 3);
                double tvaRate = 19.0;

                if (article.TVAs != null && !string.IsNullOrEmpty(article.TVAs.Name) &&
                    double.TryParse(article.TVAs.Name.Replace("%", "").Trim(), out var parsedTva))
                {
                    tvaRate = parsedTva;
                }

                double catalogTTC = Math.Round(article.SellPriceTTC.HasValue && article.SellPriceTTC > 0
                    ? article.SellPriceTTC.Value
                    : catalogHT * (1.0 + tvaRate / 100.0), 3);

                string currency = "TND";
                bool isCustomerIdentified = false;
                string? customerName = null;
                double? discountRate = null;
                double finalHT = catalogHT;
                double finalTTC = catalogTTC;

                // Secure customer lookup by phone number
                if (!string.IsNullOrWhiteSpace(customerPhone))
                {
                    var customer = await _counterPartRepository.GetByPhoneNumberAsync(customerPhone);
                    if (customer != null)
                    {
                        isCustomerIdentified = true;
                        customerName = customer.Fullname;

                        var lookupRules = await _pricingGridService.GetLookupAsync(customer.Id);
                        var rule = lookupRules.FirstOrDefault(r => r.articleid == article.Id);

                        if (rule != null && rule.discountrate > 0)
                        {
                            discountRate = Math.Round(rule.discountrate, 2);
                            finalHT = Math.Round(catalogHT * (1.0 - discountRate.Value / 100.0), 3);
                            finalTTC = Math.Round(catalogTTC * (1.0 - discountRate.Value / 100.0), 3);
                        }
                    }
                }

                var priceDto = new AiPriceDto
                {
                    ArticleId = article.Id,
                    Reference = article.Reference ?? string.Empty,
                    CatalogPriceHT = catalogHT,
                    CatalogPriceTTC = catalogTTC,
                    TvaRate = tvaRate,
                    Currency = currency,
                    IsCustomerIdentified = isCustomerIdentified,
                    CustomerName = customerName,
                    DiscountRate = discountRate,
                    FinalPriceHT = finalHT,
                    FinalPriceTTC = finalTTC
                };

                sw.Stop();
                _logger.LogInformation("AI API GetPrice succeeded for product {ProductId} (CustomerIdentified: {CustomerIdentified}) on tenant '{Tenant}' in {ElapsedMs}ms (CorrelationId: {CorrelationId})",
                    id, isCustomerIdentified, _tenantContext.Slug, sw.ElapsedMilliseconds, correlationId);

                return Ok(priceDto);
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "AI API GetPrice error for product {ProductId} on tenant '{Tenant}' (CorrelationId: {CorrelationId})",
                    id, _tenantContext.Slug, correlationId);
                return StatusCode(500, new { message = "Une erreur est survenue lors du calcul du prix." });
            }
        }

        /// <summary>
        /// Retrieves customer-safe stock availability.
        /// Handles standard inventory and wood pieces breakdown by length.
        /// Excludes confidential accounting values.
        /// </summary>
        [HttpGet("products/{id:int}/availability")]
        public async Task<ActionResult<AiAvailabilityDto>> GetAvailability(int id)
        {
            var sw = Stopwatch.StartNew();
            var correlationId = HttpContext.TraceIdentifier;

            if (id <= 0)
            {
                return BadRequest(new { message = "Identifiant de produit non valide." });
            }

            try
            {
                var article = await _articleRepository.GetById(id);
                if (article == null || article.IsDeleted)
                {
                    return NotFound(new { message = "Produit non trouvé." });
                }

                var defaultSite = await _context.SalesSites.FirstOrDefaultAsync(s => !s.IsDeleted);
                string depotName = defaultSite?.Address ?? "Dépôt Principal";
                int siteId = defaultSite?.Id ?? 1;

                bool isAvailable = false;
                string stockStatus = "OutOfStock";
                double? quantityAvailable = null;
                List<AiWoodLengthStockDto>? lengthDetails = null;

                if (article.IsWood)
                {
                    var details = await _stockService.GetWoodArticleStockDetailsAsync(article.Reference ?? string.Empty, siteId, 0);
                    var woodList = details.Where(d => d.RemainingPieces > 0).ToList();

                    if (woodList.Any())
                    {
                        isAvailable = true;
                        int totalPieces = woodList.Sum(w => w.RemainingPieces);
                        stockStatus = totalPieces > 10 ? "InStock" : "LowStock";
                        quantityAvailable = totalPieces;
                        lengthDetails = woodList.Select(w => new AiWoodLengthStockDto
                        {
                            Length = w.LengthName ?? string.Empty,
                            Pieces = w.RemainingPieces
                        }).ToList();
                    }
                    else
                    {
                        var physicalStock = await _context.Stocks
                            .Where(s => s.Merchandises != null && s.Merchandises.ArticleId == article.Id)
                            .SumAsync(s => (double?)s.Quantity) ?? 0.0;

                        if (physicalStock > 0)
                        {
                            isAvailable = true;
                            stockStatus = physicalStock > 5 ? "InStock" : "LowStock";
                            quantityAvailable = Math.Round(physicalStock, 3);
                        }
                    }
                }
                else
                {
                    var totalStock = await _context.Stocks
                        .Where(s => s.Merchandises != null && s.Merchandises.ArticleId == article.Id)
                        .SumAsync(s => (double?)s.Quantity) ?? 0.0;

                    if (totalStock > 0)
                    {
                        isAvailable = true;
                        stockStatus = totalStock > 10 ? "InStock" : "LowStock";
                        quantityAvailable = Math.Round(totalStock, 3);
                    }
                }

                var availabilityDto = new AiAvailabilityDto
                {
                    ArticleId = article.Id,
                    Reference = article.Reference ?? string.Empty,
                    IsAvailable = isAvailable,
                    StockStatus = stockStatus,
                    Unit = article.Unit ?? (article.IsWood ? "m3" : "Pcs"),
                    Depot = depotName,
                    QuantityAvailable = quantityAvailable,
                    LengthDetails = lengthDetails
                };

                sw.Stop();
                _logger.LogInformation("AI API GetAvailability succeeded for product {ProductId} (Status: {StockStatus}) on tenant '{Tenant}' in {ElapsedMs}ms (CorrelationId: {CorrelationId})",
                    id, stockStatus, _tenantContext.Slug, sw.ElapsedMilliseconds, correlationId);

                return Ok(availabilityDto);
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "AI API GetAvailability error for product {ProductId} on tenant '{Tenant}' (CorrelationId: {CorrelationId})",
                    id, _tenantContext.Slug, correlationId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la vérification du stock." });
            }
        }

        /// <summary>
        /// Retrieves basic customer-facing company information for the current tenant.
        /// </summary>
        [HttpGet("tenant-info")]
        public async Task<ActionResult<AiTenantInfoDto>> GetTenantInfo()
        {
            var sw = Stopwatch.StartNew();
            var correlationId = HttpContext.TraceIdentifier;

            try
            {
                var enterprise = await _context.Enterprises.FirstOrDefaultAsync();

                var info = new AiTenantInfoDto
                {
                    CompanyName = enterprise?.Name ?? "SOCOFEB",
                    Address = enterprise?.SiegeAddress,
                    Phone = enterprise?.Phone ?? enterprise?.MobileOne,
                    Email = enterprise?.Email,
                    Currency = enterprise?.Devise ?? enterprise?.Currency ?? "TND",
                    IsSalingWood = enterprise?.IsSalingWood ?? true
                };

                sw.Stop();
                _logger.LogInformation("AI API GetTenantInfo succeeded for tenant '{Tenant}' in {ElapsedMs}ms (CorrelationId: {CorrelationId})",
                    _tenantContext.Slug, sw.ElapsedMilliseconds, correlationId);

                return Ok(info);
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "AI API GetTenantInfo error for tenant '{Tenant}' (CorrelationId: {CorrelationId})",
                    _tenantContext.Slug, correlationId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la récupération des informations entreprise." });
            }
        }

        /// <summary>
        /// Escalates an inquiry to human sales staff via internal AppNotifications.
        /// </summary>
        [HttpPost("handoff")]
        public async Task<ActionResult<AiHandoffResponseDto>> CreateHandoff(
            [FromBody] AiHandoffRequestDto request)
        {
            var sw = Stopwatch.StartNew();
            var correlationId = HttpContext.TraceIdentifier;

            if (request == null)
            {
                return BadRequest(new { message = "Le corps de la requête est obligatoire." });
            }

            if (string.IsNullOrWhiteSpace(request.CustomerPhone))
            {
                return BadRequest(new { message = "Le numéro de téléphone du client est obligatoire." });
            }

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { message = "Le motif d'intervention est obligatoire." });
            }

            if (string.IsNullOrWhiteSpace(request.Summary))
            {
                return BadRequest(new { message = "Le résumé de la demande est obligatoire." });
            }

            try
            {
                var customer = await _counterPartRepository.GetByPhoneNumberAsync(request.CustomerPhone);
                var customerDisplayName = !string.IsNullOrWhiteSpace(request.CustomerName)
                    ? request.CustomerName.Trim()
                    : (customer?.Fullname ?? "Client WhatsApp");

                var title = $"[Agent IA] Relais commercial requis ({customerDisplayName})";
                var message = $"Client : {customerDisplayName} | Tél : {request.CustomerPhone.Trim()}\nMotif : {request.Reason.Trim()}\nDemande : {request.Summary.Trim()}";

                var notification = await _notificationService.NotifyAsync(
                    title: title,
                    message: message,
                    type: NotificationType.Warning,
                    priority: NotificationPriority.High,
                    targetRole: "Seller",
                    relatedEntityId: customer?.Id.ToString(),
                    relatedEntityType: "CounterPart"
                );

                sw.Stop();
                _logger.LogInformation("AI API CreateHandoff created notification {NotificationId} for tenant '{Tenant}' in {ElapsedMs}ms (CorrelationId: {CorrelationId})",
                    notification?.Id ?? 0, _tenantContext.Slug, sw.ElapsedMilliseconds, correlationId);

                return Ok(new AiHandoffResponseDto
                {
                    Success = true,
                    NotificationId = notification?.Id ?? 0,
                    Message = "Notification transmise avec succès à l'équipe commerciale SOCOFEB."
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "AI API CreateHandoff error for tenant '{Tenant}' (CorrelationId: {CorrelationId})",
                    _tenantContext.Slug, correlationId);
                return StatusCode(500, new { message = "Une erreur est survenue lors de la création de la notification de relais." });
            }
        }
    }
}
