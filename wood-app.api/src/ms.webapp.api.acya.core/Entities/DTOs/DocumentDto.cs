using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Entities.DTOs.Config;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class DocumentDto
  {
    public int? id { get; set; }
    /**
     *  supplierOrder, supplierReceipt, supplierInvoice, 
     *  customerOrder, customerDeliveryNote, customerInvoice
     */
    public DocumentTypes? type { get; set; }

    /**
    * Define Transaction Type : Add or Retrieve
    * Essential to know historic quantity details
    */
    public TransactionType? stocktransactiontype { get; set; }

    /**
     * Reference of the document
     */
    public string? docnumber { get; set; }

    /**
     * Description of the document
     */
    public string? description { get; set; }
    public string? supplierReference { get; set; }
    public bool isinvoiced { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public int updatedbyid { get; set; }
    /**
     * Total Prices Calculculated of the given Document
     */
    public double total_ht_net_doc { get; set; }
    public double total_net_ttc { get; set; }
    public double total_tva_doc { get; set; }
    public double total_discount_doc { get; set; }
    public double? total_net_payable { get; set; }
    /**
     * Holding Taxe : Retenue à la source
     */
    public bool withholdingtax { get; set; }
    public HoldingTaxDto? holdingtax { get; set; }
    /**
    * Taxe : Droit de Timbre
    */
    public AppVariableDto? taxe { get; set; }
    public CounterPartDto? counterpart { get; set; }
    public SiteDto? sales_site { get; set; }
    public AppUserDto? appuser { get; set; }
    public MerchandiseDto[]? merchandises { get; set; }

    /**
     * Regulation of the Document
     */
    public int regulationid { get; set; }
    public bool isdeleted { get; set; }
    public bool editing { get; set; } = false;
    public DocStatus docstatus { get; set; }
    public BillingStatus billingstatus { get; set; }
    public bool isservice { get; set; }
    public bool isPaid { get; set; }
    public double total_paid { get; set; }
    public double total_credit_notes { get; set; }
    public double remaining_balance { get; set; }

    public ICollection<DocumentDto>? childdocuments { get; set; } = new List<DocumentDto>();
    public ICollection<DocumentDto>? parentdocuments { get; set; } = new List<DocumentDto>();
    public List<string>? deliveryNoteDocNumbers { get; set; }

    public DocumentDto()
    {
    }

    public DocumentDto(Document entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Document entity)
    {
      id = entity.Id; 
      type = entity.Type;
      stocktransactiontype = entity.StockTransactionType;
      docnumber = entity.DocNumber; 
      description = entity.Description;
      supplierReference= entity.SupplierReference;
      isinvoiced = entity.IsInvoiced;
      description = entity.Description;
      creationdate = entity.CreationDate; 
      updatedate = entity.UpdateDate;
      updatedbyid = (int)entity.UpdatedById!;
      total_ht_net_doc = entity.TotalCostHTNetDoc;
      total_net_ttc = entity.TotalCostNetTTCDoc;
      total_tva_doc = entity.TotalCostTvaDoc;
      total_discount_doc = entity.TotalCostDiscountDoc;
      docstatus = entity.DocStatus;
      billingstatus = entity.BillingStatus;
      isservice = entity.Isservice;
      isPaid = entity.BillingStatus == BillingStatus.Billed;
      isdeleted = entity.IsDeleted;
      withholdingtax = entity.WithHoldingTax;

      // Calculate total_net_payable if RS is applied
      if (entity.WithHoldingTax && entity.HoldingTaxes != null)
      {
          total_net_payable = entity.TotalCostNetTTCDoc - entity.HoldingTaxes.TaxValue;
          holdingtax = new HoldingTaxDto
          {
              id = entity.HoldingTaxes.Id,
              description = entity.HoldingTaxes.Description,
              taxpercentage = entity.HoldingTaxes.TaxPercentage,
              taxvalue = entity.HoldingTaxes.TaxValue,
              issigned = entity.HoldingTaxes.isSigned,
              creationdate = entity.HoldingTaxes.CreationDate,
              updatedate = entity.HoldingTaxes.UpdateDate,
              newamountdocvalue = (float)entity.HoldingTaxes.NewAmountDocValue,
              documentid = entity.Id
          };
      }
      else
      {
          total_net_payable = entity.TotalCostNetTTCDoc;
          holdingtax = null;
      }

      // Calculate total_paid, total_credit_notes and remaining_balance
      total_paid = entity.Payments != null && entity.Payments.Any(p => !p.IsDeleted) 
          ? (double)entity.Payments.Where(p => !p.IsDeleted).Sum(p => p.Amount ?? 0) 
          : 0;
      
      total_credit_notes = entity.TotalCreditNotes;

      remaining_balance = (total_net_payable ?? total_net_ttc) - total_paid - total_credit_notes;

      // Populate childdocuments if navigation property is loaded
      if (entity.ChildDocuments != null && entity.ChildDocuments.Any())
      {
          childdocuments = entity.ChildDocuments
              .Where(cd => cd.ChildDocument != null)
              .Select(cd => new DocumentDto {
                  id = cd.ChildDocument!.Id,
                  docnumber = cd.ChildDocument.DocNumber,
                  creationdate = cd.ChildDocument.CreationDate,
                  type = cd.ChildDocument.Type
              }).ToList();
      }

      // Populate parentdocuments if navigation property is loaded
      if (entity.ParentDocuments != null && entity.ParentDocuments.Any())
      {
          parentdocuments = entity.ParentDocuments
              .Where(pd => pd.ParentDocument != null)
              .Select(pd => new DocumentDto {
                  id = pd.ParentDocument!.Id,
                  docnumber = pd.ParentDocument.DocNumber,
                  creationdate = pd.ParentDocument.CreationDate,
                  type = pd.ParentDocument.Type
              }).ToList();
      }

      if(entity.Taxes != null)
      {
        if(taxe == null) 
        {
          taxe = new AppVariableDto();
        }
        taxe.UpdateFromEntity(entity.Taxes);
      } else
      {
        taxe = null;
      }
      if (entity.DocumentMerchandises != null && entity.DocumentMerchandises.Any())
      {
          merchandises = entity.DocumentMerchandises
                            .Select(dm => new MerchandiseDto(dm))
                            .ToArray();
      }
      else
      {
        merchandises = null;
      }

      if (entity.CounterPart != null)
      {
        if (counterpart == null)
        {
          counterpart = new CounterPartDto();
        }
        counterpart.UpdateFromEntity(entity.CounterPart);
      }
      else
      {
        counterpart = null;
      }

      if (entity.SalesSite != null)
      {
        if (sales_site == null)
        {
          sales_site = new SiteDto();
        }
        sales_site.UpdateFromEntity(entity.SalesSite);
      }
      else
      {
        sales_site = null;
      }

      if (entity.AppUsers != null)
      {
        if (appuser == null)
        {
          appuser = new AppUserDto(entity.AppUsers);
        }
      }
      else
      {
        appuser = null;
      }
    }
  }
}
