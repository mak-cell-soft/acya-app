namespace ms.webapp.api.acya.infrastructure
{
  public interface ICommonRepository
  {
    Task<string> DataBaseIsOk();
  }
}
