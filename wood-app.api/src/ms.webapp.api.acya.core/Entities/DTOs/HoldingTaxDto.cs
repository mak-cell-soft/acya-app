namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class HoldingTaxDto
  {
    public int? id { get; set; }
    public string? description { get; set; }
    // NOTE: Référence documentaire RS — identifiant pièce justificative (ex: avis débit fiscal)
    public string? reference { get; set; }
    public double taxpercentage { get; set; }
    public double taxvalue { get; set; }
    public bool issigned { get; set; }
    public DateTime creationdate { get; set; }
    public DateTime updatedate { get; set; }
    public int updatedbyid { get; set; }
    public float newamountdocvalue { get; set; }
    public bool isdeleted { get; set; }

    public int? documentid { get; set; }
  }
}
