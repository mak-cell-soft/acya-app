using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Integrations.Qwerty.DTOs;
using ms.webapp.api.acya.core.Integrations.Qwerty.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.Controllers.Integrations
{
    [Authorize]
    [ApiController]
    [Route("api/integrations/qwerty")]
    public class QwertyImportController : BaseApiController
    {
        private readonly IQwertyDataProvider _dataProvider;
        private readonly IQwertyDataMapper _dataMapper;
        private readonly TenantContext _tenantContext;
        private readonly ILogger<QwertyImportController> _logger;

        public QwertyImportController(
            IQwertyDataProvider dataProvider,
            IQwertyDataMapper dataMapper,
            TenantContext tenantContext,
            ILogger<QwertyImportController> logger)
        {
            _dataProvider = dataProvider;
            _dataMapper = dataMapper;
            _tenantContext = tenantContext;
            _logger = logger;
        }

        /// <summary>
        /// Webservice source for Qwerty import (Vente, Achat, Banque, Caisse).
        /// </summary>
        [HttpGet("import")]
        [Produces("application/json")]
        [ProducesResponseType(typeof(QwertyImportResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(QwertyImportResponseDto), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(QwertyImportResponseDto), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(QwertyImportResponseDto), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(QwertyImportResponseDto), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Import(
            [FromQuery(Name = "type")] string? type,
            [FromQuery(Name = "exercice")] int exercice,
            [FromQuery(Name = "mois")] int mois,
            [FromQuery(Name = "num_traitement")] int num_traitement,
            [FromQuery(Name = "identifiant_user")] string? identifiant_user = null,
            [FromQuery(Name = "identifiant_dossier")] string? identifiant_dossier = null)
        {
            // 1. Validate Operation Type
            if (string.IsNullOrWhiteSpace(type))
            {
                return BadRequest(QwertyImportResponseDto.Fail("Le paramètre 'type' est requis (vente, achat, banque, caisse)."));
            }

            var normalizedType = type.Trim().ToLowerInvariant();
            if (normalizedType != "vente" && normalizedType != "achat" && normalizedType != "banque" && normalizedType != "caisse")
            {
                return BadRequest(QwertyImportResponseDto.Fail($"Type d'opération '{type}' invalide. Types acceptés : 'vente', 'achat', 'banque', 'caisse'."));
            }

            // 2. Validate Fiscal Period
            if (exercice < 2000 || exercice > 2100)
            {
                return BadRequest(QwertyImportResponseDto.Fail($"Exercice comptable '{exercice}' invalide."));
            }

            if (mois < 1 || mois > 12)
            {
                return BadRequest(QwertyImportResponseDto.Fail($"Mois comptable '{mois}' invalide. Doit être compris entre 1 et 12."));
            }

            // 3. Multi-Tenant Cross-Validation
            if (_tenantContext.IsEnabled && !string.IsNullOrWhiteSpace(identifiant_dossier))
            {
                if (!string.Equals(_tenantContext.Slug, identifiant_dossier.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Security Warning: Dossier mismatch. Request asked for '{Requested}', active tenant is '{Tenant}'", identifiant_dossier, _tenantContext.Slug);
                    return StatusCode(StatusCodes.Status403Forbidden, QwertyImportResponseDto.Fail("Accès refusé : Le dossier demandé ne correspond pas au tenant authentifié."));
                }
            }

            _logger.LogInformation("Processing Qwerty import request: Type={Type}, Year={Year}, Month={Month}, TreatmentId={NumTraitement}, Tenant={Tenant}",
                normalizedType, exercice, mois, num_traitement, _tenantContext.Slug);

            try
            {
                switch (normalizedType)
                {
                    case "vente":
                    {
                        var docs = await _dataProvider.GetSalesDocumentsAsync(exercice, mois);
                        var operations = _dataMapper.MapSalesDocuments(docs);
                        return Ok(QwertyImportResponseDto.Success(operations));
                    }

                    case "achat":
                    {
                        var docs = await _dataProvider.GetPurchaseDocumentsAsync(exercice, mois);
                        var operations = _dataMapper.MapPurchaseDocuments(docs);
                        return Ok(QwertyImportResponseDto.Success(operations));
                    }

                    case "banque":
                    {
                        var bankId = num_traitement > 0 ? (int?)num_traitement : null;
                        var txs = await _dataProvider.GetBankTransactionsAsync(bankId, exercice, mois);
                        var operations = _dataMapper.MapBankTransactions(txs);
                        return Ok(QwertyImportResponseDto.Success(operations));
                    }

                    case "caisse":
                    {
                        var siteId = num_traitement > 0 ? (int?)num_traitement : null;
                        var movements = await _dataProvider.GetCaisseMovementsAsync(siteId, exercice, mois);
                        var operations = _dataMapper.MapCaisseMovements(movements);
                        return Ok(QwertyImportResponseDto.Success(operations));
                    }

                    default:
                        return BadRequest(QwertyImportResponseDto.Fail("Type d'opération non supporté."));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Qwerty import for Type={Type}, Year={Year}, Month={Month}", normalizedType, exercice, mois);
                return StatusCode(StatusCodes.Status500InternalServerError, QwertyImportResponseDto.Fail($"Erreur interne lors de l'extraction des données comptables: {ex.Message}"));
            }
        }
    }
}
