using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.api.Services.PdfTemplates
{
    public class PayslipTemplate : IDocument
    {
        private readonly EmployeePayslipDto _model;

        public PayslipTemplate(EmployeePayslipDto model)
        {
            _model = model;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

        public void Compose(IDocumentContainer container)
        {
            container
                .Page(page =>
                {
                    page.Margin(50);
                    page.Header().Element(ComposeHeader);
                    page.Content().Element(ComposeContent);
                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                    });
                });
        }

        void ComposeHeader(IContainer container)
        {
            container.Row(row =>
            {
                row.RelativeItem().Column(column =>
                {
                    column.Item().Text("ACYA APP").FontSize(20).SemiBold().FontColor(Colors.Blue.Medium);
                    column.Item().Text("Département Ressources Humaines");
                });

                row.RelativeItem().AlignRight().Column(column =>
                {
                    column.Item().Text("BULLETIN DE PAIE").FontSize(24).ExtraBold().FontColor(Colors.Blue.Medium);
                    column.Item().Text($"Période: {_model.periodmonth}/{_model.periodyear}");
                });
            });
        }

        void ComposeContent(IContainer container)
        {
            container.PaddingVertical(40).Column(column =>
            {
                column.Spacing(20);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("Salarie").SemiBold().FontColor(Colors.Blue.Medium);
                        c.Item().PaddingTop(5).Text($"ID Employé: {_model.employeeid}");
                    });
                });

                column.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(150);
                        columns.RelativeColumn();
                        columns.RelativeColumn();
                    });

                    table.Header(header =>
                    {
                        header.Cell().Element(CellStyle).Text("Description");
                        header.Cell().Element(CellStyle).AlignRight().Text("Base");
                        header.Cell().Element(CellStyle).AlignRight().Text("Montant");

                        static IContainer CellStyle(IContainer container)
                        {
                            return container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Black);
                        }
                    });

                    // Salary lines
                    table.Cell().Element(CellStyle).Text("Salaire de Base");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    table.Cell().Element(CellStyle).AlignRight().Text(_model.basesalary.ToString("N3"));

                    table.Cell().Element(CellStyle).Text("Salaire Brut");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    table.Cell().Element(CellStyle).AlignRight().Text(_model.brutsalary.ToString("N3"));

                    table.Cell().Element(CellStyle).Text("CNSS (9.18%)");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    table.Cell().Element(CellStyle).AlignRight().Text($"-{_model.cnssamount:N3}");

                    table.Cell().Element(CellStyle).Text("IRPP");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    table.Cell().Element(CellStyle).AlignRight().Text($"-{_model.irppamount:N3}");

                    table.Cell().Element(CellStyle).Text("CSS (1%)");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    table.Cell().Element(CellStyle).AlignRight().Text($"-{_model.cssamount:N3}");

                    table.Cell().Element(CellStyle).Text("Primes");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    table.Cell().Element(CellStyle).AlignRight().Text(_model.bonuses.ToString("N3"));

                    table.Cell().Element(CellStyle).Text("Autres Déductions");
                    table.Cell().Element(CellStyle).AlignRight().Text("-");
                    decimal otherDeductions = _model.deductions - _model.cnssamount - _model.irppamount - _model.cssamount;
                    table.Cell().Element(CellStyle).AlignRight().Text($"-{(otherDeductions > 0 ? otherDeductions : 0):N3}");

                    static IContainer CellStyle(IContainer container)
                    {
                        return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5);
                    }
                });

                column.Item().AlignRight().Width(250).Column(c =>
                {
                    c.Item().PaddingTop(10).BorderTop(1).Row(r =>
                    {
                        r.RelativeItem().Text("NET A PAYER").FontSize(14).ExtraBold().FontColor(Colors.Blue.Medium);
                        r.RelativeItem().AlignRight().Text(_model.netsalary.ToString("N3")).FontSize(14).ExtraBold().FontColor(Colors.Blue.Medium);
                    });
                });
            });
        }
    }
}
