using System;

namespace ms.webapp.api.acya.core.Entities.Dtos
{
  public class PersonSafeDto
  {
    public int id { get; set; }
    public string? firstname { get; set; }
    public string? lastname { get; set; }
    public string? guid { get; set; }
    public int role { get; set; }
    public string? phonenumber { get; set; }
    public bool isdeleted { get; set; }
    public bool isappuser { get; set; }
    public DateTime? hiredate { get; set; }
    public DateTime? firedate { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public int updatedby { get; set; }

    public PersonSafeDto() { }

    public PersonSafeDto(PersonDto dto)
    {
      if (dto == null) return;
      id = dto.id;
      firstname = dto.firstname;
      lastname = dto.lastname;
      guid = dto.guid;
      role = dto.role;
      phonenumber = dto.phonenumber;
      isdeleted = dto.isdeleted;
      isappuser = dto.isappuser;
      hiredate = dto.hiredate;
      firedate = dto.firedate;
      creationdate = dto.creationdate;
      updatedate = dto.updatedate;
      updatedby = dto.updatedby;
    }

    public PersonSafeDto(Person entity)
    {
      if (entity == null) return;
      id = entity.Id;
      firstname = entity.Firstname;
      lastname = entity.Lastname;
      guid = entity.Guid.ToString();
      role = (int)entity.Role;
      phonenumber = entity.PhoneNumber;
      isdeleted = entity.IsDeleted;
      isappuser = entity.IsAppUser;
      hiredate = entity.HireDate;
      firedate = entity.FireDate;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      updatedby = entity.UpdadatedById ?? 0;
    }
  }
}
