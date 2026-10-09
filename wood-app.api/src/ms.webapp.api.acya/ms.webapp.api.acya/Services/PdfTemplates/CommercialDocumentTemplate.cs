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
                    column.Item().Text("ACYA APP").FontSize(20).SemiBold().FontColor(Colors.Black);
                    if (!string.IsNullOrEmpty(_model.appuser?.login))
                    {
                        column.Item().Text($"Émis par: {_model.appuser.login}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    }
                });

                row.RelativeItem().AlignRight().Column(column =>
                {
                    column.Item().Text(title).FontSize(22).ExtraBold().FontColor(Colors.Black);
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
            container.PaddingVertical(30).Column(column =>
            {
                column.Spacing(20);

                bool isPurchase = _model.type == DocumentTypes.supplierOrder ||
                                  _model.type == DocumentTypes.supplierReceipt ||
                                  _model.type == DocumentTypes.supplierInvoice ||
                                  _model.type == DocumentTypes.supplierInvoiceReturn;

                string counterpartLabel = isPurchase ? "Fournisseur" : "Client";

                column.Item().Row(row =>
                {
                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text(counterpartLabel).SemiBold().FontColor(Colors.Black);
                        string cpName = _model.counterpart?.name ?? (_model.counterpart?.firstname + " " + _model.counterpart?.lastname);
                        c.Item().PaddingTop(5).Text(cpName ?? (isPurchase ? "Fournisseur Divers" : "Client Divers")).SemiBold();
                        if (!string.IsNullOrEmpty(_model.counterpart?.address))
                            c.Item().Text(_model.counterpart.address);
                        if (!string.IsNullOrEmpty(_model.counterpart?.phonenumberone))
                            c.Item().Text($"Tél: {_model.counterpart.phonenumberone}");
                        if (!string.IsNullOrEmpty(_model.counterpart?.taxregistrationnumber))
                            c.Item().Text($"M.F: {_model.counterpart.taxregistrationnumber}");
                    });
                });

                column.Item().Element(ComposeTable);

                bool isQuote = _model.type == DocumentTypes.customerQuote;
                bool hasConditions = isQuote || _model.validity_duration != null || !string.IsNullOrWhiteSpace(_model.commercial_conditions);
                bool hasNotes = !string.IsNullOrEmpty(_model.description);

                if (hasConditions || hasNotes)
                {
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            if (hasConditions)
                            {
                                ComposeCommercialConditions(c);
                            }

                            if (hasNotes)
                            {
                                c.Item().PaddingTop(hasConditions ? 12 : 0).Column(nc =>
                                {
                                    nc.Item().Text("Notes:").SemiBold().FontSize(9);
                                    nc.Item().Text(_model.description).FontSize(8.5f).FontColor(Colors.Grey.Darken2);
                                });
                            }
                        });

                        row.ConstantItem(25);

                        row.AutoItem().Element(ComposeTotals);
                    });
                }
                else
                {
                    column.Item().AlignRight().Element(ComposeTotals);
                }
            });
        }

        void ComposeCommercialConditions(ColumnDescriptor column)
        {
            int duration = _model.validity_duration ?? 15;
            string unit = _model.validity_unit ?? "days";
            string validitySentence = GetValiditySentence(duration, unit);

            column.Item().Border(0.5f).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(8).Column(c =>
            {
                c.Item().Text("Conditions commerciales").SemiBold().FontSize(9.5f).FontColor(Colors.Black);

                c.Item().PaddingTop(3).Text(validitySentence).FontSize(8.5f).FontColor(Colors.Grey.Darken3);

                string conditionsText = _model.commercial_conditions;
                if (conditionsText == null && _model.type == DocumentTypes.customerQuote)
                {
                    conditionsText = "Dans la limite du stock disponible.";
                }

                if (!string.IsNullOrWhiteSpace(conditionsText))
                {
                    var lines = conditionsText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var line in lines)
                    {
                        var trimmed = line.Trim();
                        if (!string.IsNullOrWhiteSpace(trimmed))
                        {
                            // Avoid duplicate validity sentence if user customized text with it
                            if (trimmed.Equals(validitySentence, StringComparison.OrdinalIgnoreCase))
                                continue;

                            c.Item().PaddingTop(2).Text(trimmed).FontSize(8.5f).FontColor(Colors.Grey.Darken3);
                        }
                    }
                }
            });
        }

        private static string GetValiditySentence(int duration, string unit)
        {
            int safeDuration = duration > 0 ? duration : 15;
            string normalizedUnit = (unit ?? "days").Trim().ToLowerInvariant();

            if (normalizedUnit == "months" || normalizedUnit == "mois")
            {
                return safeDuration == 1 ? "Devis valide 1 mois." : $"Devis valide {safeDuration} mois.";
            }

            // Default to days / jours
            return safeDuration == 1 ? "Devis valide 1 jour." : $"Devis valide {safeDuration} jours.";
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
                        string refText = (!string.IsNullOrEmpty(item.packagereference) && item.packagereference != "SERVICE") 
                            ? item.packagereference 
                            : (item.article?.reference ?? item.packagereference ?? "-");
                        string descText = !string.IsNullOrEmpty(item.description) 
                            ? item.description 
                            : (item.article?.description ?? "-");

                        table.Cell().Element(CellStyle).Text(refText);
                        table.Cell().Element(CellStyle).Text(descText);
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
                        row.RelativeItem().Text("Net à Payer").FontSize(14).ExtraBold().FontColor(Colors.Black);
                        row.RelativeItem().AlignRight().Text(_model.total_net_payable?.ToString("N3") ?? "0.000").FontSize(14).ExtraBold().FontColor(Colors.Black);
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
