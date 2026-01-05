using System.Security.Principal;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.core.Entities
{
  public class Person : IEntity
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public string? Firstname { get; set; }
    public string? Lastname { get; set; }
    public string? FullName { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Cin { get; set; }
    public string? IdCnss { get; set; }
    public Roles Role { get; set; }
    public string? Address { get; set; }
    public string? BirthTown { get; set; }
    public string? BankName { get; set; }
    public string? BankAccount { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsDeleted { get; set; }
    public bool IsAppUser { get; set; }
    public DateTime? HireDate { get; set; }
    public DateTime? FireDate { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public int? UpdadatedById { get; set; } 

    public Person() { }

    public Person(PersonDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(PersonDto dto)
    {
      Id = dto.id;
      /**
       * Le Problème est là
       */
      if (string.IsNullOrEmpty(dto.guid))
      {
        Guid = Guid.NewGuid();
      } else
      {
        Guid = Guid.TryParse(dto.guid!.ToString(), out Guid _guid) ? _guid : Guid.Parse(dto.guid!);
      }
      Firstname = Helpers.CapitalizeFirstLetter(dto.firstname!);
      Lastname = dto.lastname!.ToUpper();
      FullName = $"{dto.firstname} {dto.lastname!.ToUpper()}";
      BirthDate = dto.birthdate;
      Cin = dto.cin;
      IdCnss = dto.idcnss;
      Role = Enum.TryParse(dto.role.ToString(), out Roles parsedRole) ? parsedRole : Roles.Seller;
      Address = dto.address;
      BirthTown = dto.birthtown;
      BankName= dto.bankname;
      BankAccount= dto.bankaccount;
      PhoneNumber = dto.phonenumber;
      IsDeleted = !string.IsNullOrEmpty(dto.isdeleted.ToString()) ? bool.Parse(dto.isdeleted.ToString()) : false;
      IsAppUser = dto.isappuser;
      HireDate = !string.IsNullOrEmpty(dto.hiredate.ToString()) ? DateTime.Parse(dto.hiredate.ToString()!) : DateTime.MinValue;
      FireDate = !string.IsNullOrEmpty(dto.firedate.ToString()) ? DateTime.Parse(dto.firedate.ToString()!) : DateTime.MaxValue;
      CreationDate = !string.IsNullOrEmpty(dto.creationdate.ToString()) ? DateTime.Parse(dto.creationdate.ToString()!) : DateTime.Now;
      UpdateDate = !string.IsNullOrEmpty(dto.updatedate.ToString()) ? DateTime.Parse(dto.updatedate.ToString()!) : DateTime.Now;
      UpdadatedById = dto.updatedby;
    }
  }
}
