using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    public class DeepSearchController : BaseApiController
    {
        private readonly WoodAppContext _context;

        public DeepSearchController(WoodAppContext context)
        {
            _context = context;
        }

        [HttpGet("customer-purchases/{customerId}")]
        public async Task<ActionResult<IEnumerable<PurchasedMerchandiseDto>>> GetCustomerPurchases(
            int customerId,
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            try
            {
                // Verify customer exists
                var customer = await _context.CounterParts.FindAsync(customerId);
                if (customer == null)
                {
                    return NotFound(new { message = "Client non trouvé" });
                }

                // Query document merchandises for this customer
                var query = _context.DocumentMerchandises
                    .Include(dm => dm.Document)
                    .Include(dm => dm.Merchandise)
                        .ThenInclude(m => m!.Articles)
                    .Where(dm => dm.Document!.CounterPartId == customerId 
                                 && dm.Document.IsDeleted == false
                                 && dm.Type == LineType.Merchandise);

                // Document types filtering: limit to sales documents: delivery notes and invoices
                query = query.Where(dm => dm.Document!.Type == DocumentTypes.customerDeliveryNote 
                                          || dm.Document!.Type == DocumentTypes.customerInvoice);

                if (month.HasValue && month.Value > 0)
                {
                    query = query.Where(dm => dm.Document!.CreationDate.HasValue && dm.Document.CreationDate.Value.Month == month.Value);
                }

                if (year.HasValue && year.Value > 0)
                {
                    query = query.Where(dm => dm.Document!.CreationDate.HasValue && dm.Document.CreationDate.Value.Year == year.Value);
                }

                var list = await query.ToListAsync();

                // Group in memory to avoid EF Core translation issues and normalize package reference
                var grouped = list
                    .GroupBy(dm => {
                        var mId = dm.MerchandiseId ?? 0;
                        var artRef = dm.Merchandise?.Articles?.Reference ?? "INCONNU";
                        var rawPkg = dm.Merchandise?.PackageReference ?? "Standard";
                        // Normalize the package reference: clean quotes and map Standart/Standard/null to Standard
                        var cleanPkg = rawPkg.Replace("\"", "").Trim();
                        if (string.IsNullOrEmpty(cleanPkg) || 
                            cleanPkg.Equals("Standard", StringComparison.OrdinalIgnoreCase) || 
                            cleanPkg.Equals("Standart", StringComparison.OrdinalIgnoreCase))
                        {
                            cleanPkg = "Standard";
                        }
                        return new { MerchandiseId = mId, ArticleRef = artRef, PackageRef = cleanPkg };
                    })
                    .Select(g => new PurchasedMerchandiseDto
                    {
                        MerchandiseId = g.Key.MerchandiseId,
                        ArticleReference = g.Key.ArticleRef,
                        ArticleDescription = g.First().Merchandise?.Articles?.Description ?? g.First().Merchandise?.Description ?? string.Empty,
                        PackageReference = g.Key.PackageRef,
                        TotalQuantity = g.Sum(x => x.Quantity),
                        AveragePriceHT = g.Sum(x => x.Quantity) > 0 
                            ? Math.Round(g.Sum(x => x.Quantity * x.UnitPriceHT) / g.Sum(x => x.Quantity), 3) 
                            : 0,
                        Unit = g.First().Merchandise?.Articles?.Unit ?? "Pcs",
                        RelatedDocuments = g.Select(x => x.Document?.DocNumber ?? string.Empty)
                            .Where(num => !string.IsNullOrEmpty(num))
                            .Distinct()
                            .ToList()
                    })
                    .OrderBy(dto => dto.ArticleReference)
                    .ThenBy(dto => dto.PackageReference)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("merchandise-buyers/{articleId}")]
        public async Task<ActionResult<IEnumerable<MerchandiseBuyerDto>>> GetMerchandiseBuyers(
            int articleId,
            [FromQuery] string? packageReference,
            [FromQuery] int? month,
            [FromQuery] int? year)
        {
            try
            {
                // Verify article exists
                var article = await _context.Articles.FindAsync(articleId);
                if (article == null)
                {
                    return NotFound(new { message = "Article non trouvé" });
                }

                // Query document merchandises for this article
                var query = _context.DocumentMerchandises
                    .Include(dm => dm.Document)
                        .ThenInclude(d => d!.CounterPart)
                    .Include(dm => dm.Merchandise)
                    .Where(dm => dm.Merchandise!.ArticleId == articleId
                                 && dm.Document!.IsDeleted == false
                                 && dm.Type == LineType.Merchandise);

                // Limit to sales documents
                query = query.Where(dm => dm.Document!.Type == DocumentTypes.customerDeliveryNote 
                                          || dm.Document!.Type == DocumentTypes.customerInvoice);

                if (month.HasValue && month.Value > 0)
                {
                    query = query.Where(dm => dm.Document!.CreationDate.HasValue && dm.Document.CreationDate.Value.Month == month.Value);
                }

                if (year.HasValue && year.Value > 0)
                {
                    query = query.Where(dm => dm.Document!.CreationDate.HasValue && dm.Document.CreationDate.Value.Year == year.Value);
                }

                var list = await query.ToListAsync();

                // Group in memory and filter packageReference if specified
                var queryableList = list.AsEnumerable();

                if (!string.IsNullOrEmpty(packageReference))
                {
                    var cleanFilterPkg = packageReference.Replace("\"", "").Trim();
                    if (cleanFilterPkg.Equals("Standard", StringComparison.OrdinalIgnoreCase) || 
                        cleanFilterPkg.Equals("Standart", StringComparison.OrdinalIgnoreCase))
                    {
                        queryableList = queryableList.Where(dm => {
                            var p = dm.Merchandise?.PackageReference?.Replace("\"", "").Trim() ?? "Standard";
                            return string.IsNullOrEmpty(p) || 
                                   p.Equals("Standard", StringComparison.OrdinalIgnoreCase) || 
                                   p.Equals("Standart", StringComparison.OrdinalIgnoreCase);
                        });
                    }
                    else
                    {
                        queryableList = queryableList.Where(dm => 
                            dm.Merchandise?.PackageReference != null && 
                            dm.Merchandise.PackageReference.Replace("\"", "").Trim().Equals(cleanFilterPkg, StringComparison.OrdinalIgnoreCase)
                        );
                    }
                }

                var grouped = queryableList
                    .GroupBy(dm => {
                        var cpId = dm.Document?.CounterPartId ?? 0;
                        var cpCode = dm.Document?.CounterPart?.PatenteCode ?? dm.Document?.CounterPart?.IdentityCardNumber ?? string.Empty;
                        var cpName = dm.Document?.CounterPart != null 
                            ? (dm.Document.CounterPart.FirstName + " " + dm.Document.CounterPart.LastName).Trim() 
                            : "INCONNU";
                        var cpCompany = dm.Document?.CounterPart?.Name ?? string.Empty;
                        return new { CustomerId = cpId, Code = cpCode, Name = cpName, Company = cpCompany };
                    })
                    .Select(g => new MerchandiseBuyerDto
                    {
                        CustomerId = g.Key.CustomerId,
                        CustomerCode = g.Key.Code,
                        CustomerName = string.IsNullOrEmpty(g.Key.Name) ? "INCONNU" : g.Key.Name,
                        CustomerCompany = g.Key.Company,
                        TotalQuantity = g.Sum(x => x.Quantity),
                        TotalCostHT = Math.Round(g.Sum(x => x.CostNetHT), 3),
                        RelatedDocuments = g.Select(x => x.Document?.DocNumber ?? string.Empty)
                            .Where(num => !string.IsNullOrEmpty(num))
                            .Distinct()
                            .ToList()
                    })
                    .OrderByDescending(dto => dto.TotalQuantity)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("unpaid-documents")]
        public async Task<ActionResult<IEnumerable<UnpaidDocumentDto>>> GetUnpaidDocuments(
            [FromQuery] int? customerId,
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] string? search)
        {
            try
            {
                // Query outstanding sales documents
                var query = _context.Documents
                    .Include(d => d.CounterPart)
                    .Include(d => d.Payments)
                    .Where(d => d.IsDeleted == false 
                                && d.BillingStatus != BillingStatus.Billed);

                // Include invoices and direct uninvoiced delivery notes
                query = query.Where(d => d.Type == DocumentTypes.customerInvoice 
                                          || (d.Type == DocumentTypes.customerDeliveryNote && !d.IsInvoiced));

                if (customerId.HasValue && customerId.Value > 0)
                {
                    query = query.Where(d => d.CounterPartId == customerId.Value);
                }

                if (month.HasValue && month.Value > 0)
                {
                    query = query.Where(d => d.CreationDate.HasValue && d.CreationDate.Value.Month == month.Value);
                }

                if (year.HasValue && year.Value > 0)
                {
                    query = query.Where(d => d.CreationDate.HasValue && d.CreationDate.Value.Year == year.Value);
                }

                if (!string.IsNullOrEmpty(search))
                {
                    var s = search.ToLower().Trim();
                    query = query.Where(d => (d.DocNumber != null && d.DocNumber.ToLower().Contains(s))
                                             || (d.CounterPart != null && (
                                                 (d.CounterPart.FirstName != null && d.CounterPart.FirstName.ToLower().Contains(s)) ||
                                                 (d.CounterPart.LastName != null && d.CounterPart.LastName.ToLower().Contains(s)) ||
                                                 (d.CounterPart.Name != null && d.CounterPart.Name.ToLower().Contains(s))
                                             )));
                }

                var documents = await query
                    .OrderByDescending(d => d.CreationDate)
                    .ToListAsync();

                var list = documents
                    .Select(d => {
                        var totalPaid = (double)(d.Payments?.Where(p => !p.IsDeleted).Sum(p => p.Amount ?? 0m) ?? 0m);
                        var targetTotal = d.TotalCostNetTTCDoc - d.TotalCreditNotes;
                        var remaining = Math.Max(0.0, targetTotal - totalPaid);

                        return new UnpaidDocumentDto
                        {
                            DocumentId = d.Id,
                            DocNumber = d.DocNumber ?? string.Empty,
                            Type = d.Type.ToString() ?? string.Empty,
                            CreationDate = d.CreationDate ?? DateTime.MinValue,
                            CounterPartId = d.CounterPartId ?? 0,
                            CounterPartName = d.CounterPart != null 
                                ? (d.CounterPart.FirstName + " " + d.CounterPart.LastName).Trim() 
                                : "INCONNU",
                            CounterPartCompany = d.CounterPart?.Name ?? string.Empty,
                            TotalNetTTC = Math.Round(d.TotalCostNetTTCDoc, 3),
                            TotalPaid = Math.Round(totalPaid, 3),
                            RemainingBalance = Math.Round(remaining, 3),
                            BillingStatus = d.BillingStatus.ToString()
                        };
                    })
                    // Only return documents that actually have a positive remaining balance
                    .Where(dto => dto.RemainingBalance > 0.01)
                    .ToList();

                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
