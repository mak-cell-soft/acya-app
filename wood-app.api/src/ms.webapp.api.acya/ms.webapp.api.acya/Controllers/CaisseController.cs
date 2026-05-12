using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    public class CaisseController : BaseApiController
    {
        private readonly CaisseMovementRepository _caisseRepository;
        private readonly SalesSitesRepository _siteRepository;

        public CaisseController(
            CaisseMovementRepository caisseRepository,
            SalesSitesRepository siteRepository)
        {
            _caisseRepository = caisseRepository;
            _siteRepository = siteRepository;
        }

        [HttpGet("site/{siteId}")]
        public async Task<ActionResult<CaisseBalanceDto>> GetBalance(int siteId)
        {
            var site = await _siteRepository.Get(siteId);
            if (site == null) return NotFound();

            var movements = await _caisseRepository.GetBySiteIdAsync(siteId);
            var entrees = movements.Where(m => m.Type == "ENTREE").Sum(m => m.Amount);
            var sorties = movements.Where(m => m.Type == "SORTIE").Sum(m => m.Amount);

            return Ok(new CaisseBalanceDto
            {
                SalesSiteId = site.Id,
                SalesSiteName = site.Address,
                TotalEntrees = entrees,
                TotalSorties = sorties,
                CurrentBalance = entrees - sorties,
                LastMovementDate = movements.FirstOrDefault()?.MovementDate
            });
        }

        [HttpGet("all")]
        public async Task<ActionResult<IEnumerable<CaisseBalanceDto>>> GetAllBalances()
        {
            var sites = await _siteRepository.GetAll();
            var results = new List<CaisseBalanceDto>();

            foreach (var site in sites)
            {
                var balance = await _caisseRepository.GetBalanceBySiteAsync(site.Id);
                results.Add(new CaisseBalanceDto
                {
                    SalesSiteId = site.Id,
                    SalesSiteName = site.Address,
                    CurrentBalance = balance
                });
            }

            return Ok(results);
        }

        [HttpPost("movement")]
        public async Task<ActionResult<CaisseMovementDto>> AddMovement([FromBody] CreateCaisseMovementDto dto)
        {
            // ── Règle métier : l'approvisionnement manuel ne peut pas dépasser
            //    le total des espèces/cash reçues sur ce site aujourd'hui (cumulé sur la journée) ──
            if (dto.Type == "ENTREE")
            {
                var especeTotal  = await _caisseRepository.GetTodayEspeceTotalBySiteAsync(dto.SalesSiteId);
                var alreadyIn    = await _caisseRepository.GetTodayManualEntreeTotalBySiteAsync(dto.SalesSiteId);
                var remaining    = especeTotal - alreadyIn;

                if (dto.Amount > remaining)
                    return BadRequest(new
                    {
                        code    = "APPRO_LIMIT_EXCEEDED",
                        message = $"Montant refusé. Plafond disponible : {remaining:F3} TND " +
                                  $"(Espèces du jour : {especeTotal:F3} TND, déjà approvisionnés : {alreadyIn:F3} TND)"
                    });
            }

            var movement = new CaisseMovement
            {
                SalesSiteId      = dto.SalesSiteId,
                MovementDate     = DateTime.Now,
                Type             = dto.Type,
                Reason           = dto.Reason,
                Amount           = dto.Amount,
                Reference        = dto.Reference,
                Notes            = dto.Notes,
                CreatedByUserId  = dto.CreatedByUserId
            };

            var added = await _caisseRepository.Add(movement);
            return Ok(new CaisseMovementDto
            {
                Id            = added.Id,
                SalesSiteId   = added.SalesSiteId,
                MovementDate  = added.MovementDate,
                Type          = added.Type,
                Reason        = added.Reason,
                Amount        = added.Amount,
                CreatedAt     = added.CreatedAt
            });
        }

        /// <summary>
        /// Retourne le plafond restant pour l'approvisionnement manuel du jour.
        /// Frontend : afficher ce montant max dans le modal Approvisionnement.
        /// </summary>
        [HttpGet("appro-limit/{siteId}")]
        public async Task<ActionResult<object>> GetApproLimit(int siteId)
        {
            var especeTotal = await _caisseRepository.GetTodayEspeceTotalBySiteAsync(siteId);
            var alreadyIn   = await _caisseRepository.GetTodayManualEntreeTotalBySiteAsync(siteId);
            var remaining   = Math.Max(0, especeTotal - alreadyIn);

            return Ok(new
            {
                especeTotal  = especeTotal,
                alreadyIn    = alreadyIn,
                remaining    = remaining
            });
        }

        [HttpGet("movements/{siteId}")]
        public async Task<ActionResult<IEnumerable<CaisseMovementDto>>> GetMovements(
            int siteId,
            [FromQuery] int count = 100,
            [FromQuery] DateTime? date = null)
        {
            // Filtrer par date : le jour demandé, ou aujourd'hui par défaut
            var targetDate = (date ?? DateTime.Today).Date;
            var nextDay    = targetDate.AddDays(1);

            var movements = await _caisseRepository.GetRecentMovementsAsync(siteId, count);
            var filtered  = movements
                .Where(m => m.MovementDate.Date == targetDate)
                .ToList();

            return Ok(filtered.Select(m => new CaisseMovementDto
            {
                Id           = m.Id,
                SalesSiteId  = m.SalesSiteId,
                MovementDate = m.MovementDate,
                Type         = m.Type,
                Reason       = m.Reason,
                Amount       = m.Amount,
                Reference    = m.Reference,
                Notes        = m.Notes,
                PaymentId    = m.PaymentId
            }));
        }

        /// <summary>
        /// Suppression définitive (hard delete) d'un mouvement MANUEL (Appro/Remise).
        /// Interdit si le mouvement est lié à un encaissement automatique (PaymentId != null).
        /// </summary>
        [HttpDelete("movement/{id}")]
        public async Task<IActionResult> DeleteMovement(int id)
        {
            var movement = await _caisseRepository.GetByIdAsync(id);
            if (movement == null)
                return NotFound(new { message = "Mouvement introuvable." });

            // Sécurité : refuser la suppression des encaissements liés à une vente
            if (movement.PaymentId != null)
                return BadRequest(new
                {
                    code    = "DELETE_FORBIDDEN",
                    message = "Impossible de supprimer un encaissement lié à une vente."
                });

            await _caisseRepository.HardDeleteAsync(id);
            return NoContent();
        }
    }
}
