namespace ms.webapp.api.acya.core.Entities.DTOs.tej;

public class TejOperationInput
{
    public string IdTypeOperation { get; set; } = "RS7_000002";
    public int AnneeFacturation { get; set; } = DateTime.UtcNow.Year;
    public long MontantHT { get; set; }
    public decimal TauxRS { get; set; } = 1m;
    public decimal TauxTVA { get; set; } = 19m;
    public long? MontantTVA { get; set; }
    public long? MontantTTC { get; set; }
    public long? MontantRS { get; set; }
    public bool Cnpc { get; set; }
    public bool PCharge { get; set; }
}

public class TejCertificateInput
{
    public string Action { get; set; } = "ADD"; // "ADD", "MODIFY", "CANCEL"
    public string BeneficiaryIdentifiant { get; set; } = string.Empty;
    public string BeneficiaryName { get; set; } = string.Empty;
    public string BeneficiaryAddress { get; set; } = string.Empty;
    public string BeneficiaryActivity { get; set; } = string.Empty;
    public string? BeneficiaryEmail { get; set; }
    public string? BeneficiaryPhone { get; set; }
    public string RefCertifChezDeclarant { get; set; } = string.Empty;
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow.Date;
    public List<TejOperationInput> Operations { get; set; } = new();
}

public class BuildDeclarationRequest
{
    public string DeclarantIdentifiant { get; set; } = string.Empty;
    public string DeclarantCategorie { get; set; } = "PM";
    public int DeclarantTypeIdentifiant { get; set; } = 1;
    public int Year { get; set; } = DateTime.UtcNow.Year;
    public int Month { get; set; } = DateTime.UtcNow.Month;
    public int ActeDepot { get; set; }
    public List<TejCertificateInput> Certificates { get; set; } = new();
}

public class BuildDeclarationResponse
{
    public string Xml { get; set; } = string.Empty;
}

public class UploadDeclarationRequest
{
    public BuildDeclarationRequest Declaration { get; set; } = new();
    public string TempDirectory { get; set; } = "temp";
}
