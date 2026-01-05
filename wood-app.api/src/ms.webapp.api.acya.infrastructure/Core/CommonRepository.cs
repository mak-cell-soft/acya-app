using Microsoft.EntityFrameworkCore;

namespace ms.webapp.api.acya.infrastructure
{
  public class CommonRepository : ICommonRepository
  {
    private readonly WoodAppContext _context;
    public CommonRepository(WoodAppContext context)
    {
      _context = context;
    }
    public async Task<string> DataBaseIsOk()
    {
      try
      {
        var appHealth = await _context.AppHealths.SingleOrDefaultAsync(h => h.Name == "APP_VERSION");

        if (appHealth != null)
        {
          var appVersion = appHealth.Value;
          return "OK. Version: " + appVersion;
        }
        else
        {
          return "KO: APP_VERSION not found.";
        }
      }
      catch (Exception ex)
      {
        return "KO: " + ex.Message;
      }
    }

  }
}
