using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.CustomerDependecies;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class StockRepository : CoreRepository<Stock, WoodAppContext>
  {
    private readonly DocumentMerchandiseRepository _docMerchRepository;
    public StockRepository(WoodAppContext context, DocumentMerchandiseRepository docMerchRepository) : base(context)
    {
      _docMerchRepository = docMerchRepository;
    }

    public async Task<IEnumerable<StockQuantityDto>> GetStockQuantities(int siteId)
    {
      var query = from s in context.Stocks
                  join m in context.Merchandises on s.MerchandiseId equals m.Id
                  join a in context.Articles on m.ArticleId equals a.Id
                  where s.MerchandiseId != 0 && s.SalesSiteId == siteId
                  orderby m.ArticleId descending
                  select new StockQuantityDto
                  {
                    ArticleId = m.ArticleId,
                    MerchandiseId = s.MerchandiseId,
                    PackageReference = m.PackageReference,
                    StockQuantity = s.Quantity,
                    SiteId = s.SalesSiteId,
                  };

      return await query.ToListAsync();

    }

    public async Task<IEnumerable<StockDto>> GetStocks()
    {
      var all = await context.Stocks
        .Include(s => s.Merchandises)
          .ThenInclude(s => s!.Articles)
        .Include(s => s.SalesSites)
        .Include(s => s.AppUsers)
          .ThenInclude(sp => sp!.Persons)
        .ToListAsync();

      var allDtos = all.Select(s => new StockDto(s)).ToList();

      return allDtos;
    }

    public async Task<IEnumerable<StockDto>> GetStocksBySite(SiteDto site)
    {
      var all = await context.Stocks
        .Include(s => s.Merchandises)
          .ThenInclude(s => s!.Articles)
        .Include(s => s.SalesSites)
        .Include(s => s.AppUsers)
        .Where(s => s.SalesSites!.Id == site.id)
        .ToListAsync();

      var allDtos = all.Select(s => new StockDto(s)).ToList();

      return allDtos;
    }

    /**
     * Enhancement of the next method
     * not necessary for now
     */
    #region Enhacement
    public async Task HandleTransactionAsync(List<Stock> transactions)
    {
      if (transactions == null || !transactions.Any())
      {
        throw new ArgumentException("Transactions list is empty or null.");
      }

      foreach (var transaction in transactions)
      {
        var stock = await context.Stocks.FindAsync(transaction.MerchandiseId);

        if (stock == null)
        {
          // Insert the first transaction
          context.Stocks.Add(transaction);
        }
        else
        {
          // Update the existing stock
          stock.Quantity += transaction.Quantity;
          stock.SalesSites = transaction.SalesSites;
          stock.AppUsers = transaction.AppUsers;
        }
      }

      await context.SaveChangesAsync();
    }
    #endregion

    /**
     * Desription : Détermine s'il s'agit d'une première insertion du stock ou une mise à jour. 
     * */
    public async Task HandleTransaction(Stock transaction)
    {
      if (transaction == null)
      {
        throw new ArgumentNullException(nameof(transaction));
      }

      if (transaction.Merchandises == null)
      {
        throw new ArgumentException("Merchandise information is required.", nameof(transaction));
      }

      if (transaction.SalesSites == null)
      {
        throw new ArgumentException("Sales Site information is required.", nameof(transaction));
      }

      /**
       * Le Stock qui va être Ajouté ou Modifié doit Appartenir au : 
       * 1- Même Article.
       * 2- Même Marchandise.
       * 3- Même Site de vente.
       */
      var stock = await context.Stocks
          .Where(s => s.Merchandises != null &&
                     s.Merchandises.ArticleId == transaction.Merchandises.ArticleId &&
                     s.Merchandises.Id == transaction.Merchandises.Id &&
                     s.SalesSites != null &&
                     s.SalesSites.Id == transaction.SalesSites.Id)
          .FirstOrDefaultAsync();

      if (stock == null)
      {
        await InsertFirstTransaction(transaction);
      }
      else
      {
        await UpdateStock(stock, transaction);
      }
    }

    /**
     * 1 - InsertFirstTransaction
     * 2 - Update Transaction according Type : Add OR Retrieve
     */
    #region Insert First Transaction (Stock)
    private async Task InsertFirstTransaction(Stock transaction)
    {
      if (transaction.Type == TransactionType.Retrieve && transaction.Quantity > 0)
      {
        throw new InvalidOperationException("Cannot retrieve stock from an empty inventory.");
      }

      transaction.CreationDate = DateTime.UtcNow;
      transaction.UpdateDate = DateTime.UtcNow;
      context.Stocks.Add(transaction);
      await context.SaveChangesAsync();
    }
    #endregion

    #region Update Transaction (Stock)
    private async Task UpdateStock(Stock existingStock, Stock transaction)
    {
      const int MaxRetries = 3;
      for (int i = 0; i < MaxRetries; i++)
      {
        try
        {
          if (transaction.Type == TransactionType.Add)
          {
            existingStock.Quantity += transaction.Quantity;
          }
          else if (transaction.Type == TransactionType.Retrieve)
          {
            if (existingStock.Quantity < transaction.Quantity &&
                transaction.Merchandises != null &&
                !transaction.Merchandises.AllowNegativStock)
            {
              throw new InvalidOperationException("Insufficient stock");
            }

            existingStock.Quantity -= transaction.Quantity;
          }

          existingStock.UpdateDate = DateTime.UtcNow;
          existingStock.Type = transaction.Type;
          existingStock.SalesSiteId = transaction.SalesSites!.Id;
          await context.SaveChangesAsync();
          return; // Success
        }
        catch (DbUpdateConcurrencyException)
        {
          if (i == MaxRetries - 1) throw; // Rethrow if max retries exceeded

          // Reload the entity from the database to get the latest values (including RowVersion)
          await context.Entry(existingStock).ReloadAsync();
        }
      }
    }
    #endregion

    #region Update Transfer Stock

    public async Task<bool> UpdateStockForTransfer(int? id1, int? id2)
    {
      if (!id1.HasValue && !id2.HasValue)
      {
        return false; // or throw an exception if both are null
      }

      Document? exitDoc = null!;
      Document? receiptDoc = null!;

      if (id1.HasValue)
      {
        exitDoc = await context.Documents.FindAsync(id1.Value);
        if (exitDoc == null)
        {
          return false; // or throw an exception if document not found
        }
      }

      if (id2.HasValue)
      {
        receiptDoc = await context.Documents.FindAsync(id2.Value);
        if (receiptDoc == null)
        {
          return false; // or throw an exception if document not found
        }
      }

      // Process documents if they exist
      var exitResult = exitDoc != null ? await HandleDocStock(exitDoc) : true;
      var receiptResult = receiptDoc != null ? await HandleDocStock(receiptDoc) : true;

      return exitResult && receiptResult;
    }

    //public async Task<bool> UpdateStockForTransfer(int id1, int id2)
    //{
    //  var exitDoc = await context.Documents.FindAsync(id1);
    //  var receiptDoc = await context.Documents.FindAsync(id2);

    //  if (exitDoc == null || receiptDoc == null)
    //  {
    //    return false; // or throw an exception if documents not found
    //  }

    //  // Process both documents
    //  var exitResult = await HandleDocStock(exitDoc);
    //  var receiptResult = await HandleDocStock(receiptDoc);

    //  return exitResult && receiptResult; // Only return true if both operations succeeded
    //}
    #endregion

    /**
     * Prépare l'objet Stock pour la mise à jour dans la base.
     * Entité concerné Stock.
     * Ceci est dans le Contexte du Transfer du Stock
     */
    private async Task<bool> HandleDocStock(core.Entities.Document doc)
    {
      if (doc?.DocumentMerchandises?.Any() != true) // Combined null/empty check
        throw new ArgumentException("Document or its merchandises are invalid.");

      var idAppUser = doc.UpdatedById;
      var appuser = await context.AppUsers
                          .Where(u => u.Id == idAppUser)
                          .FirstOrDefaultAsync();

      foreach (var merchandise in doc.DocumentMerchandises)
      {
        var stockTransaction = new Stock
        {
          Id = 0,
          Quantity = merchandise.Quantity,
          Type = (TransactionType)doc.StockTransactionType!,  // Use the determined type : Add or Retrieve
          Merchandises = merchandise.Merchandise,
          SalesSites = doc.SalesSite,
          AppUsers = appuser
        };

        await HandleTransaction(stockTransaction);
      }
      return true;
    }

    public async Task<bool> DocTransferRefExists(string ref1, string ref2)
    {
      var transfer = await context.StockTransfers
          .Include(st => st.ExitDocument)
          .Include(st => st.ReceiptDocument)
          .Where(st => st.ExitDocument!.DocNumber!.Equals(ref1) && st.ReceiptDocument!.DocNumber!.Equals(ref2))
          .FirstOrDefaultAsync();

      return transfer != null;
    }
    /**
     * Retourner les détails du Transfert : les marchandises transférés
     */
    public async Task<IEnumerable<StockTransferInfoDto>> GetStockTransfersInfos()
    {
      var query = from st in context.StockTransfers
                  join docexit in context.Documents on st.ExitDocumentId equals docexit.Id
                  join docreceipt in context.Documents on st.ReceiptDocumentId equals docreceipt.Id
                  join ssexit in context.SalesSites on docexit.SalesSiteId equals ssexit.Id
                  join ssreceipt in context.SalesSites on docreceipt.SalesSiteId equals ssreceipt.Id
                  join tr in context.Transporters on st.TransporterId equals tr.Id
                  join merexit in context.DocumentMerchandises on docexit.Id equals merexit.DocumentId
                  select new StockTransferInfoDto
                  {
                    Id = st.Id,
                    DocSortie = docexit.DocNumber!,
                    DocReception = docreceipt.DocNumber!,
                    Origine = ssexit.Address!,
                    Destination = ssreceipt.Address!,
                    TransferDate = st.TransferDate,
                    Transporter = tr.FirstName + " " + tr.LastName,
                    RefPaquet = merexit.Merchandise!.PackageReference!,
                    Status = st.Status,
                  };

      //return await query.ToListAsync();
      // Group by DocSortie and DocReception and select the first item from each group
      var groupedQuery = query
          .GroupBy(x => new { x.DocSortie, x.DocReception })
          .Select(g => g.First());

      return await groupedQuery.ToListAsync();

      /*
       * Some Enhancement if you want
       * 
          // To get the most recent transfer for each document pair:
           var groupedQuery = query
          .GroupBy(x => new { x.DocSortie, x.DocReception })
          .Select(g => g.OrderByDescending(x => x.TransferDate).First());

          // Or to get the one with the highest ID:
          var groupedQuery = query
          .GroupBy(x => new { x.DocSortie, x.DocReception })
          .Select(g => g.OrderByDescending(x => x.Id).First());
       */
    }

    public async Task<IEnumerable<StockTransferDetailsDto>> GetStockTransfersInfosDetails(string? originDoc = null, string? receipt_Doc = null)
    {
      // First get the basic transfer info grouped by merchandise and quantity
      var groupedQuery = from st in context.StockTransfers
                         join exitDoc in context.Documents on st.ExitDocumentId equals exitDoc.Id
                         join receiptDoc in context.Documents on st.ReceiptDocumentId equals receiptDoc.Id
                         join exitSite in context.SalesSites on exitDoc.SalesSiteId equals exitSite.Id
                         join receiptSite in context.SalesSites on receiptDoc.SalesSiteId equals receiptSite.Id
                         join transporter in context.Transporters on st.TransporterId equals transporter.Id
                         join exitMerch in context.DocumentMerchandises on exitDoc.Id equals exitMerch.DocumentId
                         join receiptMerch in context.DocumentMerchandises on receiptDoc.Id equals receiptMerch.DocumentId
                         join merchandise in context.Merchandises on exitMerch.MerchandiseId equals merchandise.Id
                         join article in context.Articles on merchandise.ArticleId equals article.Id
                         join category in context.Parents on article.ParentId equals category.Id into catGroup
                         from category in catGroup.DefaultIfEmpty()
                         join subcategory in context.FirstChildren on article.FirstChildId equals subcategory.Id into subGroup
                         from subcategory in subGroup.DefaultIfEmpty()
                         join thickness in context.AppVariables on article.ThicknessId equals thickness.Id into thickGroup
                         from thickness in thickGroup.DefaultIfEmpty()
                         join width in context.AppVariables on article.WidthId equals width.Id into widthGroup
                         from width in widthGroup.DefaultIfEmpty()
                         where (originDoc == null || exitDoc.DocNumber == originDoc) &&
                               (receipt_Doc == null || receiptDoc.DocNumber == receipt_Doc)
                         group new { exitMerch, exitDoc, receiptDoc, exitSite, receiptSite, st, transporter, merchandise, article, category, subcategory, thickness, width }
                         by new { exitMerch.MerchandiseId, exitMerch.Quantity } into grouped
                         select new
                         {
                           ExitMerch = grouped.First().exitMerch,
                           ExitDoc = grouped.First().exitDoc,
                           ReceiptDoc = grouped.First().receiptDoc,
                           ExitSite = grouped.First().exitSite,
                           ReceiptSite = grouped.First().receiptSite,
                           St = grouped.First().st,
                           Transporter = grouped.First().transporter,
                           Merchandise = grouped.First().merchandise,
                           Article = grouped.First().article,
                           Category = grouped.First().category,
                           SubCategory = grouped.First().subcategory,
                           Thickness = grouped.First().thickness,
                           Width = grouped.First().width,
                           Quantity = grouped.Key.Quantity
                         };

      var results = await groupedQuery.ToListAsync();

      // Get all lengths for exit documents using repository method
      var exitLengthsDict = new Dictionary<int, IEnumerable<ListOflengthDto>>();

      foreach (var result in results)
      {
        // Use the repository method to get lengths by document ID
        var docLengths = await _docMerchRepository.GetListOfLengthsByDoc(result.ExitDoc.Id);

        // Filter lengths to only include those for this specific document-merchandise
        exitLengthsDict[result.ExitMerch.Id] = docLengths?
            .Where(l => context.QuantityMovements
                .Any(qm => qm.DocumentMerchandiseId == result.ExitMerch.Id &&
                           qm.ListOfLengths.Any(lol => lol.Id == l.id)))
            .ToList() ?? Enumerable.Empty<ListOflengthDto>();
      }

      // Build the final result
      return results.Select(r => new StockTransferDetailsDto
      {
        Id = r.St.Id,
        DocSortie = r.ExitDoc.DocNumber!,
        DocReception = r.ReceiptDoc.DocNumber!,
        Origine = r.ExitSite.Address,
        Destination = r.ReceiptSite.Address,
        TransferDate = r.St.TransferDate,
        Transporter = r.Transporter.FullName,
        RefPaquet = r.Merchandise.PackageReference,
        ArticleId = r.Article.Id,
        MerchandiseId = r.Merchandise.Id,
        RefMerchandise = r.Article?.Reference ?? string.Empty,
        Description = r.Article?.Description ?? string.Empty,
        CategoryName = r.Category?.Name,
        SubCategoryName = r.SubCategory?.Name,
        Thickness = r.Thickness?.Name,
        Width = r.Width?.Name,
        Unit = r.Article?.Unit ?? string.Empty,
        Quantity = r.Quantity,
        ExitDocLengths = exitLengthsDict[r.ExitMerch.Id],
      }).ToList();
    }

    public async Task<bool> RestoreStockForTransfer(int exitDocId)
    {
      var exitDoc = await context.Documents
          .Include(d => d.DocumentMerchandises)
              .ThenInclude(dm => dm.Merchandise)
          .Include(d => d.SalesSite)
          .FirstOrDefaultAsync(d => d.Id == exitDocId);

      if (exitDoc == null) return false;

      // To restore stock that was "Retrieved", we need to perform an "Add" transaction
      foreach (var dm in exitDoc.DocumentMerchandises)
      {
        var stockTransaction = new Stock
        {
          Id = 0,
          Quantity = dm.Quantity,
          Type = TransactionType.Add, // Correcting the previous "Retrieve"
          Merchandises = dm.Merchandise,
          SalesSites = exitDoc.SalesSite,
          AppUsers = await context.AppUsers.FindAsync(exitDoc.UpdatedById)
        };

        await HandleTransaction(stockTransaction);
      }

      return true;
    }


    public async Task<IEnumerable<StockTransferInfoDto>> GetFilteredStockInfosTransfers(DateTime? fromDate = null, DateTime? toDate = null,
    int? originSiteId = null, int? destinationSiteId = null)
    {
      var query = from st in context.StockTransfers
                  join docexit in context.Documents on st.ExitDocumentId equals docexit.Id
                  join docreceipt in context.Documents on st.ReceiptDocumentId equals docreceipt.Id
                  join ssexit in context.SalesSites on docexit.SalesSiteId equals ssexit.Id
                  join ssreceipt in context.SalesSites on docreceipt.SalesSiteId equals ssreceipt.Id
                  join tr in context.Transporters on st.TransporterId equals tr.Id
                  join merexit in context.DocumentMerchandises on docexit.Id equals merexit.DocumentId
                  select new
                  {
                    StockTransfer = st,
                    ExitDoc = docexit,
                    ReceiptDoc = docreceipt,
                    OriginSite = ssexit,
                    DestinationSite = ssreceipt,
                    Transporter = tr,
                    Merchandise = merexit
                  };

      // Apply filters
      if (fromDate.HasValue)
      {
        query = query.Where(x => x.StockTransfer.TransferDate >= fromDate.Value);
      }

      if (toDate.HasValue)
      {
        query = query.Where(x => x.StockTransfer.TransferDate <= toDate.Value);
      }

      if (originSiteId.HasValue)
      {
        query = query.Where(x => x.ExitDoc.SalesSiteId == originSiteId.Value);
      }

      if (destinationSiteId.HasValue)
      {
        query = query.Where(x => x.ReceiptDoc.SalesSiteId == destinationSiteId.Value);
      }

      var result = await query.Select(x => new StockTransferInfoDto
      {
        DocSortie = x.ExitDoc.DocNumber!,
        DocReception = x.ReceiptDoc.DocNumber!,
        Origine = x.OriginSite.Address!,
        Destination = x.DestinationSite.Address!,
        TransferDate = x.StockTransfer.TransferDate,
        Transporter = x.Transporter.FirstName + " " + x.Transporter.LastName,
        RefPaquet = x.Merchandise.Merchandise!.PackageReference!
      }).ToListAsync();

      return result;
    }

    /**
     * Methode pour retourner le reste du stock bois (iswood == true) en détails
     * détails : nombre de pièces restantes pour chaque Longueur (Length).
     */
    public async Task<StockWithLengthDetailsDto> GetWoodMerchandiseStockWithLengthDetails(int merchandiseId, int salesSiteId)
    {
      var query = from stock in context.Stocks
                  join merchandise in context.Merchandises on stock.MerchandiseId equals merchandise.Id
                  join article in context.Articles on merchandise.ArticleId equals article.Id
                  join quantityMovement in context.QuantityMovements on merchandise.Id equals quantityMovement.DocumentMerchandiseId
                  where stock.MerchandiseId == merchandiseId
                        && stock.SalesSiteId == salesSiteId
                        && article.IsWood
                  select new
                  {
                    Stock = stock,
                    Merchandise = merchandise,
                    Article = article,
                    QuantityMovement = quantityMovement
                  };

      var result = await query.FirstOrDefaultAsync();

      if (result == null)
      {
        return null!;
      }

      // Now get the length details and calculate remaining pieces
      var lengthDetails = await context.ListOfLengths
          .Where(l => l.QuantityMovementId == result.QuantityMovement.Id)
          .Join(context.AppVariables,
                length => length.AppVarLengthId,
                appVar => appVar.Id,
                (length, appVar) => new LengthDetailDto
                {
                  LengthId = length.Id,
                  AppVarLengthId = appVar.Id,
                  LengthName = appVar.Name, // Adjust based on your actual property
                  NumberOfPieces = length.NumberOfPieces,
                  Quantity = length.Quantity,
                  RemainingPieces = (int)Math.Floor((double)(length!.NumberOfPieces! *
                                        (result.Stock!.Quantity! / result.QuantityMovement!.Quantity!)))
                })
          .ToListAsync();

      return new StockWithLengthDetailsDto
      {
        StockId = result.Stock.Id,
        MerchandiseId = result.Merchandise.Id,
        ArticleId = result.Article.Id,
        ArticleReference = result.Article.Reference,
        ArticleDescription = result.Article.Description,
        SalesSiteId = result.Stock.SalesSiteId,
        TotalQuantity = result.Stock.Quantity,
        QuantityMovementId = result.QuantityMovement.Id,
        LengthDetails = lengthDetails
      };
    }

    /**
     * 1. First Query: Gets all merchandise IDs for the specified wood article reference.
     * 2. Second Query: Retrieves all length movements (ListOfLengths) for:
     *  The specified merchandise(s)
     *  In the specified sales site
     *  Includes related data (AppVarLength, QuantityMovements, DocumentMerchandise, Document)
     *  Excludes deleted documents
     * 3. Calculation:
     *  Groups the results by length (ID and Name)
     *  Sums the pieces, adding for "Add" transactions and subtracting for "Retrieve" transactions
     *  Filters to only show lengths with remaining pieces (> 0)
     *  Orders by length name.
     */
    public async Task<List<WoodArticleStockDetail>> GetWoodArticleStockDetails(string articleReference, int salesSiteId, int merchandiseId)
    {
      // Normalize input
      var normalizedRef = (articleReference ?? string.Empty).Trim().ToLowerInvariant();

      // If a specific merchandiseId was provided, validate it directly first.
      List<int> merchandiseIds;
      if (merchandiseId > 0)
      {
        var merch = await context.Merchandises
            .Include(m => m.Articles)
            .FirstOrDefaultAsync(m => m.Id == merchandiseId);

        // Not found or invalid -> return empty list
        if (merch == null)
          return new List<WoodArticleStockDetail>();

        // Validate article reference, IsWood and not deleted
        var art = merch.Articles;
        if (merch.IsDeleted || art == null || !art.IsWood ||
            !string.Equals((art.Reference ?? string.Empty).Trim().ToLowerInvariant(), normalizedRef, StringComparison.OrdinalIgnoreCase))
        {
          return new List<WoodArticleStockDetail>();
        }

        merchandiseIds = new List<int> { merch.Id };
      }
      else
      {
        // No specific merchandise id: find all matching merchandises by article reference
        merchandiseIds = await context.Merchandises
            .Where(m => m.Articles != null &&
                        !m.IsDeleted &&
                        m.Articles.IsWood &&
                        (m.Articles.Reference ?? string.Empty).Trim().ToLower() == normalizedRef)
            .Select(m => m.Id)
            .ToListAsync();

        if (!merchandiseIds.Any())
          return new List<WoodArticleStockDetail>();
      }

      // Get all length movements for this merchandise in the specified sales site
      var lengthMovements = await context.ListOfLengths
          .Include(l => l.AppVarLength)
          .Include(l => l.QuantityMovements)
              .ThenInclude(qm => qm!.DocumentMerchandise)
                  .ThenInclude(dm => dm!.Document)
          .Where(l => merchandiseIds.Contains(l.QuantityMovements!.DocumentMerchandise!.MerchandiseId) &&
                     l.QuantityMovements.DocumentMerchandise.Document!.SalesSiteId == salesSiteId)
          .Select(l => new
          {
            LengthName = l.AppVarLength!.Name,
            LengthId = l.AppVarLengthId,
            NumberOfPieces = l.NumberOfPieces,
            TransactionType = l.QuantityMovements!.DocumentMerchandise!.Document!.StockTransactionType,
            IsDeleted = l.QuantityMovements.DocumentMerchandise.Document.IsDeleted
          })
          .Where(x => !x.IsDeleted) // Exclude deleted documents
          .ToListAsync();

      // Calculate the remaining pieces by length
      var result = lengthMovements
          .GroupBy(x => new { x.LengthId, x.LengthName })
          .Select(g => new WoodArticleStockDetail
          {
            LengthId = (int)g.Key.LengthId!,
            LengthName = g.Key.LengthName,
            RemainingPieces = g.Sum(x => x.TransactionType == TransactionType.Add ? x.NumberOfPieces : -x.NumberOfPieces)
          })
          .Where(x => x.RemainingPieces > 0) // Only show lengths with remaining pieces
          .OrderBy(x => x.LengthName)
          .ToList();

      return result!;
    }


  }



}
