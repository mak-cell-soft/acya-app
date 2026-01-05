using ms.webapp.api.acya.core;

namespace ms.webapp.api.acya.infrastructure
{
    public partial class AppHealth : IEntity
    {
        public string? Name { get; set; }
        public string? Value { get; set; }
        public bool Iscr { get; set; }
        public int Id { get; set; }
  }
}
