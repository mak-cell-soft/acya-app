using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Document = ms.webapp.api.acya.core.Entities.Document;

namespace ms.webapp.api.acya.api.Controllers
{
    public class InventoryController : BaseApiController
    {
        private readonly WoodAppContext _context;
        private readonly DocumentRepository _documentRepository;
        private readonly MerchandiseRepository _merchandiseRepository;

        public InventoryController(WoodAppContext context, DocumentRepository documentRepository, MerchandiseRepository merchandiseRepository)
        {
            _context = context;
            _documentRepository = documentRepository;
            _merchandiseRepository = merchandiseRepository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentDto>>> GetInventories()
        {
            var inventories = await _context.Documents
                .Include(d => d.SalesSite)
                .Include(d => d.AppUsers)
                    .ThenInclude(u => u!.Persons)
                .Include(d => d.DocumentMerchandises)
                    .ThenInclude(dm => dm.Merchandise)
                        .ThenInclude(m => m!.Articles)
                .Where(d => d.Type == DocumentTypes.inventory && !d.IsDeleted)
                .OrderByDescending(d => d.CreationDate)
                .ToListAsync();

            var dtos = inventories.Select(d =>
            {
                var dto = new DocumentDto(d);
                dto.merchandises = d.DocumentMerchandises.Select(dm => {
                    var mDto = new MerchandiseDto
                    {
                        id = dm.MerchandiseId,
                        packagereference = dm.Merchandise?.PackageReference,
                        quantity = dm.Quantity,
                        article = dm.Merchandise?.Articles != null ? new ArticleDto(dm.Merchandise.Articles) : null,
                    };
                    
                    // Fetch current stock
                    var stock = _context.Stocks.FirstOrDefault(s => s.MerchandiseId == dm.MerchandiseId && s.SalesSiteId == d.SalesSiteId);
                    mDto.stock_quantity = stock?.Quantity ?? 0;
                    
                    return mDto;
                }).ToArray();
                return dto;
            }).ToList();

            return Ok(dtos);
        }

        [HttpPost]
        public async Task<ActionResult> AddInventory(DocumentDto dto)
        {
            if (dto == null || dto.merchandises == null || !dto.merchandises.Any())
            {
                return BadRequest("Invalid inventory data.");
            }

            // Generate Inventory Number: Inventory-yyyyMMdd-NNN
            string datePart = DateTime.Now.ToString("yyyyMMdd");
            string prefix = $"Inventory-{datePart}";
            
            var lastDoc = await _context.Documents
                .Where(d => d.DocNumber!.StartsWith(prefix))
                .OrderByDescending(d => d.DocNumber)
                .FirstOrDefaultAsync();

            int nextIncrement = 1;
            if (lastDoc != null && lastDoc.DocNumber!.Length > prefix.Length + 1)
            {
                string numericPart = lastDoc.DocNumber.Substring(prefix.Length + 1);
                if (int.TryParse(numericPart, out int lastIncrement))
                {
                    nextIncrement = lastIncrement + 1;
                }
            }

            string newDocNumber = $"{prefix}-{nextIncrement:D3}";

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    var doc = new Document
                    {
                        DocNumber = newDocNumber,
                        Type = DocumentTypes.inventory,
                        StockTransactionType = TransactionType.None, // Inventory doesn't move stock until validated
                        Description = dto.description,
                        SupplierReference = newDocNumber, // Using doc number as reference
                        CreationDate = DateTime.UtcNow,
                        UpdateDate = DateTime.UtcNow,
                        UpdatedById = dto.updatedbyid,
                        DocStatus = DocStatus.Pending, // 1: Pending, 2: Validated? Check DocStatus enum if exists
                        SalesSiteId = dto.sales_site!.id,
                        IsDeleted = false
                    };

                    _context.Documents.Add(doc);
                    await _context.SaveChangesAsync();

                    foreach (var mDto in dto.merchandises)
                    {
                        // Similar to DocumentController, find or create merchandise
                        var merchandise = await _context.Merchandises
                            .FirstOrDefaultAsync(m => m.ArticleId == mDto.article!.id && m.PackageReference == mDto.packagereference);

                        if (merchandise == null)
                        {
                            merchandise = new Merchandise
                            {
                                ArticleId = mDto.article!.id!.Value,
                                PackageReference = mDto.packagereference ?? "Standard",
                                Description = mDto.description,
                                UpdatedById = dto.updatedbyid,
                                IsDeleted = false
                            };
                            _context.Merchandises.Add(merchandise);
                            await _context.SaveChangesAsync();
                        }

                        var docMerch = new DocumentMerchandise
                        {
                            DocumentId = doc.Id,
                            MerchandiseId = merchandise.Id,
                            Quantity = mDto.quantity,
                            CreationDate = DateTime.UtcNow,
                            UpdateDate = DateTime.UtcNow
                        };
                        _context.DocumentMerchandises.Add(docMerch);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { docRef = doc.DocNumber, message = "Inventory created successfully" });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, $"An error occurred: {ex.Message}");
                }
            }
        }

        [HttpPut("{id}/validate")]
        public async Task<ActionResult> ValidateInventory(int id)
        {
            var doc = await _context.Documents
                .Include(d => d.DocumentMerchandises)
                    .ThenInclude(dm => dm.Merchandise)
                .FirstOrDefaultAsync(d => d.Id == id && d.Type == DocumentTypes.inventory);

            if (doc == null) return NotFound("Inventory document not found.");
            if (doc.DocStatus == DocStatus.Validated) return BadRequest("Inventory already validated.");

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    foreach (var dm in doc.DocumentMerchandises)
                    {
                        var stock = await _context.Stocks
                            .FirstOrDefaultAsync(s => s.MerchandiseId == dm.MerchandiseId && s.SalesSiteId == doc.SalesSiteId);

                        if (stock == null)
                        {
                            stock = new Stock
                            {
                                MerchandiseId = dm.MerchandiseId,
                                SalesSiteId = doc.SalesSiteId,
                                Quantity = dm.Quantity,
                                CreationDate = DateTime.UtcNow,
                                UpdateDate = DateTime.UtcNow,
                                UpdatedById = doc.UpdatedById ?? 0,
                                Type = TransactionType.Add
                            };
                            _context.Stocks.Add(stock);
                        }
                        else
                        {
                            stock.Quantity = dm.Quantity;
                            stock.UpdateDate = DateTime.UtcNow;
                            stock.UpdatedById = doc.UpdatedById ?? 0;
                        }
                    }

                    doc.DocStatus = DocStatus.Validated;
                    doc.UpdateDate = DateTime.UtcNow;

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { message = "Inventory validated and stock updated." });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, $"An error occurred: {ex.Message}");
                }
            }
        }
    }
}
