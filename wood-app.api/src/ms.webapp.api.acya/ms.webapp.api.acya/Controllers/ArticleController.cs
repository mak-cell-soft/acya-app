using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Controllers
{
  public class ArticleController : BaseApiController
  {
    private readonly ArticleRepository _repository;
    private readonly SellPriceHistoryRepository _repositoryPriceHistory;

    public ArticleController(ArticleRepository repository, SellPriceHistoryRepository repositoryPriceHistory)
    {
      _repository = repository;
      _repositoryPriceHistory = repositoryPriceHistory;
    }

    [HttpPost("Add")]
    public async Task<ActionResult<ArticleDto>> Add(ArticleDto articleDto)
    {
      // Check if the article with the given reference already exists
      var existingArticle = await _repository.GetByReference(articleDto.reference!);
      if (existingArticle != null)
      {
        return Conflict("Article with Given Reference Already exists");
      }

      // Create the new article
      var newArticle = new Article(articleDto);
      var addedArticle = await _repository.Add(newArticle);

      if (addedArticle == null)
      {
        return BadRequest("Failed to add the new article: SaveChanges returned 0");
      }

      // Update the article DTO with the ID from the added article
      articleDto.id = addedArticle.Id;

      // Attempt to add the sell price history
      var sellPriceHistory = new SellPriceHistory
      {
        PriceValue = (double)(addedArticle.SellPriceTTC ?? 0),
        Description = addedArticle.Description,
        CreationDate = addedArticle.CreationDate,
        UpdateDate = addedArticle.UpdateDate,
        IsDeleted = addedArticle.IsDeleted,
        ArticleId = addedArticle.Id,
        UpdatedBy = addedArticle.UpdatedBy
      };

      var addedSellHistory = await _repositoryPriceHistory.Add(sellPriceHistory);

      // If history is not added, return error
      if (addedSellHistory == null)
      {
        return NotFound("Failed to add sell price history: SaveChanges returned 0");
      }

      // Update the added article with the history ID and save it back to the repository
      addedArticle.SellHistoryId = addedSellHistory.Id;
      var updatedArticle = await _repository.Update(addedArticle);

      if (updatedArticle == null)
      {
        return BadRequest("Failed to update the article with the history ID: SaveChanges returned 0");
      }

      // Return the created article with its history
      return CreatedAtAction(nameof(Get), new { articleDto!.id }, articleDto);
    }


    [HttpGet("{id}")]
    public async Task<ActionResult> Get(int id)
    {
      var _article = await _repository.GetById(id);
      if (_article == null)
      {
        return NotFound();
      }
      return Ok();
    }

    [HttpGet("LastPurchasePrice/{id}")]
    public async Task<ActionResult<double>> GetLastPurchasePrice(int id)
    {
      var price = await _repository.GetLastPurchasePrice(id);
      return Ok(price);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ArticleDto?>> Put(int id, ArticleDto dto)
    {
      // Fetch the existing entity by id
      var existingArticle = await _repository.GetById(id);
      if (existingArticle == null)
      {
        return NotFound();
      }

      // Check if there's another article with the same reference but a different ID
      var articleWithSameReference = await _repository.GetByReference(dto.reference!);
      if (articleWithSameReference != null && articleWithSameReference.Id != id)
      {
        return Conflict(new { message = "An article with the same reference already exists." });
      }

      // Update the properties using the constructor
      existingArticle.UpdateFromDto(dto);

      // Update the entity in the repository
      var updatedEntity = await _repository.Update(existingArticle);
      if (updatedEntity != null)
      {
        // Record sell price history if price changed
        if (dto.sellprice_ttc > 0)
        {
            var sellPriceHistory = new SellPriceHistory
            {
                PriceValue = dto.sellprice_ttc,
                ArticleId = updatedEntity.Id,
                UpdatedBy = updatedEntity.UpdatedBy,
                CreationDate = DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow,
                IsDeleted = false
            };
            await _repositoryPriceHistory.Add(sellPriceHistory);
        }

        var updatedDto = new ArticleDto(updatedEntity);
        return Ok(updatedDto);
      }
      return NoContent();
    }

    /**
     * return all Articles where IsDeleted == false;
     * 
     */

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ArticleDto>>> GetAll()
    {
      var allDtos = await _repository.GetAllAsync();
      return Ok(allDtos);
    }

    /**
    * Delete Soft just update isdeleted flag by true;
    * 
    */

    [HttpDelete("DeleteSoft/{id}")]
    public async Task<ActionResult> DeleteSoft(int id)
    {
      var _a = await _repository.GetById(id);
      if (_a == null)
      {
        return NotFound();
      }
      _a.IsDeleted = true;
      var updateDel = await _repository.Update(_a);
      return Ok();
    }

    [HttpGet("{id}/purchase-history")]
    public async Task<ActionResult<IEnumerable<PurchasePriceHistoryDto>>> GetPurchaseHistory(int id)
    {
        var history = await _repository.GetPurchaseHistory(id);
        var dtos = history.Select(h => new PurchasePriceHistoryDto(h));
        return Ok(dtos);
    }

    [HttpGet("{id}/sales-history")]
    public async Task<ActionResult<IEnumerable<SalesPriceHistoryDto>>> GetSalesHistory(int id)
    {
        var history = await _repository.GetSalesHistory(id);
        var dtos = history.Select(h => new SalesPriceHistoryDto(h));
        return Ok(dtos);
    }

    [HttpGet("{id}/catalog-history")]
    public async Task<ActionResult<IEnumerable<SellPriceHistoryDto>>> GetCatalogHistory(int id)
    {
        var history = await _repository.GetSellPriceHistory(id);
        var dtos = history.Select(h => new SellPriceHistoryDto(h));
        return Ok(dtos);
    }
  }
}
