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
using System.Text;
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

        private static string RemoveAccents(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";
            text = text.Trim().Replace("\u00A0", " ");
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();
            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static string NormalizeString(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return "";
            var unaccented = RemoveAccents(s);
            return new string(unaccented.Where(c => char.IsLetterOrDigit(c)).ToArray()).ToLowerInvariant();
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

            var parentsList = await _context.Parents.Where(x => x.Description != null).ToListAsync();
            var categories = parentsList.GroupBy(x => NormalizeString(x.Description)).ToDictionary(g => g.Key, g => g.First().Id);
            
            var childrenList = await _context.FirstChildren.Where(x => x.Description != null).ToListAsync();
            var subCategories = childrenList.GroupBy(x => NormalizeString(x.Description)).ToDictionary(g => g.Key, g => g.First().Id);
            
            var tvas = await _context.AppVariables.Where(x => x.Nature != null && x.Nature.ToLower() == "tva").ToListAsync();
            var dimensions = await _context.AppVariables
                .Where(x => x.Nature != null && (
                    x.Nature.ToLower() == "dimension" || 
                    x.Nature.ToLower() == "thickness" || 
                    x.Nature.ToLower() == "width" || 
                    x.Nature.ToLower() == "length" ||
                    x.Nature.ToLower() == "epaisseur" ||
                    x.Nature.ToLower() == "largeur"))
                .ToListAsync();

            int rowIndex = 1;
            foreach (var item in items)
            {
                rowIndex++;
                try
                {
                    int categoryId;
                    var categoryKey = NormalizeString(item.CategoryName);
                    if (string.IsNullOrEmpty(categoryKey))
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = "Catégorie non spécifiée." });
                        continue;
                    }

                    if (!categories.TryGetValue(categoryKey, out categoryId))
                    {
                        var existingParent = parentsList.FirstOrDefault(p => 
                            NormalizeString(p.Reference) == categoryKey || 
                            NormalizeString(p.Description).Contains(categoryKey) || 
                            categoryKey.Contains(NormalizeString(p.Description)));

                        if (existingParent != null)
                        {
                            categoryId = existingParent.Id;
                            categories[categoryKey] = categoryId;
                        }
                        else
                        {
                            var newParent = new Parent
                            {
                                Reference = item.CategoryName.Length > 10 ? item.CategoryName.Substring(0, 10).ToUpper() : item.CategoryName.ToUpper(),
                                Description = item.CategoryName,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow,
                                IsDeleted = false
                            };
                            _context.Parents.Add(newParent);
                            await _context.SaveChangesAsync();
                            categoryId = newParent.Id;
                            parentsList.Add(newParent);
                            categories[categoryKey] = categoryId;
                        }
                    }

                    int subCategoryId;
                    var subCategoryKey = NormalizeString(item.SubCategoryName);
                    if (string.IsNullOrEmpty(subCategoryKey))
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = "Sous-catégorie non spécifiée." });
                        continue;
                    }

                    if (!subCategories.TryGetValue(subCategoryKey, out subCategoryId))
                    {
                        var existingChild = childrenList.FirstOrDefault(c => 
                            (c.IdParent == categoryId || c.IdParent == 0) && (
                                NormalizeString(c.Reference) == subCategoryKey || 
                                NormalizeString(c.Description).Replace("plq", "plaque").Replace("hgs", "hgss") == subCategoryKey.Replace("plq", "plaque").Replace("hgs", "hgss") ||
                                NormalizeString(c.Description).Contains(subCategoryKey) || 
                                subCategoryKey.Contains(NormalizeString(c.Description))
                            ));

                        if (existingChild == null)
                        {
                            existingChild = childrenList.FirstOrDefault(c => 
                                NormalizeString(c.Description).Replace("plq", "plaque").Replace("hgs", "hgss") == subCategoryKey.Replace("plq", "plaque").Replace("hgs", "hgss"));
                        }

                        if (existingChild != null)
                        {
                            subCategoryId = existingChild.Id;
                            subCategories[subCategoryKey] = subCategoryId;
                        }
                        else
                        {
                            var newChild = new FirstChild
                            {
                                IdParent = categoryId,
                                Reference = item.SubCategoryName.Length > 10 ? item.SubCategoryName.Substring(0, 10).ToUpper() : item.SubCategoryName.ToUpper(),
                                Description = item.SubCategoryName,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow,
                                IsDeleted = false
                            };
                            _context.FirstChildren.Add(newChild);
                            await _context.SaveChangesAsync();
                            subCategoryId = newChild.Id;
                            childrenList.Add(newChild);
                            subCategories[subCategoryKey] = subCategoryId;
                        }
                    }

                    // Fix percentage if stored as decimal (e.g., 0.19 instead of 19)
                    var normalizedTva = item.TvaRate > 0 && item.TvaRate < 1 ? Math.Round(item.TvaRate * 100, 2) : item.TvaRate;

                    var tva = tvas.FirstOrDefault(x => 
                        Math.Abs((x.Value ?? 0) - normalizedTva) < 0.01 || 
                        Math.Abs((x.Value ?? 0) * 100 - normalizedTva) < 0.01 ||
                        Math.Abs((x.Value ?? 0) - normalizedTva / 100.0) < 0.0001
                    ) ?? tvas.FirstOrDefault(x => x.isDefault == true) ?? tvas.FirstOrDefault();

                    if (tva == null)
                    {
                        tva = new AppVariable
                        {
                            Nature = "TVA",
                            Name = $"TVA {(normalizedTva > 0 ? normalizedTva : 19)}%",
                            Value = normalizedTva > 0 ? normalizedTva : 19,
                            isActive = true,
                            isDefault = true,
                            isEditable = true,
                            isDeleted = false
                        };
                        _context.AppVariables.Add(tva);
                        await _context.SaveChangesAsync();
                        tvas.Add(tva);
                    }

                    int? thicknessId = null;
                    if (!string.IsNullOrEmpty(item.Thickness))
                    {
                        var normThickness = NormalizeString(item.Thickness);
                        thicknessId = dimensions.FirstOrDefault(x => NormalizeString(x.Name) == normThickness || NormalizeString(x.Value?.ToString()) == normThickness)?.Id;
                    }

                    int? widthId = null;
                    if (!string.IsNullOrEmpty(item.Width))
                    {
                        var normWidth = NormalizeString(item.Width);
                        widthId = dimensions.FirstOrDefault(x => NormalizeString(x.Name) == normWidth || NormalizeString(x.Value?.ToString()) == normWidth)?.Id;
                    }

                    if (string.IsNullOrWhiteSpace(item.Reference))
                    {
                        item.Reference = $"ART-{rowIndex}-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()}";
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
                    article.SellPriceTTC = item.SellPriceHT * (1 + (normalizedArticleTva > 0 ? normalizedArticleTva : (tva.Value ?? 0)) / 100.0);
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
                    CounterPart? cp = null;

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

                    cp.Prefix = !string.IsNullOrEmpty(item.Prefix) ? item.Prefix : cp.Prefix;
                    cp.Name = item.Name;
                    cp.Description = item.Description;
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

                    // Ensure numeric fields are initialized to 0 to prevent UI crashes
                    cp.OpeningBalance ??= 0;
                    cp.MaximumDiscount ??= 0;
                    cp.MaximumSalesBar ??= 0;

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

            if (double.TryParse(strVal, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
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
            
            var firstRow = worksheet.Row(1);
            int lastCol = firstRow.LastCellUsed()?.Address.ColumnNumber ?? 15;

            int colRef = 1, colDesc = 2, colCat = 3, colSubCat = 4, colIsWood = 5;
            int colThickness = 6, colWidth = 7, colLengths = 8, colUnit = 9, colSellPriceHT = 10;
            int colTva = 11, colMargin = 13, colPurchasePrice = 14, colMinQty = 15;

            for (int c = 1; c <= lastCol; c++)
            {
                var header = NormalizeString(firstRow.Cell(c).GetString());
                if (header.Contains("ref")) { colRef = c; }
                else if (header.Contains("designation") || header.Contains("description")) { colDesc = c; }
                else if (header.Contains("souscat")) { colSubCat = c; }
                else if (header == "categorie" || header == "category") { colCat = c; }
                else if (header.Contains("estbois") || header.Contains("iswood")) { colIsWood = c; }
                else if (header.Contains("epaisseur") || header.Contains("thickness")) { colThickness = c; }
                else if (header.Contains("largeur") || header.Contains("width")) { colWidth = c; }
                else if (header.Contains("longueur") || header.Contains("length")) { colLengths = c; }
                else if (header.Contains("unite") || header.Contains("unit")) { colUnit = c; }
                else if (header.Contains("puht") || header.Contains("sellprice")) { colSellPriceHT = c; }
                else if (header.Contains("tva")) { colTva = c; }
                else if (header.Contains("marge") || header.Contains("profit")) { colMargin = c; }
                else if (header.Contains("achat") || header.Contains("purchase")) { colPurchasePrice = c; }
                else if (header.Contains("seuil") || header.Contains("alerte") || header.Contains("minqty") || header.Contains("minquantity")) { colMinQty = c; }
            }

            var rows = worksheet.RangeUsed()!.RowsUsed().Skip(1);

            foreach (var row in rows)
            {
                var isWoodStr = GetSafeString(row.Cell(colIsWood)).ToUpper();
                list.Add(new ArticleImportDto
                {
                    Reference = GetSafeString(row.Cell(colRef)),
                    Description = GetSafeString(row.Cell(colDesc)),
                    CategoryName = GetSafeString(row.Cell(colCat)),
                    SubCategoryName = GetSafeString(row.Cell(colSubCat)),
                    IsWood = isWoodStr == "O" || isWoodStr == "OUI" || isWoodStr == "TRUE" || isWoodStr == "1",
                    Thickness = GetSafeString(row.Cell(colThickness)),
                    Width = GetSafeString(row.Cell(colWidth)),
                    Lengths = GetSafeString(row.Cell(colLengths)),
                    Unit = GetSafeString(row.Cell(colUnit)),
                    SellPriceHT = GetSafeDouble(row.Cell(colSellPriceHT)),
                    TvaRate = GetSafeDouble(row.Cell(colTva)),
                    ProfitMarginPercentage = GetSafeDouble(row.Cell(colMargin)),
                    LastPurchasePriceTTC = GetSafeDouble(row.Cell(colPurchasePrice)),
                    MinQuantity = GetSafeDouble(row.Cell(colMinQty))
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
            
            var firstRow = worksheet.Row(1);
            int lastCol = firstRow.LastCellUsed()?.Address.ColumnNumber ?? 15;

            int colPrefix = -1, colName = -1, colDesc = -1, colFirstName = -1, colLastName = -1;
            int colEmail = -1, colTaxReg = -1, colCin = -1, colAddress = -1, colGov = -1;
            int colPhone1 = -1, colPhone2 = -1, colJob = -1, colNotes = -1;

            for (int c = 1; c <= lastCol; c++)
            {
                var header = NormalizeString(firstRow.Cell(c).GetString());
                if (string.IsNullOrEmpty(header)) continue;

                if (header.Contains("type personne") || header.Contains("type client") || header.Contains("type fournisseur") || header.Contains("prefix"))
                {
                    colPrefix = c;
                }
                else if (header.Contains("sociale") || header.Contains("societe") || header.Contains("entreprise") || header.Contains("company") || header.Contains("nom service") || header.Contains("nom entreprise"))
                {
                    colName = c;
                }
                else if (header.Contains("description") || header.Contains("activite"))
                {
                    colDesc = c;
                }
                else if (header.Contains("prenom") || header.Contains("firstname"))
                {
                    colFirstName = c;
                }
                else if (header == "nom" || header.Contains("lastname") || header.Contains("responsable") || header.Contains("contact"))
                {
                    colLastName = c;
                }
                else if (header.Contains("email") || header.Contains("courriel"))
                {
                    colEmail = c;
                }
                else if (header.Contains("matricule") || header.Contains("tax"))
                {
                    colTaxReg = c;
                }
                else if (header.Contains("cin") || header.Contains("identity"))
                {
                    colCin = c;
                }
                else if (header.Contains("adresse") || header.Contains("address"))
                {
                    colAddress = c;
                }
                else if (header.Contains("gouvernorat") || header.Contains("gov"))
                {
                    colGov = c;
                }
                else if (header.Contains("tel1") || header.Contains("phone1") || header.Contains("telephone1"))
                {
                    colPhone1 = c;
                }
                else if (header.Contains("tel2") || header.Contains("phone2") || header.Contains("telephone2"))
                {
                    colPhone2 = c;
                }
                else if (header.Contains("poste") || header.Contains("fonction") || header.Contains("job"))
                {
                    colJob = c;
                }
                else if (header.Contains("note"))
                {
                    colNotes = c;
                }
            }

            var rows = worksheet.RangeUsed()!.RowsUsed().Skip(1);

            foreach (var row in rows)
            {
                var item = new CounterPartImportDto
                {
                    Prefix = colPrefix > 0 ? GetSafeString(row.Cell(colPrefix)) : null,
                    Name = colName > 0 ? GetSafeString(row.Cell(colName)) : null,
                    Description = colDesc > 0 ? GetSafeString(row.Cell(colDesc)) : null,
                    FirstName = colFirstName > 0 ? GetSafeString(row.Cell(colFirstName)) : null,
                    LastName = colLastName > 0 ? GetSafeString(row.Cell(colLastName)) : null,
                    Email = colEmail > 0 ? GetSafeString(row.Cell(colEmail)) : null,
                    TaxRegistrationNumber = colTaxReg > 0 ? GetSafeString(row.Cell(colTaxReg)) : null,
                    IdentityCardNumber = colCin > 0 ? GetSafeString(row.Cell(colCin)) : null,
                    Address = colAddress > 0 ? GetSafeString(row.Cell(colAddress)) : null,
                    Gouvernorate = colGov > 0 ? GetSafeString(row.Cell(colGov)) : null,
                    PhoneNumberOne = colPhone1 > 0 ? GetSafeString(row.Cell(colPhone1)) : null,
                    PhoneNumberTwo = colPhone2 > 0 ? GetSafeString(row.Cell(colPhone2)) : null,
                    JobTitle = colJob > 0 ? GetSafeString(row.Cell(colJob)) : null,
                    Notes = colNotes > 0 ? GetSafeString(row.Cell(colNotes)) : null,
                };

                // Normalize Prefix if 'Personne Morale' / 'Personne Physique' is specified in Excel
                if (!string.IsNullOrEmpty(item.Prefix))
                {
                    var normPrefix = NormalizeString(item.Prefix);
                    if (normPrefix.Contains("morale") || normPrefix.Contains("societe"))
                    {
                        item.Prefix = "STE";
                    }
                    else if (normPrefix.Contains("physique") || normPrefix.Contains("particulier") || normPrefix.Contains("individu"))
                    {
                        item.Prefix = "MR";
                    }
                }

                list.Add(item);
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
                    var rows = wsTaxes.RowsUsed().Skip(1);
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

                        var normDesc = NormalizeString(description);
                        var existing = await _context.Parents.FirstOrDefaultAsync(x => x.Description == description || (x.Description != null && NormalizeString(x.Description) == normDesc));
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

                        var normParent = NormalizeString(parentDescription);
                        var parent = parents.FirstOrDefault(p => p.Description == parentDescription || (p.Description != null && NormalizeString(p.Description) == normParent));
                        if (parent == null)
                        {
                            report.Errors.Add(new ImportError { RowIndex = row.RowNumber(), Message = $"Catégorie parente introuvable : {parentDescription}" });
                            continue;
                        }

                        var normDesc = NormalizeString(description);
                        var existing = await _context.FirstChildren.FirstOrDefaultAsync(x => x.IdParent == parent.Id && (x.Description == description || (x.Description != null && NormalizeString(x.Description) == normDesc)));
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
