using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.common;
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
    public DocumentController(DocumentRepository repository, MerchandiseRepository merchandiseRepository, StockRepository stockRepository, WoodAppContext context)
    {
      _repository = repository;
      _merchandiseRepository = merchandiseRepository;
      _stockRepository = stockRepository;
      _context = context;
    }

    //[HttpGet]
    //public async Task<ActionResult<IEnumerable<DocumentDto>>> GetAll()
    //{
    //  var all = await _context.Documents
    //    .Include(d => d.CounterPart) // Include CounterPart
    //    .Include(d => d.SalesSite)   // Include SalesSite
    //                                 //.Include(d => d.HoldingTaxes) // Include HoldingTax
    //                                 //.Include(d => d.Taxes)        // Include Taxes
    //    .Include(d => d.AppUsers)    // Include AppUser
    //      .ThenInclude(p => p!.Persons)
    //    .Include(d => d.Merchandises) // Include Merchandises
    //      .ThenInclude(m => m.Articles)
    //    .ToListAsync();
    //  var allDtos = all.Select(d => new DocumentDto(d)).ToList();
    //  return Ok(allDtos);
    //}

    //[HttpGet("_type")]
    //public async Task<ActionResult<IEnumerable<DocumentDto>>> LastGetByType(DocumentTypes _type)
    //{
    //  var all = await _context.Documents
    //    .Include(d => d.CounterPart) // Include CounterPart
    //    .Include(d => d.SalesSite)   // Include SalesSite
    //                                 //.Include(d => d.HoldingTaxes) // Include HoldingTax
    //                                 //.Include(d => d.Taxes)        // Include Taxes
    //    .Include(d => d.AppUsers)    // Include AppUser
    //      .ThenInclude(p => p!.Persons)
    //    .Include(d => d.Merchandises) // Include Merchandises
    //      .ThenInclude(m => m.Articles)
    //    .Where(d => d.Type == _type)
    //    .ToListAsync();
    //  var allDtos = all.Select(d => new DocumentDto(d)).ToList();
    //  return Ok(allDtos);
    //}

    //[HttpGet("_type")]
    //public async Task<ActionResult<IEnumerable<DocumentMerchandise>>> Last2GetByType(DocumentTypes _type)
    //{
    //  var all = await _context.DocumentMerchandises
    //    .Include(d => d.Document) // Include Document
    //    .Include(d => d.Document!.CounterPart)
    //    .Include(d => d.Document!.SalesSite)
    //    .Include(d => d.Document!.AppUsers)
    //    .Include(d => d.Document!.AppUsers!.Persons)
    //                                 //.Include(d => d.HoldingTaxes) // Include HoldingTax
    //                                 //.Include(d => d.Taxes)        // Include Taxes
    //    .Include(d => d.Merchandise)
    //    .Include(d => d.Merchandise!.Articles)
    //    .Include(d => d.QuantityMovements)
    //    .Include(d => d.QuantityMovements!.ListOfLengths)
    //    .Where(d => d.Document!.Type == _type)
    //    .ToListAsync();
    //  //var allDtos = all.Select(d => new DocumentDto(d)).ToList();
    //  return Ok(all);
    //}

    [HttpGet("_type")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByType(DocumentTypes _type)
    {
      // Parse the string to enum
    if (!Enum.TryParse<DocumentTypes>(_type, true, out var documentType))
    {
        return BadRequest($"Invalid document type: {_type}");
    }
      // First get all DocumentMerchandise records with their relationships
      var documentMerchandises = await _context.DocumentMerchandises
          .Include(dm => dm.Document)
              .ThenInclude(d => d!.CounterPart)
          .Include(dm => dm.Document)
              .ThenInclude(d => d!.SalesSite)
          .Include(dm => dm.Document)
              .ThenInclude(d => d!.AppUsers)
                  .ThenInclude(u => u!.Persons)
          .Include(dm => dm.Merchandise)
              .ThenInclude(m => m!.Articles)
          .Include(dm => dm.QuantityMovements)
              .ThenInclude(qm => qm!.ListOfLengths)
              .ThenInclude(ll=>ll.AppVarLength)
          .Where(dm => dm.Document!.Type == documentType)
          .ToListAsync();

      // Group by Document to avoid duplicates
      var documents = documentMerchandises
          .GroupBy(dm => dm.Document)
          .Select(g => g.Key)
          .ToList();

      // Convert to DTOs
      var documentDtos = documents.Select(d =>
      {
        var dto = new DocumentDto(d!);

        // Add DocumentMerchandise data to the DTO
        dto.merchandises = documentMerchandises
            .Where(dm => dm.DocumentId == d!.Id)
            .Select(dm => new MerchandiseDto
            {
              id = dm.MerchandiseId,
              quantity = dm.Quantity,
              unit_price_ht = dm.UnitPriceHT,
              cost_ht = dm.CostHT,
              discount_percentage = dm.DiscountPercentage,
              cost_net_ht = dm.CostNetHT,
              cost_discount_value = dm.CostDiscountValue,
              tva_value = dm.TvaValue,
              cost_ttc = dm.CostTTC,
              // Add other properties as needed
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
      });

      return Ok(documentDtos);
    }

    [HttpPost("_typefiltered")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByTypeByMonth([FromBody] TypeDocToFilterDto _type)
    {
      // First get all DocumentMerchandise records with their relationships
      var documentMerchandises = await _context.DocumentMerchandises
          .Include(dm => dm.Document)
              .ThenInclude(d => d!.CounterPart)
          .Include(dm => dm.Document)
              .ThenInclude(d => d!.SalesSite)
          .Include(dm => dm.Document)
              .ThenInclude(d => d!.AppUsers)
                  .ThenInclude(u => u!.Persons)
          .Include(dm => dm.Merchandise)
              .ThenInclude(m => m!.Articles)
          .Include(dm => dm.QuantityMovements)
              .ThenInclude(qm => qm!.ListOfLengths)
                .ThenInclude(ll=>ll.AppVarLength)
          .Where(dm => dm.Document!.Type == _type.typeDoc)
          .Where(dm => dm.Document!.CreationDate.HasValue
           && dm.Document.CreationDate.Value.Day == _type.day
                   && dm.Document.CreationDate.Value.Month == _type.month
                   && dm.Document.CreationDate.Value.Year == _type.year)
      .ToListAsync();

      // Group by Document to avoid duplicates
      var documents = documentMerchandises
          .GroupBy(dm => dm.Document)
          .Select(g => g.Key)
          .ToList();

      // Convert to DTOs
      var documentDtos = documents.Select(d =>
      {
        var dto = new DocumentDto(d!);

        // Add DocumentMerchandise data to the DTO
        dto.merchandises = documentMerchandises
            .Where(dm => dm.DocumentId == d!.Id)
            .Select(dm => new MerchandiseDto
            {
              id = dm.MerchandiseId,
              quantity = dm.Quantity,
              unit_price_ht = dm.UnitPriceHT,
              cost_ht = dm.CostHT,
              discount_percentage = dm.DiscountPercentage,
              cost_net_ht = dm.CostNetHT,
              cost_discount_value = dm.CostDiscountValue,
              tva_value = dm.TvaValue,
              cost_ttc = dm.CostTTC,
              // Add other properties as needed
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
      });

      return Ok(documentDtos);
    }


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

      // Generate the document number
      string prefix = Helpers.GetPrefixForDocumentType(dto.type.Value);
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
          newDocNumber = Helpers.GenerateNewDocNumber(prefix, lastDocNumber);
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
          

          // Post-commit operations
          await _repository.updateListOfIdsListOfLengths(doc);
          await _repository.updateStockByMerchandises(doc);

          await transaction.CommitAsync();

          return Ok(new { docRef = doc.DocNumber, message = "Document added successfully" });
        }
        catch (Exception ex)
        {
          await transaction.RollbackAsync();
          //_logger.LogError(ex, "Error creating document");
          return StatusCode(500, $"An error occurred: {ex.Message}");
        }
      }
    }

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

      /**
      * Document Invoice type will be supplierInvoice 
      * so the reference will be like FF-25-0001 
      * Here we Generate the Prefix
      */
      // Generate the document number
      string prefix = Helpers.GetPrefixForDocumentType(genDto.invoiceDoc.type.Value);
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
          newDocNumber = Helpers.GenerateNewDocNumber(prefix, lastDocNumber);
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
      if (invoice.AppUsers != null)
      {
        _context.Entry(invoice.AppUsers).State = EntityState.Unchanged;
      }
      else
      {
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
      }
      catch (Exception ex)
      {
        // Log the error (if needed)
        return StatusCode(500, "An error occurred while saving the invoice and relationships. " + ex.Message);
      }

      // Return the created invoice with a 201 Created status
      return CreatedAtAction(nameof(GetInvoiceById), new { id = invoice.Id }, invoice);
    }

    // Example method to get an invoice by ID (used in CreatedAtAction)
    [HttpGet("{id}")]
    public async Task<ActionResult<Document>> GetInvoiceById(int id)
    {
      var invoice = await _repository.Get(id);
      if (invoice == null)
      {
        return NotFound();
      }
      return Ok(invoice);
    }


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

  }
}
