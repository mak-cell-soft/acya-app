using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class CounterPart : IEntity
  {
    public int Id { get; set; }
    public Guid? Guid { get; set; }
    /**
     * CustomerType : Customer or Provider or Both
     */
    public CounterPartType Type { get; set; }
    /**
     * Prefix : STE - Mr - Mme
     */
    public string? Prefix { get; set; }
    /**
     * Name - Descripttion : Nom et Description de la Société
     */
    public string? Name { get; set; }
    public string? Description { get; set; }
    /**
     * Firstname - Lastname : Nom et prénom pour le  Client 
     * OU nom et prénom du responsable
     */
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Fullname => Helpers.CapitalizeFirstLetter(FirstName!) + " " + LastName!.ToUpper();
    /**
     * IdentityCardNumber : Numéro de la carte d'identité Nationale : Cin
     */
    public string? IdentityCardNumber { get; set; }
    public string? Email { get; set; }
    /**
     * TaxRegistrationNumber : Matricule Fiscal
     */
    public string? TaxRegistrationNumber { get; set; }
    public string? PatenteCode { get; set; }
    public string? Address { get; set; }
    public string? Gouvernorate { get; set; }

    public double? MaximumDiscount { get; set; }
    public double? MaximumSalesBar { get; set; }
    public string? Notes { get; set; }

    public string? PhoneNumberOne { get; set; }
    public string? PhoneNumberTwo { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    /**
     * Activité du Client ou de l'entreprise.
     */
    public string? JobTitle { get; set; }

    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }

    public bool? IsActive { get; set; }
    public bool? IsDeleted { get; set; }

    public int UpdatedById { get; set; }
    public AppUser? AppUsers { get; set; }

    public int? TransporterId { get; set; }
    public Transporter? Transporter { get; set; }

    public CounterPart()
    {
    }

    public CounterPart(CounterPartDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(CounterPartDto dto)
    {
      Id = dto.id;
      if (string.IsNullOrEmpty(dto.guid))
      {
        Guid = null;
      } else
      {
        Guid = System.Guid.Parse(dto.guid!);
      }
      
      // Assuming `dto.type` is a string that matches the CounterPartType enum
      //if (Enum.TryParse(dto.type, true, out CounterPartType result))
      //{
      //  Type = result;
      //}
      //else
      //{
      //  throw new ArgumentException($"Invalid CounterPartType: {dto.type}");
      //}
      // Other Alternative
      Type = (CounterPartType)Enum.Parse(typeof(CounterPartType), dto.type!, true);
      Prefix = dto.prefix;
      Name = dto.name;
      Description = dto.description;
      FirstName = Helpers.CapitalizeFirstLetter(dto.firstname);
      LastName = dto.lastname!.ToUpper();
      IdentityCardNumber = dto.identitycardnumber;
      Email = dto.email;
      TaxRegistrationNumber = dto.taxregistrationnumber!.ToString();
      PatenteCode = dto.patentecode!.ToString();
      Address = dto.address;
      Gouvernorate = dto.gouvernorate;
      MaximumDiscount = dto.maximumdiscount;
      MaximumSalesBar = dto.maximumsalesbar;
      Notes = dto.notes;
      PhoneNumberOne = dto.phonenumberone;
      PhoneNumberTwo = dto.phonenumbertwo;
      CreationDate = dto.creationdate;
      UpdateDate = dto.updatedate;
      JobTitle = dto.jobtitle;
      BankName = dto.bankname;
      BankAccountNumber = dto.bankaccountnumber;
      IsActive = dto.isactive;
      IsDeleted = dto.isdeleted;
      UpdatedById = (int)dto.updatedbyid!;
      if (dto.appuser != null)
      {
        AppUsers = new AppUser(dto.appuser);
      }
      else
      {
        AppUsers = null;
      }
    }

  }
}
