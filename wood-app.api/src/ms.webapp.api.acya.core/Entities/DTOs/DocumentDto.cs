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

    public ICollection<DocumentDto>? childdocuments { get; set; } = new List<DocumentDto>();

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
      isdeleted = entity.IsDeleted;
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
      if (entity.Merchandises!= null)
      {
        if (merchandises == null)
        {
          merchandises = entity.Merchandises
                            .Select(m => new MerchandiseDto(m))
                            .ToArray();
        }
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
