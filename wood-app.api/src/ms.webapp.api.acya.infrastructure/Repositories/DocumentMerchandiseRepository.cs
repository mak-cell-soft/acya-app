using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class DocumentMerchandiseRepository : CoreRepository<DocumentMerchandise, WoodAppContext>
  {
    public DocumentMerchandiseRepository(WoodAppContext context) : base(context) { }

    public async Task<IEnumerable<ListOflengthDto>> GetListOfLengthsByDoc(int docId)
    {
      if (docId == 0)
      {
        return null!;
      }

      // Get all DocumentMerchandise records for the given docId
      var documentMerchandises = await context.DocumentMerchandises
          .Include(dm => dm.QuantityMovements)
              .ThenInclude(qm => qm!.ListOfLengths)
                  .ThenInclude(lol => lol.AppVarLength)
          .Where(dm => dm.DocumentId == docId)
          .ToListAsync();

      // Collect all ListOfLength entities from all QuantityMovements,
      // filtering out records where NumberOfPieces == 0
      var listOfLengths = documentMerchandises
          .SelectMany(dm => dm.QuantityMovements?.ListOfLengths
                            ?? Enumerable.Empty<ListOfLength>())
          .Where(lol => lol.NumberOfPieces != 0)
          .ToList();

      // Convert to DTOs
      var result = listOfLengths.Select(lol => new ListOflengthDto(lol)).ToList();

      return result;
    }
  }
}
