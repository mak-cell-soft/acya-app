using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
    public class CaisseMovementRepository : CoreRepository<CaisseMovement, WoodAppContext>
    {
        public CaisseMovementRepository(WoodAppContext context) : base(context)
        {
        }

        public async Task<CaisseMovement?> GetByIdAsync(int id)
        {
            return await context.CaisseMovements
                .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        }

        /// <summary>
        /// Suppression physique (hard delete) — réservée aux mouvements manuels uniquement.
        /// Le contrôleur s'assure que PaymentId == null avant d'appeler cette méthode.
        /// </summary>
        public async Task HardDeleteAsync(int id)
        {
            var movement = await context.CaisseMovements.FindAsync(id);
            if (movement != null)
            {
                context.CaisseMovements.Remove(movement);
                await context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<CaisseMovement>> GetBySiteIdAsync(int siteId)
        {
            return await context.CaisseMovements
                .Where(m => m.SalesSiteId == siteId && !m.IsDeleted)
                .OrderByDescending(m => m.MovementDate)
                .ToListAsync();
        }

        public async Task<decimal> GetBalanceBySiteAsync(int siteId)
        {
            var entrees = await context.CaisseMovements
                .Where(m => m.SalesSiteId == siteId && m.Type == "ENTREE" && !m.IsDeleted)
                .SumAsync(m => m.Amount);

            var sorties = await context.CaisseMovements
                .Where(m => m.SalesSiteId == siteId && m.Type == "SORTIE" && !m.IsDeleted)
                .SumAsync(m => m.Amount);

            return entrees - sorties;
        }

        public async Task<IEnumerable<CaisseMovement>> GetRecentMovementsAsync(int siteId, int count)
        {
            return await context.CaisseMovements
                .Where(m => m.SalesSiteId == siteId && !m.IsDeleted)
                .OrderByDescending(m => m.MovementDate)
                .Take(count)
                .ToListAsync();
        }

        /// <summary>
        /// Total des paiements ESPECE/CASH reçus aujourd'hui pour un site donné.
        /// Source de vérité : table tbl_payments filtrée par SalesSiteId et date du jour.
        /// </summary>
        public async Task<decimal> GetTodayEspeceTotalBySiteAsync(int siteId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            // Payment n'a pas de SalesSiteId direct — on joint via Document
            return await context.Payments
                .Where(p => !p.IsDeleted
                         && (p.PaymentMethod == "ESPECE" || p.PaymentMethod == "CASH")
                         && p.PaymentDate >= today
                         && p.PaymentDate < tomorrow
                         && p.Document != null
                         && p.Document.SalesSiteId == siteId)
                .SumAsync(p => (decimal?)p.Amount ?? 0m);
        }

        /// <summary>
        /// Total des mouvements ENTREE manuels (non liés à un paiement) déjà enregistrés
        /// aujourd'hui pour un site donné. Utilisé pour vérifier le plafond d'approvisionnement.
        /// </summary>
        public async Task<decimal> GetTodayManualEntreeTotalBySiteAsync(int siteId)
        {
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            return await context.CaisseMovements
                .Where(m => m.SalesSiteId == siteId
                         && !m.IsDeleted
                         && m.Type == "ENTREE"
                         && m.PaymentId == null          // manuel uniquement (pas auto depuis vente)
                         && m.MovementDate >= today
                         && m.MovementDate < tomorrow)
                .SumAsync(m => (decimal?)m.Amount ?? 0m);
        }
    }
}
