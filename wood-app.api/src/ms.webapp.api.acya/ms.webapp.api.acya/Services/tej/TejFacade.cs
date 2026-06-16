using ms.webapp.api.acya.core.Entities.DTOs.tej;

namespace ms.webapp.api.acya.api.Services.tej;

public class TejFacade
{
    private readonly TejApiClient _apiClient;

    public TejFacade(TejApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public DeclarationsRS BuildDeclaration(BuildDeclarationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DeclarantIdentifiant))
        {
            throw new ArgumentException("DeclarantIdentifiant is required.");
        }

        if (request.Month is < 1 or > 12)
        {
            throw new ArgumentException("Month must be between 1 and 12.");
        }

        var builder = new DeclarationBuilder()
            .ForDeclarant(
                request.DeclarantIdentifiant,
                request.DeclarantCategorie,
                request.DeclarantTypeIdentifiant)
            .ForPeriod(request.Year, request.Month, request.ActeDepot);

        foreach (var certificate in request.Certificates)
        {
            Action<CertificatBuilder> configAction = cert =>
            {
                cert.WithBeneficiary(
                        certificate.BeneficiaryIdentifiant,
                        certificate.BeneficiaryName,
                        certificate.BeneficiaryAddress,
                        certificate.BeneficiaryActivity,
                        email: certificate.BeneficiaryEmail,
                        tel: certificate.BeneficiaryPhone)
                    .WithPayment(certificate.PaymentDate, certificate.RefCertifChezDeclarant);

                foreach (var operation in certificate.Operations)
                {
                    cert.AddOperation(
                        operation.IdTypeOperation,
                        operation.AnneeFacturation,
                        operation.MontantHT,
                        operation.TauxRS,
                        operation.TauxTVA,
                        operation.MontantTVA,
                        operation.MontantTTC,
                        operation.MontantRS,
                        operation.Cnpc,
                        operation.PCharge);
                }
            };

            var action = certificate.Action?.ToUpper() ?? "ADD";

            if (action == "CANCEL")
            {
                builder.CancelCertificate(certificate.RefCertifChezDeclarant, certificate.PaymentDate);
            }
            else if (action == "MODIFY")
            {
                builder.ModifyCertificate(configAction);
            }
            else
            {
                builder.AddCertificate(configAction);
            }
        }

        return builder.Build();
    }

    public string GenerateXml(BuildDeclarationRequest request)
    {
        var declaration = BuildDeclaration(request);
        return TejXmlSerializer.Serialize(declaration);
    }

    public Task<TejUploadResult> UploadAsync(UploadDeclarationRequest request)
    {
        var declaration = BuildDeclaration(request.Declaration);
        return _apiClient.UploadDeclarationAsync(declaration, request.TempDirectory);
    }
}
