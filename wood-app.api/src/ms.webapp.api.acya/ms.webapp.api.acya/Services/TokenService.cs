using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ms.webapp.api.acya.Interfaces;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
//using ms.webapp.api.acya.core.Permissions;

namespace ms.webapp.api.acya.api.Services
{
  public class TokenService : ITokenService
  {
    // crypt and decrypt electronic information.
    private readonly SymmetricSecurityKey _key;
    private readonly IConfiguration _configuration;

    private readonly byte[] key;
    public TokenService(IConfiguration config)
    {
      string? s = config["TokenKey"];
      _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(s!));

      var s2 = config.GetSection("JWTSettings").GetSection("securityKey").Value!;
      key = Encoding.ASCII.GetBytes(s2!);

      _configuration = config;
    }

    public string CreateTokenOld(AppUser appuser)
    {
      // Adding some Claims
      var claims = new List<Claim>
      {
        new Claim(JwtRegisteredClaimNames.Name, appuser.Persons!.Lastname!),
        new Claim(JwtRegisteredClaimNames.FamilyName, appuser.Persons.Firstname!),
        new Claim(JwtRegisteredClaimNames.Email, appuser.Login!),
        // Add some custom permissions
        //new Claim("Permission", "AddArticle"),
        //new Claim("Permission","PutArticle"),
        //new Claim("Permission","GetAllArticle"),
      };

      // Creating some credentials
      var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha512Signature);

      // Describe how the token will look like
      var tokenDescriptor = new SecurityTokenDescriptor
      {
        Subject = new ClaimsIdentity(claims),
        Expires = DateTime.Now.AddDays(7),
        SigningCredentials = creds
      };

      // Need to create the token by the following Handler.
      var tokeHandler = new JwtSecurityTokenHandler();
      var token = tokeHandler.CreateToken(tokenDescriptor);

      // return the created Token
      return tokeHandler.WriteToken(token);
    }

    public string CreateToken(AppUser user)
    {
      var tokenHandler = new JwtSecurityTokenHandler();

      var key = Encoding.ASCII
      .GetBytes(_configuration.GetSection("JWTSettings").GetSection("securityKey").Value!);

      var claims = new List<Claim>
      {
          new Claim(JwtRegisteredClaimNames.Email, user.Email! ?? "" ),
          new Claim(JwtRegisteredClaimNames.Name, user.Persons!.FullName! ?? ""),
          new Claim(JwtRegisteredClaimNames.NameId, user.Id.ToString() ?? ""),
          new Claim(JwtRegisteredClaimNames.Aud,
          _configuration.GetSection("JWTSettings").GetSection("validAudience").Value!),
          new(JwtRegisteredClaimNames.Iss, _configuration.GetSection("JWTSettings").GetSection("validIssuer").Value!)
      };


      // Assuming 'user.Person.Role' holds the numeric role value
      int userRoleValue = (int)user.Persons.Role;

      // Get the role name as a string from the enum
      string? roleName = Enum.GetName(typeof(Roles), userRoleValue);

      // Check if the role name was found, and add it to the claims if so
      if (roleName != null)
      {
        claims.Add(new Claim(ClaimTypes.Role, roleName));
      }

      // Add the EnterpriseId as a new claim if available
      if (user.EnterpriseId != null)
      {
        claims.Add(new Claim("EnterpriseId", user.EnterpriseId.ToString()!));
      }

      // Add the SalesSite as a new claim if available
      if(user.SalesSite != null)
      {
        claims.Add(new Claim("DefaultSite", user.SalesSite.Address!.ToString()!));
      }

      var tokenDescriptor = new SecurityTokenDescriptor
      {
        Subject = new ClaimsIdentity(claims),
        Expires = DateTime.UtcNow.AddDays(5),
        SigningCredentials = new SigningCredentials(
              new SymmetricSecurityKey(key),
              SecurityAlgorithms.HmacSha256
          )
      };

      var token = tokenHandler.CreateToken(tokenDescriptor);

      return tokenHandler.WriteToken(token);
    }

    private static List<string> GetSelectedRoles()
    {
      // Define the specific roles you want to include as a filter
      var selectedRoles = new List<Roles> { Roles.SuperAdmin, Roles.Admin, Roles.User, Roles.InvoiceAgent };

      // Filter the enum and convert to a List<string>
      return Enum.GetValues(typeof(Roles))
                 .Cast<Roles>()
                 .Where(role => selectedRoles.Contains(role)) // Only include specified roles
                 .Select(role => role.ToString()) // Convert to string
                 .ToList();
    }


  }
}
