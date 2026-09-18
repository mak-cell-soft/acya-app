using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers.AppConfiguration
{
  public class AppVariableController : BaseApiController
  {
    private readonly AppVariableRepository _repository;
    public AppVariableController(AppVariableRepository repository)
    {
      _repository = repository;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<AppVariableDto>?> Add(AppVariableDto appvar)
    {
      // Check if the bank account already exists in the repository by unique identifier : rib
      var existingAppvariable = await _repository.GetByNameAsync(appvar.name!, appvar.GetFormattedValue()!);
      if (existingAppvariable != null)
      {
        return Conflict("AppVariable with given name and value already exist."); // Return 409 Conflict if category exists
      }
      var _appvar = new AppVariable(appvar);
      var addedAppVar = await _repository.Add(_appvar);
      appvar.id = addedAppVar.Id; // Update the DTO with the generated ID
      return CreatedAtAction(nameof(Get), new { id = appvar!.id }, appvar);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _bank = await _repository.Get(id);
      if (_bank == null)
      {
        return NotFound();
      }
      return Ok();
    }

    [HttpGet("getall/{nature}")]
    public async Task<ActionResult<IEnumerable<AppVariableDto>>> GetAll(string nature)
    {
      var allbyNature = await _repository.GetAllAsync(nature);
      var choosenDtos = allbyNature.Select
                        (u => new AppVariableDto(u!))
                        .ToList();
      return Ok(choosenDtos);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AppVariableDto?>> Put(int id, AppVariableDto dto)
    {
      // Fetch the existing entity by id
      var existingAppVar = await _repository.Get(id);
      if (existingAppVar == null)
      {
        return NotFound();
      }
      // Update the properties using the constructor
      existingAppVar.UpdateFromDto(dto);
      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingAppVar);
      if (updatedEntity != null)
      {
        var updatedDto = new AppVariableDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NotFound();
    }

    [HttpPost("daily-ceiling")]
    public async Task<ActionResult<AppVariableDto>> UpsertDailyCeiling(AppVariableDto dto)
    {
      if (string.IsNullOrEmpty(dto.name) || string.IsNullOrEmpty(dto.value))
      {
        return BadRequest("Date (name) and Amount (value) are required.");
      }

      var existing = await _repository.GetByNatureAndNameAsync("DailyInvoiceCeiling", dto.name);
      if (existing != null)
      {
        existing.Value = dto.GetFormattedValue();
        existing.isActive = dto.isactive ?? true;
        existing.isDeleted = false;
        var updated = await _repository.Update(existing);
        return Ok(new AppVariableDto(updated!));
      }
      else
      {
        var _appvar = new AppVariable
        {
          Nature = "DailyInvoiceCeiling",
          Name = dto.name,
          Value = dto.GetFormattedValue(),
          isActive = dto.isactive ?? true,
          isDefault = false,
          isEditable = true,
          isDeleted = false
        };
        var added = await _repository.Add(_appvar);
        return Ok(new AppVariableDto(added));
      }
    }

    [HttpGet("impression")]
    public async Task<ActionResult> GetImpression()
    {
      var impressionVar = await _repository.GetImpressionAsync();
      if (impressionVar == null || string.IsNullOrEmpty(impressionVar.ValueText))
      {
        return Content(DefaultPrintLocaleJson, "application/json");
      }
      return Content(impressionVar.ValueText, "application/json");
    }

    [HttpPut("impression")]
    public async Task<ActionResult> PutImpression([FromBody] System.Text.Json.JsonElement body)
    {
      var rawJson = body.GetRawText();
      var impressionVar = await _repository.GetImpressionAsync();
      if (impressionVar == null)
      {
        impressionVar = new AppVariable
        {
          Nature = "Impression",
          Name = "print-locale",
          ValueText = rawJson,
          isActive = true,
          isDefault = false,
          isEditable = true,
          isDeleted = false
        };
        await _repository.Add(impressionVar);
      }
      else
      {
        impressionVar.ValueText = rawJson;
        await _repository.Update(impressionVar);
      }
      return Ok(new { success = true });
    }

    /// <summary>
    /// GET /api/AppVariable/roles
    /// Retrieves current tenant's configurable employee roles.
    /// Auto-initializes with default roles if the configuration does not yet exist.
    /// </summary>
    [HttpGet("roles")]
    public async Task<ActionResult> GetRoles()
    {
      var rolesVar = await _repository.GetRolesAsync();
      if (rolesVar == null || string.IsNullOrWhiteSpace(rolesVar.ValueText))
      {
        // Safe auto-initialization: seed default roles for tenant if not present
        if (rolesVar == null)
        {
          rolesVar = new AppVariable
          {
            Nature = "Roles",
            Name = "ROLES",
            ValueText = DefaultRolesJson,
            isActive = true,
            isDefault = true,
            isEditable = true,
            isDeleted = false
          };
          await _repository.Add(rolesVar);
        }
        else
        {
          rolesVar.ValueText = DefaultRolesJson;
          await _repository.Update(rolesVar);
        }
        return Content(DefaultRolesJson, "application/json");
      }
      return Content(rolesVar.ValueText, "application/json");
    }

    /// <summary>
    /// PUT /api/AppVariable/roles
    /// Updates current tenant's configurable employee roles.
    /// Strictly restricted to tenant administrators (Admin / SuperAdmin).
    /// </summary>
    [Authorize(Roles = "Admin,SuperAdmin")]
    [HttpPut("roles")]
    public async Task<ActionResult> PutRoles([FromBody] EmployeeRolesConfigDto config)
    {
      if (config == null || config.Roles == null)
      {
        return BadRequest(new { message = "Configuration de rôles invalide." });
      }

      // 1. Validation & trimming
      var seenIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

      // Collect existing codes to avoid collisions when assigning new codes
      var existingRolesVar = await _repository.GetRolesAsync();
      var existingRolesMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
      int maxCode = 99;

      if (existingRolesVar != null && !string.IsNullOrWhiteSpace(existingRolesVar.ValueText))
      {
        try
        {
          var parsedExisting = System.Text.Json.JsonSerializer.Deserialize<EmployeeRolesConfigDto>(existingRolesVar.ValueText);
          if (parsedExisting?.Roles != null)
          {
            foreach (var r in parsedExisting.Roles)
            {
              if (r.Code.HasValue && r.Code.Value > maxCode)
                maxCode = r.Code.Value;
              if (!string.IsNullOrEmpty(r.Id) && r.Code.HasValue)
                existingRolesMap[r.Id] = r.Code.Value;
            }
          }
        }
        catch { /* ignore deserialization issues of old record */ }
      }

      // Default codes dictionary for known historical roles
      var defaultHistoricalCodes = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
      {
        { "conducteur-travaux", 40 },
        { "chauffeur", 45 },
        { "vendeur", 50 },
        { "agent-facturation", 60 },
        { "gestionnaire-stock", 70 }
      };

      var validatedRoles = new List<EmployeeRoleItemDto>();
      foreach (var role in config.Roles)
      {
        var trimmedName = role.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmedName))
        {
          return BadRequest(new { message = "Le nom de la fonction ne peut pas être vide." });
        }

        // Generate slug if ID is empty
        var roleId = string.IsNullOrWhiteSpace(role.Id) 
          ? Slugify(trimmedName) 
          : role.Id.Trim().ToLowerInvariant();

        if (seenIds.Contains(roleId))
        {
          return BadRequest(new { message = $"L'identifiant '{roleId}' est dupliqué." });
        }
        if (seenNames.Contains(trimmedName))
        {
          return BadRequest(new { message = $"La fonction '{trimmedName}' existe déjà." });
        }

        seenIds.Add(roleId);
        seenNames.Add(trimmedName);

        // Determine stable numeric code:
        // Priority: explicitly sent valid code -> existing code -> historical default code -> new incremental code (>= 100)
        int code;
        if (role.Code.HasValue && role.Code.Value > 0)
        {
          code = role.Code.Value;
        }
        else if (existingRolesMap.TryGetValue(roleId, out var existingCode))
        {
          code = existingCode;
        }
        else if (defaultHistoricalCodes.TryGetValue(roleId, out var defaultCode))
        {
          code = defaultCode;
        }
        else
        {
          maxCode++;
          code = maxCode;
        }

        validatedRoles.Add(new EmployeeRoleItemDto
        {
          Id = roleId,
          Code = code,
          Name = trimmedName,
          IsActive = role.IsActive
        });
      }

      // 2. Safety check against permanent deletion of roles in use:
      // If a role was previously configured and had a code, but is missing from the new configuration:
      if (existingRolesVar != null && !string.IsNullOrWhiteSpace(existingRolesVar.ValueText))
      {
        try
        {
          var prevConfig = System.Text.Json.JsonSerializer.Deserialize<EmployeeRolesConfigDto>(existingRolesVar.ValueText);
          if (prevConfig?.Roles != null)
          {
            foreach (var prevRole in prevConfig.Roles)
            {
              if (prevRole.Code.HasValue && !validatedRoles.Any(r => r.Code == prevRole.Code.Value))
              {
                // Check if any active employee currently has this role
                var inUse = await _repository.IsRoleInUseAsync(prevRole.Code.Value);
                if (inUse)
                {
                  return Conflict(new
                  {
                    message = $"Impossible de supprimer la fonction '{prevRole.Name}' car des collaborateurs y sont actuellement assignés. Vous pouvez la désactiver à la place."
                  });
                }
              }
            }
          }
        }
        catch { /* proceed */ }
      }

      var serialized = System.Text.Json.JsonSerializer.Serialize(new EmployeeRolesConfigDto { Roles = validatedRoles }, new System.Text.Json.JsonSerializerOptions
      {
        WriteIndented = true
      });

      if (existingRolesVar == null)
      {
        existingRolesVar = new AppVariable
        {
          Nature = "Roles",
          Name = "ROLES",
          ValueText = serialized,
          isActive = true,
          isDefault = false,
          isEditable = true,
          isDeleted = false
        };
        await _repository.Add(existingRolesVar);
      }
      else
      {
        existingRolesVar.ValueText = serialized;
        existingRolesVar.isDeleted = false;
        await _repository.Update(existingRolesVar);
      }

      return Ok(new { success = true, config = new EmployeeRolesConfigDto { Roles = validatedRoles } });
    }

    private static string Slugify(string text)
    {
      if (string.IsNullOrWhiteSpace(text)) return Guid.NewGuid().ToString("N").Substring(0, 8);
      var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
      var sb = new System.Text.StringBuilder();
      foreach (var c in normalized)
      {
        var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
        if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
        {
          if (char.IsLetterOrDigit(c))
            sb.Append(char.ToLowerInvariant(c));
          else if (c == ' ' || c == '-' || c == '_')
            sb.Append('-');
        }
      }
      var res = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), "-+", "-").Trim('-');
      return string.IsNullOrEmpty(res) ? Guid.NewGuid().ToString("N").Substring(0, 8) : res;
    }

    private const string DefaultRolesJson = @"{
  ""roles"": [
    {
      ""id"": ""conducteur-travaux"",
      ""code"": 40,
      ""name"": ""Conducteur de Travaux"",
      ""isActive"": true
    },
    {
      ""id"": ""chauffeur"",
      ""code"": 45,
      ""name"": ""Conducteur Véhicule (Chauffeur)"",
      ""isActive"": true
    },
    {
      ""id"": ""vendeur"",
      ""code"": 50,
      ""name"": ""Vendeur"",
      ""isActive"": true
    },
    {
      ""id"": ""agent-facturation"",
      ""code"": 60,
      ""name"": ""Agent de Facturation"",
      ""isActive"": true
    },
    {
      ""id"": ""gestionnaire-stock"",
      ""code"": 70,
      ""name"": ""Gestionnaire de Stock"",
      ""isActive"": true
    }
  ]
}";

    private const string DefaultPrintLocaleJson = @"{
  ""originalLabel"": {
    ""bl"": ""ORIGINAL CLIENT"",
    ""invoice"": ""FACTURE ORIGINAL""
  },
  ""originalLabelTransfer"": ""TRANSFERT STOCK"",
  ""companyArabicName"": ""الشركة التجارية للحديد و الخشب"",
  ""companyArabicCapital"": ""شركة خفية الإسم رأس مالها 20.000 د.ت"",
  ""companyArabicAddress"": ""مقرها الاجتماعي: طريق رواد كلم 4 اريانة"",
  ""stampImageBase64"": """",
  ""labels"": {
    ""client"": ""Client :"",
    ""address"": ""Adresse :"",
    ""tvaCode"": ""Code TVA :"",
    ""date"": ""DATE"",
    ""docNumberBL"": ""N° BL"",
    ""docNumberInvoice"": ""N° BL/FAC"",
    ""accountNumber"": ""N° COMPTE"",
    ""designations"": ""DESIGNATIONS"",
    ""unit"": ""UN"",
    ""qty"": ""QTE"",
    ""unitPriceHT"": ""P.U.H.T"",
    ""tva"": ""TVA"",
    ""discount"": ""RM"",
    ""amountHT"": ""MONTANT HT"",
    ""taxe"": ""Taxe"",
    ""base"": ""Base"",
    ""percent"": ""%"",
    ""value"": ""Valeur"",
    ""arreteLaSomme"": ""ARRETE LA PRESENTE A LA SOMME DE :"",
    ""totalHT"": ""TOTAL H.T.V.A"",
    ""totalTVA"": ""TOTAL TVA"",
    ""totalTTC"": ""TOTAL TTC"",
    ""stampTax"": ""TIMBRE FISCAL"",
    ""withholdingTax"": ""RETENUE SOURCE"",
    ""netPayable"": ""NET A PAYER"",
    ""signClient"": ""SIGN. CLIENT"",
    ""truckNumber"": ""N° CAMION"",
    ""driverName"": ""NOM CHAUFFEUR"",
    ""cin"": ""C.I.N :"",
    ""controlBL"": ""CONTROL BL"",
    ""controlExit"": ""CONTROL SORTIE""
  }
}";
  }
}
 