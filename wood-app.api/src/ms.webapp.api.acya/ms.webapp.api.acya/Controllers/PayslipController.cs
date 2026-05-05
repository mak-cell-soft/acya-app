using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.Services;

namespace ms.webapp.api.acya.api.Controllers
{
    [Route("api/[controller]")]
    public class PayslipController : BaseApiController
    {
        private readonly EmployeePayslipRepository _repository;
        private readonly IPdfGenerationService _pdfService;
        private readonly ISalaryCalculationService _calculationService;
        private readonly PersonRepository _personRepository;

        public PayslipController(EmployeePayslipRepository repository, IPdfGenerationService pdfService, ISalaryCalculationService calculationService, PersonRepository personRepository)
        {
            _repository = repository;
            _pdfService = pdfService;
            _calculationService = calculationService;
            _personRepository = personRepository;
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
            var employee = await _personRepository.Get(dto.employeeid);
            if (employee == null) return NotFound("Employee not found");

            // Automatic calculation based on Tunisia rates
            var calculatedDto = _calculationService.CalculatePayslip(employee, dto.periodmonth, dto.periodyear, dto.bonuses, dto.deductions);
            
            var entity = new EmployeePayslip(calculatedDto);
            await _repository.Add(entity);
            return Ok(new EmployeePayslipDto(entity));
        }

        [HttpGet("Download/{id}")]
        public async Task<IActionResult> DownloadPdf(int id)
        {
            var payslip = await _repository.Get(id);
            if (payslip == null) return NotFound();

            var pdfBytes = _pdfService.GeneratePayslipPdf(new EmployeePayslipDto(payslip));
            return File(pdfBytes, "application/pdf", $"Payslip_{id}.pdf");
        }
    }
}
