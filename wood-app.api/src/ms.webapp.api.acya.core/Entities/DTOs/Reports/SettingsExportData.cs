namespace ms.webapp.api.acya.core.Entities.DTOs.Reports
{
    public class SettingsExportData
    {
        public List<AppVariableExportRow> Taxes { get; set; } = new();
        public List<AppVariableExportRow> Dimensions { get; set; } = new();
        public List<CategoryExportRow> Categories { get; set; } = new();
        public List<SubCategoryExportRow> SubCategories { get; set; } = new();
        public List<TransporterExportRow> Transporters { get; set; } = new();
        public List<BankExportRow> Banks { get; set; } = new();
    }

    public class AppVariableExportRow
    {
        public string Nature { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public double Value { get; set; }
    }

    public class CategoryExportRow
    {
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class SubCategoryExportRow
    {
        public string Category { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class TransporterExportRow
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
    }

    public class BankExportRow
    {
        public string Designation { get; set; } = string.Empty;
        public string Rib { get; set; } = string.Empty;
    }
}
