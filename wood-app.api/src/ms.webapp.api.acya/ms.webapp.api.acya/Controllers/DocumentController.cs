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
using ms.webapp.api.acya.core.Interfaces;
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
    private readonly IApprovalService _approvalService;
    private readonly IPdfGenerationService _pdfService;
    private readonly IAppNotificationService _notificationService;
    public DocumentController(DocumentRepository repository, MerchandiseRepository merchandiseRepository, StockRepository stockRepository, WoodAppContext context, IAccountService accountService, IBalanceService balanceService, IApprovalService approvalService, IPdfGenerationService pdfService, IAppNotificationService notificationService)
    {
      _repository = repository;
      _merchandiseRepository = merchandiseRepository;
      _stockRepository = stockRepository;
      _context = context;
      _accountService = accountService;
      _balanceService = balanceService;
      _approvalService = approvalService;
      _pdfService = pdfService;
      _notificationService = notificationService;
    }

    [HttpGet("_type")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByType(DocumentTypes _type)
    {
      // Query from Documents instead of DocumentMerchandises
      // This ensures we get the document even if it has no direct merchandise records
      var documents = await _context.Documents
          .AsNoTracking() // Performance: Disable change tracking for read-only query
          .AsSplitQuery() // Performance: Avoid cartesian product in complex joins
          .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
          .Include(d => d.SalesSite)
          .Include(d => d.HoldingTaxes)
          .Include(d => d.Taxes)
          .Include(d => d.Payments)
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
        // 1. If ChildDocuments exist (Generated Invoice/Delivery Note) AND it's NOT an Order, aggregate from them
        // 2. Otherwise use d.DocumentMerchandises (Direct Documents or Orders with status tracking)
        
        var sourceMerchandises = new List<DocumentMerchandise>();
        if (d.ChildDocuments != null && d.ChildDocuments.Any() && 
            d.Type != DocumentTypes.supplierOrder && d.Type != DocumentTypes.customerOrder && d.Type != DocumentTypes.customerQuote)
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
            // For Orders and basic documents, use the direct lines
            if (d.DocumentMerchandises != null)
            {
                sourceMerchandises.AddRange(d.DocumentMerchandises);
            }
            
            // Still populate childdocuments list for the UI (timeline/badges)
            if (d.ChildDocuments != null)
            {
                dto.childdocuments = d.ChildDocuments
                    .Where(cd => cd.ChildDocument != null)
                    .Select(cd => new DocumentDto {
                        id = cd.ChildDocument!.Id,
                        docnumber = cd.ChildDocument.DocNumber,
                        creationdate = cd.ChildDocument.CreationDate
                    }).ToList();
            }
        }

        // Map the source merchandises to the DTO
        dto.merchandises = sourceMerchandises
            .Select(dm => new MerchandiseDto
            {
              id = dm.MerchandiseId,
              line_type = dm.Type,
              transporter_id = dm.TransporterId,
              transporter_name = dm.Transporter?.FullName,
              packagereference = dm.Merchandise?.PackageReference,
              description = dm.Type == LineType.TransportFee ? (dm.Description ?? "Frais de transport") : dm.Merchandise?.Description,
              isinvoicible = dm.Type == LineType.TransportFee || (dm.Merchandise?.IsInvoicible ?? false),
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
                      id = ll.Id,
                      nbpieces = ll.NumberOfPieces,
                      quantity = ll.Quantity,
                      customLength = ll.CustomLengthCm,
                      totalWidth = ll.TotalWidthCm,
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

    [HttpGet("counterpart/{id}")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByCounterpartId(int id)
    {
      var documents = await _context.Documents
          .AsNoTracking()
          .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
          .Include(d => d.Payments)
          .Include(d => d.HoldingTaxes)
          .Include(d => d.Taxes)
          .Where(d => d.CounterPartId == id && !d.IsDeleted)
          .OrderByDescending(d => d.DocNumber)
          .ToListAsync();

      var documentDtos = documents.Select(d => new DocumentDto(d)).ToList();
      return Ok(documentDtos);
    }

    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> GetPdf(int id)
    {
      var document = await _context.Documents
          .AsNoTracking()
          .AsSplitQuery()
          .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
          .Include(d => d.SalesSite)
          .Include(d => d.HoldingTaxes)
          .Include(d => d.Payments)
          .Include(d => d.Taxes)
          .Include(d => d.AppUsers)
              .ThenInclude(u => u!.Persons)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
                  .ThenInclude(m => m!.Articles)
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.QuantityMovements)
                  .ThenInclude(qm => qm!.ListOfLengths)
                      .ThenInclude(ll => ll.AppVarLength)
          .FirstOrDefaultAsync(d => d.Id == id);

      if (document == null) return NotFound();

      var dto = new DocumentDto(document);
      var pdfBytes = _pdfService.GenerateCommercialDocumentPdf(dto);
      
      string fileName = $"{document.Type}_{document.DocNumber}.pdf";
      return File(pdfBytes, "application/pdf", fileName);
    }

    [HttpPost("_typefiltered")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetByTypeByMonth([FromBody] TypeDocToFilterDto _type)
    {
      // Query from Documents instead of DocumentMerchandises
      var documents = await _context.Documents
          .AsNoTracking() // Performance: Disable change tracking for read-only query
          .AsSplitQuery() // Performance: Avoid cartesian product in complex joins
          .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
          .Include(d => d.SalesSite)
          .Include(d => d.HoldingTaxes)
          .Include(d => d.Taxes)
          .Include(d => d.Payments)
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
                   && (_type.day == 0 || d.CreationDate.Value.Day == _type.day)
                   && (_type.month == 0 || d.CreationDate.Value.Month == _type.month)
                   && (_type.year == 0 || d.CreationDate.Value.Year == _type.year))
          .ToListAsync();

      // Convert to DTOs using reusable mapper
      var documentDtos = documents.Select(MapDocumentToDto).ToList();

      return Ok(documentDtos);
    }

    /// <summary>
    /// Advanced / Deep Search endpoint for purchase invoices and documents.
    /// Supports combinable filters: reference, supplierReference, supplierId,
    /// article/merchandise ID (at line level), date range, and pagination.
    /// Preserves tenant isolation via WoodAppContext schema configuration.
    /// </summary>
    [HttpPost("search-purchases")]
    public async Task<ActionResult<PagedResult<DocumentDto>>> SearchPurchases([FromBody] PurchaseSearchFilterDto filter)
    {
      if (filter == null)
      {
        return BadRequest("Filter criteria must be provided.");
      }

      int page = filter.Page > 0 ? filter.Page : 1;
      int pageSize = filter.PageSize > 0 ? filter.PageSize : 15;

      // Base query scoped to non-deleted documents in the current tenant schema
      var query = _context.Documents
          .AsNoTracking()
          .Where(d => !d.IsDeleted);

      // 1. Document Type Filter: Default to supplier invoices if unspecified
      if (filter.DocumentType.HasValue)
      {
        query = query.Where(d => d.Type == filter.DocumentType.Value);
      }
      else
      {
        query = query.Where(d => d.Type == DocumentTypes.supplierInvoice);
      }

      // 2. Invoice Reference (partial case-insensitive match)
      if (!string.IsNullOrWhiteSpace(filter.Reference))
      {
        var refTerm = filter.Reference.Trim().ToLower();
        query = query.Where(d => d.DocNumber != null && d.DocNumber.ToLower().Contains(refTerm));
      }

      // 3. Supplier Reference (partial case-insensitive match)
      if (!string.IsNullOrWhiteSpace(filter.SupplierReference))
      {
        var supRefTerm = filter.SupplierReference.Trim().ToLower();
        query = query.Where(d => d.SupplierReference != null && d.SupplierReference.ToLower().Contains(supRefTerm));
      }

      // 4. Supplier Filter
      if (filter.SupplierId.HasValue && filter.SupplierId.Value > 0)
      {
        query = query.Where(d => d.CounterPartId == filter.SupplierId.Value);
      }

      // 5. Date Period Filter (applied to all searches)
      if (filter.StartDate.HasValue)
      {
        var start = DateTime.SpecifyKind(filter.StartDate.Value.Date, DateTimeKind.Utc);
        query = query.Where(d => d.CreationDate.HasValue && d.CreationDate.Value >= start);
      }

      if (filter.EndDate.HasValue)
      {
        var end = DateTime.SpecifyKind(filter.EndDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
        query = query.Where(d => d.CreationDate.HasValue && d.CreationDate.Value <= end);
      }

      // 6. Merchandise / Article Filter (checks lines directly and on child receipts with EXISTS)
      if (filter.ArticleId.HasValue && filter.ArticleId.Value > 0)
      {
        int artId = filter.ArticleId.Value;
        query = query.Where(d =>
            d.DocumentMerchandises.Any(dm =>
                dm.Type == LineType.Merchandise &&
                dm.Merchandise != null &&
                dm.Merchandise.ArticleId == artId)
            ||
            d.ChildDocuments.Any(cd =>
                cd.ChildDocument != null &&
                cd.ChildDocument.DocumentMerchandises.Any(cdm =>
                    cdm.Type == LineType.Merchandise &&
                    cdm.Merchandise != null &&
                    cdm.Merchandise.ArticleId == artId))
        );
      }
      else if (filter.MerchandiseId.HasValue && filter.MerchandiseId.Value > 0)
      {
        int mId = filter.MerchandiseId.Value;
        query = query.Where(d =>
            d.DocumentMerchandises.Any(dm => dm.MerchandiseId == mId)
            ||
            d.ChildDocuments.Any(cd =>
                cd.ChildDocument != null &&
                cd.ChildDocument.DocumentMerchandises.Any(cdm => cdm.MerchandiseId == mId))
        );
      }

      // 7. Get total count for pagination before loading related entities
      var totalCount = await query.CountAsync();

      // 8. Order by CreationDate descending, then by Id
      query = query.OrderByDescending(d => d.CreationDate).ThenByDescending(d => d.Id);

      // 9. Fetch paged slice with full relational graph using AsSplitQuery
      var pagedDocuments = await query
          .AsSplitQuery()
          .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
          .Include(d => d.SalesSite)
          .Include(d => d.HoldingTaxes)
          .Include(d => d.Taxes)
          .Include(d => d.Payments)
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
                  .ThenInclude(c => c!.DocumentMerchandises)
                      .ThenInclude(cdm => cdm.QuantityMovements)
                          .ThenInclude(qm => qm!.ListOfLengths)
                              .ThenInclude(ll => ll.AppVarLength)
          .Include(d => d.ParentDocuments)
              .ThenInclude(pd => pd.ParentDocument)
          .Skip((page - 1) * pageSize)
          .Take(pageSize)
          .ToListAsync();

      var items = pagedDocuments.Select(MapDocumentToDto).ToList();

      return Ok(new PagedResult<DocumentDto>
      {
        Items = items,
        TotalCount = totalCount,
        PageNumber = page,
        PageSize = pageSize
      });
    }

    /// <summary>
    /// Helper mapper to convert Document entity with related merchandise lines and children to DocumentDto.
    /// </summary>
    private static DocumentDto MapDocumentToDto(Document d)
    {
      var dto = new DocumentDto(d);

      var sourceMerchandises = new List<DocumentMerchandise>();
      bool isOrderOrQuote = d.Type == DocumentTypes.supplierOrder || d.Type == DocumentTypes.customerOrder || d.Type == DocumentTypes.customerQuote;

      if (d.ChildDocuments != null && d.ChildDocuments.Any())
      {
        dto.deliveryNoteDocNumbers = d.ChildDocuments
            .Where(cd => cd.ChildDocument != null)
            .Select(cd => cd.ChildDocument!.DocNumber ?? "")
            .ToList();

        dto.childdocuments = d.ChildDocuments
            .Where(cd => cd.ChildDocument != null)
            .Select(cd => new DocumentDto
            {
              id = cd.ChildDocument!.Id,
              docnumber = cd.ChildDocument.DocNumber,
              creationdate = cd.ChildDocument.CreationDate
            }).ToList();

        if (isOrderOrQuote)
        {
          if (d.DocumentMerchandises != null)
          {
            sourceMerchandises.AddRange(d.DocumentMerchandises);
          }
        }
        else
        {
          foreach (var rel in d.ChildDocuments.Where(cd => cd.ChildDocument != null))
          {
            if (rel.ChildDocument!.DocumentMerchandises != null)
            {
              sourceMerchandises.AddRange(rel.ChildDocument.DocumentMerchandises);
            }
          }
        }
      }
      else
      {
        if (d.DocumentMerchandises != null)
        {
          sourceMerchandises.AddRange(d.DocumentMerchandises);
        }

        if (d.Type == DocumentTypes.customerInvoice && d.ParentDocuments != null)
        {
          var blParents = d.ParentDocuments
              .Where(pd => pd.ParentDocument != null && pd.ParentDocument.Type == DocumentTypes.customerDeliveryNote)
              .Select(pd => pd.ParentDocument!.DocNumber ?? "")
              .Where(num => !string.IsNullOrEmpty(num))
              .Distinct()
              .ToList();

          if (blParents.Count == 0 && !string.IsNullOrEmpty(d.SupplierReference))
            blParents = new List<string> { d.SupplierReference };

          if (blParents.Count > 0)
            dto.deliveryNoteDocNumbers = blParents;
        }
      }

      dto.merchandises = sourceMerchandises
          .Select(dm => new MerchandiseDto
          {
            id = dm.MerchandiseId,
            line_type = dm.Type,
            transporter_id = dm.TransporterId,
            transporter_name = dm.Transporter?.FullName,
            packagereference = dm.Merchandise?.PackageReference,
            description = dm.Type == LineType.TransportFee ? (dm.Description ?? "Frais de transport") : dm.Merchandise?.Description,
            isinvoicible = dm.Type == LineType.TransportFee || (dm.Merchandise?.IsInvoicible ?? false),
            allownegativstock = dm.Merchandise?.AllowNegativStock ?? false,
            quantity = dm.Quantity,
            quantity_delivered = dm.QuantityDelivered,
            quantity_remaining = dm.QuantityRemaining,
            unit_price_ht = dm.UnitPriceHT,
            cost_ht = dm.CostHT,
            discount_percentage = dm.DiscountPercentage,
            cost_net_ht = dm.CostNetHT,
            cost_discount_value = dm.CostDiscountValue,
            tva_value = dm.TvaValue,
            cost_ttc = dm.CostTTC,
            article = dm.Merchandise?.Articles != null ? new ArticleDto(dm.Merchandise.Articles) : null,
            lisoflengths = dm.QuantityMovements?.ListOfLengths?
                  .Select(ll => new ListOflengthDto
                  {
                    id = ll.Id,
                    nbpieces = ll.NumberOfPieces,
                    quantity = ll.Quantity,
                    customLength = ll.CustomLengthCm,
                    totalWidth = ll.TotalWidthCm,
                    length = ll.AppVarLength != null ? new AppVariableDto(ll.AppVarLength) : null
                  })
                  .ToArray()
          })
          .ToArray();

      return dto;
    }

    #region Add Document
    [HttpPost]
    public async Task<ActionResult> Add(DocumentDto dto, [FromQuery] bool bypassStockUpdate = false)
    {
      // Validate the DTO
      if (dto == null || dto.type == null)
      {
        return BadRequest("Invalid document data.");
      }

      if (dto.type == DocumentTypes.customerInvoice)
      {
        var (exceeds, currentTotal, ceiling, msg) = await CheckDailyCeilingAsync(dto.total_net_ttc, dto.creationdate);
        if (exceeds)
        {
          return StatusCode(422, new {
            code = "DAILY_CEILING_EXCEEDED",
            ceiling = ceiling,
            currentTotal = currentTotal,
            newInvoiceAmount = dto.total_net_ttc,
            projectedTotal = currentTotal + dto.total_net_ttc,
            message = msg
          });
        }
      }

      // If it's NOT a service document, it MUST have merchandises
      if (!dto.isservice && (dto.merchandises == null || !dto.merchandises.Any()))
      {
        return BadRequest("Non-service documents must have at least one merchandise line.");
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
          return Conflict("Un document existant avec la même référence.");
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
            CreationDate = dto.creationdate ?? DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow,
            UpdatedById = dto.updatedbyid,
            DocStatus = dto.docstatus,
            TotalCostHTNetDoc = Math.Round(dto.total_ht_net_doc, 3, MidpointRounding.AwayFromZero),
            TotalCostNetTTCDoc = Math.Round(dto.total_net_ttc, 3, MidpointRounding.AwayFromZero),
            TotalCostDiscountDoc = Math.Round(dto.total_discount_doc, 3, MidpointRounding.AwayFromZero),
            TotalCostTvaDoc = Math.Round(dto.total_tva_doc, 3, MidpointRounding.AwayFromZero),
            IsDeleted = dto.isdeleted,
            IsInvoiced = dto.isinvoiced,
            BillingStatus = dto.billingstatus,
            WithHoldingTax = dto.withholdingtax,
            Isservice = dto.isservice,

          };

          // Handle relationships with proper null checks
          if (dto.counterpart?.id > 0)
          {
            doc.CounterPart = await _context.CounterParts.FindAsync(dto.counterpart.id);
            doc.CounterPartId = dto.counterpart.id;
            if (doc.CounterPart != null)
            {
              _context.Entry(doc.CounterPart).State = EntityState.Unchanged;
              
              // Mettre à jour le transporteur du client s'il a été sélectionné/modifié 
              // lors de la création du document, pour le précharger les prochaines fois.
              if (doc.CounterPart.TransporterId != dto.counterpart.transporterid)
              {
                doc.CounterPart.TransporterId = dto.counterpart.transporterid;
                _context.Entry(doc.CounterPart).Property(c => c.TransporterId).IsModified = true;
              }
            }
          }

          if (dto.sales_site?.id > 0)
          {
            doc.SalesSite = await _context.SalesSites.FindAsync(dto.sales_site.id);
            doc.SalesSiteId = dto.sales_site.id;
            if (doc.SalesSite != null)
              _context.Entry(doc.SalesSite).State = EntityState.Unchanged;
          }

          // Ensure HoldingTaxeId is null if HoldingTaxes is null
          if (dto.holdingtax?.id > 0)
          {
            doc.HoldingTaxes = await _context.HoldingTaxes.FindAsync(dto.holdingtax.id);
            doc.HoldingTaxId = dto.holdingtax.id;
            if (doc.HoldingTaxes != null)
              _context.Entry(doc.HoldingTaxes).State = EntityState.Unchanged;
          }
          else
          {
            doc.HoldingTaxId = null;
          }

          // Handle Taxe (Droit de timbre)
          if (dto.taxe?.id > 0)
          {
            doc.Taxes = await _context.AppVariables.FindAsync(dto.taxe.id);
            doc.TaxeId = dto.taxe.id;
            if (doc.Taxes != null)
              _context.Entry(doc.Taxes).State = EntityState.Unchanged;
          }
          else
          {
            doc.TaxeId = null;
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

          if (dto.merchandises != null && dto.merchandises.Any())
          {
            if (dto.merchandises.Any(m => m.line_type == LineType.Merchandise && m.article?.id == null))
            {
              return BadRequest("All merchandise lines must have an article ID.");
            }

            // Get existing merchandises by matching ArticleId and PackageReference
            var existingMerchandiseIds = await _merchandiseRepository.GetIdsByPackageReference(dto);
            var existingMerchandises = await _merchandiseRepository.GetByIdsAsync(existingMerchandiseIds);

            // Create a dictionary for quick lookup of existing merchandises by ArticleId and PackageReference (normalized)
            var existingMerchDict = existingMerchandises
                  .Where(m => m.Articles != null)
                  .GroupBy(m => new { 
                      ArticleId = m.Articles!.Id, 
                      PackageReference = m.PackageReference?.Replace("\"", "").Trim() 
                  })
                  .ToDictionary(
                    g => g.Key,
                    g => g.First() // Take the first merchandise for each unique key
                  );

            var newMerchandises = new List<Merchandise>();

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
              // Case 3: Transport Fee line
              else if (merchDto.line_type == LineType.TransportFee)
              {
                merchandise = null; // No physical merchandise for transport fee
              }
              // Case 2: No ID provided - try to find existing by ArticleId+PackageReference or create new
              else
              {
                var key = new { 
                  ArticleId = merchDto.article!.id!.Value, 
                  PackageReference = merchDto.packagereference?.Replace("\"", "").Trim() 
                };

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
                Merchandise = merchandise,
                Type = merchDto.line_type,
                TransporterId = merchDto.transporter_id,
                Description = merchDto.line_type == LineType.TransportFee ? merchDto.description : null,
                Quantity = merchDto.quantity,
                UnitPriceHT = merchDto.unit_price_ht,
                CostHT = merchDto.cost_ht,
                CostDiscountValue = merchDto.cost_discount_value,
                CostNetHT = merchDto.cost_net_ht,
                CostTTC = merchDto.cost_ttc,
                DiscountPercentage = merchDto.discount_percentage,
                // NOTE: Explicitly map TvaValue from DTO; fallback to TTC - NetHT if missing
                TvaValue = merchDto.tva_value > 0 ? merchDto.tva_value : (merchDto.cost_ttc > merchDto.cost_net_ht ? Math.Round(merchDto.cost_ttc - merchDto.cost_net_ht, 3) : 0),
                CreationDate = merchDto.creationdate ?? doc.CreationDate ?? DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow
              };

              // Update counterpart's transporter if this is a transport fee
              if (merchDto.line_type == LineType.TransportFee && merchDto.transporter_id > 0 && doc.CounterPart != null)
              {
                doc.CounterPart.TransporterId = merchDto.transporter_id;
                _context.Entry(doc.CounterPart).Property(c => c.TransporterId).IsModified = true;
              }

              // Handle merchandise entity state
              if (merchandise != null)
              {
                if (merchandise.Id > 0) // Existing merchandise
                {
                  // Ensure merchandise is properly attached and marked as unchanged
                  var entry = _context.Entry(merchandise);
                  if (entry.State == EntityState.Detached)
                  {
                    _context.Merchandises.Attach(merchandise);
                  }
                  entry.State = EntityState.Unchanged;
                }
                else // New merchandise
                {
                  _context.Merchandises.Add(merchandise);
                }
              }

              // Handle QuantityMovement if lengths exist
              if (merchDto.lisoflengths != null && merchDto.lisoflengths.Any())
              {
                var newQtyMovement = new QuantityMovement
                {
                  Quantity = merchDto.quantity,
                  LengthIds = string.Join(",", merchDto.lisoflengths.Select(l => l.length?.id)),
                  CreationDate = merchDto.creationdate ?? doc.CreationDate ?? DateTime.UtcNow,
                  UpdateDate = DateTime.UtcNow,
                  DocumentMerchandise = docMerchandise // Set the navigation property
                };

                foreach (var lengthDto in merchDto.lisoflengths)
                {
                  var newLength = new ListOfLength
                  {
                    NumberOfPieces = lengthDto.nbpieces!,
                    Quantity = lengthDto.quantity,
                    CustomLengthCm = lengthDto.customLength,
                    TotalWidthCm = lengthDto.totalWidth,
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
              if (merchandise != null && _context.Entry(merchandise).State == EntityState.Detached)
              {
                _context.Merchandises.Attach(merchandise);
                _context.Entry(merchandise).State = EntityState.Unchanged;
              }

              _context.DocumentMerchandises.Add(docMerchandise);
            }
          }
          #endregion

          await _context.SaveChangesAsync();
          
          /**
           * §5.6 — Record Transactional Price History
           */
          await RecordPriceHistory(doc);

          #region Ledger Entry
          // Integrate Ledger Entry if it's an Invoice, Delivery Note or Credit Note / Return
          if (doc.Type == DocumentTypes.customerInvoice || doc.Type == DocumentTypes.customerDeliveryNote || 
              doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt ||
              doc.Type == DocumentTypes.customerInvoiceReturn || doc.Type == DocumentTypes.supplierInvoiceReturn ||
              doc.Type == DocumentTypes.supplierMerchandiseReturn)
          {
              bool isSupplier = doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt || doc.Type == DocumentTypes.supplierInvoiceReturn || doc.Type == DocumentTypes.supplierMerchandiseReturn;
              await _accountService.AddLedgerEntryAsync(
                  doc.CounterPartId ?? 0, 
                  doc.Type.ToString()!, 
                  (decimal)doc.TotalCostNetTTCDoc, 
                  doc.Id, 
                  $"Movement - document {doc.DocNumber}",
                  isSupplier,
                  doc.CreationDate);
          }
          #endregion

          // Post-commit operations
          await _repository.updateListOfIdsListOfLengths(doc);
          
          // Documents that do not move inventory (quotes, orders, and financial credit notes)
          var noStockTypes = new[] {
              DocumentTypes.supplierOrder,
              DocumentTypes.customerQuote,
              DocumentTypes.customerOrder,
              DocumentTypes.supplierInvoiceReturn
          };
          if (!noStockTypes.Contains(doc.Type!.Value) && doc.Isservice != true && !bypassStockUpdate) // Skip stock for financial credit notes, services, orders/quotes, or converted invoices where parent BL/BR already moved stock
          {
              await _repository.updateStockByMerchandises(doc);
          }

          await transaction.CommitAsync();

          // Update persistent balance
          if (doc.CounterPartId > 0)
          {
              string lastTxType = doc.Type.ToString()!;
              if (doc.CounterPart?.Type == CounterPartType.Customer)
                  await _balanceService.UpdateCustomerBalanceAsync(doc.CounterPartId ?? 0, lastTxType, DateTime.UtcNow);
              else
                  await _balanceService.UpdateSupplierBalanceAsync(doc.CounterPartId ?? 0, lastTxType, DateTime.UtcNow);
          }

          // §5.15 — Auto-submit si BC dépasse le seuil d'approbation configuré
          if (doc.Type == DocumentTypes.supplierOrder || doc.Type == DocumentTypes.customerOrder)
          {
              var enterpriseId = user?.EnterpriseId ?? 0;
              if (enterpriseId > 0)
              {
                  bool requiresApproval = await _approvalService
                      .RequiresApprovalAsync(enterpriseId, (decimal)doc.TotalCostNetTTCDoc);
                  if (requiresApproval)
                  {
                      await _approvalService.SubmitForApprovalAsync(doc.Id, dto.updatedbyid);
                  }
              }
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

    #region Delete
    /**
     * Soft delete a document.
     * If the document is a Credit Note, update parent's TotalCreditNotes.
     */
    [HttpDelete("DeleteSoft/{id}")]
    public async Task<ActionResult> DeleteSoft(int id)
    {
        var doc = await _context.Documents
            .Include(d => d.CounterPart)
            .Include(d => d.SalesSite)
            .Include(d => d.DocumentMerchandises)
                .ThenInclude(dm => dm.Merchandise)
            .Include(d => d.ParentDocuments)
                .ThenInclude(p => p.ParentDocument)
            .Include(d => d.ChildDocuments)
                .ThenInclude(c => c.ChildDocument)
            .FirstOrDefaultAsync(d => d.Id == id);
            
        if (doc == null)
        {
            return NotFound();
        }

        // Block deletion if Delivery Note (BL) is already invoiced
        if (doc.Type == DocumentTypes.customerDeliveryNote)
        {
            bool isAlreadyInvoiced = doc.IsInvoiced ||
                (doc.ParentDocuments != null && doc.ParentDocuments.Any(p => p.ParentDocument != null && p.ParentDocument.Type == DocumentTypes.customerInvoice && !p.ParentDocument.IsDeleted)) ||
                (doc.ChildDocuments != null && doc.ChildDocuments.Any(c => c.ChildDocument != null && c.ChildDocument.Type == DocumentTypes.customerInvoice && !c.ChildDocument.IsDeleted));

            if (isAlreadyInvoiced)
            {
                return BadRequest("Ce Bon de Livraison est déjà facturé et ne peut pas être supprimé.");
            }
        }

        using (var transaction = await _context.Database.BeginTransactionAsync())
        {
            try
            {
                // 1. Handle Credit Note / Return rollback (update parent balance)
                if (doc.Type == DocumentTypes.supplierInvoiceReturn || doc.Type == DocumentTypes.customerInvoiceReturn || doc.Type == DocumentTypes.supplierMerchandiseReturn)
                {
                     var relationships = await _context.DocumentDocumentRelationships
                         .Where(r => r.ChildDocumentId == id)
                         .ToListAsync();
                         
                     foreach(var rel in relationships)
                     {
                         var parent = await _context.Documents.FindAsync(rel.ParentDocumentId);
                         if (parent != null)
                         {
                             parent.TotalCreditNotes = (double)Math.Round((decimal)parent.TotalCreditNotes - (decimal)doc.TotalCostNetTTCDoc, 3, MidpointRounding.AwayFromZero);
                             _context.Entry(parent).State = EntityState.Modified;
                         }
                     }
                }

                // 2. Revert Stock (for all actual receipts/deliveries, returns, and direct invoices)
                var noStockTypes = new[] {
                    DocumentTypes.supplierOrder,
                    DocumentTypes.customerQuote,
                    DocumentTypes.customerOrder,
                    DocumentTypes.supplierInvoiceReturn
                };

                bool isLinkedToReceiptOrDelivery = false;
                if (doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.customerInvoice)
                {
                    isLinkedToReceiptOrDelivery = await _context.DocumentDocumentRelationships
                        .AnyAsync(r => 
                            (r.ParentDocumentId == doc.Id && r.ChildDocument != null && 
                             (r.ChildDocument.Type == DocumentTypes.supplierReceipt || r.ChildDocument.Type == DocumentTypes.customerDeliveryNote))
                            ||
                            (r.ChildDocumentId == doc.Id && r.ParentDocument != null && 
                             (r.ParentDocument.Type == DocumentTypes.supplierReceipt || r.ParentDocument.Type == DocumentTypes.customerDeliveryNote))
                        );
                }

                if (!noStockTypes.Contains(doc.Type!.Value) && doc.Isservice != true && !isLinkedToReceiptOrDelivery)
                {
                    await _repository.revertStockByMerchandises(doc);
                }

                // 3. Mark as deleted and set status as Deleted
                doc.IsDeleted = true;
                doc.DocStatus = DocStatus.Deleted;
                _context.Entry(doc).State = EntityState.Modified;
                
                // 4. Delete Ledger Entry
                await _accountService.DeleteLedgerEntryAsync(doc.Id, doc.Type.ToString()!);

                await _context.SaveChangesAsync();

                // 5. Update persistent balance
                if (doc.CounterPartId > 0)
                {
                    string lastTxType = doc.Type.ToString()!;
                    if (doc.CounterPart?.Type == CounterPartType.Customer)
                        await _balanceService.UpdateCustomerBalanceAsync(doc.CounterPartId ?? 0, lastTxType, DateTime.UtcNow);
                    else
                        await _balanceService.UpdateSupplierBalanceAsync(doc.CounterPartId ?? 0, lastTxType, DateTime.UtcNow);
                }

                await transaction.CommitAsync();
                return Ok();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"An error occurred during deletion: {ex.Message}");
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
      if (genDto.docChildrenIds == null || !genDto.docChildrenIds.Any())
      {
        return BadRequest("Nothing to Create");
      }

      // Validate the DTO
      if (genDto.invoiceDoc == null || genDto.invoiceDoc.type == null)
      {
        return BadRequest("Invalid document data.");
      }

      var (exceeds, currentTotal, ceiling, msg) = await CheckDailyCeilingAsync(genDto.invoiceDoc.total_net_ttc, genDto.invoiceDoc.creationdate);
      if (exceeds)
      {
        return StatusCode(422, new {
          code = "DAILY_CEILING_EXCEEDED",
          ceiling = ceiling,
          currentTotal = currentTotal,
          newInvoiceAmount = genDto.invoiceDoc.total_net_ttc,
          projectedTotal = currentTotal + genDto.invoiceDoc.total_net_ttc,
          message = msg
        });
      }

      // Test the existence of doc with same supplier reference
      if (!string.IsNullOrEmpty(genDto.invoiceDoc.supplierReference))
      {
        if (_repository.GetDocBySupplierReference(genDto.invoiceDoc.supplierReference, (DocumentTypes)genDto.invoiceDoc.type))
        {
          return Conflict("Un document existant avec la même référence.");
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
      string prefix = Helpers.GetPrefixForDocumentType(genDto.invoiceDoc.type.Value, numberingConfig.Prefixes);
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

      try
      {
        // 1. Instantiate invoice with scalar properties
        Document invoice = new Document
        {
          DocNumber = newDocNumber,
          Type = genDto.invoiceDoc.type.Value,
          StockTransactionType = genDto.invoiceDoc.stocktransactiontype,
          Description = genDto.invoiceDoc.description,
          SupplierReference = genDto.invoiceDoc.supplierReference,
          CreationDate = genDto.invoiceDoc.creationdate ?? DateTime.UtcNow,
          UpdateDate = DateTime.UtcNow,
          UpdatedById = genDto.invoiceDoc.updatedbyid,
          DocStatus = genDto.invoiceDoc.docstatus,
          BillingStatus = genDto.invoiceDoc.billingstatus,
          WithHoldingTax = genDto.invoiceDoc.withholdingtax,
          Isservice = genDto.invoiceDoc.isservice,
          IsDeleted = genDto.invoiceDoc.isdeleted,
          IsInvoiced = genDto.invoiceDoc.isinvoiced,
          Currency = genDto.invoiceDoc.currency,
          ExchangeRate = genDto.invoiceDoc.exchangeRate > 0 ? genDto.invoiceDoc.exchangeRate : 1.0,
          TotalCostHTNetDoc = Math.Round(genDto.invoiceDoc.total_ht_net_doc, 3, MidpointRounding.AwayFromZero),
          TotalCostTvaDoc = Math.Round(genDto.invoiceDoc.total_tva_doc, 3, MidpointRounding.AwayFromZero),
          TotalCostDiscountDoc = Math.Round(genDto.invoiceDoc.total_discount_doc, 3, MidpointRounding.AwayFromZero),
          TotalCostNetTTCDoc = Math.Round(genDto.invoiceDoc.total_net_ttc, 3, MidpointRounding.AwayFromZero)
        };

        // Handle AppUsers
        if (user != null)
        {
          invoice.AppUsers = user;
          invoice.UpdatedById = user.Id;
          _context.Entry(invoice.AppUsers).State = EntityState.Unchanged;
        }
        else if (genDto.invoiceDoc.updatedbyid > 0)
        {
          invoice.UpdatedById = genDto.invoiceDoc.updatedbyid;
        }

        // Handle CounterPart
        var cpId = genDto.invoiceDoc.counterpart?.id;
        if (cpId.HasValue && cpId.Value > 0)
        {
          invoice.CounterPart = await _context.CounterParts.FindAsync(cpId.Value);
          invoice.CounterPartId = cpId.Value;
          if (invoice.CounterPart != null)
          {
            _context.Entry(invoice.CounterPart).State = EntityState.Unchanged;
          }
        }

        // Handle SalesSite
        var siteId = genDto.invoiceDoc.sales_site?.id;
        if (siteId.HasValue && siteId.Value > 0)
        {
          invoice.SalesSite = await _context.SalesSites.FindAsync(siteId.Value);
          invoice.SalesSiteId = siteId.Value;
          if (invoice.SalesSite != null)
          {
            _context.Entry(invoice.SalesSite).State = EntityState.Unchanged;
          }
        }
        else
        {
          var defaultSite = await _context.SalesSites.FirstOrDefaultAsync(s => !s.IsDeleted);
          if (defaultSite != null)
          {
            invoice.SalesSite = defaultSite;
            invoice.SalesSiteId = defaultSite.Id;
            _context.Entry(invoice.SalesSite).State = EntityState.Unchanged;
          }
        }

        // Handle HoldingTaxes
        var holdingTaxId = genDto.invoiceDoc.holdingtax?.id;
        if (holdingTaxId.HasValue && holdingTaxId.Value > 0)
        {
          invoice.HoldingTaxes = await _context.HoldingTaxes.FindAsync(holdingTaxId.Value);
          invoice.HoldingTaxId = holdingTaxId.Value;
          if (invoice.HoldingTaxes != null)
          {
            _context.Entry(invoice.HoldingTaxes).State = EntityState.Unchanged;
          }
        }

        // Handle Taxes (Stamp tax / Droit de timbre)
        var taxeId = genDto.invoiceDoc.taxe?.id;
        if (taxeId.HasValue && taxeId.Value > 0)
        {
          invoice.Taxes = await _context.AppVariables.FindAsync(taxeId.Value);
          invoice.TaxeId = taxeId.Value;
          if (invoice.Taxes != null)
          {
            _context.Entry(invoice.Taxes).State = EntityState.Unchanged;
          }
        }

        // Add invoice and SAVE to database so invoice.Id gets generated by Postgres identity!
        await _context.Documents.AddAsync(invoice);
        await _context.SaveChangesAsync();

        // 2. Fetch all child documents
        var childDocuments = await _context.Documents
            .Include(d => d.DocumentMerchandises)
            .Where(d => genDto.docChildrenIds!.Contains(d.Id))
            .ToListAsync();

        foreach (var childDocument in childDocuments)
        {
          childDocument.IsInvoiced = true;
          childDocument.BillingStatus = BillingStatus.Billed;
          _context.Entry(childDocument).State = EntityState.Modified;

          // Clone merchandises to the invoice for printing
          foreach (var dm in childDocument.DocumentMerchandises)
          {
            var newDm = new DocumentMerchandise
            {
              DocumentId = invoice.Id,
              MerchandiseId = dm.MerchandiseId,
              Type = dm.Type,
              TransporterId = dm.TransporterId,
              Description = dm.Description,
              Quantity = dm.Quantity,
              UnitPriceHT = dm.UnitPriceHT,
              CostHT = dm.CostHT,
              CostDiscountValue = dm.CostDiscountValue,
              CostNetHT = dm.CostNetHT,
              CostTTC = dm.CostTTC,
              DiscountPercentage = dm.DiscountPercentage,
              TvaValue = dm.TvaValue,
              CreationDate = invoice.CreationDate,
              UpdateDate = DateTime.UtcNow
            };
            _context.DocumentMerchandises.Add(newDm);
          }
        }

        // 3. Register relationships with invoice.Id (which is now guaranteed > 0!)
        foreach (var id in genDto.docChildrenIds!)
        {
          var relationship = new DocumentDocumentRelationship
          {
            ParentDocumentId = invoice.Id,
            ChildDocumentId = id
          };
          _context.DocumentDocumentRelationships.Add(relationship);
        }

        // 4. Transfer payments from children to the new invoice (only if child belongs to same counterpart)
        var paymentsToTransfer = await _context.Payments
            .Where(p => p.DocumentId.HasValue && genDto.docChildrenIds!.Contains(p.DocumentId.Value) && !p.IsDeleted)
            .ToListAsync();

        decimal totalTransferredAmount = 0;
        foreach (var payment in paymentsToTransfer)
        {
            if (payment.CustomerId == invoice.CounterPartId)
            {
                payment.DocumentId = invoice.Id;
                _context.Entry(payment).State = EntityState.Modified;
            }
            totalTransferredAmount += (payment.Amount ?? 0);
        }
        
        if (totalTransferredAmount > 0)
        {
            double netPayable = invoice.TotalCostNetTTCDoc;
            if (invoice.WithHoldingTax && invoice.HoldingTaxes != null)
            {
                netPayable -= invoice.HoldingTaxes.TaxValue;
            }
            netPayable -= invoice.TotalCreditNotes;

            if ((double)totalTransferredAmount >= Math.Round(netPayable, 3, MidpointRounding.AwayFromZero) - 0.005)
            {
                invoice.BillingStatus = BillingStatus.Billed;
            }
            else
            {
                invoice.BillingStatus = BillingStatus.PartiallyBilled;
            }

            // For batch invoices with different counterparts, create a payment record for the batch customer
            if (invoice.CounterPartId.HasValue && invoice.CounterPartId.Value > 0)
            {
                bool hasDifferentCounterparts = childDocuments.Any(c => c.CounterPartId != invoice.CounterPartId);
                if (hasDifferentCounterparts)
                {
                    bool paymentExists = await _context.Payments.AnyAsync(p => p.DocumentId == invoice.Id && !p.IsDeleted);
                    if (!paymentExists)
                    {
                        var batchPayment = new Payment
                        {
                            DocumentId = invoice.Id,
                            CustomerId = invoice.CounterPartId.Value,
                            Amount = totalTransferredAmount,
                            PaymentDate = invoice.CreationDate ?? DateTime.UtcNow,
                            PaymentMethod = "Règlement Facture Groupée",
                            Notes = $"Règlement automatique facture groupée {invoice.DocNumber}",
                            CreatedAt = DateTime.UtcNow,
                            IsDeleted = false,
                            ExchangeRate = 1.0m
                        };
                        _context.Payments.Add(batchPayment);
                    }
                }
            }
        }

        // Save all child, merchandise, and relationship updates
        await _context.SaveChangesAsync();

        // Record Price History for the newly created invoice
        await RecordPriceHistory(invoice);

        // Sync ledger for invoice and its children
        await _accountService.SyncLedgerForInvoiceAsync(invoice);

        // Update persistent balance
        if (invoice.CounterPartId.HasValue && invoice.CounterPartId.Value > 0)
        {
          var cp = invoice.CounterPart ?? await _context.CounterParts.FindAsync(invoice.CounterPartId.Value);
          if (cp?.Type == CounterPartType.Customer)
            await _balanceService.UpdateCustomerBalanceAsync(invoice.CounterPartId.Value, "mouvement", DateTime.UtcNow);
          else
            await _balanceService.UpdateSupplierBalanceAsync(invoice.CounterPartId.Value, "mouvement", DateTime.UtcNow);
        }

        return Ok(new { id = invoice.Id, docRef = invoice.DocNumber, message = "Invoice created successfully" });
      }
      catch (Exception ex)
      {
        string errMsg = ex.Message;
        if (ex.InnerException != null) errMsg += " | Inner: " + ex.InnerException.Message;
        return StatusCode(500, "An error occurred while saving the invoice and relationships: " + errMsg);
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
          .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
          .Include(d => d.SalesSite)
          .Include(d => d.HoldingTaxes)
          .Include(d => d.Taxes)
          .Include(d => d.Payments)
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
            line_type = dm.Type,
            transporter_id = dm.TransporterId,
            transporter_name = dm.Transporter?.FullName,
            packagereference = dm.Merchandise?.PackageReference,
            description = dm.Type == LineType.TransportFee ? (dm.Description ?? "Frais de transport") : dm.Merchandise?.Description,
            isinvoicible = dm.Type == LineType.TransportFee || (dm.Merchandise?.IsInvoicible ?? false),
            allownegativstock = dm.Merchandise?.AllowNegativStock ?? false,
            quantity = dm.Quantity,
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
              .ThenInclude(p => p!.CounterPart)
                  .ThenInclude(cp => cp!.Transporter)
                      .ThenInclude(t => t!.Vehicle)
          .Include(p => p.ParentDocument)
              .ThenInclude(p => p!.CounterPart)
                  .ThenInclude(cp => cp!.AppUsers)
                      .ThenInclude(u => u!.Persons)
          .Include(p => p.ParentDocument)
              .ThenInclude(p => p!.HoldingTaxes)
          .Include(c => c.ChildDocument)
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

      if (dto.type == DocumentTypes.customerInvoice)
      {
        var (exceeds, currentTotal, ceiling, msg) = await CheckDailyCeilingAsync(dto.total_net_ttc, dto.creationdate, id);
        if (exceeds)
        {
          return StatusCode(422, new {
            code = "DAILY_CEILING_EXCEEDED",
            ceiling = ceiling,
            currentTotal = currentTotal,
            newInvoiceAmount = dto.total_net_ttc,
            projectedTotal = currentTotal + dto.total_net_ttc,
            message = msg
          });
        }
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
              .Include(d => d.CounterPart).ThenInclude(cp => cp!.Transporter).ThenInclude(t => t!.Vehicle)
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

          var noStockTypes = new[] {
              DocumentTypes.supplierOrder,
              DocumentTypes.customerQuote,
              DocumentTypes.customerOrder,
              DocumentTypes.supplierInvoiceReturn
          };

          bool isLinkedToReceiptOrDelivery = false;
          if (doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.customerInvoice)
          {
              isLinkedToReceiptOrDelivery = await _context.DocumentDocumentRelationships
                  .AnyAsync(r => 
                      (r.ParentDocumentId == doc.Id && r.ChildDocument != null && 
                       (r.ChildDocument.Type == DocumentTypes.supplierReceipt || r.ChildDocument.Type == DocumentTypes.customerDeliveryNote))
                      ||
                      (r.ChildDocumentId == doc.Id && r.ParentDocument != null && 
                       (r.ParentDocument.Type == DocumentTypes.supplierReceipt || r.ParentDocument.Type == DocumentTypes.customerDeliveryNote))
                  );
          }

          bool impactsStock = !noStockTypes.Contains(doc.Type!.Value) && doc.Isservice != true && !isLinkedToReceiptOrDelivery;

          // Revert old stock impact before replacing merchandises
          if (impactsStock)
          {
            await _repository.revertStockByMerchandises(doc, appUser);
          }

          // Update basic fields
          doc.SupplierReference = dto.supplierReference;
          doc.Description = dto.description;
          doc.UpdateDate = DateTime.UtcNow;
          doc.UpdatedById = dto.updatedbyid;
          doc.TotalCostHTNetDoc = Math.Round(dto.total_ht_net_doc, 3, MidpointRounding.AwayFromZero);
          doc.TotalCostNetTTCDoc = Math.Round(dto.total_net_ttc, 3, MidpointRounding.AwayFromZero);
          doc.TotalCostDiscountDoc = Math.Round(dto.total_discount_doc, 3, MidpointRounding.AwayFromZero);
          doc.TotalCostTvaDoc = Math.Round(dto.total_tva_doc, 3, MidpointRounding.AwayFromZero);

          // Handle CounterPart transporter update
          if (dto.counterpart != null && doc.CounterPart != null)
          {
            if (doc.CounterPart.TransporterId != dto.counterpart.transporterid)
            {
              doc.CounterPart.TransporterId = dto.counterpart.transporterid;
              _context.Entry(doc.CounterPart).Property(c => c.TransporterId).IsModified = true;
            }
          }

          // Handle SalesSite update (crucial for stock transfer on update)
          if (dto.sales_site?.id > 0 && doc.SalesSiteId != dto.sales_site.id)
          {
            doc.SalesSite = await _context.SalesSites.FindAsync(dto.sales_site.id);
            doc.SalesSiteId = dto.sales_site.id;
            if (doc.SalesSite != null)
              _context.Entry(doc.SalesSite).State = EntityState.Unchanged;
          }

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

            Merchandise? merchandise = null;
            if (merchDto.line_type == LineType.Merchandise)
            {
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
            }

            if (merchandise != null || merchDto.line_type == LineType.TransportFee)
            {
              var docMerchandise = new DocumentMerchandise
              {
                Document = doc,
                Merchandise = merchandise,
                Type = merchDto.line_type,
                TransporterId = merchDto.transporter_id,
                Description = merchDto.line_type == LineType.TransportFee ? merchDto.description : null,
                Quantity = merchDto.quantity,
                UnitPriceHT = merchDto.unit_price_ht,
                CostHT = merchDto.cost_ht,
                CostDiscountValue = merchDto.cost_discount_value,
                CostNetHT = merchDto.cost_net_ht,
                CostTTC = merchDto.cost_ttc,
                DiscountPercentage = merchDto.discount_percentage,
                // NOTE: Explicitly map TvaValue from DTO; fallback to TTC - NetHT if missing
                TvaValue = merchDto.tva_value > 0 ? merchDto.tva_value : (merchDto.cost_ttc > merchDto.cost_net_ht ? Math.Round(merchDto.cost_ttc - merchDto.cost_net_ht, 3) : 0),
                CreationDate = merchDto.creationdate ?? doc.CreationDate ?? DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow
              };

              // Update counterpart's transporter if this is a transport fee
              if (merchDto.line_type == LineType.TransportFee && merchDto.transporter_id > 0 && doc.CounterPart != null)
              {
                doc.CounterPart.TransporterId = merchDto.transporter_id;
                _context.Entry(doc.CounterPart).Property(c => c.TransporterId).IsModified = true;
              }

              // Handle QuantityMovement if lengths exist
              if (merchDto.lisoflengths != null && merchDto.lisoflengths.Any())
              {
                var newQtyMovement = new QuantityMovement
                {
                  Quantity = merchDto.quantity,
                  LengthIds = string.Join(",", merchDto.lisoflengths.Select(l => l.length?.id)),
                  CreationDate = merchDto.creationdate ?? doc.CreationDate ?? DateTime.UtcNow,
                  UpdateDate = DateTime.UtcNow,
                  DocumentMerchandise = docMerchandise
                };

                foreach (var lengthDto in merchDto.lisoflengths)
                {
                  var newLength = new ListOfLength
                  {
                    NumberOfPieces = lengthDto.nbpieces!,
                    Quantity = lengthDto.quantity,
                    CustomLengthCm = lengthDto.customLength,
                    TotalWidthCm = lengthDto.totalWidth,
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
              if (merchandise != null && _context.Entry(merchandise).State == EntityState.Detached)
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
          if (doc.Type == DocumentTypes.customerInvoice || doc.Type == DocumentTypes.customerDeliveryNote || 
              doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt ||
              doc.Type == DocumentTypes.customerInvoiceReturn || doc.Type == DocumentTypes.supplierInvoiceReturn ||
              doc.Type == DocumentTypes.supplierMerchandiseReturn)
          {
              string docTypeStr = doc.Type.ToString()!;
              await _accountService.DeleteLedgerEntryAsync(doc.Id, docTypeStr);
              bool isSupplier = doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt || doc.Type == DocumentTypes.supplierInvoiceReturn || doc.Type == DocumentTypes.supplierMerchandiseReturn;
              await _accountService.AddLedgerEntryAsync(
                  doc.CounterPartId ?? 0, 
                  docTypeStr, 
                  (decimal)doc.TotalCostNetTTCDoc, 
                  doc.Id, 
                  $"Updated movement for document {doc.DocNumber}",
                  isSupplier,
                  doc.CreationDate);
          }

          // Update Stock and Length IDs
          await _repository.updateListOfIdsListOfLengths(doc);
          if (impactsStock)
          {
            await _repository.updateStockByMerchandises(doc);
          }
          #endregion
          
          /**
           * §5.6 — Record Transactional Price History
           */
          await RecordPriceHistory(doc);

          await transaction.CommitAsync();

          // Update persistent balance
          if (doc.CounterPartId > 0)
          {
              string lastTxType = doc.Type.ToString()!;
              if (doc.CounterPart?.Type == CounterPartType.Customer)
                  await _balanceService.UpdateCustomerBalanceAsync(doc.CounterPartId ?? 0, lastTxType, DateTime.UtcNow);
              else
                  await _balanceService.UpdateSupplierBalanceAsync(doc.CounterPartId ?? 0, lastTxType, DateTime.UtcNow);
          }

          // Trigger admin notification if a customer sales invoice was updated
          if (doc.Type == DocumentTypes.customerInvoice)
          {
              try
              {
                  string invoiceRef = !string.IsNullOrWhiteSpace(doc.DocNumber) ? doc.DocNumber : $"FAC-#{doc.Id}";
                  string title = "Facture de vente mise à jour";
                  string message = $"La facture N° {invoiceRef} a été mise à jour. Un email doit être envoyé au comptable. Veuillez confirmer son adresse email.";

                  // Deduplication: check if an unread notification for this specific invoice already exists
                  var existingNotif = await _context.AppNotifications
                      .FirstOrDefaultAsync(n => n.RelatedEntityId == doc.Id.ToString() && n.RelatedEntityType == "SalesInvoice" && !n.IsRead);

                  if (existingNotif != null)
                  {
                      existingNotif.Title = title;
                      existingNotif.Message = message;
                      existingNotif.CreatedAt = DateTime.UtcNow;
                      await _context.SaveChangesAsync();
                  }
                  else
                  {
                      await _notificationService.NotifyAsync(
                          title: title,
                          message: message,
                          type: NotificationType.Info,
                          priority: NotificationPriority.Normal,
                          targetRole: "Admin",
                          relatedEntityId: doc.Id.ToString(),
                          relatedEntityType: "SalesInvoice"
                      );
                  }
              }
              catch
              {
                  // Non-blocking: notification dispatch failure must not fail the invoice update transaction
              }
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
    #region Convert Document
    [HttpPost("{parentId}/convert")]
    public async Task<ActionResult> Convert(int parentId, DocumentDto dto)
    {
        // 1. Validate the parent document exists
        var parent = await _context.Documents.FindAsync(parentId);
        if (parent == null)
        {
            return NotFound($"Parent document with ID {parentId} not found.");
        }

        // 2. Check for "Ghost" documents (failed previous conversion attempts)
        // If a document with the same supplier reference already exists, it might be 
        // a remnant from a previous call where Add() succeeded but RegisterRelationship() failed.
        if (!string.IsNullOrEmpty(dto.supplierReference))
        {
            var existingChild = await _context.Documents
                .Where(d => d.Type == dto.type && d.SupplierReference == dto.supplierReference && !d.IsDeleted)
                .OrderByDescending(d => d.Id)
                .FirstOrDefaultAsync();

            if (existingChild != null)
            {
                var relationshipExists = await _context.DocumentDocumentRelationships
                    .AnyAsync(r => r.ParentDocumentId == parentId && r.ChildDocumentId == existingChild.Id);

                if (relationshipExists)
                {
                    // Already converted and linked! Just return the existing document.
                    return Ok(new { id = existingChild.Id, docRef = existingChild.DocNumber, message = "Already converted." });
                }
                else 
                {
                    // Ghost found: Document exists with correct reference but NO link to this parent.
                    // Validate that the parent is indeed the source (parent number == child reference)
                    if (parent.DocNumber == dto.supplierReference)
                    {
                        var rel = new DocumentDocumentRelationship { ParentDocumentId = parentId, ChildDocumentId = existingChild.Id };
                        var regResult = await RegisterRelationship(rel);
                        
                        if (regResult is OkObjectResult)
                            return Ok(new { id = existingChild.Id, docRef = existingChild.DocNumber, message = "Conversion relationship restored." });
                    }
                }
            }
        }

        // Determine if parent already moved stock (e.g. BR or BL)
        bool parentMovedStock = (parent.Type == DocumentTypes.supplierReceipt && dto.type == DocumentTypes.supplierInvoice) ||
                                (parent.Type == DocumentTypes.customerDeliveryNote && dto.type == DocumentTypes.customerInvoice);

        // 3. Perform the normal 'Add' logic, bypassing stock update only if parent already moved stock
        var result = await Add(dto, bypassStockUpdate: parentMovedStock);

        if (result is OkObjectResult okResult)
        {
            // Extract the new document ID from the okResult
            if (okResult.Value == null) return StatusCode(500, "Document created but result data is missing.");
            
            var responseData = okResult.Value as dynamic;
            int childId = responseData.id;

            // 3. Register Relationship
            var relationship = new DocumentDocumentRelationship
            {
                ParentDocumentId = parentId,
                ChildDocumentId = childId
            };

            var registerResult = await RegisterRelationship(relationship);
            
            if (registerResult is OkObjectResult)
            {
                // Update parent document's IsInvoiced flag if it is a Customer Delivery Note (BL).
                // The batch createinvoice endpoint already does this; we mirror it here for single conversions
                // so IsInvoiced stays consistent in the database regardless of which path was used.
                var parentDoc = await _context.Documents.FindAsync(parentId);
                if (parentDoc != null && parentDoc.Type == DocumentTypes.customerDeliveryNote)
                {
                    parentDoc.IsInvoiced = true;
                    _context.Entry(parentDoc).State = EntityState.Modified;
                }

                // Transfer payments from parent to child
                var paymentsToTransfer = await _context.Payments
                    .Where(p => p.DocumentId == parentId && !p.IsDeleted)
                    .ToListAsync();
                
                decimal totalTransferredAmount = 0;
                foreach (var payment in paymentsToTransfer)
                {
                    payment.DocumentId = childId;
                    _context.Entry(payment).State = EntityState.Modified;
                    totalTransferredAmount += (payment.Amount ?? 0);
                }

                if (totalTransferredAmount > 0)
                {
                    var childDoc = await _context.Documents
                        .Include(d => d.HoldingTaxes)
                        .FirstOrDefaultAsync(d => d.Id == childId);
                        
                    if (childDoc != null)
                    {
                        double netPayable = childDoc.TotalCostNetTTCDoc;
                        if (childDoc.WithHoldingTax && childDoc.HoldingTaxes != null)
                        {
                            netPayable -= childDoc.HoldingTaxes.TaxValue;
                        }
                        netPayable -= childDoc.TotalCreditNotes;

                        if ((double)totalTransferredAmount >= Math.Round(netPayable, 3, MidpointRounding.AwayFromZero) - 0.005)
                        {
                            childDoc.BillingStatus = BillingStatus.Billed;
                        }
                        else
                        {
                            childDoc.BillingStatus = BillingStatus.PartiallyBilled;
                        }
                        _context.Entry(childDoc).State = EntityState.Modified;
                    }
                }
                
                await _context.SaveChangesAsync();

                return okResult; // Return the successful document creation result
            }
            else
            {
                return StatusCode(500, "Document created but relationship registration failed.");
            }
        }

        return result; 
    }
    #endregion
    #region Create Credit Note
    /**
     * Create Credit Note for a given parent document (usually an invoice).
     * @param parentId The id of the invoice to credit.
     * @param dto The credit note data.
     * @return The created credit note.
     */
    [HttpPost("{parentId}/credit-note")]
    public async Task<ActionResult> CreateCreditNote(int parentId, DocumentDto dto)
    {
        // 1. Validate the parent document exists
        var parentExists = await _context.Documents.AnyAsync(d => d.Id == parentId);
        if (!parentExists)
        {
            return NotFound($"Parent document with ID {parentId} not found.");
        }

        // 2. Perform the normal 'Add' logic
        // The Add method handles numbering, stock (skipped if isservice=true), and ledger entry.
        var result = await Add(dto);

        if (result is OkObjectResult okResult)
        {
            // Extract the new document ID from the okResult
            if (okResult.Value == null) return StatusCode(500, "Credit note created but result data is missing.");
            
            var responseData = okResult.Value as dynamic;
            int childId = responseData.id;

            // 3. Register Relationship
            var relationship = new DocumentDocumentRelationship
            {
                ParentDocumentId = parentId,
                ChildDocumentId = childId
            };

            var registerResult = await RegisterRelationship(relationship);
            
            if (registerResult is OkObjectResult)
            {
                // 4. Update parent document's TotalCreditNotes
                var parentDoc = await _context.Documents.FindAsync(parentId);
                if (parentDoc != null)
                {
                    parentDoc.TotalCreditNotes = (double)Math.Round((decimal)parentDoc.TotalCreditNotes + (decimal)dto.total_net_ttc, 3, MidpointRounding.AwayFromZero);
                    _context.Entry(parentDoc).State = EntityState.Modified;
                    await _context.SaveChangesAsync();
                }

                return okResult; // Return the successful document creation result
            }
            else
            {
                return StatusCode(500, "Credit note created but relationship registration failed.");
            }
        }

        return result; 
    }
    #endregion

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
        try 
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
                // 2. OR ArticleId + PackageReference match
                // 3. OR Type + Description/Transporter for transport fees
                var parentMerch = parent.DocumentMerchandises
                    .FirstOrDefault(pm => 
                        (pm.Type == childMerch.Type && pm.Type == LineType.TransportFee && 
                         (pm.TransporterId == childMerch.TransporterId || pm.Description == childMerch.Description)) ||
                        ((pm.MerchandiseId > 0 && pm.MerchandiseId == childMerch.MerchandiseId) ||
                         (pm.Merchandise != null && childMerch.Merchandise != null &&
                          pm.Merchandise.ArticleId == childMerch.Merchandise.ArticleId && 
                          pm.Merchandise.PackageReference?.Replace("\"", "").Trim() == childMerch.Merchandise.PackageReference?.Replace("\"", "").Trim())));

                if (parentMerch != null)
                {
                    parentMerch.QuantityDelivered += childMerch.Quantity;
                    _context.Entry(parentMerch).State = EntityState.Modified;
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception)
        {
            // Fail gracefully for now to avoid blocking the main conversion flow
            // Ideally log this error to an audit table
        }
    }
    private async Task RecordPriceHistory(Document doc)
    {
      if (doc == null || doc.CounterPartId == 0) return;

      // We only care about transaction documents
      if (doc.Type != DocumentTypes.supplierReceipt 
          && doc.Type != DocumentTypes.supplierInvoice 
          && doc.Type != DocumentTypes.customerDeliveryNote 
          && doc.Type != DocumentTypes.customerInvoice) return;

      // Check if it's a child document (converted from another)
      // If it's an Invoice coming from a BR/BL, we don't record another history entry
      bool hasParentTransaction = await _context.DocumentDocumentRelationships
          .AnyAsync(r => r.ChildDocumentId == doc.Id && 
                        (r.ParentDocument!.Type == DocumentTypes.supplierReceipt || 
                         r.ParentDocument!.Type == DocumentTypes.customerDeliveryNote));
                         
      if (hasParentTransaction) return;

      // Clear existing history for this document (for updates)
      var existingPurchaseHistory = await _context.PurchasePriceHistories
          .Where(h => h.DocumentId == doc.Id)
          .ToListAsync();
      if (existingPurchaseHistory.Any())
          _context.PurchasePriceHistories.RemoveRange(existingPurchaseHistory);

      var existingSalesHistory = await _context.SalesPriceHistories
          .Where(h => h.DocumentId == doc.Id)
          .ToListAsync();
      if (existingSalesHistory.Any())
          _context.SalesPriceHistories.RemoveRange(existingSalesHistory);

      await _context.SaveChangesAsync();

      // Fetch merchandises directly from DB to ensure we have ArticleId and latest data
      var merchandises = await _context.DocumentMerchandises
          .Include(dm => dm.Merchandise)
          .Include(dm => dm.Transporter)
          .Where(dm => dm.DocumentId == doc.Id)
          .ToListAsync();

      foreach (var dm in merchandises.Where(m => m.Type == LineType.Merchandise))
      {
          int articleId = dm.Merchandise?.ArticleId ?? 0;
          if (articleId == 0) continue;

          if (doc.Type == DocumentTypes.supplierReceipt || doc.Type == DocumentTypes.supplierInvoice)
          {
              var history = new PurchasePriceHistory
              {
                  ArticleId = articleId,
                  CounterPartId = doc.CounterPartId ?? 0,
                  PriceValue = dm.UnitPriceHT,
                  TransactionDate = doc.CreationDate ?? DateTime.UtcNow,
                  DocumentId = doc.Id,
                  DocNumber = doc.DocNumber,
                  CreationDate = DateTime.UtcNow,
                  UpdateDate = DateTime.UtcNow,
                  IsDeleted = false
              };
              _context.PurchasePriceHistories.Add(history);

              // §5.16 — Mettre à jour le dernier prix d'achat sur l'article
              var article = await _context.Articles.FindAsync(articleId);
              if (article != null && dm.Quantity > 0)
              {
                  // On stocke le prix TTC (ou HT selon le besoin, ici l'entité semble attendre TTC par convention dans ACYA)
                  article.LastPurchasePriceTTC = (double)(dm.CostTTC / dm.Quantity);
                  _context.Entry(article).State = EntityState.Modified;
              }
          }
          else if (doc.Type == DocumentTypes.customerDeliveryNote || doc.Type == DocumentTypes.customerInvoice)
          {
              var history = new SalesPriceHistory
              {
                  ArticleId = articleId,
                  CounterPartId = doc.CounterPartId ?? 0,
                  PriceValue = dm.UnitPriceHT,
                  TransactionDate = doc.CreationDate ?? DateTime.UtcNow,
                  DocumentId = doc.Id,
                  DocNumber = doc.DocNumber,
                  CreationDate = DateTime.UtcNow,
                  UpdateDate = DateTime.UtcNow,
                  IsDeleted = false
              };
              _context.SalesPriceHistories.Add(history);
          }
      }
      await _context.SaveChangesAsync();
    }
    #endregion

    private async Task<(bool exceedsLimit, double currentTotal, double ceiling, string message)> CheckDailyCeilingAsync(double newInvoiceAmount, DateTime? invoiceDate, int? excludeDocId = null)
    {
      var dateToCheck = invoiceDate ?? DateTime.UtcNow;
      string dateString = dateToCheck.ToString("yyyy-MM-dd");

      var ceilingVar = await _context.AppVariables
          .FirstOrDefaultAsync(av => av.Nature == "DailyInvoiceCeiling" && av.Name == dateString && av.isActive == true && av.isDeleted == false);

      if (ceilingVar == null || ceilingVar.Value == null || ceilingVar.Value.Value <= 0)
      {
        return (false, 0, 0, string.Empty);
      }

      double ceilingValue = ceilingVar.Value.Value;

      var day = dateToCheck.Day;
      var month = dateToCheck.Month;
      var year = dateToCheck.Year;

      double currentTotal = await _context.Documents
          .Where(d => d.Type == DocumentTypes.customerInvoice 
                   && d.IsDeleted == false
                   && (!excludeDocId.HasValue || d.Id != excludeDocId.Value)
                   && d.CreationDate.HasValue
                   && d.CreationDate.Value.Day == day
                   && d.CreationDate.Value.Month == month
                   && d.CreationDate.Value.Year == year)
          .SumAsync(d => d.TotalCostNetTTCDoc);

      double projectedTotal = currentTotal + newInvoiceAmount;
      if (projectedTotal > ceilingValue)
      {
        string msg = $"Le plafond journalier de {ceilingValue:F3} DT serait dépassé. Total actuel: {currentTotal:F3} DT. Nouveau document: {newInvoiceAmount:F3} DT.";
        return (true, currentTotal, ceilingValue, msg);
      }

      return (false, currentTotal, ceilingValue, string.Empty);
    }

    [HttpGet("customer-invoices-without-rs/{customerId}")]
    public async Task<ActionResult> GetCustomerInvoicesWithoutRS(int customerId)
    {
      var count = await _context.Documents
          .Where(d => d.CounterPartId == customerId
                   && d.Type == DocumentTypes.customerInvoice
                   && !d.IsDeleted
                   && !d.WithHoldingTax)
          .CountAsync();

      return Ok(new { count });
    }

    #endregion

  }
}
