using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs.Mobile
{
    public class MobileReleasesListDto
    {
        public List<MobileReleaseDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }
}
