using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.api.Services.PdfTemplates
{
    public class CommercialDocumentTemplate : IDocument
    {
        private readonly DocumentDto _model;

        public CommercialDocumentTemplate(DocumentDto model)
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
            var title = GetDocumentTitle();

            container.Row(row =>
            {
                row.RelativeItem().Column(column =>
                {
                    column.Item().Text("ACYA APP").FontSize(20).SemiBold().FontColor(Colors.Blue.Medium);
                    column.Item().Text($"{_model.sales_site?.address ?? "Site de vente principal"}");
                    column.Item().Text($"{_model.appuser?.login ?? "Admin"}");
                });

                row.RelativeItem().AlignRight().Column(column =>
                {
                    column.Item().Text(title).FontSize(24).ExtraBold().FontColor(Colors.Blue.Medium);
                    column.Item().Text(text =>
                    {
                        text.Span("Référence: ").SemiBold();
                        text.Span(_model.docnumber ?? "N/A");
                    });
                    column.Item().Text(text =>
                    {
                        text.Span("Date: ").SemiBold();
                        text.Span(_model.creationdate?.ToString("dd/MM/yyyy") ?? DateTime.Now.ToString("dd/MM/yyyy"));
                    });
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
                        c.Item().Text("Client / Fournisseur").SemiBold().FontColor(Colors.Blue.Medium);
                        string cpName = _model.counterpart?.name ?? (_model.counterpart?.firstname + " " + _model.counterpart?.lastname);
                        c.Item().PaddingTop(5).Text(cpName ?? "Client Divers");
                        c.Item().Text(_model.counterpart?.address ?? "Tunisie");
                        c.Item().Text(_model.counterpart?.phonenumberone ?? "");
                        if (!string.IsNullOrEmpty(_model.counterpart?.taxregistrationnumber))
                            c.Item().Text($"M.F: {_model.counterpart.taxregistrationnumber}");
                    });
                });

                column.Item().Element(ComposeTable);

                column.Item().AlignRight().Element(ComposeTotals);

                if (!string.IsNullOrEmpty(_model.description))
                {
                    column.Item().PaddingTop(20).Column(c =>
                    {
                        c.Item().Text("Notes:").SemiBold();
                        c.Item().Text(_model.description);
                    });
                }
            });
        }

        void ComposeTable(IContainer container)
        {
            container.Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(80);
                    columns.RelativeColumn(3);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });

                table.Header(header =>
                {
                    header.Cell().Element(CellStyle).Text("Référence");
                    header.Cell().Element(CellStyle).Text("Désignation");
                    header.Cell().Element(CellStyle).AlignRight().Text("Qté");
                    header.Cell().Element(CellStyle).AlignRight().Text("P.U HT");
                    header.Cell().Element(CellStyle).AlignRight().Text("TVA");
                    header.Cell().Element(CellStyle).AlignRight().Text("TTC");

                    static IContainer CellStyle(IContainer container)
                    {
                        return container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Black);
                    }
                });

                if (_model.merchandises != null)
                {
                    foreach (var item in _model.merchandises)
                    {
                        table.Cell().Element(CellStyle).Text(item.packagereference ?? "-");
                        table.Cell().Element(CellStyle).Text(item.description ?? "-");
                        table.Cell().Element(CellStyle).AlignRight().Text(item.quantity.ToString("N3"));
                        table.Cell().Element(CellStyle).AlignRight().Text(item.unit_price_ht.ToString("N3"));
                        table.Cell().Element(CellStyle).AlignRight().Text($"{item.tva_value:N3}");
                        table.Cell().Element(CellStyle).AlignRight().Text(item.cost_ttc.ToString("N3"));

                        static IContainer CellStyle(IContainer container)
                        {
                            return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5);
                        }
                    }
                }
            });
        }

        void ComposeTotals(IContainer container)
        {
            container.Width(250).Column(column =>
            {
                column.Spacing(5);

                column.Item().Row(row =>
                {
                    row.RelativeItem().Text("Total HT");
                    row.RelativeItem().AlignRight().Text(_model.total_ht_net_doc.ToString("N3"));
                });

                column.Item().Row(row =>
                {
                    row.RelativeItem().Text("Total TVA");
                    row.RelativeItem().AlignRight().Text(_model.total_tva_doc.ToString("N3"));
                });

                if (_model.taxe != null)
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Droit de Timbre");
                        row.RelativeItem().AlignRight().Text(_model.taxe.GetFormattedValue().ToString("N3"));
                    });
                }

                column.Item().PaddingTop(5).BorderTop(1).Row(row =>
                {
                    row.RelativeItem().Text("Total TTC").FontSize(12).SemiBold();
                    row.RelativeItem().AlignRight().Text(_model.total_net_ttc.ToString("N3")).FontSize(12).SemiBold();
                });

                if (_model.withholdingtax && _model.holdingtax != null)
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"R.S ({_model.holdingtax.taxpercentage}%)").FontColor(Colors.Red.Medium);
                        row.RelativeItem().AlignRight().Text(_model.holdingtax.taxvalue.ToString("N3")).FontColor(Colors.Red.Medium);
                    });

                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Net à Payer").FontSize(14).ExtraBold().FontColor(Colors.Blue.Medium);
                        row.RelativeItem().AlignRight().Text(_model.total_net_payable?.ToString("N3") ?? "0.000").FontSize(14).ExtraBold().FontColor(Colors.Blue.Medium);
                    });
                }
            });
        }

        private string GetDocumentTitle()
        {
            return _model.type switch
            {
                DocumentTypes.customerQuote => "DEVIS",
                DocumentTypes.customerOrder => "BON DE COMMANDE",
                DocumentTypes.customerDeliveryNote => "BON DE LIVRAISON",
                DocumentTypes.customerInvoice => "FACTURE",
                DocumentTypes.supplierOrder => "COMMANDE FOURNISSEUR",
                DocumentTypes.supplierReceipt => "BON DE RECEPTION",
                DocumentTypes.supplierInvoice => "FACTURE FOURNISSEUR",
                DocumentTypes.customerInvoiceReturn => "AVOIR CLIENT",
                DocumentTypes.supplierInvoiceReturn => "AVOIR FOURNISSEUR",
                _ => "DOCUMENT"
            };
        }
    }
}
