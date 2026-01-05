using System;

namespace ms.webapp.api.acya.core.Entities.Dtos
{
  public class PersonDto
  {
    public int id { get; set; }
    public string? firstname { get; set; }
    public string? lastname { get; set; }
    public string? guid { get; set; }
    public DateTime? birthdate { get; set; }
    public string? cin { get; set; }
    public string? idcnss { get; set; }
    public int role { get; set; }
    public string? address { get; set; }
    public string? birthtown { get; set; }
    public string? bankname { get; set; }
    public string? bankaccount { get; set; }
    public string? phonenumber { get; set; }
    public bool isdeleted { get; set; }
    public bool isappuser { get; set; }
    public DateTime? hiredate { get; set; }
    public DateTime? firedate { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public int updatedby { get; set; }

    public PersonDto() { }

    public PersonDto(Person entity)
    {
      id = entity.Id;
      firstname = entity.Firstname;
      lastname = entity.Lastname;
      guid = entity.Guid.ToString();
      birthdate = entity.BirthDate;
      cin = entity.Cin;
      idcnss = entity.IdCnss;
      role = (int)entity.Role;
      address = entity.Address;
      birthtown = entity.BirthTown;
      bankname = entity.BankName;
      bankaccount= entity.BankAccount;
      phonenumber = entity.PhoneNumber;
      isdeleted = entity.IsDeleted;
      isappuser = entity.IsAppUser;
      hiredate = entity.HireDate;
      firedate = entity.FireDate;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      updatedby = (int)entity.UpdadatedById!;
    }
  }
}
