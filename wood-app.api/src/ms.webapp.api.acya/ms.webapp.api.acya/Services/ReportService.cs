using System.Data;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.DTOs.Reports;
using ms.webapp.api.acya.infrastructure;
using System.Globalization;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.Services
{
    public interface IReportService
    {
        Task<byte[]> ExportReportAsync(string type, string format, DateTime? startDate, DateTime? endDate, int? salesSiteId);
    }

    public class ReportService : IReportService
    {
        private readonly WoodAppContext _context;

        public ReportService(WoodAppContext context)
        {
            _context = context;
        }

        public async Task<byte[]> ExportReportAsync(string type, string format, DateTime? startDate, DateTime? endDate, int? salesSiteId)
        {
            object data = type.ToLower() switch
            {
                "sales" => await GetSalesReportData(startDate, endDate, salesSiteId),
                "profitability" => await GetProfitabilityReportData(startDate, endDate, salesSiteId),
                "stock" => await GetStockReportData(salesSiteId),
                "settings" => await GetSettingsReportData(),
                _ => throw new ArgumentException("Invalid report type")
            };

            return format.ToLower() switch
            {
                "xlsx" => GenerateExcel(data),
                "csv" => GenerateCsv(data),
                _ => throw new ArgumentException("Invalid format")
            };
        }

        private async Task<List<SalesReportRow>> GetSalesReportData(DateTime? start, DateTime? end, int? siteId)
        {
            var query = _context.DocumentMerchandises
                .Include(l => l.Document)
                .ThenInclude(d => d!.CounterPart)
                .Include(l => l.Merchandise)
                .ThenInclude(m => m!.Articles)
                .Include(l => l.Document!.SalesSite)
                .Where(l => l.Document!.Type == DocumentTypes.customerInvoice || l.Document.Type == DocumentTypes.customerDeliveryNote)
                .Where(l => !l.Document!.IsDeleted);

            if (start.HasValue) query = query.Where(l => l.Document!.CreationDate >= start.Value);
            if (end.HasValue) query = query.Where(l => l.Document!.CreationDate <= end.Value);
            if (siteId.HasValue) query = query.Where(l => l.Document!.SalesSiteId == siteId.Value);

            return await query.Select(l => new SalesReportRow
            {
                DocumentReference = l.Document!.DocNumber ?? "",
                Date = l.Document!.CreationDate ?? DateTime.MinValue,
                ClientName = l.Document!.CounterPart != null ? (l.Document!.CounterPart!.Name ?? l.Document!.CounterPart!.Fullname!) : "",
                ArticleReference = l.Merchandise!.Articles!.Reference ?? "",
                ArticleDescription = l.Merchandise!.Articles!.Description ?? "",
                Quantity = l.Quantity,
                UnitPriceHT = l.UnitPriceHT,
                Discount = l.DiscountPercentage,
                TotalHT = l.Quantity * l.UnitPriceHT * (1 - l.DiscountPercentage / 100),
                SalesSite = l.Document.SalesSite != null ? l.Document.SalesSite.Address ?? "" : ""
            }).OrderByDescending(r => r.Date).ToListAsync();
        }

        private async Task<List<ProfitabilityReportRow>> GetProfitabilityReportData(DateTime? start, DateTime? end, int? siteId)
        {
            var query = _context.DocumentMerchandises
                .Include(l => l.Document)
                .Include(l => l.Merchandise)
                .ThenInclude(m => m!.Articles)
                .Where(l => l.Document!.Type == DocumentTypes.customerInvoice || l.Document.Type == DocumentTypes.customerDeliveryNote)
                .Where(l => !l.Document!.IsDeleted);

            if (start.HasValue) query = query.Where(l => l.Document!.CreationDate >= start.Value);
            if (end.HasValue) query = query.Where(l => l.Document!.CreationDate <= end.Value);
            if (siteId.HasValue) query = query.Where(l => l.Document!.SalesSiteId == siteId.Value);

            var grouped = await query.GroupBy(l => new { l.Merchandise!.ArticleId, l.Merchandise.Articles!.Reference, l.Merchandise.Articles.Description, l.Merchandise.Articles.LastPurchasePriceTTC })
                .Select(g => new
                {
                    g.Key.Reference,
                    g.Key.Description,
                    g.Key.LastPurchasePriceTTC,
                    TotalQty = g.Sum(l => l.Quantity),
                    TotalSalesHT = g.Sum(l => l.Quantity * l.UnitPriceHT * (1 - l.DiscountPercentage / 100))
                }).ToListAsync();

            return grouped.Select(g => {
                double costHT = g.LastPurchasePriceTTC / 1.19; 
                double totalCostHT = g.TotalQty * costHT;
                double margin = g.TotalSalesHT - totalCostHT;
                
                return new ProfitabilityReportRow
                {
                    ArticleReference = g.Reference ?? "",
                    ArticleDescription = g.Description ?? "",
                    QuantitySold = g.TotalQty,
                    TotalSalesHT = g.TotalSalesHT,
                    LastPurchasePriceTTC = g.LastPurchasePriceTTC,
                    EstimatedCostHT = totalCostHT,
                    MarginHT = margin,
                    MarginPercentage = g.TotalSalesHT > 0 ? (margin / g.TotalSalesHT) * 100 : 0
                };
            }).ToList();
        }

        private async Task<List<StockReportRow>> GetStockReportData(int? siteId)
        {
            var query = _context.Stocks
                .Include(s => s.Merchandises)
                .ThenInclude(m => m!.Articles)
                .ThenInclude(a => a!.Parents)
                .Where(s => !s.Merchandises!.Articles!.IsDeleted);

            if (siteId.HasValue) query = query.Where(s => s.SalesSiteId == siteId.Value);

            return await query.Select(s => new StockReportRow
            {
                Reference = s.Merchandises!.Articles!.Reference ?? "",
                Description = s.Merchandises.Articles.Description ?? "",
                Category = s.Merchandises.Articles.Parents != null ? s.Merchandises.Articles.Parents.Reference ?? "" : "",
                CurrentStock = s.Quantity,
                MinStock = s.Merchandises.Articles.MinQuantity ?? 0,
                Unit = s.Merchandises.Articles.Unit ?? "",
                IsAlert = s.Quantity <= (s.Merchandises.Articles.MinQuantity ?? 0)
            }).OrderBy(r => r.Category).ToListAsync();
        }

        private async Task<SettingsExportData> GetSettingsReportData()
        {
            var data = new SettingsExportData();
            
            var vars = await _context.AppVariables.ToListAsync();
            data.Taxes = vars.Where(v => v.Nature != null && (v.Nature.ToLower() == "tva" || v.Nature.ToLower() == "taxe" || v.Nature.ToLower() == "rs"))
                .Select(v => new AppVariableExportRow { Nature = v.Nature ?? "", Name = v.Name ?? "", Value = v.Value ?? 0 })
                .OrderBy(v => v.Nature).ToList();

            data.Dimensions = vars.Where(v => v.Nature != null && (v.Nature.ToLower() == "thickness" || v.Nature.ToLower() == "width" || v.Nature.ToLower() == "length" || v.Nature.ToLower() == "dimension"))
                .Select(v => new AppVariableExportRow { Nature = v.Nature ?? "", Name = v.Name ?? "", Value = v.Value ?? 0 })
                .OrderBy(v => v.Nature).ToList();

            var parents = await _context.Parents.ToListAsync();
            data.Categories = parents.Select(p => new CategoryExportRow { Reference = p.Reference ?? "", Description = p.Description ?? "" }).ToList();

            var children = await _context.FirstChildren.Include(c => c.Parents).ToListAsync();
            data.SubCategories = children.Select(c => new SubCategoryExportRow { 
                Category = c.Parents?.Description ?? "", 
                Reference = c.Reference ?? "", 
                Description = c.Description ?? "" 
            }).ToList();

            var transporters = await _context.Transporters.ToListAsync();
            data.Transporters = transporters.Select(t => new TransporterExportRow { FirstName = t.FirstName ?? "", LastName = t.LastName ?? "" }).ToList();

            var banks = await _context.Banks.ToListAsync();
            data.Banks = banks.Select(b => new BankExportRow { Designation = b.Designation ?? "", Rib = b.Rib ?? "" }).ToList();

            return data;
        }

        private byte[] GenerateExcel(object data)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Report");
            
            bool inserted = false;
            if (data is SettingsExportData settings)
            {
                worksheet.Name = "Taxes";
                if (settings.Taxes.Any()) worksheet.Cell(1, 1).InsertTable(settings.Taxes);
                worksheet.Columns().AdjustToContents();

                var wsDimensions = workbook.Worksheets.Add("Dimensions");
                if (settings.Dimensions.Any()) wsDimensions.Cell(1, 1).InsertTable(settings.Dimensions);
                wsDimensions.Columns().AdjustToContents();

                var wsCategories = workbook.Worksheets.Add("Catégories");
                if (settings.Categories.Any()) wsCategories.Cell(1, 1).InsertTable(settings.Categories);
                wsCategories.Columns().AdjustToContents();

                var wsSubCategories = workbook.Worksheets.Add("Sous-catégories");
                if (settings.SubCategories.Any()) wsSubCategories.Cell(1, 1).InsertTable(settings.SubCategories);
                wsSubCategories.Columns().AdjustToContents();

                var wsTransporters = workbook.Worksheets.Add("Transporteurs");
                if (settings.Transporters.Any()) wsTransporters.Cell(1, 1).InsertTable(settings.Transporters);
                wsTransporters.Columns().AdjustToContents();

                var wsBanks = workbook.Worksheets.Add("Banques");
                if (settings.Banks.Any()) wsBanks.Cell(1, 1).InsertTable(settings.Banks);
                wsBanks.Columns().AdjustToContents();
                
                foreach (var ws in workbook.Worksheets)
                {
                    var headerRow = ws.Row(1);
                    headerRow.Style.Font.Bold = true;
                    headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#3f51b5");
                    headerRow.Style.Font.FontColor = XLColor.White;
                }
            }
            else
            {
                if (data is List<SalesReportRow> sales) { worksheet.Cell(1, 1).InsertTable(sales); inserted = true; }
                else if (data is List<ProfitabilityReportRow> profit) { worksheet.Cell(1, 1).InsertTable(profit); inserted = true; }
                else if (data is List<StockReportRow> stock) { worksheet.Cell(1, 1).InsertTable(stock); inserted = true; }

                if (inserted)
                {
                    worksheet.Columns().AdjustToContents();
                    var headerRow = worksheet.Row(1);
                    headerRow.Style.Font.Bold = true;
                    headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#3f51b5");
                    headerRow.Style.Font.FontColor = XLColor.White;
                }
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private byte[] GenerateCsv(object data)
        {
            using var stream = new MemoryStream();
            using (var writer = new StreamWriter(stream))
            using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                if (data is System.Collections.IEnumerable list)
                {
                    csv.WriteRecords(list);
                }
                writer.Flush();
            }
            return stream.ToArray();
        }
    }
}
