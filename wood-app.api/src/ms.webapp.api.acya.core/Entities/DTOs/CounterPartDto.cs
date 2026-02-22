using System.Net;
using System.Xml.Linq;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class CounterPartDto
  {
    public int id { get; set; }
    public string? guid { get; set; }
    /**
     * CustomerType : Customer or Provider
     */
    public string? type { get; set; }
    /**
     * Prefix : STE - Mr - Mme
     */
    public string? prefix { get; set; }
    /**
     * Name - Descripttion : Nom et Description de la Société
     */
    public string? name { get; set; }
    public string? description { get; set; }
    /**
     * Firstname - Lastname : Nom et prénom pour le  Client 
     * OU nom et prénom du responsable
     */
    public string? firstname { get; set; }
    public string? lastname { get; set; }
    /**
     * IdentityCardNumber : Numéro de la carte d'identité Nationale : Cin
     */
    public string? identitycardnumber { get; set; }
    public string? email { get; set; }
    /**
     * TaxRegistrationNumber : Matricule Fiscal
     */
    public string? taxregistrationnumber { get; set; }
    public string? patentecode { get; set; }
    public string? address { get; set; }
    public string? gouvernorate { get; set; }

    public double? maximumdiscount { get; set; }
    public decimal? openingbalance { get; set; }
    public double? maximumsalesbar { get; set; }
    public string? notes { get; set; }

    public string? phonenumberone { get; set; }
    public string? phonenumbertwo { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    /**
     * Activité du Client ou de l'entreprise.
     */
    public string? jobtitle { get; set; }

    public string? bankname { get; set; }
    public string? bankaccountnumber { get; set; }

    public bool? isactive { get; set; }
    public bool? isdeleted { get; set; }

    public int? updatedbyid { get; set; }
    public AppUserDto? appuser { get; set; }

    public TransporterDto? transporter { get; set; }

    public CounterPartDto()
    {
    }

    public CounterPartDto(CounterPart entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(CounterPart entity)
    {
      id= entity.Id;
      guid = entity.Guid.ToString();
      type = Enum.GetName(typeof(CounterPartType), entity.Type);
      prefix = entity.Prefix;
      name = entity.Name;
      description = entity.Description;
      firstname = entity.FirstName;
      lastname = entity.LastName;
      identitycardnumber = entity.IdentityCardNumber;
      email = entity.Email;
      taxregistrationnumber = entity.TaxRegistrationNumber;
      patentecode = entity.PatenteCode;
      address = entity.Address;
      gouvernorate = entity.Gouvernorate;
      maximumdiscount = entity.MaximumDiscount;
      openingbalance = entity.OpeningBalance;
      maximumsalesbar = entity.MaximumSalesBar;
      notes = entity.Notes;
      phonenumberone = entity.PhoneNumberOne;
      phonenumbertwo = entity.PhoneNumberTwo;
      creationdate = entity.CreationDate;
      updatedate = entity.UpdateDate;
      jobtitle = entity.JobTitle;
      bankname = entity.BankName;
      bankaccountnumber = entity.BankAccountNumber;
      isactive = entity.IsActive;
      isdeleted = entity.IsDeleted;
      updatedbyid = (int)entity.UpdatedById!;
      if (entity.AppUsers != null)
      {
        appuser = new AppUserDto(entity.AppUsers);
      }
      else
      {
        appuser = null;
      }

      if (entity.Transporter != null)
      {
        transporter = new TransporterDto(entity.Transporter);
      }
      else
      {
        transporter = null;
      }

    }

  }
}
