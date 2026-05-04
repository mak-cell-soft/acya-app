using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.api.Services.PdfTemplates;

namespace ms.webapp.api.acya.api.Services
{
    public class PdfGenerationService : IPdfGenerationService
    {
        public byte[] GeneratePayslipPdf(EmployeePayslipDto payslip)
        {
            var document = new PayslipTemplate(payslip);
            return document.GeneratePdf();
        }

        public byte[] GenerateCommercialDocumentPdf(DocumentDto documentData)
        {
            var document = new CommercialDocumentTemplate(documentData);
            return document.GeneratePdf();
        }
    }
}
