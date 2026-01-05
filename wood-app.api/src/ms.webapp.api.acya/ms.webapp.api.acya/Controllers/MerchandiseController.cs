using Microsoft.AspNetCore.Mvc;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure.Repositories;

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
      var result = await _repository.GetAll();
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
        if (_mArticle.IsWood) // Reference is like BR-38115-2502-1
        {
          prefix = _mArticle.FirstChildren!.Reference + '-' + _mArticle.Thicknesses!.Name + _mArticle.Widths!.Name;
          var lastRef = await _repository.GetLastReferenceByArticle(prefix);
          if (lastRef != null)
          {
            // Extract the last part of the reference (the increment)
            var parts = lastRef.Split('-');
            if (parts.Length > 0 && int.TryParse(parts.Last(), out int lastIncrement))
            {
              newIncrement = lastIncrement + 1;
            }
          }
          reference = prefix + '-' + intermediate + '-' + newIncrement;
        }
        else // Example Reference is like STR-2502-1
        {
          prefix = _mArticle.FirstChildren!.Reference;
          var lastRef = await _repository.GetLastReferenceByArticle(prefix!);
          if (lastRef != null)
          {
            // Extract the last part of the reference (the increment)
            var parts = lastRef.Split('-');
            if (parts.Length > 0 && int.TryParse(parts.Last(), out int lastIncrement))
            {
              newIncrement = lastIncrement + 1;
            }
          }
          reference = prefix + '-' + intermediate + '-' + newIncrement;
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
