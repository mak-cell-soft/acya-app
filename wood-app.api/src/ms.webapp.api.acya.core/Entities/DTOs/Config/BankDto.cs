namespace ms.webapp.api.acya.core.Entities.DTOs.Config
{
  public class BankDto
  {
    public int? id { get; set; }
    public int? updatedby { get; set; }
    public string? reference { get; set; }
    public string? designation { get; set; }
    public string? logo { get; set; }
    public string? agency { get; set; }
    public string? rib { get; set; }
    public string? iban { get; set; }
    public DateTime creationdate { get; set; }
    public DateTime updatedate { get; set; }
    public bool? isdeleted { get; set; }
    public bool? editing { get; set; }

    public BankDto()
    {

    }

    public BankDto(Bank entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Bank entity)
    {
      id = entity.Id;
      updatedby = entity.UpdatedBy;
      reference = entity.Reference; 
      designation = entity.Designation;
      logo = entity.Logo;
      agency = entity.Agency;
      rib= entity.Rib;
      iban = entity.Iban;
      creationdate = entity.CreationDate; 
      updatedate = entity.UpdateDate;
      isdeleted = entity.IsDeleted;
    }
  }
}
