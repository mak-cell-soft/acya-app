using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Controllers
{
    public class BankDepositController : BaseApiController
    {
        private readonly BankDepositRepository _depositRepository;
        private readonly BankRepository _bankRepository;
        private readonly AppVariableRepository _appVarRepository;
        private readonly CaisseMovementRepository _caisseRepository;

        public BankDepositController(
            BankDepositRepository depositRepository,
            BankRepository bankRepository,
            AppVariableRepository appVarRepository,
            CaisseMovementRepository caisseRepository)
        {
            _depositRepository = depositRepository;
            _bankRepository = bankRepository;
            _appVarRepository = appVarRepository;
            _caisseRepository = caisseRepository;
        }

        [HttpPost]
        public async Task<ActionResult<BankDepositDto>> Create([FromBody] CreateBankDepositDto createDto)
        {
            try
            {
                var bank = await _bankRepository.Get(createDto.BankId);
                if (bank == null) return NotFound("Bank not found");

                // 1. Determine Fee HT based on type
                decimal feeHT = createDto.DepositType.ToUpper() switch
                {
                    "CHEQUE" => bank.ChequeDepositFeeHT,
                    "TRAITE" => bank.TraiteDepositFeeHT,
                    "VIREMENT" => bank.WireTransferFeeHT,
                    "ESPECE" or "CASH" => 0, // En général pas de frais pour versement espèces ? Le prompt dit "chaque opération en banque a un coût"
                    _ => bank.MiscFeeHT
                };
                
                // Si ESPECE a aussi un coût, on pourrait utiliser MiscFeeHT ou ajouter une colonne. 
                // Pour l'instant on suit le prompt.

                // 2. Get Tax Rate (TVA 19% default if not found)
                var tvaVars = await _appVarRepository.GetAllAsync("Tva");
                decimal taxRate = (decimal)(tvaVars.FirstOrDefault()?.Value ?? 19.0);

                // 3. Calculate
                decimal feeWithTax = feeHT * (1 + taxRate / 100);
                decimal netAmount = createDto.AmountHT - feeWithTax;

                // 4. Create Deposit
                var deposit = new BankDeposit
                {
                    BankId = createDto.BankId,
                    DepositDate = DateTime.Now,
                    DepositType = createDto.DepositType,
                    AmountHT = createDto.AmountHT,
                    FeeHT = feeHT,
                    TaxRate = taxRate,
                    FeeWithTax = feeWithTax,
                    NetAmount = netAmount,
                    Reference = string.IsNullOrWhiteSpace(createDto.Reference)
                        ? Helpers.GenerateDailyDocNumber("BORD", await _depositRepository.GetLastReferenceAsync("BORD"))
                        : createDto.Reference,
                    Notes = createDto.Notes,
                    PaymentInstrumentId = createDto.PaymentInstrumentId,
                    SalesSiteId = createDto.SalesSiteId,
                    CreatedByUserId = createDto.CreatedByUserId
                };

                var addedDeposit = await _depositRepository.Add(deposit);

                // 5. If ESPECE or CASH, create CaisseMovement (SORTIE)
                if ((createDto.DepositType.ToUpper() == "ESPECE" || createDto.DepositType.ToUpper() == "CASH") && createDto.SalesSiteId.HasValue)
                {
                    var caisseMovement = new CaisseMovement
                    {
                        SalesSiteId = createDto.SalesSiteId.Value,
                        MovementDate = DateTime.Now,
                        Type = "SORTIE",
                        Reason = "VERSEMENT_BANQUE",
                        Amount = createDto.AmountHT,
                        Reference = deposit.Reference,
                        Notes = $"Versé à {bank.Designation}",
                        BankDepositId = addedDeposit.Id,
                        CreatedByUserId = createDto.CreatedByUserId
                    };
                    await _caisseRepository.Add(caisseMovement);
                }

                return Ok(new BankDepositDto
                {
                    Id = addedDeposit.Id,
                    BankId = addedDeposit.BankId,
                    BankName = bank.Designation,
                    DepositDate = addedDeposit.DepositDate,
                    DepositType = addedDeposit.DepositType,
                    AmountHT = addedDeposit.AmountHT,
                    FeeHT = addedDeposit.FeeHT,
                    TaxRate = addedDeposit.TaxRate,
                    FeeWithTax = addedDeposit.FeeWithTax,
                    NetAmount = addedDeposit.NetAmount,
                    Reference = addedDeposit.Reference,
                    Notes = addedDeposit.Notes,
                    CreatedAt = addedDeposit.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("bank/{bankId}")]
        public async Task<ActionResult<IEnumerable<BankDepositDto>>> GetByBank(int bankId)
        {
            var deposits = await _depositRepository.GetByBankIdAsync(bankId);
            return Ok(deposits.Select(d => new BankDepositDto
            {
                Id = d.Id,
                BankId = d.BankId,
                DepositDate = d.DepositDate,
                DepositType = d.DepositType,
                AmountHT = d.AmountHT,
                NetAmount = d.NetAmount,
                Reference = d.Reference,
                SalesSiteName = d.SalesSite?.Address
            }));
        }

        [HttpGet("balance/{bankId}")]
        public async Task<ActionResult<BankBalanceDto>> GetBankBalance(int bankId)
        {
            var bank = await _bankRepository.Get(bankId);
            if (bank == null) return NotFound();

            var totalDeposits = await _depositRepository.GetTotalNetsByBankAsync(bankId);
            var totalFees = await _depositRepository.GetTotalFeesByBankAsync(bankId);

            return Ok(new BankBalanceDto
            {
                BankId = bank.Id,
                BankName = bank.Designation,
                Rib = bank.Rib,
                InitialBalance = bank.InitialBalance,
                TotalDeposits = totalDeposits,
                TotalFees = totalFees,
                CurrentBalance = bank.InitialBalance + totalDeposits
            });
        }
        
        [HttpGet("balances")]
        public async Task<ActionResult<IEnumerable<BankBalanceDto>>> GetAllBankBalances()
        {
            var banks = await _bankRepository.GetAll();
            var results = new List<BankBalanceDto>();
            
            foreach(var bank in banks)
            {
                var totalDeposits = await _depositRepository.GetTotalNetsByBankAsync(bank.Id);
                results.Add(new BankBalanceDto
                {
                    BankId = bank.Id,
                    BankName = bank.Designation,
                    Rib = bank.Rib,
                    InitialBalance = bank.InitialBalance,
                    TotalDeposits = totalDeposits,
                    CurrentBalance = bank.InitialBalance + totalDeposits
                });
            }
            return Ok(results);
        }
    }
}
