using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.infrastructure.Configurations.Audit;
using ms.webapp.api.acya.Services;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.common;
using System.Globalization;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.Services
{
    public class ImportService : IImportService
    {
        private readonly WoodAppContext _context;

        public ImportService(WoodAppContext context)
        {
            _context = context;
        }

        public async Task<ImportReportDto> ImportArticlesAsync(Stream fileStream, string fileName, int userId, int enterpriseId)
        {
            var report = new ImportReportDto();
            var extension = Path.GetExtension(fileName).ToLower();
            
            List<ArticleImportDto> items = new();

            try
            {
                if (extension == ".xlsx")
                {
                    items = ParseArticlesExcel(fileStream);
                }
                else if (extension == ".csv")
                {
                    items = ParseArticlesCsv(fileStream);
                }
                else
                {
                    report.Errors.Add(new ImportError { RowIndex = 0, Message = "Format de fichier non supporté. Utilisez .xlsx ou .csv" });
                    report.ErrorCount = report.Errors.Count;
                    return report;
                }
            }
            catch (Exception ex)
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Erreur lors de la lecture : {ex.Message}" });
                report.ErrorCount = report.Errors.Count;
                return report;
            }

            report.TotalRows = items.Count;

            string NormalizeString(string? s) => s?.Replace(" ", "")?.Replace("-", "")?.Replace("_", "")?.ToLower() ?? "";

            var parentsList = await _context.Parents.Where(x => x.Description != null).ToListAsync();
            var categories = parentsList.GroupBy(x => NormalizeString(x.Description)).ToDictionary(g => g.Key, g => g.First().Id);
            
            var childrenList = await _context.FirstChildren.Where(x => x.Description != null).ToListAsync();
            var subCategories = childrenList.GroupBy(x => NormalizeString(x.Description)).ToDictionary(g => g.Key, g => g.First().Id);
            
            var tvas = await _context.AppVariables.Where(x => x.Nature != null && x.Nature.ToLower() == "tva").ToListAsync();
            var dimensions = await _context.AppVariables.Where(x => x.Nature != null && x.Nature.ToLower() == "dimension").ToListAsync();

            int rowIndex = 1;
            foreach (var item in items)
            {
                rowIndex++;
                try
                {
                    var categoryKey = NormalizeString(item.CategoryName);
                    if (string.IsNullOrEmpty(categoryKey) || !categories.TryGetValue(categoryKey, out int categoryId))
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Catégorie inconnue : {item.CategoryName}" });
                        continue;
                    }

                    var subCategoryKey = NormalizeString(item.SubCategoryName);
                    if (string.IsNullOrEmpty(subCategoryKey) || !subCategories.TryGetValue(subCategoryKey, out int subCategoryId))
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Sous-catégorie inconnue : {item.SubCategoryName}" });
                        continue;
                    }

                    // Fix percentage if stored as decimal (e.g., 0.19 instead of 19)
                    var normalizedTva = item.TvaRate > 0 && item.TvaRate < 1 ? Math.Round(item.TvaRate * 100, 2) : item.TvaRate;

                    var tva = tvas.FirstOrDefault(x => x.Value == normalizedTva);
                    if (tva == null)
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Taux TVA '{item.TvaRate}' non configuré." });
                        continue;
                    }

                    int? thicknessId = null;
                    if (!string.IsNullOrEmpty(item.Thickness))
                    {
                        thicknessId = dimensions.FirstOrDefault(x => x.Name == item.Thickness)?.Id;
                    }

                    int? widthId = null;
                    if (!string.IsNullOrEmpty(item.Width))
                    {
                        widthId = dimensions.FirstOrDefault(x => x.Name == item.Width)?.Id;
                    }

                    var article = await _context.Articles.FirstOrDefaultAsync(x => x.Reference == item.Reference && !x.IsDeleted);
                    bool isNew = false;
                    
                    if (article == null)
                    {
                        article = new Article
                        {
                            Reference = item.Reference,
                            CreationDate = DateTime.UtcNow,
                            IsDeleted = false
                        };
                        _context.Articles.Add(article);
                        isNew = true;
                    }

                    article.Description = item.Description;
                    article.IsWood = item.IsWood;
                    article.ParentId = categoryId;
                    article.FirstChildId = subCategoryId;
                    article.TvaId = tva.Id;
                    article.ThicknessId = thicknessId;
                    article.WidthId = widthId;
                    article.Unit = item.Unit;
                    article.SellPriceHT = item.SellPriceHT;
                    var normalizedArticleTva = item.TvaRate > 0 && item.TvaRate < 1 ? Math.Round(item.TvaRate * 100, 2) : item.TvaRate;
                    article.SellPriceTTC = item.SellPriceHT * (1 + normalizedArticleTva / 100.0);
                    article.LastPurchasePriceTTC = item.LastPurchasePriceTTC;
                    article.MinQuantity = item.MinQuantity;
                    article.Lengths = item.Lengths;
                    article.ProfitMarginPercentage = item.ProfitMarginPercentage;
                    article.UpdateDate = DateTime.UtcNow;
                    article.UpdatedBy = userId;

                    await _context.SaveChangesAsync();

                    if (article.SellPriceTTC > 0)
                    {
                        var sellHistory = new SellPriceHistory
                        {
                            ArticleId = article.Id,
                            PriceValue = article.SellPriceTTC ?? 0,
                            CreationDate = isNew ? article.CreationDate : DateTime.UtcNow,
                            UpdateDate = isNew ? article.UpdateDate : DateTime.UtcNow,
                            IsDeleted = false,
                            UpdatedBy = userId
                        };
                        _context.SellPricesHistories.Add(sellHistory);

                        if (isNew)
                        {
                            await _context.SaveChangesAsync();
                            article.SellHistoryId = sellHistory.Id;
                        }
                    }

                    if (item.LastPurchasePriceTTC > 0 && isNew)
                    {
                        var purchaseHistory = new PurchasePriceHistory
                        {
                            ArticleId = article.Id,
                            PriceValue = item.LastPurchasePriceTTC,
                            CreationDate = article.CreationDate,
                            UpdateDate = article.UpdateDate,
                            IsDeleted = false,
                            UpdatedById = userId
                        };
                        _context.PurchasePriceHistories.Add(purchaseHistory);
                    }

                    await _context.SaveChangesAsync();

                    report.SuccessCount++;
                }
                catch (Exception ex)
                {
                    report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Erreur : {ex.Message}" });
                }
            }
            report.ErrorCount = report.Errors.Count;
            return report;
        }

        public async Task<ImportReportDto> ImportCounterPartsAsync(Stream fileStream, string fileName, string type, int userId, int enterpriseId)
        {
            var report = new ImportReportDto();
            var extension = Path.GetExtension(fileName).ToLower();
            List<CounterPartImportDto> items = new();

            try
            {
                if (extension == ".xlsx")
                {
                    items = ParseCounterPartsExcel(fileStream);
                }
                else if (extension == ".csv")
                {
                    items = ParseCounterPartsCsv(fileStream);
                }
                else
                {
                    report.Errors.Add(new ImportError { RowIndex = 0, Message = "Format non supporté." });
                    report.ErrorCount = report.Errors.Count;
                    return report;
                }
            }
            catch (Exception ex)
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Erreur : {ex.Message}" });
                report.ErrorCount = report.Errors.Count;
                return report;
            }

            report.TotalRows = items.Count;
            if (!Enum.TryParse<CounterPartType>(type, true, out var cpType))
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Type de contrepartie '{type}' invalide." });
                report.ErrorCount = report.Errors.Count;
                return report;
            }

            int rowIndex = 1;
            foreach (var item in items)
            {
                rowIndex++;
                try
                {
                    CounterPart cp = null;

                    if (!string.IsNullOrEmpty(item.TaxRegistrationNumber))
                        cp = await _context.CounterParts.FirstOrDefaultAsync(x => x.Type == cpType && x.IsDeleted != true && x.TaxRegistrationNumber == item.TaxRegistrationNumber);

                    if (cp == null && !string.IsNullOrEmpty(item.IdentityCardNumber))
                        cp = await _context.CounterParts.FirstOrDefaultAsync(x => x.Type == cpType && x.IsDeleted != true && x.IdentityCardNumber == item.IdentityCardNumber);

                    if (cp == null && !string.IsNullOrEmpty(item.Name))
                        cp = await _context.CounterParts.FirstOrDefaultAsync(x => x.Type == cpType && x.IsDeleted != true && x.Name == item.Name);

                    if (cp == null && !string.IsNullOrEmpty(item.FirstName) && !string.IsNullOrEmpty(item.LastName))
                        cp = await _context.CounterParts.FirstOrDefaultAsync(x => x.Type == cpType && x.IsDeleted != true && x.FirstName == item.FirstName && x.LastName == item.LastName);

                    if (cp == null)
                    {
                        cp = new CounterPart
                        {
                            Guid = Guid.NewGuid(),
                            Type = cpType,
                            CreationDate = DateTime.UtcNow,
                            IsActive = true,
                            IsDeleted = false
                        };
                        _context.CounterParts.Add(cp);
                    }

                    cp.Name = item.Name;
                    cp.FirstName = item.FirstName;
                    cp.LastName = item.LastName;
                    cp.Email = item.Email;
                    cp.TaxRegistrationNumber = item.TaxRegistrationNumber;
                    cp.IdentityCardNumber = item.IdentityCardNumber;
                    cp.Address = item.Address;
                    cp.Gouvernorate = item.Gouvernorate;
                    cp.PhoneNumberOne = item.PhoneNumberOne;
                    cp.PhoneNumberTwo = item.PhoneNumberTwo;
                    cp.JobTitle = item.JobTitle;
                    cp.Notes = item.Notes;
                    cp.UpdateDate = DateTime.UtcNow;
                    cp.UpdatedById = userId;

                    report.SuccessCount++;
                }
                catch (Exception ex)
                {
                    report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Erreur : {ex.Message}" });
                }
            }

            await _context.SaveChangesAsync();
            report.ErrorCount = report.Errors.Count;
            return report;
        }

        private string GetSafeString(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty()) return "";
            return cell.GetString()?.Trim() ?? "";
        }

        private double GetSafeDouble(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty()) return 0;

            if (cell.TryGetValue<double>(out var dValue))
            {
                return dValue;
            }

            var strVal = cell.GetString()?.Trim() ?? "";
            if (string.IsNullOrEmpty(strVal)) return 0;

            if (strVal.EndsWith("%"))
            {
                strVal = strVal.Substring(0, strVal.Length - 1).Trim();
            }

            strVal = strVal.Replace(',', '.');

            if (double.TryParse(strVal, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }

            return 0;
        }

        private List<ArticleImportDto> ParseArticlesExcel(Stream stream)
        {
            var list = new List<ArticleImportDto>();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1);
            var rows = worksheet.RangeUsed()!.RowsUsed().Skip(1);

            foreach (var row in rows)
            {
                list.Add(new ArticleImportDto
                {
                    Reference = row.Cell(1).GetString(),
                    Description = row.Cell(2).GetString(),
                    CategoryName = row.Cell(3).GetString(),
                    SubCategoryName = row.Cell(4).GetString(),
                    IsWood = row.Cell(5).GetString()?.ToUpper() == "O",
                    Thickness = row.Cell(6).GetString(),
                    Width = row.Cell(7).GetString(),
                    Lengths = row.Cell(8).GetString(),
                    Unit = row.Cell(9).GetString(),
                    SellPriceHT = GetSafeDouble(row.Cell(10)),
                    TvaRate = GetSafeDouble(row.Cell(11)),
                    ProfitMarginPercentage = GetSafeDouble(row.Cell(13)),
                    LastPurchasePriceTTC = GetSafeDouble(row.Cell(14)),
                    MinQuantity = GetSafeDouble(row.Cell(15))
                });
            }
            return list;
        }

        private List<ArticleImportDto> ParseArticlesCsv(Stream stream)
        {
            using var reader = new StreamReader(stream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true });
            return csv.GetRecords<ArticleImportDto>().ToList();
        }

        private List<CounterPartImportDto> ParseCounterPartsExcel(Stream stream)
        {
            var list = new List<CounterPartImportDto>();
            using var workbook = new XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1);
            var rows = worksheet.RangeUsed()!.RowsUsed().Skip(1);

            foreach (var row in rows)
            {
                list.Add(new CounterPartImportDto
                {
                    Name = row.Cell(1).GetString(),
                    FirstName = row.Cell(2).GetString(),
                    LastName = row.Cell(3).GetString(),
                    Email = row.Cell(4).GetString(),
                    TaxRegistrationNumber = row.Cell(5).GetString(),
                    IdentityCardNumber = row.Cell(6).GetString(),
                    Address = row.Cell(7).GetString(),
                    Gouvernorate = row.Cell(8).GetString(),
                    PhoneNumberOne = row.Cell(9).GetString(),
                    PhoneNumberTwo = row.Cell(10).GetString(),
                    JobTitle = row.Cell(11).GetString(),
                    Notes = row.Cell(12).GetString()
                });
            }
            return list;
        }

        private List<CounterPartImportDto> ParseCounterPartsCsv(Stream stream)
        {
            using var reader = new StreamReader(stream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true });
            return csv.GetRecords<CounterPartImportDto>().ToList();
        }

        public async Task<ImportReportDto> ImportSettingsAsync(Stream fileStream, string fileName)
        {
            var report = new ImportReportDto { TotalRows = 0, SuccessCount = 0, ErrorCount = 0, Errors = new List<ImportError>() };

            if (!fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = "Format de fichier non supporté. Utilisez .xlsx" });
                report.ErrorCount = report.Errors.Count;
                return report;
            }

            try
            {
                using var workbook = new XLWorkbook(fileStream);

                // Import Taxes
                if (workbook.TryGetWorksheet("Taxes", out var wsTaxes))
                {
                    var rows = wsTaxes.RowsUsed().Skip(1); // skip header
                    foreach (var row in rows)
                    {
                        string nature = GetSafeString(row.Cell(1));
                        string name = GetSafeString(row.Cell(2));
                        double value = GetSafeDouble(row.Cell(3));

                        if (string.IsNullOrEmpty(nature) || string.IsNullOrEmpty(name)) continue;

                        var existing = await _context.AppVariables.FirstOrDefaultAsync(x => x.Nature == nature && x.Name == name);
                        if (existing != null)
                        {
                            existing.Value = value;
                            _context.AppVariables.Update(existing);
                        }
                        else
                        {
                            _context.AppVariables.Add(new AppVariable { Nature = nature, Name = name, Value = value, isActive = true, isDefault = false, isEditable = true, isDeleted = false });
                        }
                        report.SuccessCount++;
                    }
                }

                // Import Dimensions
                if (workbook.TryGetWorksheet("Dimensions", out var wsDimensions))
                {
                    var rows = wsDimensions.RowsUsed().Skip(1);
                    foreach (var row in rows)
                    {
                        string nature = GetSafeString(row.Cell(1));
                        string name = GetSafeString(row.Cell(2));
                        double value = GetSafeDouble(row.Cell(3));

                        if (string.IsNullOrEmpty(nature) || string.IsNullOrEmpty(name)) continue;

                        var existing = await _context.AppVariables.FirstOrDefaultAsync(x => x.Nature == nature && x.Name == name);
                        if (existing != null)
                        {
                            existing.Value = value;
                            _context.AppVariables.Update(existing);
                        }
                        else
                        {
                            _context.AppVariables.Add(new AppVariable { Nature = nature, Name = name, Value = value, isActive = true, isDefault = false, isEditable = true, isDeleted = false });
                        }
                        report.SuccessCount++;
                    }
                }

                // Import Categories
                if (workbook.TryGetWorksheet("Catégories", out var wsCategories))
                {
                    var rows = wsCategories.RowsUsed().Skip(1);
                    foreach (var row in rows)
                    {
                        string reference = GetSafeString(row.Cell(1));
                        string description = GetSafeString(row.Cell(2));

                        if (string.IsNullOrEmpty(description)) continue;

                        var existing = await _context.Parents.FirstOrDefaultAsync(x => x.Description == description);
                        if (existing != null)
                        {
                            existing.Reference = reference;
                            _context.Parents.Update(existing);
                        }
                        else
                        {
                            _context.Parents.Add(new Parent { 
                                Reference = reference, 
                                Description = description,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow,
                                IsDeleted = false
                            });
                        }
                        report.SuccessCount++;
                    }
                }
                
                await _context.SaveChangesAsync(); // save parents to get their IDs for subcategories

                // Import SubCategories
                if (workbook.TryGetWorksheet("Sous-catégories", out var wsSubCategories))
                {
                    var parents = await _context.Parents.ToListAsync();
                    var rows = wsSubCategories.RowsUsed().Skip(1);
                    foreach (var row in rows)
                    {
                        string parentDescription = GetSafeString(row.Cell(1));
                        string reference = GetSafeString(row.Cell(2));
                        string description = GetSafeString(row.Cell(3));

                        if (string.IsNullOrEmpty(description) || string.IsNullOrEmpty(parentDescription)) continue;

                        var parent = parents.FirstOrDefault(p => p.Description == parentDescription);
                        if (parent == null)
                        {
                            report.Errors.Add(new ImportError { RowIndex = row.RowNumber(), Message = $"Catégorie parente introuvable : {parentDescription}" });
                            continue;
                        }

                        var existing = await _context.FirstChildren.FirstOrDefaultAsync(x => x.Description == description && x.IdParent == parent.Id);
                        if (existing != null)
                        {
                            existing.Reference = reference;
                            _context.FirstChildren.Update(existing);
                        }
                        else
                        {
                            _context.FirstChildren.Add(new FirstChild { 
                                Reference = reference, 
                                Description = description, 
                                IdParent = parent.Id,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow,
                                IsDeleted = false
                            });
                        }
                        report.SuccessCount++;
                    }
                }

                // Import Transporters
                if (workbook.TryGetWorksheet("Transporteurs", out var wsTransporters))
                {
                    var rows = wsTransporters.RowsUsed().Skip(1);
                    foreach (var row in rows)
                    {
                        string firstName = GetSafeString(row.Cell(1));
                        string lastName = GetSafeString(row.Cell(2));

                        if (string.IsNullOrEmpty(firstName) && string.IsNullOrEmpty(lastName)) continue;

                        var existing = await _context.Transporters.FirstOrDefaultAsync(x => x.FirstName == firstName && x.LastName == lastName);
                        if (existing == null)
                        {
                            _context.Transporters.Add(new Transporter { FirstName = firstName, LastName = lastName, FullName = $"{firstName} {lastName}".Trim() });
                        }
                        report.SuccessCount++;
                    }
                }

                // Import Banks
                if (workbook.TryGetWorksheet("Banques", out var wsBanks))
                {
                    var rows = wsBanks.RowsUsed().Skip(1);
                    foreach (var row in rows)
                    {
                        string designation = GetSafeString(row.Cell(1));
                        string rib = GetSafeString(row.Cell(2));

                        if (string.IsNullOrEmpty(designation)) continue;

                        var existing = await _context.Banks.FirstOrDefaultAsync(x => x.Designation == designation);
                        if (existing != null)
                        {
                            existing.Rib = rib;
                            _context.Banks.Update(existing);
                        }
                        else
                        {
                            _context.Banks.Add(new Bank { Designation = designation, Rib = rib });
                        }
                        report.SuccessCount++;
                    }
                }

                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Erreur lors de la lecture : {ex.Message}" });
            }

            report.ErrorCount = report.Errors.Count;
            return report;
        }
    }
}
