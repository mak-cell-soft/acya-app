using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class DocumentRepository : CoreRepository <Document, WoodAppContext>
  {
    private readonly StockRepository _stockRepository;
    public DocumentRepository(WoodAppContext context, StockRepository stockRepository) : base(context)
    {
      _stockRepository = stockRepository;
    }

    //public new async Task<IEnumerable<DocumentDto>> GetAllAsync()
    //{
    //  var all = await context.Documents
    //      .Where(_s => _s.IsDeleted == false)
    //      .ToListAsync();

    //  var allDtos = all.Select(d => new DocumentDto(d)).ToList();
    //  return allDtos!;
    //}

    public async Task<List<Document>> GetAll(IEnumerable<int> ids)
    {
      return await context.Documents
                           .Where(d => ids.Contains(d.Id))
                           .ToListAsync();
    }
    public bool GetDocBySupplierReference(string supplierReference, DocumentTypes type)
    {
      var doc = context.Documents
               .Where(d => d.Type == type)
               .Where(d => d.SupplierReference == supplierReference)
               .Any();
      return doc;
    }

    public string? GetLastDocNumberByPrefix(string prefix)
    {
      return context.Documents
          .Where(d => d.DocNumber!.StartsWith(prefix))
          .OrderByDescending(d => d.DocNumber)
          .Select(d => d.DocNumber)
          .FirstOrDefault();
    }

    public async Task AddRelationship(DocumentDocumentRelationship relationship)
    {
      context.DocumentDocumentRelationships.Add(relationship);
      await context.SaveChangesAsync();
    }

    public async Task SaveChanges()
    {
      await context.SaveChangesAsync();
    }

    /**
    * Update Table Stock by Merchandises.
    * Identify which document types should Add to stock and which should Retrieve from stock. Typically:
    * 1- Supplier documents (receiving goods) should Add to stock.
    * 2- Customer documents (shipping goods) should Retrieve from stock
   */
    public async Task<bool> updateStockByMerchandises(Document document)
    {
      if (document?.DocumentMerchandises?.Any() != true) // Combined null/empty check
        throw new ArgumentException("Document or its merchandises are invalid.");

      var idAppUser = document.UpdatedById;
      var appuser = await context.AppUsers
                          .Where(u => u.Id == idAppUser)
                          .FirstOrDefaultAsync();

      var transactionType = Helpers.GetTransactionType((DocumentTypes)document.Type!);

      foreach (var merchandise in document.DocumentMerchandises)
      {
        var stockTransaction = new Stock
        {
          Id = 0,
          Quantity = merchandise.Quantity,
          Type = transactionType,  // Use the determined type : Add or Retrieve
          Merchandises = merchandise.Merchandise,
          SalesSites = document.SalesSite,
          AppUsers = appuser
        };

        await _stockRepository.HandleTransaction(stockTransaction);
      }
      return true;
    }

    /**
    * Update List Of Lengths Ids (string) by Ids of Saved Lenghts
    * with condition Number of Pieces > 0
    */
    public async Task<bool> updateListOfIdsListOfLengths(Document document)
    {
      foreach (var merchandise in document.DocumentMerchandises)
      {
        if (merchandise.QuantityMovements != null)
        {
          // Filter ListOfLengths to include only those with NumberOfPieces > 0
          var listOfLengthIds = merchandise.QuantityMovements.ListOfLengths
              .Where(l => l.NumberOfPieces > 0) // Filter by NumberOfPieces > 0
              .Select(l => l.Id) // Select the IDs of the filtered ListOfLength entities
              .ToList();

          // Update LengthIds in QuantityMovement with the actual IDs of ListOfLength entities
          merchandise.QuantityMovements.LengthIds = string.Join(",", listOfLengthIds);

          // Update the QuantityMovement entity
          context.Update(merchandise.QuantityMovements);
          await context.SaveChangesAsync();
        }
      }

      return true;
    }

    /**
     * UpdateStockByMerchandises
     * Enhancement of the previous method
     * not needed for now
     */
    #region Enhancement UpdateStockByMerchandises
    private async Task<UpdateStockResult> UpdateStockByMerchandisesAsync(Document document)
    {
      if (document == null || document.Merchandises == null || !document.Merchandises.Any())
      {
        throw new ArgumentException("Document or its merchandises are invalid.");
      }

      var updateResults = new List<MerchandiseUpdateResult>();
      var failedUpdates = new List<MerchandiseUpdateResult>();

      foreach (var merchandise in document.DocumentMerchandises)
      {
        try
        {
          var stockTransaction = new Stock
          {
            Quantity = merchandise.Quantity,
            MerchandiseId = merchandise.Id,
            SalesSites = document.SalesSite,
            AppUsers = document.AppUsers
          };

          // Update the stock using the repository method
          await _stockRepository.HandleTransaction(stockTransaction);

          updateResults.Add(new MerchandiseUpdateResult
          {
            MerchandiseId = merchandise.Id,
            IsSuccess = true,
            Message = "Stock updated successfully."
          });
        }
        catch (Exception ex)
        {
          // Log the error (you can use a logging framework like Serilog, NLog, etc.)
          Console.Error.WriteLine($"Failed to update stock for merchandise {merchandise.Id}: {ex.Message}");

          failedUpdates.Add(new MerchandiseUpdateResult
          {
            MerchandiseId = merchandise.Id,
            IsSuccess = false,
            Message = ex.Message
          });
        }
      }

      return new UpdateStockResult
      {
        TotalMerchandises = document.Merchandises.Count,
        SuccessCount = updateResults.Count,
        FailedCount = failedUpdates.Count,
        SuccessUpdates = updateResults,
        FailedUpdates = failedUpdates
      };
    }
    #endregion
  }
}
