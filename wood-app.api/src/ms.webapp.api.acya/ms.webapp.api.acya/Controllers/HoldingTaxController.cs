using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.common;

using ms.webapp.api.acya.api.Interfaces;

namespace ms.webapp.api.acya.api.Controllers
{
    public class HoldingTaxController : BaseApiController
    {
        private readonly WoodAppContext _context;
        private readonly IAccountService _accountService;
        private readonly IBalanceService _balanceService;

        public HoldingTaxController(WoodAppContext context, IAccountService accountService, IBalanceService balanceService)
        {
            _context = context;
            _accountService = accountService;
            _balanceService = balanceService;
        }

        [HttpGet("generate-reference/{documentId}")]
        public async Task<ActionResult> GenerateReference(int documentId)
        {
            var document = await _context.Documents
                .Include(d => d.CounterPart)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null) return NotFound(new { message = "Document not found" });

            string reference = Helpers.GenerateHoldingTaxReference(document.DocNumber ?? "", document.CounterPart?.Name ?? "");
            return Ok(new { reference });
        }

        [HttpPost("apply-to-document/{documentId}")]
        public async Task<ActionResult> ApplyToDocument(int documentId, [FromBody] HoldingTaxDto dto)
        {
            var document = await _context.Documents
                .Include(d => d.HoldingTaxes)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null)
            {
                return NotFound(new { message = "Document not found" });
            }

            // Uniqueness check for Reference
            if (!string.IsNullOrWhiteSpace(dto.reference))
            {
                var exists = await _context.HoldingTaxes
                    .AnyAsync(h => h.Reference == dto.reference && h.Id != (document.HoldingTaxId ?? 0));
                
                if (exists)
                {
                    return BadRequest(new { message = "Retenue existe déjà" });
                }
            }

            if (document.HoldingTaxes != null)
            {
                // Update existing
                document.HoldingTaxes.UpdateFromDto(dto);
                document.HoldingTaxes.UpdateDate = DateTime.UtcNow;
            }
            else
            {
                // Create new
                var holdingTax = new HoldingTax(dto);
                holdingTax.CreationDate = DateTime.UtcNow;
                holdingTax.UpdateDate = DateTime.UtcNow;
                
                _context.Set<HoldingTax>().Add(holdingTax);
                document.HoldingTaxes = holdingTax;
            }

            document.WithHoldingTax = true;
            document.UpdateDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // UPDATE LEDGER
            // If we already had an entry for this holding tax, delete it first to avoid duplicates on update
            await _accountService.DeleteLedgerEntryAsync(document.HoldingTaxes.Id, "RS");

            // Add new ledger entry
            bool isSupplier = document.Type == DocumentTypes.supplierInvoice || document.Type == DocumentTypes.supplierReceipt || document.Type == DocumentTypes.supplierInvoiceReturn;
            string description = $"Retenue à la source ({document.HoldingTaxes.TaxPercentage}%) - document {document.DocNumber}";
            await _accountService.AddLedgerEntryAsync(
                document.CounterPartId,
                "RS",
                (decimal)document.HoldingTaxes.TaxValue,
                document.HoldingTaxes.Id,
                description,
                isSupplier
            );

            // Update persistent balance
            var counterpart = await _context.CounterParts.FindAsync(document.CounterPartId);
            if (counterpart != null)
            {
                if (counterpart.Type == ms.webapp.api.acya.common.CounterPartType.Customer)
                    await _balanceService.UpdateCustomerBalanceAsync(counterpart.Id, "RS", DateTime.UtcNow);
                else
                    await _balanceService.UpdateSupplierBalanceAsync(counterpart.Id, "RS", DateTime.UtcNow);
            }

            return Ok(new { message = "Holding tax applied successfully", holdingTaxId = document.HoldingTaxes.Id });
        }

        [HttpDelete("remove-from-document/{documentId}")]
        public async Task<ActionResult> RemoveFromDocument(int documentId)
        {
            var document = await _context.Documents
                .Include(d => d.HoldingTaxes)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null)
            {
                return NotFound(new { message = "Document not found" });
            }

            document.WithHoldingTax = false;
            document.UpdateDate = DateTime.UtcNow;

            // Before removing from DB, keep the ID for ledger cleanup
            int? oldHoldingTaxId = document.HoldingTaxes?.Id;

            if (document.HoldingTaxes != null)
            {
                _context.Set<HoldingTax>().Remove(document.HoldingTaxes);
                document.HoldingTaxes = null;
                document.HoldingTaxId = null;
            }

            await _context.SaveChangesAsync();

            // CLEANUP LEDGER
            if (oldHoldingTaxId.HasValue)
            {
                await _accountService.DeleteLedgerEntryAsync(oldHoldingTaxId.Value, "RS");
                
                // Update persistent balance
                var counterpart = await _context.CounterParts.FindAsync(document.CounterPartId);
                if (counterpart != null)
                {
                    if (counterpart.Type == ms.webapp.api.acya.common.CounterPartType.Customer)
                        await _balanceService.UpdateCustomerBalanceAsync(counterpart.Id, "RS-Removed", DateTime.UtcNow);
                    else
                        await _balanceService.UpdateSupplierBalanceAsync(counterpart.Id, "RS-Removed", DateTime.UtcNow);
                }
            }

            return Ok(new { message = "Holding tax removed successfully" });
        }

        [HttpGet("all")]
        public async Task<ActionResult> GetAll()
        {
            var result = await _context.HoldingTaxes
                .Where(h => !h.IsDeleted)
                // Filter to only include holding taxes associated with supplier documents
                .Where(h => h.Documents.Any(d => d.Type == DocumentTypes.supplierOrder ||
                                               d.Type == DocumentTypes.supplierReceipt ||
                                               d.Type == DocumentTypes.supplierInvoice ||
                                               d.Type == DocumentTypes.supplierInvoiceReturn))
                .Include(h => h.Documents)
                    .ThenInclude(d => d.CounterPart)
                .Select(h => new
                {
                    h.Id,
                    h.Description,
                    h.Reference,
                    h.TaxPercentage,
                    h.TaxValue,
                    h.isSigned,
                    h.CreationDate,
                    h.UpdateDate,
                    DocNumber = h.Documents.OrderByDescending(d => d.UpdateDate).Select(d => d.DocNumber).FirstOrDefault(),
                    CounterPartName = h.Documents.OrderByDescending(d => d.UpdateDate).Select(d => d.CounterPart != null ? d.CounterPart.Name : "").FirstOrDefault()
                })
                .OrderByDescending(h => h.UpdateDate)
                .ToListAsync();

            return Ok(result);
        }
    }
}
