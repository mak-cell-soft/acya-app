using System.Collections;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Product
{
  public class Article : IEntity, IAuditable
  {
    public int Id { get; set; }
    public string? Reference { get; set; }
    public string? Description { get; set; }
    public bool IsWood { get; set; }
    public DateTime CreationDate { get; set; }
    public DateTime UpdateDate { get; set; }
    public bool IsDeleted { get; set; }
    public double? MinQuantity { get; set; }
    public string? Unit { get; set; }
    public double? SellPriceHT { get; set; }
    public double? SellPriceTTC { get; set; }
    public double LastPurchasePriceTTC { get; set; }
    public double? ProfitMarginPercentage { get; set; }
    /**
     * String contains appvariable names of choosen Lengths of Wood 
     * like : 330, 360, 390, 420
     */
    public string? Lengths { get; set; }
    public string? ImageUrl { get; set; }

    public int? SellHistoryId { get; set; }
    public SellPriceHistory? SellHistories { get; set; }
    public virtual ICollection<PurchasePriceHistory> PurchasePriceHistories { get; set; } = new List<PurchasePriceHistory>();
    public virtual ICollection<SalesPriceHistory> SalesPriceHistories { get; set; } = new List<SalesPriceHistory>();

    public int TvaId { get; set; }
    public AppVariable? TVAs { get; set; }

    public int ParentId { get; set; } // Equivalent to Category
    public Parent? Parents { get; set; }

    public int FirstChildId { get; set; } // Equivalent to SubCategory
    public FirstChild? FirstChildren { get; set; }

    public int UpdatedBy { get; set; }
    public AppUser? AppUsers { get; set; }

    public int? ThicknessId { get; set; }
    public AppVariable? Thicknesses { get; set; }

    public int? WidthId { get; set; }
    public AppVariable? Widths { get; set; }

    

    public Article()
    {
    }

    public Article(ArticleDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(ArticleDto dto)
    {
      Id = dto.id ?? 0;
      Reference = dto.reference ?? string.Empty;
      Description = dto.description;
      IsDeleted = dto.isdeleted;
      IsWood = dto.iswood;
      CreationDate = dto.creationdate;
      UpdateDate = dto.updatedate;
      UpdatedBy = dto.updatedby ?? 0;
      Unit = dto.unit;
      MinQuantity= dto.minquantity;
      SellPriceHT = dto.sellprice_ht;
      SellPriceTTC = dto.sellprice_ttc;
      Lengths = dto.lengths;
      LastPurchasePriceTTC = dto.lastpurchaseprice_ttc;
      ProfitMarginPercentage = dto.profitmarginpercentage;

      TvaId = dto.tvaid;
      ThicknessId =dto.thicknessid;
      WidthId = dto.widthid;
      ParentId = dto.categoryid;
      FirstChildId = dto.subcategoryid;
      ImageUrl = dto.imageurl;
    }

  }
}
