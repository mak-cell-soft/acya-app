using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Controllers
{
    [Authorize]
    public class ApprovalController : BaseApiController
    {
        private readonly IApprovalService _approvalService;

        public ApprovalController(IApprovalService approvalService)
        {
            _approvalService = approvalService;
        }

        [HttpGet("config/{enterpriseId}")]
        public async Task<ActionResult<ApprovalConfig>> GetConfig(int enterpriseId)
        {
            var config = await _approvalService.GetConfigAsync(enterpriseId);
            return Ok(config);
        }

        [HttpPut("config")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<ApprovalConfig>> SaveConfig(ApprovalConfigDto dto)
        {
            var config = await _approvalService.SaveConfigAsync(dto);
            return Ok(config);
        }

        [HttpPost("submit/{documentId}")]
        public async Task<ActionResult<DocumentApproval>> Submit(int documentId, [FromQuery] int userId)
        {
            try
            {
                var approval = await _approvalService.SubmitForApprovalAsync(documentId, userId);
                return Ok(approval);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("decide/{documentId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<DocumentApproval>> Decide(int documentId, ApprovalDecisionRequestDto dto)
        {
            try
            {
                var approval = await _approvalService.ProcessDecisionAsync(
                    documentId, 
                    dto.Decision, 
                    dto.DecidedByUserId, 
                    dto.RejectionReason);
                return Ok(approval);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("pending/{enterpriseId}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<IEnumerable<DocumentApprovalDto>>> GetPending(int enterpriseId)
        {
            var approvals = await _approvalService.GetPendingApprovalsAsync(enterpriseId);
            
            var dtos = new List<DocumentApprovalDto>();
            foreach (var app in approvals)
            {
                var docDto = new DocumentDto(app.Document!);
                
                // Manually map merchandises from DocumentMerchandises lines
                if (app.Document!.DocumentMerchandises != null)
                {
                    docDto.merchandises = app.Document.DocumentMerchandises.Select(dm => new MerchandiseDto
                    {
                        id = dm.MerchandiseId,
                        packagereference = dm.Merchandise?.PackageReference,
                        description = dm.Merchandise?.Description,
                        isinvoicible = dm.Merchandise?.IsInvoicible ?? false,
                        quantity = dm.Quantity,
                        unit_price_ht = dm.UnitPriceHT,
                        cost_ht = dm.CostHT,
                        discount_percentage = dm.DiscountPercentage,
                        cost_net_ht = dm.CostNetHT,
                        cost_discount_value = dm.CostDiscountValue,
                        tva_value = dm.TvaValue,
                        cost_ttc = dm.CostTTC,
                        article = dm.Merchandise?.Articles != null ? new ArticleDto(dm.Merchandise.Articles) : null,
                        lisoflengths = dm.QuantityMovements?.ListOfLengths?
                            .Select(ll => new ListOflengthDto
                            {
                                nbpieces = ll.NumberOfPieces,
                                quantity = ll.Quantity,
                                length = ll.AppVarLength != null ? new AppVariableDto(ll.AppVarLength) : null
                            }).ToArray()
                    }).ToArray();
                }

                dtos.Add(new DocumentApprovalDto
                {
                    id = app.Id,
                    documentId = app.DocumentId,
                    document = docDto,
                    submittedByUserId = app.SubmittedByUserId,
                    submittedBy = app.SubmittedBy != null ? new AppUserDto(app.SubmittedBy) : null,
                    decision = app.Decision,
                    submittedAt = app.SubmittedAt
                });
            }

            return Ok(dtos);
        }

        [HttpGet("history/{documentId}")]
        public async Task<ActionResult<IEnumerable<DocumentApproval>>> GetHistory(int documentId)
        {
            var history = await _approvalService.GetHistoryAsync(documentId);
            return Ok(history);
        }
    }

    public class ApprovalDecisionRequestDto
    {
        public ApprovalDecision Decision { get; set; }
        public int DecidedByUserId { get; set; }
        public string? RejectionReason { get; set; }
    }
}
