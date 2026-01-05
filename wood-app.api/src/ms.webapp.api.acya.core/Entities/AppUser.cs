using System.Security.Cryptography;
using System.Text;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

namespace ms.webapp.api.acya.core.Entities
{
  public class AppUser : IEntity
  {
    /**
     * Toute personne qui utilise l'application
     * */
    public int Id { get; set; }
    public string? Login { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; }
    public byte[]? PasswordHash { get; set; }
    public byte[]? PasswordSalt { get; set; }

    public int IdPerson { get; set; }
    public Person? Persons { get; set; }

    // One-to-One with Enterprise
    public int? EnterpriseId { get; set; }
    public Enterprise? Enterprise { get; set; }

    public int? IdSalesSite { get; set; }
    public SalesSite? SalesSite { get; set; }

    public AppUser() { }
    public AppUser(AppUserDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(AppUserDto dto)
    {
      using var hmac = new HMACSHA512();

      Id = dto.id;
      Login = dto.login;
      Email = dto.email;
      IsActive = !string.IsNullOrEmpty(dto.isactive.ToString()) ? bool.Parse(dto.isactive.ToString()) : true;
      IdSalesSite = dto.defaultsite;
      if (!string.IsNullOrEmpty(dto.password!))
      {
        PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.password!));
        PasswordSalt = hmac.Key;
      }
      Persons = dto.person != null ? new Person(dto.person) : null;
    }
  }
}
