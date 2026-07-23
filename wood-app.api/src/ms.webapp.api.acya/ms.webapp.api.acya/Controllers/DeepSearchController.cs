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

        [HttpGet("discount-report")]
        public async Task<ActionResult<IEnumerable<DiscountReportLineDto>>> GetDiscountReport(
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo,
            [FromQuery] int? customerId)
        {
            try
            {
                // Query DocumentMerchandises that are not deleted and are of type Merchandise
                var query = _context.DocumentMerchandises
                    .Include(dm => dm.Document)
                        .ThenInclude(d => d!.CounterPart)
                    .Include(dm => dm.Document)
                        .ThenInclude(d => d!.ParentDocuments)
                            .ThenInclude(r => r.ParentDocument)
                    .Include(dm => dm.Merchandise)
                        .ThenInclude(m => m!.Articles)
                    .Where(dm => dm.Document!.IsDeleted == false
                                 && dm.Type == LineType.Merchandise);

                // Filter by customer if provided
                if (customerId.HasValue && customerId.Value > 0)
                {
                    query = query.Where(dm => 
                        (dm.Document!.Type == DocumentTypes.customerInvoice && dm.Document.CounterPartId == customerId.Value)
                        || (dm.Document.Type == DocumentTypes.customerDeliveryNote 
                            && dm.Document.ParentDocuments.Any(p => p.ParentDocument!.Type == DocumentTypes.customerInvoice && p.ParentDocument.IsDeleted == false && p.ParentDocument.CounterPartId == customerId.Value))
                    );
                }

                // Resolve start and end dates
                DateTime from = DateTime.Today;
                if (!string.IsNullOrEmpty(dateFrom))
                {
                    if (DateTime.TryParseExact(dateFrom, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedFrom))
                    {
                        from = parsedFrom.Date;
                    }
                    else if (DateTime.TryParse(dateFrom, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedFromFallback))
                    {
                        from = parsedFromFallback.Date;
                    }
                }

                DateTime to = DateTime.Today.AddDays(1).AddTicks(-1);
                if (!string.IsNullOrEmpty(dateTo))
                {
                    if (DateTime.TryParseExact(dateTo, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedTo))
                    {
                        to = parsedTo.Date.AddDays(1).AddTicks(-1);
                    }
                    else if (DateTime.TryParse(dateTo, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var parsedToFallback))
                    {
                        to = parsedToFallback.Date.AddDays(1).AddTicks(-1);
                    }
                }

                // Filter by Invoice Date (direct invoice creation date or parent invoice creation date for delivery notes)
                query = query.Where(dm => 
                    (dm.Document!.Type == DocumentTypes.customerInvoice && dm.Document.CreationDate >= from && dm.Document.CreationDate <= to)
                    || (dm.Document.Type == DocumentTypes.customerDeliveryNote 
                        && dm.Document.ParentDocuments.Any(p => p.ParentDocument!.Type == DocumentTypes.customerInvoice && p.ParentDocument.IsDeleted == false && p.ParentDocument.CreationDate >= from && p.ParentDocument.CreationDate <= to))
                );

                var list = await query.ToListAsync();

                var result = list.Select(dm => {
                    var catalogPrice = dm.Merchandise?.Articles?.SellPriceHT ?? 0.0;

                    // Resolve the active invoice document reference
                    var invoiceDoc = dm.Document!.Type == DocumentTypes.customerInvoice
                        ? dm.Document
                        : dm.Document.ParentDocuments
                            .Where(r => r.ParentDocument!.Type == DocumentTypes.customerInvoice && r.ParentDocument.IsDeleted == false)
                            .Select(r => r.ParentDocument)
                            .FirstOrDefault();

                    var activeDoc = invoiceDoc ?? dm.Document;

                    // Calculate discount percentage
                    double discountPercent = 0.0;
                    if (dm.DiscountPercentage > 0.001)
                    {
                        discountPercent = dm.DiscountPercentage;
                    }
                    else if (activeDoc != null && activeDoc.TotalCostDiscountDoc > 0.001)
                    {
                        // Calculate global discount percentage from invoice
                        double totalGrossHT = activeDoc.TotalCostHTNetDoc + activeDoc.TotalCostDiscountDoc;
                        if (totalGrossHT > 0.001)
                        {
                            discountPercent = (activeDoc.TotalCostDiscountDoc / totalGrossHT) * 100.0;
                        }
                    }

                    var invoicePrice = dm.UnitPriceHT * (1 - discountPercent / 100.0);

                    return new {
                        dm,
                        catalogPrice,
                        invoicePrice,
                        discountPercent,
                        activeDoc
                    };
                })
                // Only keep lines that have a discount
                .Where(x => x.discountPercent > 0.001)
                .Select(x => new DiscountReportLineDto
                {
                    InvoiceDate = x.activeDoc?.CreationDate ?? DateTime.MinValue,
                    InvoiceNumber = x.activeDoc?.DocNumber ?? string.Empty,
                    ArticleReference = x.dm.Merchandise?.Articles?.Reference ?? "INCONNU",
                    ArticleDescription = x.dm.Merchandise?.Articles?.Description ?? x.dm.Merchandise?.Description ?? string.Empty,
                    Quantity = x.dm.Quantity,
                    Unit = x.dm.Merchandise?.Articles?.Unit ?? "Pcs",
                    CatalogPriceHT = Math.Round(x.catalogPrice, 3),
                    InvoicePriceHT = Math.Round(x.invoicePrice, 3),
                    DiscountPercentage = Math.Round(x.discountPercent, 2),
                    CustomerId = x.activeDoc?.CounterPartId ?? 0,
                    CustomerName = x.activeDoc?.CounterPart != null 
                        ? (x.activeDoc.CounterPart.FirstName + " " + x.activeDoc.CounterPart.LastName).Trim() 
                        : "INCONNU"
                })
                .OrderByDescending(dto => dto.InvoiceDate)
                .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("profit-margins")]
        public async Task<ActionResult<ProfitMarginSummaryDto>> GetProfitMargins(
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo,
            [FromQuery] int? month,
            [FromQuery] int? year,
            [FromQuery] string? costMethod = "lastPrice")
        {
            try
            {
                DateTime from;
                DateTime to;

                if (month.HasValue && month.Value > 0 && year.HasValue && year.Value > 0)
                {
                    from = new DateTime(year.Value, month.Value, 1);
                    to = from.AddMonths(1).AddTicks(-1);
                }
                else if (year.HasValue && year.Value > 0)
                {
                    from = new DateTime(year.Value, 1, 1);
                    to = new DateTime(year.Value, 12, 31, 23, 59, 59);
                }
                else if (!string.IsNullOrEmpty(dateFrom) || !string.IsNullOrEmpty(dateTo))
                {
                    from = DateTime.Today;
                    if (!string.IsNullOrEmpty(dateFrom) && DateTime.TryParse(dateFrom, out var pFrom))
                    {
                        from = pFrom.Date;
                    }

                    to = DateTime.Today.AddDays(1).AddTicks(-1);
                    if (!string.IsNullOrEmpty(dateTo) && DateTime.TryParse(dateTo, out var pTo))
                    {
                        to = pTo.Date.AddDays(1).AddTicks(-1);
                    }
                }
                else
                {
                    from = DateTime.Today;
                    to = DateTime.Today.AddDays(1).AddTicks(-1);
                }

                var salesQuery = _context.DocumentMerchandises
                    .Include(dm => dm.Document)
                    .Include(dm => dm.Merchandise)
                        .ThenInclude(m => m!.Articles)
                    .Where(dm => dm.Document!.IsDeleted == false
                                 && dm.Type == LineType.Merchandise
                                 && dm.Document.CreationDate >= from 
                                 && dm.Document.CreationDate <= to);

                salesQuery = salesQuery.Where(dm => 
                    dm.Document!.Type == DocumentTypes.customerInvoice 
                    || (dm.Document.Type == DocumentTypes.customerDeliveryNote && !dm.Document.IsInvoiced));

                var salesList = await salesQuery.ToListAsync();

                if (!salesList.Any())
                {
                    return Ok(new ProfitMarginSummaryDto());
                }

                var salesByArticle = salesList
                    .Where(dm => dm.Merchandise?.ArticleId != null && dm.Merchandise.ArticleId > 0)
                    .GroupBy(dm => dm.Merchandise!.ArticleId);

                var articleIds = salesByArticle.Select(g => g.Key).ToList();

                var purchaseTypes = new[] { DocumentTypes.supplierReceipt, DocumentTypes.supplierInvoice };

                var purchaseLinesQuery = _context.DocumentMerchandises
                    .Include(dm => dm.Document)
                    .Include(dm => dm.Merchandise)
                    .Where(dm => dm.Merchandise != null 
                                 && articleIds.Contains(dm.Merchandise.ArticleId)
                                 && dm.Document!.IsDeleted == false
                                 && dm.Type == LineType.Merchandise
                                 && dm.Document.Type.HasValue 
                                 && purchaseTypes.Contains(dm.Document.Type.Value));

                var purchaseLines = await purchaseLinesQuery.ToListAsync();

                var purchaseDocIds = purchaseLines.Select(l => l.DocumentId).Distinct().ToList();
                var relationships = await _context.DocumentDocumentRelationships
                    .Include(r => r.ChildDocument)
                    .Where(r => purchaseDocIds.Contains(r.ParentDocumentId) || purchaseDocIds.Contains(r.ChildDocumentId))
                    .ToListAsync();

                var filteredPurchaseLines = purchaseLines.Where(line =>
                {
                    if (line.Document?.Type == DocumentTypes.supplierInvoice)
                    {
                        bool hasLinkedReceipt = relationships.Any(r =>
                            r.ParentDocumentId == line.DocumentId &&
                            r.ChildDocument != null &&
                            r.ChildDocument.Type == DocumentTypes.supplierReceipt);

                        if (hasLinkedReceipt) return false;
                    }
                    return true;
                }).ToList();

                var purchasesByArticle = filteredPurchaseLines
                    .Where(l => l.Merchandise != null)
                    .GroupBy(l => l.Merchandise!.ArticleId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                var items = new List<ProfitMarginDto>();
                bool useCmp = string.Equals(costMethod, "cmp", StringComparison.OrdinalIgnoreCase);

                foreach (var group in salesByArticle)
                {
                    int artId = group.Key;
                    var sampleDm = group.First();
                    var article = sampleDm.Merchandise?.Articles;

                    double qtySold = group.Sum(x => x.Quantity);
                    if (qtySold <= 0) continue;

                    double totalSalesHTNet = group.Sum(dm => {
                        double discountPercent = dm.DiscountPercentage;
                        if (discountPercent <= 0.001 && dm.Document != null && dm.Document.TotalCostDiscountDoc > 0.001)
                        {
                            double totalGrossHT = dm.Document.TotalCostHTNetDoc + dm.Document.TotalCostDiscountDoc;
                            if (totalGrossHT > 0.001)
                            {
                                discountPercent = (dm.Document.TotalCostDiscountDoc / totalGrossHT) * 100.0;
                            }
                        }
                        double unitNetPrice = dm.UnitPriceHT * (1.0 - discountPercent / 100.0);
                        return unitNetPrice * dm.Quantity;
                    });

                    double avgSellingPriceHTNet = qtySold > 0 ? (totalSalesHTNet / qtySold) : 0;

                    double unitPurchasePriceHTNet = 0;

                    if (purchasesByArticle.TryGetValue(artId, out var pLines) && pLines.Any())
                    {
                        if (useCmp)
                        {
                            double totalPurchasedQty = pLines.Sum(l => l.Quantity);
                            if (totalPurchasedQty > 0)
                            {
                                unitPurchasePriceHTNet = pLines.Sum(l => l.CostNetHT > 0 ? l.CostNetHT : (l.UnitPriceHT * (1 - l.DiscountPercentage / 100.0) * l.Quantity)) / totalPurchasedQty;
                            }
                        }
                        else
                        {
                            var latestPurchase = pLines.OrderByDescending(l => l.Document?.CreationDate ?? DateTime.MinValue).First();
                            double latestNetCost = latestPurchase.CostNetHT > 0 
                                ? latestPurchase.CostNetHT 
                                : (latestPurchase.UnitPriceHT * (1 - latestPurchase.DiscountPercentage / 100.0) * latestPurchase.Quantity);
                            unitPurchasePriceHTNet = latestPurchase.Quantity > 0 ? (latestNetCost / latestPurchase.Quantity) : 0;
                        }
                    }

                    double totalPurchaseCostHTNet = unitPurchasePriceHTNet * qtySold;
                    double marginHT = totalSalesHTNet - totalPurchaseCostHTNet;
                    double marginPercentage = totalSalesHTNet > 0 ? ((marginHT / totalSalesHTNet) * 100.0) : 0;

                    items.Add(new ProfitMarginDto
                    {
                        ArticleId = artId,
                        ArticleReference = article?.Reference ?? "INCONNU",
                        ArticleDescription = article?.Description ?? sampleDm.Merchandise?.Description ?? string.Empty,
                        Unit = article?.Unit ?? "Pcs",
                        QuantitySold = Math.Round(qtySold, 3),
                        TotalSalesHTNet = Math.Round(totalSalesHTNet, 3),
                        AverageSellingPriceHTNet = Math.Round(avgSellingPriceHTNet, 3),
                        AveragePurchasePriceHTNet = Math.Round(unitPurchasePriceHTNet, 3),
                        TotalPurchaseCostHTNet = Math.Round(totalPurchaseCostHTNet, 3),
                        MarginHT = Math.Round(marginHT, 3),
                        MarginPercentage = Math.Round(marginPercentage, 2)
                    });
                }

                items = items.OrderByDescending(x => x.MarginHT).ToList();

                double grandTotalSales = Math.Round(items.Sum(x => x.TotalSalesHTNet), 3);
                double grandTotalPurchase = Math.Round(items.Sum(x => x.TotalPurchaseCostHTNet), 3);
                double grandTotalMargin = Math.Round(grandTotalSales - grandTotalPurchase, 3);
                double globalMarginPercent = grandTotalSales > 0 ? Math.Round((grandTotalMargin / grandTotalSales) * 100.0, 2) : 0;

                return Ok(new ProfitMarginSummaryDto
                {
                    TotalSalesHTNet = grandTotalSales,
                    TotalPurchaseCostHTNet = grandTotalPurchase,
                    TotalMarginHT = grandTotalMargin,
                    GlobalMarginPercentage = globalMarginPercent,
                    Items = items
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
