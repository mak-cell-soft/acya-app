using System.Collections.Generic;

namespace ms.admin.api.acya.core.DTOs
{
    public class SiteProvisionItem
    {
        public string? Gov { get; set; }
        public string? Address { get; set; }
        public bool IsForSale { get; set; }
    }

    public class TenantProvisionDetails
    {
        public string AdminUsername { get; set; } = "admin";
        public string AdminEmail { get; set; } = string.Empty;
        public string AdminPassword { get; set; } = string.Empty;
        public string? AdminSurname { get; set; }

        public string? Description { get; set; }
        public string? MobileOne { get; set; }
        public string? MobileTwo { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? Devise { get; set; }
        public string? SiegeAddress { get; set; }
        public string? CommercialRegister { get; set; }
        public string? Capital { get; set; }
        public string? NameResponsable { get; set; }
        public string? SurnameResponsable { get; set; }
        public string? PositionResponsable { get; set; }

        public List<SiteProvisionItem> Sites { get; set; } = new List<SiteProvisionItem>();
    }
}
