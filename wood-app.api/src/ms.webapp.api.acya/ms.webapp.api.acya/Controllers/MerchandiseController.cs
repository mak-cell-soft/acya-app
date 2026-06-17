using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure.Repositories;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.api.Controllers
{
  public class MerchandiseController : BaseApiController
  {
    private readonly MerchandiseRepository _repository;
    private readonly ArticleRepository _articleRepository;
    public MerchandiseController(MerchandiseRepository repository, ArticleRepository articleRepository)
    {
      _repository = repository;
      _articleRepository = articleRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MerchandiseDto>>> GetAll()
    {
      var result = await _repository.GetAllAsync();
      return Ok(result);
    }

    [HttpGet("getref/{_id}")]
    public async Task<ActionResult<string>> GenerateReferenceForMerchandise(int _id)
    {
      string _y = DateTime.Now.ToString("yy");
      string _m = DateTime.Now.ToString("MM");
      var _mArticle = await _articleRepository.GetById(_id);
      string? prefix = "";
      string? intermediate = _y + _m; // Concat 2 digit year and 2 digit month
      string? reference = "";
      int newIncrement = 1;

      if (_mArticle != null)
      {
        if (_mArticle.IsWood) // Reference is like BR-2502-38115-1
        {
          string category = _mArticle.FirstChildren?.Reference ?? "";
          string thicknessWidth = $"{_mArticle.Thicknesses?.Name}{_mArticle.Widths?.Name}";
          
          string searchPrefix = Helpers.GenerateMerchandiseReference(category, thicknessWidth, null);
          searchPrefix = searchPrefix.Substring(0, searchPrefix.LastIndexOf('-')); 
          
          var lastRef = await _repository.GetLastReferenceByArticle(searchPrefix);
          reference = Helpers.GenerateMerchandiseReference(category, thicknessWidth, lastRef);
        }
        else // Example Reference is like STR-2502-1
        {
          string category = _mArticle.FirstChildren?.Reference ?? "";
          
          string searchPrefix = Helpers.GenerateMerchandiseReference(category, "", null);
          searchPrefix = searchPrefix.Substring(0, searchPrefix.LastIndexOf('-')); 
          
          var lastRef = await _repository.GetLastReferenceByArticle(searchPrefix);
          reference = Helpers.GenerateMerchandiseReference(category, "", lastRef);
        }

        return reference;
      }
      else
      {
        return intermediate + "-";
      }
    }
  }
}
