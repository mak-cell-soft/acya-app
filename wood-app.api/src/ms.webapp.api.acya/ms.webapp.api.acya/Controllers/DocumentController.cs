using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Document = ms.webapp.api.acya.core.Entities.Document;

namespace ms.webapp.api.acya.api.Controllers
{
  public class DocumentController : BaseApiController
  {
    private readonly DocumentRepository _repository;
    private readonly MerchandiseRepository _merchandiseRepository;
    private readonly StockRepository _stockRepository;
    private readonly WoodAppContext _context;
    private readonly IAccountService _accountService;
    private readonly IBalanceService _balanceService;
    public DocumentController(DocumentRepository repository, MerchandiseRepository merchandiseRepository, StockRepository stockRepository, WoodAppContext context, IAccountService accountService, IBalanceService balanceService)
    {
      _repository = repository;
      _merchandiseRepository = merchandiseRepository;
      _stockRepository = stockRepository;
      _context = context;
      _accountService = accountService;
      _balanceService = balanceService;
    }

    [HttpGet("_type")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByType(DocumentTypes _type)
    {
      // Query from Documents instead of DocumentMerchandises
      // This ensures we get the document even if it has no direct merchandise records
      var documents = await _context.Documents
          .AsNoTracking() // Performance: Disable change tracking for read-only query
          .AsSplitQuery() // Performance: Avoid cartesian product in complex joins
          .Include(d => d.CounterPart)
          .Include(d => d.SalesSite)
          .Include(d => d.AppUsers)
              .ThenInclude(u => u!.Persons)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.Thicknesses)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.Widths)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.TVAs)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.QuantityMovements)
                  .ThenInclude(qm => qm!.ListOfLengths)
                      .ThenInclude(ll => ll.AppVarLength)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.Merchandise)
                          .ThenInclude(m => m!.Articles)
                              .ThenInclude(a => a!.Thicknesses)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.Merchandise)
                          .ThenInclude(m => m!.Articles)
                              .ThenInclude(a => a!.Widths)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.Merchandise)
                          .ThenInclude(m => m!.Articles)
                              .ThenInclude(a => a!.TVAs)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
          .Include(d => d.ParentDocuments)
              .ThenInclude(pd => pd.ParentDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.QuantityMovements)
                          .ThenInclude(qm => qm!.ListOfLengths)
                              .ThenInclude(ll => ll.AppVarLength)
          .Where(d => d.Type == _type)
          .ToListAsync();

      // Convert to DTOs
      var documentDtos = documents.Select(d =>
      {
        var dto = new DocumentDto(d);

        // Logic to retrieve merchandises: 
        // 1. If ChildDocuments exist (Generated Invoice), aggregate from them
        // 2. Otherwise use d.DocumentMerchandises (Direct Invoice)
        
        var sourceMerchandises = new List<DocumentMerchandise>();
        if (d.ChildDocuments != null && d.ChildDocuments.Any())
        {
            dto.deliveryNoteDocNumbers = d.ChildDocuments
                .Where(cd => cd.ChildDocument != null)
                .Select(cd => cd.ChildDocument!.DocNumber ?? "")
                .ToList();

            // 🆕 Populate childdocuments with simplified data for the UI
            dto.childdocuments = d.ChildDocuments
                .Where(cd => cd.ChildDocument != null)
                .Select(cd => new DocumentDto {
                    id = cd.ChildDocument!.Id,
                    docnumber = cd.ChildDocument.DocNumber,
                    creationdate = cd.ChildDocument.CreationDate
                }).ToList();

            foreach (var rel in d.ChildDocuments.Where(cd => cd.ChildDocument != null))
            {
                if (rel.ChildDocument!.DocumentMerchandises != null)
                {
                    sourceMerchandises.AddRange(rel.ChildDocument.DocumentMerchandises);
                }
            }
        }
        else
        {
            if (d.DocumentMerchandises != null)
            {
                sourceMerchandises.AddRange(d.DocumentMerchandises);
            }
        }

        // Map the source merchandises to the DTO
        dto.merchandises = sourceMerchandises
            .Select(dm => new MerchandiseDto
            {
              id = dm.MerchandiseId,
              packagereference = dm.Merchandise?.PackageReference,
              description = dm.Merchandise?.Description,
              isinvoicible = dm.Merchandise?.IsInvoicible ?? false,
              allownegativstock = dm.Merchandise?.AllowNegativStock ?? false,
              quantity = dm.Quantity,
              // §5.5 — Reliquats
              quantity_delivered = dm.QuantityDelivered,
              quantity_remaining = dm.QuantityRemaining,
              unit_price_ht = dm.UnitPriceHT,
              cost_ht = dm.CostHT,
              discount_percentage = dm.DiscountPercentage,
              cost_net_ht = dm.CostNetHT,
              cost_discount_value = dm.CostDiscountValue,
              tva_value = dm.TvaValue,
              cost_ttc = dm.CostTTC,
              article = dm.Merchandise?.Articles != null ?
                    new ArticleDto(dm.Merchandise.Articles) : null,
              lisoflengths = dm.QuantityMovements?.ListOfLengths?
                    .Select(ll => new ListOflengthDto
                    {
                      nbpieces = ll.NumberOfPieces,
                      quantity = ll.Quantity,
                      length = ll.AppVarLength != null ?
                            new AppVariableDto(ll.AppVarLength) : null
                    })
                    .ToArray()
            })
            .ToArray();

        return dto;
      }).ToList();

      return Ok(documentDtos);
    }

    [HttpPost("_typefiltered")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByTypeByMonth([FromBody] TypeDocToFilterDto _type)
    {
      // Query from Documents instead of DocumentMerchandises
      var documents = await _context.Documents
          .AsNoTracking() // Performance: Disable change tracking for read-only query
          .AsSplitQuery() // Performance: Avoid cartesian product in complex joins
          .Include(d => d.CounterPart)
          .Include(d => d.SalesSite)
          .Include(d => d.AppUsers)
              .ThenInclude(u => u!.Persons)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.Thicknesses)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.Widths)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.TVAs)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.QuantityMovements)
                  .ThenInclude(qm => qm!.ListOfLengths)
                      .ThenInclude(ll => ll.AppVarLength)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.Merchandise)
                          .ThenInclude(m => m!.Articles)
                              .ThenInclude(a => a!.Thicknesses)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.Merchandise)
                          .ThenInclude(m => m!.Articles)
                              .ThenInclude(a => a!.Widths)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.Merchandise)
                          .ThenInclude(m => m!.Articles)
                              .ThenInclude(a => a!.TVAs)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
          .Include(d => d.ParentDocuments)
              .ThenInclude(pd => pd.ParentDocument)
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.QuantityMovements)
                          .ThenInclude(qm => qm!.ListOfLengths)
                              .ThenInclude(ll => ll.AppVarLength)
          .Where(d => d.Type == _type.typeDoc)
          .Where(d => d.CreationDate.HasValue
                   && d.CreationDate.Value.Day == _type.day
                   && d.CreationDate.Value.Month == _type.month
                   && d.CreationDate.Value.Year == _type.year)
          .ToListAsync();

      // Convert to DTOs
      var documentDtos = documents.Select(d =>
      {
        var dto = new DocumentDto(d);

        // Logic to retrieve merchandises: 
        // 1. If ChildDocuments exist (Generated Invoice), aggregate from them
        // 2. Otherwise use d.DocumentMerchandises (Direct Invoice)
        
        var sourceMerchandises = new List<DocumentMerchandise>();
        if (d.ChildDocuments != null && d.ChildDocuments.Any())
        {
            dto.deliveryNoteDocNumbers = d.ChildDocuments
                .Where(cd => cd.ChildDocument != null)
                .Select(cd => cd.ChildDocument!.DocNumber ?? "")
                .ToList();

             // 🆕 Also populate the full childdocuments collection
            dto.childdocuments = d.ChildDocuments
                .Where(cd => cd.ChildDocument != null)
                .Select(cd => new DocumentDto {
                    id = cd.ChildDocument!.Id,
                    docnumber = cd.ChildDocument.DocNumber,
                    creationdate = cd.ChildDocument.CreationDate
                }).ToList();

            foreach (var rel in d.ChildDocuments.Where(cd => cd.ChildDocument != null))
            {
                if (rel.ChildDocument!.DocumentMerchandises != null)
                {
                    sourceMerchandises.AddRange(rel.ChildDocument.DocumentMerchandises);
                }
            }
        }
        else
        {
            if (d.DocumentMerchandises != null)
            {
                sourceMerchandises.AddRange(d.DocumentMerchandises);
            }
        }

        // Map the source merchandises to the DTO
        dto.merchandises = sourceMerchandises
            .Select(dm => new MerchandiseDto
            {
              id = dm.MerchandiseId,
              packagereference = dm.Merchandise?.PackageReference,
              description = dm.Merchandise?.Description,
              isinvoicible = dm.Merchandise?.IsInvoicible ?? false,
              allownegativstock = dm.Merchandise?.AllowNegativStock ?? false,
              quantity = dm.Quantity,
              // §5.5 — Reliquats
              quantity_delivered = dm.QuantityDelivered,
              quantity_remaining = dm.QuantityRemaining,
              unit_price_ht = dm.UnitPriceHT,
              cost_ht = dm.CostHT,
              discount_percentage = dm.DiscountPercentage,
              cost_net_ht = dm.CostNetHT,
              cost_discount_value = dm.CostDiscountValue,
              tva_value = dm.TvaValue,
              cost_ttc = dm.CostTTC,
              article = dm.Merchandise?.Articles != null ?
                    new ArticleDto(dm.Merchandise.Articles) : null,
              lisoflengths = dm.QuantityMovements?.ListOfLengths?
                    .Select(ll => new ListOflengthDto
                    {
                      nbpieces = ll.NumberOfPieces,
                      quantity = ll.Quantity,
                      length = ll.AppVarLength != null ?
                            new AppVariableDto(ll.AppVarLength) : null
                    })
                    .ToArray()
            })
            .ToArray();

        return dto;
      }).ToList();

      return Ok(documentDtos);
    }

    #region Add Document
    [HttpPost]
    public async Task<ActionResult> Add(DocumentDto dto)
    {
      // Validate the DTO
      if (dto == null || dto.type == null || dto.merchandises == null || !dto.merchandises.Any())
      {
        return BadRequest("Invalid document data or no merchandises provided.");
      }

      // Validate the updatedbyid
      if (dto.updatedbyid == 0)
      {
        return BadRequest("updatedbyid is required.");
      }

      var appUserExists = await _context.AppUsers.AnyAsync(u => u.Id == dto.updatedbyid);
      if (!appUserExists)
      {
        return BadRequest("Invalid updatedbyid: The specified user does not exist.");
      }

      // Test the existence of doc with same supplier reference
      if (!string.IsNullOrEmpty(dto.supplierReference))
      {
        if (_repository.GetDocBySupplierReference(dto.supplierReference, (DocumentTypes)dto.type))
        {
          return Conflict("An existing doc with same reference.");
        }
      }

      // Get Enterprise Configuration for numbering
      var user = await _context.AppUsers
          .Include(u => u.Enterprise)
          .FirstOrDefaultAsync(u => u.Id == dto.updatedbyid);

      var numberingConfig = new DocumentNumberingConfigDto();
      if (!string.IsNullOrEmpty(user?.Enterprise?.DocumentNumberingConfig))
      {
          try 
          {
              var options = new System.Text.Json.JsonSerializerOptions
              {
                  PropertyNameCaseInsensitive = true,
                  NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
              };
              numberingConfig = System.Text.Json.JsonSerializer.Deserialize<DocumentNumberingConfigDto>(user.Enterprise.DocumentNumberingConfig, options) ?? new DocumentNumberingConfigDto();
          }
          catch 
          {
              // Fallback to defaults on error
          }
      }

      // Generate the document number
      string prefix = Helpers.GetPrefixForDocumentType(dto.type.Value, numberingConfig.Prefixes);
      if (string.IsNullOrEmpty(prefix))
      {
        return BadRequest("Invalid document type.");
      }

      string newDocNumber;
      try
      {
        lock (_repository)
        {
          string? lastDocNumber = _repository.GetLastDocNumberByPrefix(prefix);
          newDocNumber = Helpers.GenerateNewDocNumber(prefix, lastDocNumber, numberingConfig.YearFormat, numberingConfig.IncrementLength);
        }
      }
      catch (Exception ex)
      {
        return StatusCode(500, $"Failed to generate document number: {ex.Message}");
      }



      using (var transaction = await _context.Database.BeginTransactionAsync())
      {
        try
        {
          // Create document with all necessary properties
          var doc = new Document
          {
            DocNumber = newDocNumber,
            Type = dto.type.Value,
            StockTransactionType = dto.stocktransactiontype,
            Description = dto.description,
            SupplierReference = dto.supplierReference,
            CreationDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow,
            UpdatedById = dto.updatedbyid,
            DocStatus = dto.docstatus,
            TotalCostHTNetDoc = dto.total_ht_net_doc,
            TotalCostNetTTCDoc = dto.total_net_ttc,
            TotalCostDiscountDoc = dto.total_discount_doc,
            TotalCostTvaDoc = dto.total_tva_doc,
            IsDeleted = dto.isdeleted,
            IsInvoiced = dto.isinvoiced,
            BillingStatus = dto.billingstatus,
            WithHoldingTax = dto.withholdingtax,

          };

          // Handle relationships with proper null checks
          if (dto.counterpart?.id > 0)
          {
            doc.CounterPart = await _context.CounterParts.FindAsync(dto.counterpart.id);
            doc.CounterPartId = dto.counterpart.id;
            if (doc.CounterPart != null)
              _context.Entry(doc.CounterPart).State = EntityState.Unchanged;
          }

          if (dto.sales_site?.id > 0)
          {
            doc.SalesSite = await _context.SalesSites.FindAsync(dto.sales_site.id);
            doc.SalesSiteId = dto.sales_site.id;
            if (doc.SalesSite != null)
              _context.Entry(doc.SalesSite).State = EntityState.Unchanged;
          }

          // Ensure HoldingTaxeId is null if HoldingTaxes is null
          if (doc.HoldingTaxes == null)
          {
            doc.HoldingTaxId = null;
          }
          else
          {
            _context.Entry(doc.HoldingTaxes).State = EntityState.Unchanged;
          }

          // Handle AppUser relationship
          doc.AppUsers = await _context.AppUsers.FindAsync(dto.updatedbyid);
          if (doc.AppUsers != null)
            _context.Entry(doc.AppUsers).State = EntityState.Unchanged;

          // Add document to context first to generate ID
          _context.Documents.Add(doc);
          await _context.SaveChangesAsync(); // First save to get document ID

          /**
           * Process with Merchandises
           */
          #region Process with Merchandises

          if (dto.merchandises.Any(m => m.article?.id == null))
          {
            return BadRequest("All merchandises must have an article ID.");
          }

          // Get existing merchandises by matching ArticleId and PackageReference
          var existingMerchandiseIds = await _merchandiseRepository.GetIdsByPackageReference(dto);
          var existingMerchandises = await _merchandiseRepository.GetByIdsAsync(existingMerchandiseIds);

          // Create a dictionary for quick lookup of existing merchandises by ArticleId and PackageReference
          var existingMerchDict = existingMerchandises
                .Where(m => m.Articles != null)
                .GroupBy(m => new { ArticleId = m.Articles!.Id, m.PackageReference })
                .ToDictionary(
                  g => g.Key,
                  g => g.First() // Take the first merchandise for each unique key
                );

          var newMerchandises = new List<Merchandise>();

          if (!existingMerchandises.Any() && !dto.merchandises.Any(m => m.id == 0))
          {
            return BadRequest("Invalid merchandise data provided.");
          }

          foreach (var merchDto in dto.merchandises)
          {
            // Skip if no article (should be validated earlier)
            if (merchDto.article == null) continue;

            Merchandise? merchandise;

            // Case 1: Explicit ID provided - use that (existing or throw error)
            if (merchDto.id > 0)
            {
              merchandise = await _merchandiseRepository.GetById(merchDto.id);
              if (merchandise == null)
              {
                await transaction.RollbackAsync();
                return BadRequest($"Merchandise with ID {merchDto.id} not found.");
              }

              // Update merchandise properties
              merchandise.UpdateFromDto(merchDto);
              _context.Entry(merchandise).State = EntityState.Modified;
            }
            // Case 2: No ID provided - try to find existing by ArticleId+PackageReference or create new
            else
            {
              var key = new { ArticleId = merchDto.article.id!.Value, PackageReference = merchDto.packagereference };

              if (existingMerchDict.TryGetValue(key, out var existingMerch))
              {
                // Use existing merchandise
                merchandise = existingMerch;

                // First detach the existing entity if it's being tracked
                var existingEntry = _context.Entry(merchandise);
                if (existingEntry.State != EntityState.Detached)
                {
                  existingEntry.State = EntityState.Detached;
                }
                
                _context.Entry(merchandise).State = EntityState.Modified;
              }
              else
              {
                // Create new merchandise
                merchandise = new Merchandise(merchDto)
                {
                  PackageReference = merchDto.packagereference,
                  Description = merchDto.description,
                  IsInvoicible = merchDto.isinvoicible,
                  AllowNegativStock = merchDto.allownegativstock,
                  IsMergedWith = merchDto.ismergedwith,
                  IdMergedMerchandise = merchDto.ismergedwith ? merchDto.idmergedmerchandise : 0,
                  IsDeleted = merchDto.isdeleted,
                  UpdatedById = merchDto.updatedbyid
                };

                // Reset the Articles navigation property to avoid tracking conflicts
                var articleId = merchDto.article.id;
                merchandise.Articles = null;

                _context.Merchandises.Add(merchandise);

                // Then set the foreign key directly
                merchandise.ArticleId = articleId.Value;
                _context.Entry(merchandise).Reference(m => m.Articles).IsModified = false;

                newMerchandises.Add(merchandise);
              }
            }

            // Create DocumentMerchandise record
            var docMerchandise = new DocumentMerchandise
            {
              Document = doc,
              //MerchandiseId = merchandise.Id, // Set the foreign key directly
              Merchandise = merchandise,
              Quantity = merchDto.quantity,
              UnitPriceHT = merchDto.unit_price_ht,
              CostHT = merchDto.cost_ht,
              CostDiscountValue = merchDto.cost_discount_value,
              CostNetHT = merchDto.cost_net_ht,
              CostTTC = merchDto.cost_ttc,
              DiscountPercentage = merchDto.discount_percentage,
              CreationDate = DateTime.UtcNow,
              UpdateDate = DateTime.UtcNow
            };

            // Handle merchandise entity state
            if (merchandise.Id > 0) // Existing merchandise
            {
              // Ensure merchandise is properly attached and marked as unchanged
              var entry = _context.Entry(merchandise);
              if (entry.State == EntityState.Detached)
              {
                _context.Merchandises.Attach(merchandise);
              }
              entry.State = EntityState.Unchanged;

              // Alternative: Fetch fresh from DB to ensure proper tracking
              // merchandise = await _context.Merchandises.FindAsync(merchandise.Id);
              // docMerchandise.Merchandise = merchandise;
            }
            else // New merchandise
            {
              _context.Merchandises.Add(merchandise);
              // Consider saving new merch first if needed
              // await _context.SaveChangesAsync();
            }

            // Handle QuantityMovement if lengths exist
            if (merchDto.lisoflengths != null && merchDto.lisoflengths.Any())
            {
              var newQtyMovement = new QuantityMovement
              {
                Quantity = merchDto.quantity,
                LengthIds = string.Join(",", merchDto.lisoflengths.Select(l => l.length?.id)),
                CreationDate = DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow,
                DocumentMerchandise = docMerchandise // Set the navigation property
              };

              foreach (var lengthDto in merchDto.lisoflengths)
              {
                var newLength = new ListOfLength
                {
                  NumberOfPieces = lengthDto.nbpieces!,
                  Quantity = lengthDto.quantity,
                  QuantityMovements = newQtyMovement
                };

                if (lengthDto.length != null && lengthDto.length.id > 0)
                {
                  newLength.AppVarLength = await _context.AppVariables.FindAsync(lengthDto.length.id);
                  _context.Entry(newLength.AppVarLength!).State = EntityState.Unchanged;
                }

                if (newLength.NumberOfPieces > 0)
                {
                  newQtyMovement.ListOfLengths.Add(newLength);
                }
              }

              docMerchandise.QuantityMovements = newQtyMovement;
            }

            // Ensure the merchandise is properly attached
            if (_context.Entry(merchandise).State == EntityState.Detached)
            {
              _context.Merchandises.Attach(merchandise);
              _context.Entry(merchandise).State = EntityState.Unchanged;
            }

            _context.DocumentMerchandises.Add(docMerchandise);
          }
          #endregion

          await _context.SaveChangesAsync();

          #region Ledger Entry
          // Integrate Ledger Entry if it's an Invoice or Delivery Note
          if (doc.Type == DocumentTypes.customerInvoice || doc.Type == DocumentTypes.customerDeliveryNote || doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt)
          {
              await _accountService.AddLedgerEntryAsync(
                  doc.CounterPartId, 
                  doc.Type.ToString()!, 
                  (decimal)doc.TotalCostNetTTCDoc, 
                  doc.Id, 
                  $"Movement for document {doc.DocNumber}");
          }
          #endregion

          // Post-commit operations
          await _repository.updateListOfIdsListOfLengths(doc);
          
          // supplierOrder, customerQuote, customerOrder: no stock movement
          // Only actual receipts/deliveries affect inventory
          if (doc.Type != DocumentTypes.supplierOrder 
              && doc.Type != DocumentTypes.customerQuote
              && doc.Type != DocumentTypes.customerOrder)
          {
              await _repository.updateStockByMerchandises(doc);
          }

          await transaction.CommitAsync();

          // Update persistent balance
          if (doc.CounterPartId > 0)
          {
              string lastTxType = doc.Type.ToString()!;
              if (doc.CounterPart?.Type == CounterPartType.Customer)
                  await _balanceService.UpdateCustomerBalanceAsync(doc.CounterPartId, lastTxType, DateTime.UtcNow);
              else
                  await _balanceService.UpdateSupplierBalanceAsync(doc.CounterPartId, lastTxType, DateTime.UtcNow);
          }

          return Ok(new { id = doc.Id, docRef = doc.DocNumber, message = "Document added successfully" });
        }
        catch (Exception ex)
        {
          await transaction.RollbackAsync();
          //_logger.LogError(ex, "Error creating document");
          return StatusCode(500, $"An error occurred: {ex.Message}");
        }
      }
    }
    #endregion

    #region Create Invoice
    /**
     * Invoice is a list of added Reciept supplier Documents
     * takes the list of Ids of created Reciept Documents
     * and the pre-creation of dto Invoice Supplier
     * Normally it will work also with Customers
     */

    [HttpPost("createinvoice")]
    public async Task<ActionResult> CreateInvoice(GenerateInvoiceDto genDto)
    {
      if (!genDto.docChildrenIds!.Any())
      {
        return BadRequest("Nothing to Create");
      }

      // Validate the DTO
      if (genDto.invoiceDoc == null || genDto.invoiceDoc.type == null)
      {
        return BadRequest("Invalid document data.");
      }

      // Test the existence of doc with same supplier reference
      if (!string.IsNullOrEmpty(genDto.invoiceDoc.supplierReference))
      {
        if (_repository.GetDocBySupplierReference(genDto.invoiceDoc.supplierReference, (DocumentTypes)genDto.invoiceDoc.type))
        {
          return Conflict("An existing doc with same reference.");
        }
      }

      // Get Enterprise Configuration for numbering
      var user = await _context.AppUsers
          .Include(u => u.Enterprise)
          .FirstOrDefaultAsync(u => u.Id == genDto.invoiceDoc.updatedbyid);

      var numberingConfig = new DocumentNumberingConfigDto();
      if (!string.IsNullOrEmpty(user?.Enterprise?.DocumentNumberingConfig))
      {
          try 
          {
              numberingConfig = System.Text.Json.JsonSerializer.Deserialize<DocumentNumberingConfigDto>(user.Enterprise.DocumentNumberingConfig) ?? new DocumentNumberingConfigDto();
          }
          catch 
          {
              // Fallback to defaults on error
          }
      }

      // Generate the document number
      string prefix = Helpers.GetPrefixForDocumentType(genDto.invoiceDoc.type.Value, numberingConfig.Prefixes);
      if (string.IsNullOrEmpty(prefix))
      {
        return BadRequest("Invalid document type.");
      }

      string newDocNumber;
      try
      {
        // Lock resource to ensure thread safety
        lock (_repository)
        {
          // Fetch the last DocNumber for this prefix
          string? lastDocNumber = _repository.GetLastDocNumberByPrefix(prefix);

          // Generate a new incremental DocNumber
          newDocNumber = Helpers.GenerateNewDocNumber(prefix, lastDocNumber, numberingConfig.YearFormat, numberingConfig.IncrementLength);
        }
      }
      catch (Exception ex)
      {
        return StatusCode(500, $"Failed to generate document number: {ex.Message}");
      }

      // Create the invoice document
      Document invoice = new Document(genDto.invoiceDoc);

      // Calculate totals based on the selected documents
      //foreach (var id in genDto.docChildrenIds!)
      //{
      //  var _d = await _repository.Get(id);
      //  if (_d == null)
      //  {
      //    return NotFound($"Document with ID {id} not found");
      //  }

      //  invoice.TotalCostHTNetDoc += _d.TotalCostHTNetDoc;
      //  invoice.TotalCostTvaDoc += _d.TotalCostTvaDoc;
      //  invoice.TotalCostDiscountDoc += _d.TotalCostDiscountDoc;
      //  invoice.TotalCostNetTTCDoc += _d.TotalCostNetTTCDoc;
      //}

      /**
       * Add the new doc number to the invoice
       */
      invoice.DocNumber = newDocNumber;

      // Ensure the AppUser is tracked as an existing entity
      if (user != null)
      {
        invoice.AppUsers = user;
        _context.Entry(invoice.AppUsers).State = EntityState.Unchanged;
      }
      else
      {
        invoice.AppUsers = null;
        invoice.UpdatedById = genDto.invoiceDoc.updatedbyid;
      }

      // Ensure HoldingTaxeId is null if HoldingTaxes is null
      if (invoice.HoldingTaxes == null)
      {
        invoice.HoldingTaxId = null;
      }
      else
      {
        _context.Entry(invoice.HoldingTaxes).State = EntityState.Unchanged;
      }

      // Ensure the CounterPart is tracked as an existing entity
      if (invoice.CounterPart != null)
      {
        _context.Entry(invoice.CounterPart).State = EntityState.Unchanged;
      }

      // Ensure the Sales Site is tracked as an existing entity
      if (invoice.SalesSite != null)
      {
        _context.Entry(invoice.SalesSite).State = EntityState.Unchanged;
      }

      // Ensure TaxeId is null if Taxes is null
      if (invoice.Taxes != null)
      {
        _context.Entry(invoice.Taxes).State = EntityState.Unchanged;
      }

      // Add the invoice to the database
      await _repository.Add(invoice);

      /**
       * Another Approach if we have many Children Documents
       */

      // Fetch all child documents in a single query
      var childDocuments = await _repository.GetAll(genDto.docChildrenIds!);

      // Update the IsInvoiced property for each child document
      foreach (var childDocument in childDocuments)
      {
        childDocument.IsInvoiced = true;
        await _repository.Update(childDocument);
      }

      // Register relationships in DocumentDocumentRelationship
      foreach (var id in genDto.docChildrenIds!)
      {
        var relationship = new DocumentDocumentRelationship
        {
          ParentDocumentId = invoice.Id, // The new invoice is the parent
          ChildDocumentId = id           // The selected documents are the children
        };

        // Add the relationship to the database
        await _repository.AddRelationship(relationship);
      }

      // Save changes and verify
      try
      {
        await _repository.SaveChanges();

        // Update persistent balance
        if (invoice.CounterPartId > 0)
        {
          if (invoice.CounterPart?.Type == CounterPartType.Customer)
            await _balanceService.UpdateCustomerBalanceAsync(invoice.CounterPartId, "mouvement", DateTime.UtcNow);
          else
            await _balanceService.UpdateSupplierBalanceAsync(invoice.CounterPartId, "mouvement", DateTime.UtcNow);
        }

        // Return the created invoice with a 201 Created status
        return CreatedAtAction(nameof(GetInvoiceById), new { id = invoice.Id }, invoice);
      }
      catch (Exception ex)
      {
        // Log the error (if needed)
        return StatusCode(500, "An error occurred while saving the invoice and relationships. " + ex.Message);
      }
    }
    #endregion

    #region Get Invoice by ID
    // Example method to get an invoice by ID (used in CreatedAtAction)
    [HttpGet("{id}")]
    public async Task<ActionResult<DocumentDto>> GetInvoiceById(int id)
    {
      var d = await _context.Documents
          .AsNoTracking()
          .AsSplitQuery()
          .Include(d => d.CounterPart)
          .Include(d => d.SalesSite)
          .Include(d => d.AppUsers)
              .ThenInclude(u => u!.Persons)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.Thicknesses)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.Widths)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
                      .ThenInclude(a => a!.TVAs)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.QuantityMovements)
                  .ThenInclude(qm => qm!.ListOfLengths)
                      .ThenInclude(ll => ll.AppVarLength)
          .Include(d => d.ChildDocuments)
              .ThenInclude(cd => cd.ChildDocument)
          .FirstOrDefaultAsync(d => d.Id == id);

      if (d == null)
      {
        return NotFound();
      }

      var dto = new DocumentDto(d);

      // Logic to retrieve merchandises correctly from join table
      var sourceMerchandises = d.DocumentMerchandises?.ToList() ?? new List<DocumentMerchandise>();
      
      dto.merchandises = sourceMerchandises
          .Select(dm => new MerchandiseDto
          {
            id = dm.MerchandiseId,
            packagereference = dm.Merchandise?.PackageReference,
            description = dm.Merchandise?.Description,
            isinvoicible = dm.Merchandise?.IsInvoicible ?? false,
            allownegativstock = dm.Merchandise?.AllowNegativStock ?? false,
            quantity = dm.Quantity,
            unit_price_ht = dm.UnitPriceHT,
            cost_ht = dm.CostHT,
            discount_percentage = dm.DiscountPercentage,
            cost_net_ht = dm.CostNetHT,
            cost_discount_value = dm.CostDiscountValue,
            tva_value = dm.TvaValue,
            cost_ttc = dm.CostTTC,
            article = dm.Merchandise?.Articles != null ?
                  new ArticleDto(dm.Merchandise.Articles) : null,
            lisoflengths = dm.QuantityMovements?.ListOfLengths?
                  .Select(ll => new ListOflengthDto
                  {
                    nbpieces = ll.NumberOfPieces,
                    quantity = ll.Quantity,
                    length = ll.AppVarLength != null ?
                          new AppVariableDto(ll.AppVarLength) : null
                  })
                  .ToArray()
          })
          .ToArray();

      // Handle deliveryNoteDocNumbers if exists
      if (d.ChildDocuments != null && d.ChildDocuments.Any())
      {
        dto.deliveryNoteDocNumbers = d.ChildDocuments
            .Where(cd => cd.ChildDocument != null)
            .Select(cd => cd.ChildDocument!.DocNumber ?? "")
            .ToList();
      }

      return Ok(dto);
    }
    #endregion

    #region Get All Invoices with Their Reciepts (Children)
    /**
     * Get All Invoices with Their Reciepts (Children).
     */

    [HttpGet("ParentsWithChildren")]
    public async Task<ActionResult<IEnumerable<ParentDocumentWithChildrenDto>>> GetParentDocumentsWithChildren()
    {
      var parentDocuments = await _context.DocumentDocumentRelationships
          .Include(p => p.ParentDocument)
              .ThenInclude(p => p!.CounterPart) // Include CounterPart for ParentDocument
              .ThenInclude(p => p!.AppUsers) // Include AppUsers for ParentDocument (if AppUsers is a relation of CounterPart)
              .ThenInclude(p => p!.Persons)
          .Include(c => c.ChildDocument) // Include ChildDocument
          .Where(p => p.ParentDocument!.Type == DocumentTypes.supplierInvoice)
          .ToListAsync();

      var result = parentDocuments
          .GroupBy(p => p.ParentDocumentId)
          .Select(g => new ParentDocumentWithChildrenDto
          {
            ParentDocumentId = g.Key,
            ParentDocument = new DocumentDto(g.First().ParentDocument!),
            ChildDocuments = g.Select(c => new DocumentDto(c.ChildDocument!)).ToList()
          })
          .ToList();
      
      return result;
    }
    #endregion

    #region Update Document
    /**
     * Update Document.
     * This method works in 2 cases:
     * 1. Update a direct document (no child documents).
     * 2. Update a parent document (with child documents).
     * @param id The id of the document to update.
     * @param dto The document data to update.
     * @return The updated document.
     */
    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, DocumentDto dto)
    {
      if (dto == null || id != dto.id)
      {
        return BadRequest("Invalid document data.");
      }

      var appUser = await _context.AppUsers.FindAsync(dto.updatedbyid);
      if (appUser == null)
      {
        return BadRequest("Invalid updatedbyid: The specified user does not exist.");
      }

      using (var transaction = await _context.Database.BeginTransactionAsync())
      {
        try
        {
          var doc = await _context.Documents
              .Include(d => d.CounterPart)
              .Include(d => d.SalesSite)
              .Include(d => d.DocumentMerchandises)
                  .ThenInclude(dm => dm.Merchandise)
              .Include(d => d.DocumentMerchandises)
                  .ThenInclude(dm => dm.QuantityMovements)
                      .ThenInclude(qm => qm!.ListOfLengths)
              .FirstOrDefaultAsync(d => d.Id == id);

          if (doc == null)
          {
            return NotFound("Document not found.");
          }

          if (doc.IsInvoiced)
          {
            return BadRequest("Cannot edit an invoiced document.");
          }

          // Revert old stock impact before replacing merchandises
          await _repository.revertStockByMerchandises(doc, appUser);

          // Update basic fields
          doc.SupplierReference = dto.supplierReference;
          doc.Description = dto.description;
          doc.UpdateDate = DateTime.UtcNow;
          doc.UpdatedById = dto.updatedbyid;
          doc.TotalCostHTNetDoc = dto.total_ht_net_doc;
          doc.TotalCostNetTTCDoc = dto.total_net_ttc;
          doc.TotalCostDiscountDoc = dto.total_discount_doc;
          doc.TotalCostTvaDoc = dto.total_tva_doc;

          // Process Merchandises
          // Remove existing DocumentMerchandises (they will be re-added from the DTO)
          _context.DocumentMerchandises.RemoveRange(doc.DocumentMerchandises);
          doc.DocumentMerchandises.Clear(); // Ensure collection is cleared to avoid duplicates during processing

          foreach (var merchDto in dto.merchandises!)
          {
            // Ensure child items have updatedbyid set from parent if they don't have it
            if (merchDto.updatedbyid == 0)
            {
                merchDto.updatedbyid = dto.updatedbyid;
            }

            Merchandise? merchandise;
            if (merchDto.id > 0)
            {
              merchandise = await _context.Merchandises.FindAsync(merchDto.id);
              if (merchandise != null)
              {
                merchandise.UpdateFromDto(merchDto);
                _context.Entry(merchandise).State = EntityState.Modified;
              }
            }
            else
            {
              merchandise = new Merchandise(merchDto);
              _context.Merchandises.Add(merchandise);
            }

            if (merchandise != null)
            {
              var docMerchandise = new DocumentMerchandise
              {
                Document = doc,
                Merchandise = merchandise,
                Quantity = merchDto.quantity,
                UnitPriceHT = merchDto.unit_price_ht,
                CostHT = merchDto.cost_ht,
                CostDiscountValue = merchDto.cost_discount_value,
                CostNetHT = merchDto.cost_net_ht,
                CostTTC = merchDto.cost_ttc,
                DiscountPercentage = merchDto.discount_percentage,
                CreationDate = DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow
              };

              // Handle QuantityMovement if lengths exist
              if (merchDto.lisoflengths != null && merchDto.lisoflengths.Any())
              {
                var newQtyMovement = new QuantityMovement
                {
                  Quantity = merchDto.quantity,
                  LengthIds = string.Join(",", merchDto.lisoflengths.Select(l => l.length?.id)),
                  CreationDate = DateTime.UtcNow,
                  UpdateDate = DateTime.UtcNow,
                  DocumentMerchandise = docMerchandise
                };

                foreach (var lengthDto in merchDto.lisoflengths)
                {
                  var newLength = new ListOfLength
                  {
                    NumberOfPieces = lengthDto.nbpieces!,
                    Quantity = lengthDto.quantity,
                    QuantityMovements = newQtyMovement
                  };

                  if (lengthDto.length != null && lengthDto.length.id > 0)
                  {
                    newLength.AppVarLength = await _context.AppVariables.FindAsync(lengthDto.length.id);
                    _context.Entry(newLength.AppVarLength!).State = EntityState.Unchanged;
                  }

                  if (newLength.NumberOfPieces > 0)
                  {
                    newQtyMovement.ListOfLengths.Add(newLength);
                  }
                }

                docMerchandise.QuantityMovements = newQtyMovement;
              }

              // Ensure the merchandise is properly attached
              if (_context.Entry(merchandise).State == EntityState.Detached)
              {
                _context.Merchandises.Attach(merchandise);
                _context.Entry(merchandise).State = EntityState.Unchanged;
              }

              _context.DocumentMerchandises.Add(docMerchandise);
            }
          }

          await _context.SaveChangesAsync();

          #region Post Commit Operations (Same as Add)
          // Update Ledger Entry (Delete old and Add new to handle amount changes)
          if (doc.Type == DocumentTypes.customerInvoice || doc.Type == DocumentTypes.customerDeliveryNote || doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt)
          {
              string docTypeStr = doc.Type.ToString()!;
              await _accountService.DeleteLedgerEntryAsync(doc.Id, docTypeStr);
              await _accountService.AddLedgerEntryAsync(
                  doc.CounterPartId, 
                  docTypeStr, 
                  (decimal)doc.TotalCostNetTTCDoc, 
                  doc.Id, 
                  $"Updated movement for document {doc.DocNumber}");
          }

          // Update Stock and Length IDs
          await _repository.updateListOfIdsListOfLengths(doc);
          await _repository.updateStockByMerchandises(doc);
          #endregion

          await transaction.CommitAsync();

          // Update persistent balance
          if (doc.CounterPartId > 0)
          {
              string lastTxType = doc.Type.ToString()!;
              if (doc.CounterPart?.Type == CounterPartType.Customer)
                  await _balanceService.UpdateCustomerBalanceAsync(doc.CounterPartId, lastTxType, DateTime.UtcNow);
              else
                  await _balanceService.UpdateSupplierBalanceAsync(doc.CounterPartId, lastTxType, DateTime.UtcNow);
          }

          return Ok(new { message = "Document updated successfully" });
        }
        catch (Exception ex)
        {
          await transaction.RollbackAsync();
          return StatusCode(500, $"An error occurred: {ex.Message}");
        }
      }
    }
    #region Update Status
    [HttpPatch("UpdateStatus/{id}")]
    public async Task<ActionResult> UpdateStatus(int id, UpdateDocStatusDto dto)
    {
      var doc = await _context.Documents.FindAsync(id);
      if (doc == null)
      {
        return NotFound();
      }

      doc.DocStatus = dto.DocStatus;
      if (!string.IsNullOrEmpty(dto.SupplierReference))
      {
        doc.SupplierReference = dto.SupplierReference;
      }
      doc.UpdateDate = DateTime.UtcNow;

      await _context.SaveChangesAsync();
      return Ok(new { message = "Status updated successfully" });
    }
    #endregion

    #region Register Relationship
    [HttpPost("RegisterRelationship")]
    public async Task<ActionResult> RegisterRelationship([FromBody] DocumentDocumentRelationship relationship)
    {
        if (relationship == null || relationship.ParentDocumentId == 0 || relationship.ChildDocumentId == 0)
        {
            return BadRequest("Invalid relationship data.");
        }

        var exists = await _context.DocumentDocumentRelationships.AnyAsync(r => 
            r.ParentDocumentId == relationship.ParentDocumentId && 
            r.ChildDocumentId == relationship.ChildDocumentId);

        if (!exists)
        {
            _context.DocumentDocumentRelationships.Add(relationship);
            await _context.SaveChangesAsync();

            // §5.5 — Gestion des reliquats
            // If we are linking a child (e.g. BL) to a parent (e.g. BC), 
            // we should update the parent's QuantityDelivered based on the child's Quantity.
            await UpdateParentQuantities(relationship.ParentDocumentId, relationship.ChildDocumentId);
        }

        return Ok(new { message = "Relationship registered successfully" });
    }

    private async Task UpdateParentQuantities(int parentId, int childId)
    {
        var parent = await _context.Documents
            .Include(d => d.DocumentMerchandises)
                .ThenInclude(dm => dm.Merchandise)
            .FirstOrDefaultAsync(d => d.Id == parentId);

        var child = await _context.Documents
            .Include(d => d.DocumentMerchandises)
                .ThenInclude(dm => dm.Merchandise)
            .FirstOrDefaultAsync(d => d.Id == childId);

        if (parent == null || child == null) return;

        // For each item in the child document, find a corresponding item in the parent
        foreach (var childMerch in child.DocumentMerchandises)
        {
            // Match logic:
            // 1. Precise MerchandiseId match (best)
            // 2. OR ArticleId + PackageReference match (common when converting Quote -> Order or Order -> BL)
            var parentMerch = parent.DocumentMerchandises
                .FirstOrDefault(pm => 
                    pm.MerchandiseId == childMerch.MerchandiseId || 
                    (pm.MerchandiseId > 0 && pm.MerchandiseId == childMerch.MerchandiseId) ||
                    (pm.Merchandise != null && childMerch.Merchandise != null &&
                     pm.Merchandise.ArticleId == childMerch.Merchandise.ArticleId && 
                     pm.Merchandise.PackageReference == childMerch.Merchandise.PackageReference));

            if (parentMerch != null)
            {
                parentMerch.QuantityDelivered += childMerch.Quantity;
                _context.Entry(parentMerch).State = EntityState.Modified;
            }
        }

        await _context.SaveChangesAsync();
    }
    #endregion

    #endregion
  }
}
