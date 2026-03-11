using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
    [Route("api/[controller]")]
    public class PayslipController : BaseApiController
    {
        private readonly EmployeePayslipRepository _repository;

        public PayslipController(EmployeePayslipRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeePayslipDto>>> GetAll()
        {
            var payslips = await _repository.GetAllAsync();
            return Ok(payslips.Select(p => new EmployeePayslipDto(p)));
        }

        [HttpGet("Employee/{employeeId}")]
        public async Task<ActionResult<IEnumerable<EmployeePayslipDto>>> GetByEmployee(int employeeId)
        {
            var payslips = await _repository.GetByEmployeeId(employeeId);
            return Ok(payslips.Select(p => new EmployeePayslipDto(p)));
        }

        [HttpPost]
        public async Task<ActionResult<EmployeePayslipDto>> Generate(EmployeePayslipDto dto)
        {
            var entity = new EmployeePayslip(dto);
            await _repository.Add(entity);
            return Ok(new EmployeePayslipDto(entity));
        }

        [HttpGet("Download/{id}")]
        public async Task<IActionResult> DownloadPdf(int id)
        {
            var payslip = await _repository.Get(id);
            if (payslip == null) return NotFound();

            // Placeholder for PDF generation
            // In a real scenario, we would use a library like QuestPDF or iText
            byte[] dummyPdf = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4 Dummy PDF Content for Payslip " + id);
            return File(dummyPdf, "application/pdf", $"Payslip_{id}.pdf");
        }
    }
}
