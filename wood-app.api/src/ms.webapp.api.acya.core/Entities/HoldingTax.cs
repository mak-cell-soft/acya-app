using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class HoldingTax : IEntity
  {
    public int Id { get; set; }
    public string? Description { get; set; }
    // NOTE: Référence documentaire de la RS (ex: numéro avis débit fiscal, attestation)
    public string? Reference { get; set; }
    public double TaxPercentage { get; set; }
    public double TaxValue { get; set; }
    public bool isSigned { get; set; }
    public DateTime CreationDate { get; set; }
    public DateTime UpdateDate { get; set; }
    public double NewAmountDocValue { get; set; }
    public bool IsDeleted { get; set; }


    //public Document? Documents { get; set; }

    public int UpdatedById { get; set; }
    //public int? AppUsersId { get; set; }
    public AppUser? AppUsers { get; set; }

    public HoldingTax()
    {

    }

    public HoldingTax(HoldingTaxDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(HoldingTaxDto dto)
    {
      Id = (int)dto.id!;
      Description = dto.description;
      // NOTE: Mapper la référence documentaire RS depuis le DTO
      Reference = dto.reference;
      TaxPercentage = dto.taxpercentage;
      TaxValue = dto.taxvalue;
      isSigned= dto.issigned;
      CreationDate= dto.creationdate;
      UpdateDate= dto.updatedate;
      NewAmountDocValue= dto.newamountdocvalue;
      IsDeleted = dto.isdeleted;
      UpdatedById = dto.updatedbyid;
    }
  }
}
