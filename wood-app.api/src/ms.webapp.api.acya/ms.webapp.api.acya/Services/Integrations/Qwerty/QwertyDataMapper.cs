using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Integrations.Qwerty.DTOs;
using ms.webapp.api.acya.core.Integrations.Qwerty.Interfaces;

namespace ms.webapp.api.acya.Services.Integrations.Qwerty
{
    public class QwertyDataMapper : IQwertyDataMapper
    {
        public List<QwertyOperationDto> MapSalesDocuments(IEnumerable<Document> documents)
        {
            var operations = new List<QwertyOperationDto>();

            foreach (var doc in documents)
            {
                var isReturn = doc.Type == DocumentTypes.customerInvoiceReturn;
                var sign = isReturn ? -1m : 1m;

                var op = new QwertyOperationDto
                {
                    DateOperation = doc.CreationDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    Facture = doc.DocNumber,
                    Reference = doc.DocNumber,
                    Libelle = !string.IsNullOrWhiteSpace(doc.Description) ? doc.Description : (isReturn ? $"Avoir client {doc.DocNumber}" : $"Facture {doc.DocNumber}"),
                    Devise = NormalizeCurrency(doc.Currency),
                    TauxChange = doc.ExchangeRate > 0 && Math.Abs(doc.ExchangeRate - 1.0) > 0.0001 ? (decimal)doc.ExchangeRate : null
                };

                // Parent document linkage (e.g. Bon de commande)
                var parent = doc.ParentDocuments?.FirstOrDefault()?.ParentDocument;
                if (parent != null)
                {
                    op.BonCommande = parent.DocNumber;
                    op.DateBonCommande = parent.CreationDate?.ToString("yyyy-MM-dd");
                }

                // Due date
                var instrument = doc.Payments?.FirstOrDefault(p => p.PaymentInstrument != null)?.PaymentInstrument;
                if (instrument?.DueDate.HasValue == true)
                {
                    op.DateEch = instrument.DueDate.Value.ToString("yyyy-MM-dd");
                }

                // Customer resolution
                if (doc.CounterPart != null)
                {
                    op.Client = ResolveTierCode(doc.CounterPart, "CL");
                    op.ClientCreation = BuildTierCreation(doc.CounterPart, op.Client);
                }

                // Calculate Amounts
                op.Montants = BuildInvoiceAmounts(doc, sign);
                operations.Add(op);
            }

            return operations;
        }

        public List<QwertyOperationDto> MapPurchaseDocuments(IEnumerable<Document> documents)
        {
            var operations = new List<QwertyOperationDto>();

            foreach (var doc in documents)
            {
                var isReturn = doc.Type == DocumentTypes.supplierInvoiceReturn;
                var sign = isReturn ? -1m : 1m;

                var op = new QwertyOperationDto
                {
                    DateOperation = doc.CreationDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    Facture = !string.IsNullOrWhiteSpace(doc.SupplierReference) ? doc.SupplierReference : doc.DocNumber,
                    Reference = doc.DocNumber,
                    Libelle = !string.IsNullOrWhiteSpace(doc.Description) ? doc.Description : (isReturn ? $"Avoir fournisseur {doc.DocNumber}" : $"Facture fournisseur {doc.SupplierReference ?? doc.DocNumber}"),
                    Devise = NormalizeCurrency(doc.Currency),
                    TauxChange = doc.ExchangeRate > 0 && Math.Abs(doc.ExchangeRate - 1.0) > 0.0001 ? (decimal)doc.ExchangeRate : null
                };

                // Parent document linkage
                var parent = doc.ParentDocuments?.FirstOrDefault()?.ParentDocument;
                if (parent != null)
                {
                    op.BonCommande = parent.DocNumber;
                    op.DateBonCommande = parent.CreationDate?.ToString("yyyy-MM-dd");
                }

                // Due date
                var instrument = doc.Payments?.FirstOrDefault(p => p.PaymentInstrument != null)?.PaymentInstrument;
                if (instrument?.DueDate.HasValue == true)
                {
                    op.DateEch = instrument.DueDate.Value.ToString("yyyy-MM-dd");
                }

                // Supplier resolution
                if (doc.CounterPart != null)
                {
                    op.Fournisseur = ResolveTierCode(doc.CounterPart, "FR");
                    op.FournisseurCreation = BuildTierCreation(doc.CounterPart, op.Fournisseur);
                }

                // Calculate Amounts
                op.Montants = BuildInvoiceAmounts(doc, sign);
                operations.Add(op);
            }

            return operations;
        }

