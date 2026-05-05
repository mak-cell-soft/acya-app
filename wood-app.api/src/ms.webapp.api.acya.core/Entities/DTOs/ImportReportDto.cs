using System;
using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class ImportReportDto
    {
        public int TotalRows { get; set; }
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<ImportError> Errors { get; set; } = new List<ImportError>();
    }

    public class ImportError
    {
        public int RowIndex { get; set; }
        public string? Message { get; set; }
    }
}
