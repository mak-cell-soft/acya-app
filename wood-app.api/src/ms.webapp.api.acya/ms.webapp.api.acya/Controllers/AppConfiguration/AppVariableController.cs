using Microsoft.AspNetCore.Mvc;
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
 