        public List<QwertyOperationDto> MapBankTransactions(IEnumerable<BankTransaction> transactions)
        {
            var operations = new List<QwertyOperationDto>();

            foreach (var tx in transactions)
            {
                var op = new QwertyOperationDto
                {
                    DateOperation = tx.TransactionDate.ToString("yyyy-MM-dd"),
                    DateValeur = tx.TransactionDate.ToString("yyyy-MM-dd"),
                    Reference = tx.Reference,
                    Libelle = !string.IsNullOrWhiteSpace(tx.Description) ? tx.Description : "Opération bancaire",
                    ContrePartie = "580000", // Compte virement interne / contrepartie par défaut
                    Montants = new Dictionary<string, decimal>
                    {
                        ["debit"] = Math.Round(tx.Debit, 3),
                        ["credit"] = Math.Round(tx.Credit, 3)
                    }
                };

                operations.Add(op);
            }

            return operations;
        }

        public List<QwertyOperationDto> MapCaisseMovements(IEnumerable<CaisseMovement> movements)
        {
            var operations = new List<QwertyOperationDto>();

            foreach (var cm in movements)
            {
                var isEntree = string.Equals(cm.Type, "ENTREE", StringComparison.OrdinalIgnoreCase);

                var op = new QwertyOperationDto
                {
                    DateOperation = cm.MovementDate.ToString("yyyy-MM-dd"),
                    Reference = cm.Reference,
                    Libelle = !string.IsNullOrWhiteSpace(cm.Notes) ? cm.Notes : (!string.IsNullOrWhiteSpace(cm.Reason) ? cm.Reason : "Mouvement de caisse")
                };

                // Counterparty if payment is attached
                if (cm.Payment?.Customer != null)
                {
                    var isSupplier = cm.Payment.Customer.Type == CounterPartType.Supplier;
                    if (isSupplier)
                    {
                        op.Fournisseur = ResolveTierCode(cm.Payment.Customer, "FR");
                        op.FournisseurCreation = BuildTierCreation(cm.Payment.Customer, op.Fournisseur);
                    }
                    else
                    {
                        op.Client = ResolveTierCode(cm.Payment.Customer, "CL");
                        op.ClientCreation = BuildTierCreation(cm.Payment.Customer, op.Client);
                    }
                }
                else
                {
                    op.ContrePartie = "532000"; // Compte caisse générale
                }

                var amount = Math.Round(cm.Amount, 3);
                op.Montants = new Dictionary<string, decimal>
                {
                    ["debit"] = isEntree ? amount : 0m,
                    ["credit"] = !isEntree ? amount : 0m
                };

                operations.Add(op);
            }

            return operations;
        }

        public List<QwertyOperationDto> MapHoldingTaxes(IEnumerable<HoldingTax> holdingTaxes)
        {
            var operations = new List<QwertyOperationDto>();

            foreach (var ht in holdingTaxes)
            {
                var doc = ht.Documents?.FirstOrDefault();
                var cp = doc?.CounterPart;
                var isSupplier = doc != null && (doc.Type == DocumentTypes.supplierInvoice || doc.Type == DocumentTypes.supplierReceipt || doc.Type == DocumentTypes.supplierInvoiceReturn) || (cp != null && cp.Type == CounterPartType.Supplier);

                var op = new QwertyOperationDto
                {
                    DateOperation = ht.CreationDate.ToString("yyyy-MM-dd"),
                    Reference = ht.Reference ?? doc?.DocNumber,
                    Facture = doc?.DocNumber ?? ht.Reference,
                    Libelle = !string.IsNullOrWhiteSpace(ht.Description) ? ht.Description : $"Retenue à la source ({ht.TaxPercentage:F1}%) - {doc?.DocNumber ?? ht.Reference}",
                    Type = ht.TaxPercentage.ToString("F1", CultureInfo.InvariantCulture)
                };

                if (cp != null)
                {
                    if (isSupplier)
                    {
                        op.Fournisseur = ResolveTierCode(cp, "FR");
                        op.FournisseurCreation = BuildTierCreation(cp, op.Fournisseur);
                    }
                    else
                    {
                        op.Client = ResolveTierCode(cp, "CL");
                        op.ClientCreation = BuildTierCreation(cp, op.Client);
                    }
                }

                var taxVal = Math.Round((decimal)ht.TaxValue, 3);
                var grossVal = doc != null ? Math.Round((decimal)doc.TotalCostNetTTCDoc, 3) : Math.Round((decimal)(ht.NewAmountDocValue + ht.TaxValue), 3);
                var netVal = Math.Round((decimal)ht.NewAmountDocValue, 3);

                op.Montants = new Dictionary<string, decimal>
                {
                    ["rs"] = taxVal,
                    ["retenue"] = taxVal,
                    ["taux"] = Math.Round((decimal)ht.TaxPercentage, 2),
                    ["ttc"] = grossVal,
                    ["net"] = netVal,
                    ["debit"] = isSupplier ? taxVal : 0m,
                    ["credit"] = !isSupplier ? taxVal : 0m
                };

                operations.Add(op);
            }

            return operations;
        }

