using Newtonsoft.Json;
using System.Linq;
using System.Reflection.Metadata;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Document : IEntity
  {
    public int Id { get; set; }
    /**
    *  supplierOrder, supplierReceipt, supplierInvoice, 
    *  customerOrder, customerDeliveryNote, customerInvoice
    */
    public DocumentTypes? Type { get; set; }

    /**
     * Define Transaction Type : Add or Retrieve
     * Essential to know historic quantity details
     */
    public TransactionType? StockTransactionType { get; set; }
    public string? DocNumber { get; set; }
    public string? Description { get; set; }
    public string? SupplierReference { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsInvoiced { get; set; }
    public bool WithHoldingTax { get; set; } // Avec RS ?

    /**
     * Total Prices Calculculated of the given Document
     */
    public double TotalCostHTNetDoc { get; set; }
    public double TotalCostNetTTCDoc { get; set; }
    public double TotalCostTvaDoc { get; set; } = 0;
    public double TotalCostDiscountDoc { get; set; }

    /**
    * Holding Taxe : Retenue à la source
    */
    public int? HoldingTaxId { get; set; }
    public HoldingTax? HoldingTaxes { get; set; }

    /**
    * Taxe : Droit de Timbre
    */
    public int? TaxeId { get; set; }
    public AppVariable? Taxes { get; set; }

    public int? UpdatedById { get; set; }
    public AppUser? AppUsers { get; set; }

    //public int MerchandiseId { get; set; }
    /**
     * Navigation property for many-to-many relationship
     */
    public ICollection<Merchandise> Merchandises { get; set; } = new HashSet<Merchandise>();

    public ICollection<DocumentMerchandise> DocumentMerchandises { get; set; } = new HashSet<DocumentMerchandise>();

    public int CounterPartId { get; set; }
    public CounterPart? CounterPart { get; set; }
    public bool IsDeleted { get; set; }

    public int SalesSiteId { get; set; }
    public SalesSite? SalesSite { get; set; }

    public DocStatus DocStatus { get; set; }
    public BillingStatus BillingStatus { get; set; }

    /**
    * Navigation property for Document Document Relationship
    */
    //[JsonIgnore]
    //public ICollection<DocumentDocumentRelationship> ParentDocuments { get; set; } = new List<DocumentDocumentRelationship>();

    [JsonIgnore]
    public ICollection<DocumentDocumentRelationship> ChildDocuments { get; set; } = new List<DocumentDocumentRelationship>();

    public Document()
    {
    }

    public Document(DocumentDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(DocumentDto dto)
    {
      Id = (int)dto.id!;
      Type = dto.type;
      StockTransactionType = dto.stocktransactiontype;
      DocNumber = dto.docnumber;
      Description = dto.description;
      SupplierReference = dto.supplierReference;
      IsInvoiced = dto.isinvoiced;
      CreationDate = dto.creationdate;
      UpdateDate = dto.updatedate;
      UpdatedById = dto.updatedbyid;
      WithHoldingTax = dto.withholdingtax;
      /**
       * Prices and Costs
       */
      TotalCostHTNetDoc = dto.total_ht_net_doc;
      TotalCostNetTTCDoc = dto.total_net_ttc;
      //TotalDiscountPercentage= dto.total_tva_doc;
      TotalCostDiscountDoc = dto.total_discount_doc;
      TotalCostTvaDoc = dto.total_tva_doc;
      /**
       */
      BillingStatus = dto.billingstatus;
      IsDeleted = dto.isdeleted;
      //ChildDocuments = dto.childdocuments!.Select(cd => new DocumentDocumentRelationship
      //{
      //  ChildDocument = new Document(cd)

      //}).ToList();

      // CounterPart 
      if (dto.counterpart != null)
      {
        CounterPart = new CounterPart(dto.counterpart);
      }
      else
      {
        CounterPart = null;
      }
      // SalesSite
      if (dto.sales_site != null)
      {
        SalesSite = new SalesSite(dto.sales_site);
      }
      else
      {
        SalesSite = null;
      }
      // Taxe Appvariale
      if (dto.taxe != null)
      {
        Taxes = new AppVariable(dto.taxe);
      }
      else
      {
        Taxes = null;
      }

      // Holding Tax
      if (dto.holdingtax != null)
      {
        HoldingTaxes = new HoldingTax(dto.holdingtax);
      }
      else
      {
        HoldingTaxes = null;
      }

      // AppUser
      if (dto.appuser != null)
      {
        AppUsers = new AppUser(dto.appuser);
      }
      else
      {
        AppUsers = null;
      }
    }
  }
}
