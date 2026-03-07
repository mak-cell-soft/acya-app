using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.api.Services
{
    public class BalanceService : IBalanceService
    {
        private readonly AppVariableRepository _appVariableRepository;
        private readonly CounterPartRepository _counterPartRepository;
        private readonly IAccountService _accountService;
        private readonly WoodAppContext _context;

        public BalanceService(
            AppVariableRepository appVariableRepository,
            CounterPartRepository counterPartRepository,
            IAccountService accountService,
            WoodAppContext context)
        {
            _appVariableRepository = appVariableRepository;
            _counterPartRepository = counterPartRepository;
            _accountService = accountService;
            _context = context;
        }

        public async Task UpdateCustomerBalanceAsync(int customerId, string lastTxType, DateTime txDate)
        {
            await UpsertBalanceAsync(customerId, CounterPartType.Customer, lastTxType, txDate);
        }

        public async Task UpdateSupplierBalanceAsync(int supplierId, string lastTxType, DateTime txDate)
        {
            await UpsertBalanceAsync(supplierId, CounterPartType.Supplier, lastTxType, txDate);
        }

        private async Task UpsertBalanceAsync(int counterpartId, CounterPartType type, string lastTxType, DateTime txDate)
        {
            var counterpart = await _context.CounterParts.FindAsync(counterpartId);
            if (counterpart == null || counterpart.IsDeleted == true) return;

            var balance = await _accountService.GetCurrentBalanceAsync(counterpartId);
            string nature = type == CounterPartType.Customer ? "customerBalance" : "supplierBalance";

            var existingVar = await _appVariableRepository.GetByNatureAndExternalIdAsync(nature, counterpartId);

            var metadata = new
            {
                id = counterpartId,
                label = counterpart.Fullname,
                lastTx = lastTxType,
                lastTxDate = txDate
            };
            string jsonName = $"{counterpartId}|" + JsonSerializer.Serialize(metadata);

            if (existingVar != null)
            {
                existingVar.Name = jsonName;
                existingVar.Value = (double)balance;
                await _appVariableRepository.Update(existingVar);
            }
            else
            {
                var newVar = new AppVariable
                {
                    Nature = nature,
                    Name = jsonName,
                    Value = (double)balance,
                    isActive = true,
                    isDefault = false,
                    isEditable = false,
                    isDeleted = false
                };
                await _appVariableRepository.Add(newVar);
            }
        }

        public async Task RefreshAllBalancesAsync()
        {
            // Clear existing balances to ensure fresh state if needed, or just update all
            // For safety and performance, we'll just iterate and update
            var counterparts = await _context.CounterParts
                .Where(cp => cp.IsDeleted == false)
                .ToListAsync();

            foreach (var cp in counterparts)
            {
                await UpsertBalanceAsync(cp.Id, cp.Type, "refresh", DateTime.UtcNow);
            }
        }

        public async Task<IEnumerable<BalanceEntryDto>> GetCustomerBalancesAsync()
        {
            return await GetBalancesByNatureAsync("customerBalance");
        }

        public async Task<IEnumerable<BalanceEntryDto>> GetSupplierBalancesAsync()
        {
            return await GetBalancesByNatureAsync("supplierBalance");
        }

        private async Task<IEnumerable<BalanceEntryDto>> GetBalancesByNatureAsync(string nature)
        {
            var variables = await _appVariableRepository.GetAllAsync(nature);
            var result = new List<BalanceEntryDto>();

            foreach (var v in variables)
            {
                if (v == null || string.IsNullOrEmpty(v.Name)) continue;

                try
                {
                    string jsonPart = v.Name;
                    int pipeIndex = v.Name.IndexOf('|');
                    if (pipeIndex >= 0)
                    {
                        jsonPart = v.Name.Substring(pipeIndex + 1);
                    }

                    var metadata = JsonSerializer.Deserialize<JsonElement>(jsonPart);
                    result.Add(new BalanceEntryDto
                    {
                        Id = metadata.GetProperty("id").GetInt32(),
                        Label = metadata.GetProperty("label").GetString() ?? "Unknown",
                        ClosingBalance = (decimal)(v.Value ?? 0),
                        LastTransaction = metadata.GetProperty("lastTx").GetString() ?? "",
                        DateOfLastTransaction = metadata.GetProperty("lastTxDate").GetDateTime()
                    });
                }
                catch
                {
                    // Fallback if JSON is malformed (e.g. from early manual entries)
                    // Skip or log
                }
            }

            return result;
        }
    }
}
