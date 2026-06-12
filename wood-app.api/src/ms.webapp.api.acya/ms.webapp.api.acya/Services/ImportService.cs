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

            var categories = await _context.Parents.Where(x => x.Description != null).ToDictionaryAsync(x => x.Description!.ToLower(), x => x.Id);
            var subCategories = await _context.FirstChildren.Where(x => x.Description != null).ToDictionaryAsync(x => x.Description!.ToLower(), x => x.Id);
            var tvas = await _context.AppVariables.Where(x => x.Nature == "TVA").ToListAsync();
            var dimensions = await _context.AppVariables.Where(x => x.Nature == "DIMENSION").ToListAsync();

            int rowIndex = 1;
            foreach (var item in items)
            {
                rowIndex++;
                try
                {
                    int categoryId = 0;
                    int subCategoryId = 0;

                    if (string.IsNullOrEmpty(item.CategoryName) || !categories.TryGetValue(item.CategoryName.ToLower(), out categoryId))
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Catégorie inconnue : {item.CategoryName}" });
                        continue;
                    }

                    if (string.IsNullOrEmpty(item.SubCategoryName) || !subCategories.TryGetValue(item.SubCategoryName.ToLower(), out subCategoryId))
                    {
                        report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Sous-catégorie inconnue : {item.SubCategoryName}" });
                        continue;
                    }

                    var tva = tvas.FirstOrDefault(x => x.Value == item.TvaRate);
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
                    article.SellPriceTTC = item.SellPriceHT * (1 + item.TvaRate / 100.0);
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
                    SellPriceHT = row.Cell(10).GetDouble(),
                    TvaRate = row.Cell(11).GetDouble(),
                    ProfitMarginPercentage = row.Cell(13).GetDouble(),
                    LastPurchasePriceTTC = row.Cell(14).GetDouble(),
                    MinQuantity = row.Cell(15).GetDouble()
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
    }
}
