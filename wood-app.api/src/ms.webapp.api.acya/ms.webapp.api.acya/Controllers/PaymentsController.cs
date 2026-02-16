using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities.DTOs;
using System.Security.Claims;

namespace ms.webapp.api.acya.api.Controllers
{
    public class PaymentsController : BaseApiController
    {
        private readonly IPaymentService _paymentService;
        private readonly ILogger<PaymentsController> _logger;

        public PaymentsController(IPaymentService paymentService, ILogger<PaymentsController> logger)
        {
            _paymentService = paymentService;
            _logger = logger;
        }

        // Helper to get User ID (int) from token claims
        private int GetCurrentUserId()
        {
             // Standard claim for ID often "nameid" or custom "id" depending on TokenService
             var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("id")?.Value
                           ?? User.FindFirst("nameid")?.Value;

             if (int.TryParse(idClaim, out int userId))
             {
                 return userId;
             }
             
             _logger.LogError("Failed to find user ID in claims. Available claims: {Claims}", 
                 string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));

             return 0; 
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PaymentDto>> GetById(int id)
        {
            try
            {
                var payment = await _paymentService.GetByIdAsync(id);
                if (payment == null) return NotFound();
                return Ok(payment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment {PaymentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost("search")]
        public async Task<ActionResult<PagedResult<PaymentDto>>> Search([FromBody] PaymentSearchDto searchDto)
        {
            try
            {
                var result = await _paymentService.SearchAsync(searchDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching payments");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("customer/{customerId}")]
        public async Task<ActionResult<IEnumerable<PaymentDto>>> GetByCustomer(int customerId)
        {
            try
            {
                var payments = await _paymentService.GetByCustomerIdAsync(customerId);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payments for customer {CustomerId}", customerId);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("document/{documentId}")]
        public async Task<ActionResult<IEnumerable<PaymentDto>>> GetByDocument(int documentId)
        {
            try
            {
                var payments = await _paymentService.GetByDocumentIdAsync(documentId);
                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payments for document {DocumentId}", documentId);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPost]
        public async Task<ActionResult<PaymentDto>> Create([FromBody] CreatePaymentDto createDto)
        {
            try
            {
                // var userId = GetCurrentUserId();
                // if (userId == 0) return Unauthorized("Invalid User ID in token");

                var userId = createDto.updatedbyid;

                var payment = await _paymentService.CreateAsync(createDto, userId);
                return CreatedAtAction(nameof(GetById), new { id = payment.PaymentId }, payment);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment");
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PaymentDto>> Update(int id, [FromBody] UpdatePaymentDto updateDto)
        {
            if (id != updateDto.PaymentId) return BadRequest("ID mismatch");

            try
            {
                var userId = GetCurrentUserId();
                 if (userId == 0) return Unauthorized("Invalid User ID in token");

                var payment = await _paymentService.UpdateAsync(updateDto, userId);
                return Ok(payment);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating payment {PaymentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<bool>> Delete(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                 if (userId == 0) return Unauthorized("Invalid User ID in token");

                var result = await _paymentService.DeleteAsync(id, userId);
                if (!result) return NotFound();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting payment {PaymentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult<IEnumerable<DashboardPaymentDto>>> GetDashboardPayments([FromQuery] DateTime date, [FromQuery] int? appuserid)
        {
            try
            {
                // Log the received date with full details
                _logger.LogInformation("Dashboard Payments Request - Received date: {Date}, Kind: {Kind}, UTC: {UTC}, Local: {Local}", 
                    date, date.Kind, date.ToUniversalTime(), date.ToLocalTime());

                var userId = appuserid ?? GetCurrentUserId();
                if (userId == 0) return Unauthorized("Invalid User ID");

                _logger.LogInformation("Dashboard Payments Request - UserId: {UserId}, Date.Year: {Year}, Date.Month: {Month}, Date.Day: {Day}", 
                    userId, date.Year, date.Month, date.Day);

                var payments = await _paymentService.GetDashboardPaymentsAsync(date, userId);
                
                _logger.LogInformation("Dashboard Payments Response - Returned {Count} payments for date {Date}", 
                    payments.Count(), date.ToShortDateString());

                return Ok(payments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard payments for date {Date}", date);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
