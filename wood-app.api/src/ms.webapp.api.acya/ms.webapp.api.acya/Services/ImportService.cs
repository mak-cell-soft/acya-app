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
                    return report;
                }
            }
            catch (Exception ex)
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Erreur lors de la lecture : {ex.Message}" });
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

                    var article = new Article
                    {
                        Reference = item.Reference,
                        Description = item.Description,
                        IsWood = item.IsWood,
                        ParentId = categoryId,
                        FirstChildId = subCategoryId,
                        TvaId = tva.Id,
                        ThicknessId = thicknessId,
                        WidthId = widthId,
                        Unit = item.Unit,
                        SellPriceHT = item.SellPriceHT,
                        SellPriceTTC = item.SellPriceHT * (1 + item.TvaRate / 100.0),
                        LastPurchasePriceTTC = item.LastPurchasePriceTTC,
                        MinQuantity = item.MinQuantity,
                        Lengths = item.Lengths,
                        CreationDate = DateTime.UtcNow,
                        UpdateDate = DateTime.UtcNow,
                        UpdatedBy = userId,
                        IsDeleted = false
                    };

                    _context.Articles.Add(article);
                    await _context.SaveChangesAsync();

                    var sellHistory = new SellPriceHistory
                    {
                        ArticleId = article.Id,
                        PriceValue = article.SellPriceTTC ?? 0,
                        CreationDate = article.CreationDate,
                        UpdateDate = article.UpdateDate,
                        IsDeleted = false,
                        UpdatedBy = userId
                    };
                    _context.SellPricesHistories.Add(sellHistory);

                    if (item.LastPurchasePriceTTC > 0)
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
                    article.SellHistoryId = sellHistory.Id;
                    await _context.SaveChangesAsync();

                    report.SuccessCount++;
                }
                catch (Exception ex)
                {
                    report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Erreur : {ex.Message}" });
                }
            }

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
                    return report;
                }
            }
            catch (Exception ex)
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Erreur : {ex.Message}" });
                return report;
            }

            report.TotalRows = items.Count;
            if (!Enum.TryParse<CounterPartType>(type, true, out var cpType))
            {
                report.Errors.Add(new ImportError { RowIndex = 0, Message = $"Type de contrepartie '{type}' invalide." });
                return report;
            }

            int rowIndex = 1;
            foreach (var item in items)
            {
                rowIndex++;
                try
                {
                    var cp = new CounterPart
                    {
                        Guid = Guid.NewGuid(),
                        Type = cpType,
                        Name = item.Name,
                        FirstName = item.FirstName,
                        LastName = item.LastName,
                        Email = item.Email,
                        TaxRegistrationNumber = item.TaxRegistrationNumber,
                        IdentityCardNumber = item.IdentityCardNumber,
                        Address = item.Address,
                        Gouvernorate = item.Gouvernorate,
                        PhoneNumberOne = item.PhoneNumberOne,
                        PhoneNumberTwo = item.PhoneNumberTwo,
                        JobTitle = item.JobTitle,
                        Notes = item.Notes,
                        CreationDate = DateTime.UtcNow,
                        UpdateDate = DateTime.UtcNow,
                        UpdatedById = userId,
                        IsActive = true,
                        IsDeleted = false
                    };

                    _context.CounterParts.Add(cp);
                    report.SuccessCount++;
                }
                catch (Exception ex)
                {
                    report.Errors.Add(new ImportError { RowIndex = rowIndex, Message = $"Erreur : {ex.Message}" });
                }
            }

            await _context.SaveChangesAsync();
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
                    IsWood = row.Cell(5).GetBoolean(),
                    Thickness = row.Cell(6).GetString(),
                    Width = row.Cell(7).GetString(),
                    Unit = row.Cell(8).GetString(),
                    SellPriceHT = row.Cell(9).GetDouble(),
                    LastPurchasePriceTTC = row.Cell(10).GetDouble(),
                    TvaRate = row.Cell(11).GetDouble(),
                    MinQuantity = row.Cell(12).GetDouble(),
                    Lengths = row.Cell(13).GetString()
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
            var rows = worksheet.RangeUsed().RowsUsed().Skip(1);

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
