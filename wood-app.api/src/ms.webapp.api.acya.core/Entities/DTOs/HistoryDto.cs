using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class SellPriceHistoryDto
  {
    public int id { get; set; }
    public double pricevalue { get; set; }
    public string? description { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public bool isdeleted { get; set; }
    public int articleid { get; set; }
    public int updatedby { get; set; }
    public string? updatedby_name { get; set; }

    public SellPriceHistoryDto()
    {
    }

    public SellPriceHistoryDto(SellPriceHistory entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(SellPriceHistory entity)
    {
      id = entity.Id;
      pricevalue = entity.PriceValue;
      description= entity.Description;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      isdeleted = entity.IsDeleted;
      articleid = entity.ArticleId;
      updatedby = entity.UpdatedBy;
      updatedby_name = entity.AppUsers?.Persons?.FullName ?? entity.AppUsers?.Login;
    }
  }

  public class PurchasePriceHistoryDto
  {
    public int id { get; set; }
    public int articleid { get; set; }
    public int counterpartid { get; set; }
    public string? counterpartname { get; set; }
    public double pricevalue { get; set; }
    public DateTime transactiondate { get; set; }
    public int documentid { get; set; }
    public string? docnumber { get; set; }
    public DateTime? creationdate { get; set; }
    public bool isdeleted { get; set; }
    public int? updatedby_id { get; set; }
    public string? updatedby_name { get; set; }

    public PurchasePriceHistoryDto() { }

    public PurchasePriceHistoryDto(PurchasePriceHistory entity)
    {
      id = entity.Id;
      articleid = entity.ArticleId;
      counterpartid = entity.CounterPartId;
      counterpartname = entity.Supplier?.Name;
      pricevalue = entity.PriceValue;
      transactiondate = entity.TransactionDate;
      documentid = entity.DocumentId;
      docnumber = entity.DocNumber;
      creationdate = entity.CreationDate;
      isdeleted = entity.IsDeleted;
      updatedby_id = entity.UpdatedById ?? entity.Document?.UpdatedById;
      var user = entity.UpdatedBy ?? entity.Document?.AppUsers;
      updatedby_name = user?.Persons?.FullName ?? user?.Login;
    }
  }

  public class SalesPriceHistoryDto
  {
    public int id { get; set; }
    public int articleid { get; set; }
    public int counterpartid { get; set; }
    public string? counterpartname { get; set; }
    public double pricevalue { get; set; }
    public DateTime transactiondate { get; set; }
    public int documentid { get; set; }
    public string? docnumber { get; set; }
    public DateTime? creationdate { get; set; }
    public bool isdeleted { get; set; }
    public int? updatedby_id { get; set; }
    public string? updatedby_name { get; set; }

    public SalesPriceHistoryDto() { }

    public SalesPriceHistoryDto(SalesPriceHistory entity)
    {
      id = entity.Id;
      articleid = entity.ArticleId;
      counterpartid = entity.CounterPartId;
      counterpartname = entity.Customer?.Name;
      pricevalue = entity.PriceValue;
      transactiondate = entity.TransactionDate;
      documentid = entity.DocumentId;
      docnumber = entity.DocNumber;
      creationdate = entity.CreationDate;
      isdeleted = entity.IsDeleted;
      updatedby_id = entity.UpdatedById ?? entity.Document?.UpdatedById;
      var user = entity.UpdatedBy ?? entity.Document?.AppUsers;
      updatedby_name = user?.Persons?.FullName ?? user?.Login;
    }
  }
}
