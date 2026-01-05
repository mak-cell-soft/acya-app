using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.CustomerDependecies;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Customer : IEntity
  {
    public int Id { get; set; }
    public Guid? Guid { get; set; }
    public CounterPartType Type { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Fullname => Helpers.CapitalizeFirstLetter(FirstName!) + " " + LastName!.ToUpper();
    public string? Cin { get; set; }
    public string? Email { get; set; }
    public string? MFCode { get; set; }
    public string? PatenteCode { get; set; }
    public string? Address { get; set; }
    public string? Gouvernorate { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsDeleted { get; set; }
    public double? MaximumDiscount { get; set; }
    public double? MaximumSalesBar { get; set; }
    public string? Notes { get; set; }
    public string? BankAccount { get; set; }
    public string? Bank { get; set; }
    public string? PhoneNumberOne { get; set; }
    public string? PhoneNumberTwo { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public string? JobTitle { get; set; }

    public int UpdatedById { get; set; }
    public AppUser? AppUsers { get; set; }

    public int? TransporterId { get; set; }
    public Transporter? Transporter { get; set; }

    public Customer(){}

    public Customer(CustomerDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(CustomerDto dto)
    {

    }

  }
}
