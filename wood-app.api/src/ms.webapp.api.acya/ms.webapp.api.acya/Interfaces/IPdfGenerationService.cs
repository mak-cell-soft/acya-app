using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.api.Interfaces
{
    public interface IPdfGenerationService
    {
        byte[] GeneratePayslipPdf(EmployeePayslipDto payslip);
        byte[] GenerateCommercialDocumentPdf(DocumentDto document);
    }
}
