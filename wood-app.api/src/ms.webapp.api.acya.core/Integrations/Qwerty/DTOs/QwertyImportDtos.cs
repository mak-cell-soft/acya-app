using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace ms.webapp.api.acya.core.Integrations.Qwerty.DTOs
{
    /// <summary>
    /// Root query parameters for Qwerty import GET request.
    /// </summary>
    public class QwertyImportRequestDto
    {
        public string Type { get; set; } = string.Empty; // "vente", "achat", "banque", "caisse"
        public int Exercice { get; set; }
        public int Mois { get; set; }
        public int NumTraitement { get; set; }
        public string? IdentifiantUser { get; set; }
        public string? IdentifiantDossier { get; set; }
    }

    /// <summary>
    /// Response payload returned to Qwerty importer.
    /// </summary>
    public class QwertyImportResponseDto
    {
        [JsonPropertyName("ok")]
        public bool Ok { get; set; } = true;

        [JsonPropertyName("count")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? Count { get; set; }

        [JsonPropertyName("error")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Error { get; set; }

        [JsonPropertyName("operations")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<QwertyOperationDto>? Operations { get; set; }

        public static QwertyImportResponseDto Success(List<QwertyOperationDto> operations)
        {
            return new QwertyImportResponseDto
            {
                Ok = true,
                Count = operations.Count,
                Operations = operations
            };
        }

        public static QwertyImportResponseDto Fail(string error)
        {
            return new QwertyImportResponseDto
            {
                Ok = false,
                Error = error,
                Count = null,
                Operations = null
            };
        }
    }

    /// <summary>
    /// Standard operation row according to Qwerty specification.
    /// </summary>
    public class QwertyOperationDto
    {
        [JsonPropertyName("date_operation")]
        public string DateOperation { get; set; } = string.Empty; // YYYY-MM-DD

        [JsonPropertyName("date_valeur")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DateValeur { get; set; }

        [JsonPropertyName("facture")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Facture { get; set; }

        [JsonPropertyName("reference")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Reference { get; set; }

        [JsonPropertyName("libelle")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Libelle { get; set; }

        [JsonPropertyName("bon_commande")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? BonCommande { get; set; }

        [JsonPropertyName("date_bon_commande")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DateBonCommande { get; set; }

        [JsonPropertyName("autorisation")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Autorisation { get; set; }

        [JsonPropertyName("date_autorisation")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DateAutorisation { get; set; }

        [JsonPropertyName("devise")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Devise { get; set; }

        [JsonPropertyName("taux_change")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public decimal? TauxChange { get; set; }

        [JsonPropertyName("date_ech")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DateEch { get; set; }

        [JsonPropertyName("type")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Type { get; set; }

        [JsonPropertyName("client")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Client { get; set; }

        [JsonPropertyName("client_creation")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public QwertyTierCreationDto? ClientCreation { get; set; }

        [JsonPropertyName("fournisseur")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Fournisseur { get; set; }

        [JsonPropertyName("fournisseur_creation")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public QwertyTierCreationDto? FournisseurCreation { get; set; }

        [JsonPropertyName("employe")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Employe { get; set; }

        [JsonPropertyName("employe_creation")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public QwertyTierCreationDto? EmployeCreation { get; set; }

        [JsonPropertyName("contre_partie")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ContrePartie { get; set; }

        [JsonPropertyName("montants")]
        public Dictionary<string, decimal> Montants { get; set; } = new Dictionary<string, decimal>();
    }

    /// <summary>
    /// Third-party creation details for automated customer/supplier provisioning in Qwerty.
    /// </summary>
    public class QwertyTierCreationDto
    {
        [JsonPropertyName("nom")]
        public string Nom { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Code { get; set; }

        [JsonPropertyName("matricule_fiscal")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? MatriculeFiscal { get; set; }

        [JsonPropertyName("adresse")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Adresse { get; set; }

        [JsonPropertyName("telephone")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Telephone { get; set; }

        [JsonPropertyName("email")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Email { get; set; }

        [JsonPropertyName("compte_auxiliaire")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? CompteAuxiliaire { get; set; }
    }
}
