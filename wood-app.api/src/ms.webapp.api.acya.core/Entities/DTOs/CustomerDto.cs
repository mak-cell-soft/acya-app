using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.CustomerDependecies;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class CustomerDto
  {
    public int id { get; set; }
    public string? guid { get; set; }
    public string? type { get; set; } // Regular / Passenger
    public string? firstname { get; set; }
    public string? lastname { get; set; }
    public string? fullname {get; set; }
    public string? email { get; set; }
    public string? cin { get; set; }
    public string? mfcode { get; set; }
    public string? patentecode { get; set; }
    public string? address { get; set; }
    public string? gouvernorate { get; set; }
    public bool? isactive { get; set; }
    public bool? isdeleted { get; set; }
    public double? maximumdiscount { get; set; }
    public double? Maximumsalesbar { get; set; }
    public string? notes { get; set; }
    public string? bankaccount { get; set; }
    public string? bank { get; set; }
    public string? phonenumberone { get; set; }
    public string? phonenumbertwo { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public string? jobtitle { get; set; }

    public int UpdatedById { get; set; }
    public AppUserDto? AppUser { get; set; }

    public int? TransporterId { get; set; }
    public TransporterDto? Transporter { get; set; }


    public CustomerDto()
    {
    }

    public CustomerDto(Customer entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Customer entity)
    {

    }
  }
}
