using System.Text.RegularExpressions;
using System.Xml.Linq;
using ms.webapp.api.acya.core.Entities.Dtos.Config;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class ArticleDto
  {
    public int? id { get; set; }
    public string? reference { get; set; }
    public string? description { get; set; }
    public int categoryid { get; set; }
    public int subcategoryid { get; set; }
    public bool iswood { get; set; }
    public int? thicknessid { get; set; }
    public int? widthid { get; set; }
    public string? unit { get; set; }
    public double sellprice_ht { get; set; }
    public double lastpurchaseprice_ttc { get; set; }
    public int tvaid { get; set; }
    public double sellprice_ttc { get; set; }
    public DateTime creationdate { get; set; }
    public DateTime updatedate { get; set; }
    public int? updatedby { get; set; }
    public bool isdeleted { get; set; }
    public double? minquantity { get; set; }
    public double? profitmarginpercentage { get; set; }
    public string? lengths { get; set; } //example : [3.3, 3.6, 5.4]
    public bool? editing { get; set; } = false;
    public CategoryDto? category { get; set; }
    public FirstChildDto? subcategory { get; set; }
    public AppVariableDto? tva { get; set; }
    public AppVariableDto? thickness { get; set; }
    public AppVariableDto? width { get; set; }
    public AppUserDto? appuser { get; set; }

    public ArticleDto() { }
    public ArticleDto(Article entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Article entity)
    {
      id = entity.Id;
      reference = entity.Reference;
      description = entity.Description;
      iswood = entity.IsWood; 
      isdeleted = entity.IsDeleted;
      creationdate = entity.CreationDate; 
      updatedate = entity.UpdateDate;
      updatedby = entity.UpdatedBy;
      minquantity = entity.MinQuantity;
      sellprice_ht = (double)entity.SellPriceHT!;
      sellprice_ttc = (double)entity.SellPriceTTC!;
      unit = entity.Unit;
      lengths= entity.Lengths;
      lastpurchaseprice_ttc = (double)entity.LastPurchasePriceTTC;
      profitmarginpercentage = entity.ProfitMarginPercentage;

      categoryid = entity.ParentId;
      thicknessid = entity.ThicknessId;
      widthid = entity.WidthId;
      tvaid = entity.TvaId;
      subcategoryid = entity.FirstChildId;
      updatedby= entity.UpdatedBy;

      if (entity.TVAs != null)
      {
        tva = new AppVariableDto(entity.TVAs);
      }
      if (entity.Thicknesses != null)
      {
        thickness = new AppVariableDto(entity.Thicknesses);
      }
      if (entity.Parents != null)
      {
        category = new CategoryDto(entity.Parents);
      }
      if (entity.Widths != null)
      {
        width= new AppVariableDto(entity.Widths);
      }
      if (entity.FirstChildren != null)
      {
        subcategory = new FirstChildDto(entity.FirstChildren);
      }
      if (entity.AppUsers != null)
      {
        appuser = new AppUserDto(entity.AppUsers);
      }

    }
  }
}
