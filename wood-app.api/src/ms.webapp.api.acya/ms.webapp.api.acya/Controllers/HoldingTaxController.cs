using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Controllers
{
    public class HoldingTaxController : BaseApiController
    {
        private readonly WoodAppContext _context;

        public HoldingTaxController(WoodAppContext context)
        {
            _context = context;
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

            if (document.HoldingTaxes != null)
            {
                _context.Set<HoldingTax>().Remove(document.HoldingTaxes);
                document.HoldingTaxes = null;
                document.HoldingTaxId = null;
            }

            document.WithHoldingTax = false;
            document.UpdateDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Holding tax removed successfully" });
        }
    }
}