        #region Helpers

        private static string? NormalizeCurrency(string? currency)
        {
            if (string.IsNullOrWhiteSpace(currency) || string.Equals(currency, "TND", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }
            return currency.Trim().ToUpperInvariant();
        }

        private static string ResolveTierCode(CounterPart cp, string defaultPrefix)
        {
            if (!string.IsNullOrWhiteSpace(cp.TaxRegistrationNumber))
            {
                return cp.TaxRegistrationNumber.Trim();
            }
            if (!string.IsNullOrWhiteSpace(cp.IdentityCardNumber))
            {
                return cp.IdentityCardNumber.Trim();
            }
            return $"{defaultPrefix}{cp.Id:D5}";
        }

        private static QwertyTierCreationDto BuildTierCreation(CounterPart cp, string code)
        {
            return new QwertyTierCreationDto
            {
                Nom = !string.IsNullOrWhiteSpace(cp.Name) ? cp.Name : (!string.IsNullOrWhiteSpace(cp.Fullname) ? cp.Fullname : "TIERS INCONNU"),
                Code = code,
                MatriculeFiscal = cp.TaxRegistrationNumber,
                Adresse = cp.Address,
                Telephone = cp.PhoneNumberOne ?? cp.PhoneNumberTwo,
                Email = cp.Email,
                CompteAuxiliaire = cp.Type == CounterPartType.Supplier ? $"401{cp.Id:D3}" : $"411{cp.Id:D3}"
            };
        }

        private static Dictionary<string, decimal> BuildInvoiceAmounts(Document doc, decimal sign)
        {
            var montants = new Dictionary<string, decimal>();

            // Aggregate line items if present
            if (doc.DocumentMerchandises != null && doc.DocumentMerchandises.Any())
            {
                var lines = doc.DocumentMerchandises.ToList();

                // Group by TVA rate (e.g. 19%, 7%, 13%, 0%)
                var tvaGroups = lines
                    .GroupBy(l => ExtractTvaRate(l))
                    .OrderByDescending(g => g.Key) // 19% first, then lower
                    .ToList();

                int tierIndex = 1;
                foreach (var group in tvaGroups)
                {
                    var htSum = group.Sum(l => (decimal)l.CostNetHT);
                    var tvaSum = group.Sum(l => (decimal)l.TvaValue);

                    montants[$"ht{tierIndex}"] = Math.Round(htSum * sign, 3);
                    montants[$"tva{tierIndex}"] = Math.Round(tvaSum * sign, 3);
                    tierIndex++;
                }
            }
            else
            {
                // Fallback to document header totals
                montants["ht1"] = Math.Round((decimal)doc.TotalCostHTNetDoc * sign, 3);
                montants["tva1"] = Math.Round((decimal)doc.TotalCostTvaDoc * sign, 3);
            }

            // Timbre fiscal if configured
            if (doc.Taxes != null && doc.Taxes.Value.HasValue && doc.Taxes.Value.Value > 0)
            {
                montants["timbre"] = Math.Round((decimal)doc.Taxes.Value.Value * sign, 3);
            }

            // TTC
            montants["ttc"] = Math.Round((decimal)doc.TotalCostNetTTCDoc * sign, 3);

            return montants;
        }

        private static decimal ExtractTvaRate(DocumentMerchandise line)
        {
            var tvaVar = line.Merchandise?.Articles?.TVAs;
            if (tvaVar?.Value.HasValue == true)
            {
                return (decimal)tvaVar.Value.Value;
            }

            // If not directly on article, estimate from line values
            if (line.CostNetHT > 0 && line.TvaValue > 0)
            {
                var calculatedRate = (decimal)(line.TvaValue / line.CostNetHT) * 100m;
                return Math.Round(calculatedRate, 0);
            }

            return 19m; // Default standard Tunisian VAT
        }

        #endregion
    }
}
