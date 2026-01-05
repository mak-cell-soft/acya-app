using ms.webapp.api.acya.core.Entities.DTOs.Config;

namespace ms.webapp.api.acya.core.Entities
{
  public class Bank : IEntity
  {
    public int Id { get; set; }    
    public string? Reference { get; set; }
    public string? Designation { get; set; }
    public string? Logo { get; set; }
    public string? Agency { get; set; }
    public string? Rib { get; set; }
    public string? Iban { get; set; }
    public DateTime CreationDate { get; set; }
    public DateTime UpdateDate { get; set; }
    public bool? IsDeleted { get; set; }

    public int? UpdatedBy { get; set; }
    public AppUser? AppUser { get; set; }
    
    public Bank()
    {

    }

    public Bank(BankDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(BankDto dto)
    {
      Id = (int)dto.id!;
      UpdatedBy = dto.updatedby;
      Reference= dto.reference;
      Designation= dto.designation;
      Logo= dto.logo;
      Agency= dto.agency;
      Rib = dto.rib;
      Iban = dto.iban;
      CreationDate= dto.creationdate;
      UpdateDate= dto.updatedate;
      IsDeleted = dto.isdeleted;
    }
  }

}
