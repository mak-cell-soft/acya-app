using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Provider : IEntity
  {
    public int Id { get; set; }
    public string? Prefix { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; } // Description du Nom od Provider Name
    public string? RepresentedByName { get; set; }
    public string? RepresentedBySurname { get; set; }
    public string? RepresentedByFullname { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? Category { get; set; } // What does he sell ?
    public string? TaxRegistrationNumber { get; set; } // Matricule Fiscal
    public string? PhoneNumberOne { get; set; }
    public string? PhoneNumberTwo { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsActive { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    
    public int UpdatedById { get; set; }
    public AppUser? AppUsers { get; set; }

    public Provider()
    {

    }

    public Provider(ProviderDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(ProviderDto dto)
    {
      Id= (int)dto.id!;
      Prefix= dto.prefix;
      Name= dto.name!.ToUpper();
      Description= dto.description;
      Category = dto.category;
      RepresentedByName = dto.representedbyname!.ToUpper();
      RepresentedByFullname= dto.representedbyfullname;
      RepresentedBySurname = dto.representedbysurname;
      Address= dto.address;
      Email= dto.email;
      TaxRegistrationNumber= dto.taxregistrationnumber;
      PhoneNumberOne= dto.phonenumberone;
      PhoneNumberTwo= dto.phonenumberone;
      BankName= dto.bankname;
      BankAccountNumber= dto.bankaccountnumber;
      CreationDate= dto.creationdate;
      UpdateDate= dto.updatedate;
      UpdatedById = dto.updatedbyid;
    }
  }
}
