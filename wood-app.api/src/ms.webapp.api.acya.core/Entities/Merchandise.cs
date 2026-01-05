using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities
{
  public class Merchandise : IEntity
  {
    public int Id { get; set; }
    public string? PackageReference { get; set; }
    public string? Description { get; set; }

    /**
    * Is Invoicible : Marchandise Facturable
    */
    public bool IsInvoicible { get; set; }

    /**
    * Allow Negtiv Stock : Autoriser stock Negatif
    */
    public bool AllowNegativStock { get; set; }

    /**
     * A Merchandise is merged with another 
     */
    public bool IsMergedWith { get; set; }
    public int? IdMergedMerchandise { get; set; }
    public bool IsDeleted { get; set; }

    public int ArticleId { get; set; }
    public Article? Articles { get; set; }

    // Updated relationship
    public ICollection<DocumentMerchandise> DocumentMerchandises { get; set; } = new HashSet<DocumentMerchandise>();

    public ICollection<Document> Documents { get; set; } = new HashSet<Document>();

    //public int? QuantityMovementId { get; set; }
   

    public int UpdatedById { get; set; }
    public AppUser? AppUsers { get; set; }

    public Merchandise()
    {
    }

    public Merchandise(MerchandiseDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(MerchandiseDto dto)
    {
      Id = (int)dto.id!;
      PackageReference = dto.packagereference;
      Description = dto.description;
      IsInvoicible = dto.isinvoicible;
      AllowNegativStock = dto.allownegativstock;
      IsMergedWith = dto.ismergedwith;
      IdMergedMerchandise = dto.idmergedmerchandise;
      UpdatedById = dto.updatedbyid;
      IsDeleted = dto.isdeleted;
      //if (dto.article != null)
      //{
      //  if (Articles == null)
      //  {
      //    Articles = new Article();
      //  }
      //  Articles.UpdateFromDto(dto.article);
      //}
      //else
      //{
      //  Articles = null;
      //}

      //if (dto.lisoflengths != null)
      //{
      //  if (QuantityMovements == null)
      //  {
      //    QuantityMovements = new QuantityMovement(dto.lisoflengths);
      //  }
      //}
      //else
      //{
      //  QuantityMovements = null;
      //}

      if (dto.article != null)
      {
        if (Articles == null)
        {
          Articles = new Article();
        }
      }
      else
      {
        Articles = null;
      }
    }
  }
}

