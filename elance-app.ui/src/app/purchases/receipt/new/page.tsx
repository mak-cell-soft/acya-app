'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import {
  ArrowLeft,
  Plus,
  Trash2,
  TreeDeciduous,
  Truck,
  PlusCircle,
  Percent,
  CheckCircle2,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  X,
  Search,
  ShieldCheck,
  Barcode,
  Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useTransporters } from '@/hooks/use-transporters';
import { useArticles } from '@/hooks/use-articles';
import { useSites } from '@/hooks/use-enterprise';
import { useAppVariables } from '@/hooks/use-app-variables';
import { documentService } from '@/services/components/document.service';
import { merchandiseService } from '@/services/components/merchandise.service';
import { exchangeRateService } from '@/services/components/exchange-rate.service';
import { DocumentTypes, DocStatus, BillingStatus, LineType, ListOfLength } from '@/types/document';
import { Article } from '@/types/article';
import { Supplier } from '@/types/customer';
import { Transporter } from '@/types/settings';
import { toast } from 'sonner';
import { WoodLengthsDialog } from '@/components/sales/wood-lengths-dialog';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interface representing a row in our dynamic merchandise grid.
 * Maps closely to the C# Merchandise model structure.
 */
interface MerchandRow {
  selectedArticle: Article | null;
  articleSearchInput: string;
  filteredArticles: Article[];
  unit_price_ht: number;
  quantity: number;
  listLengths: ListOfLength[];
  selldiscountpercentage: number;
  sellcostprice_discountValue: number;
  sellcostprice_net_ht: number;
  sellcostprice_taxValue: number;
  totalWithTax: number;
  line_type: LineType;
  description: string;
  isWoodArticle: boolean;
  packagereference: string;
  isinvoicible: boolean;
  allownegativstock: boolean;
  transporter_id?: number | null;
  transporter_name?: string;
  tva_percentage: number;
}

function NewSupplierReceiptPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Connected User details for updatedbyid field
  const { user } = useAuthStore();

  // Handle conversion parent references if navigated from order flows
  const sourceIdFromParams = parseInt(
    searchParams.get('sourceId') || 
    searchParams.get('fromOrderId') || 
    '0'
  );
  const [sourceDocumentId] = useState<number>(sourceIdFromParams);

  // 1. Core Data Hooks
  const { data: allSuppliers = [], isLoading: isLoadingSuppliers } = useSuppliers();
  const { data: allTransporters = [], isLoading: isLoadingTransporters } = useTransporters();
  const { data: allArticles = [], isLoading: isLoadingArticles } = useArticles();
  const { data: allSites = [] } = useSites();
  const { data: allTvas = [] } = useAppVariables('Tva');
  const { data: appvariablesRS = [] } = useAppVariables('RS'); // For withholding taxes

  // Active Storage Site Selection based on logged-in user default site ID
  const [selectedSite, setSelectedSite] = useState<any | null>(null);

  // Set default site based on user defaultSiteId once sites are loaded
  useEffect(() => {
    if (allSites.length > 0 && !selectedSite) {
      const defaultSiteId = user?.defaultSiteId;
      const defaultSite = allSites.find(s => s.id.toString() === defaultSiteId?.toString()) || allSites[0];
      setSelectedSite(defaultSite);
    }
  }, [allSites, user?.defaultSiteId, selectedSite]);

  // Selected site label for storage site select box display
  const selectedSiteLabel = useMemo(() => {
    if (!selectedSite) return 'Sélectionner le dépôt...';
    return `${selectedSite.gov || ''} - ${selectedSite.address || ''}`.trim() || 'Sélectionner le dépôt...';
  }, [selectedSite]);

  // 2. Entête State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [supplierReference, setSupplierReference] = useState<string>(''); // BL Réf (Required)
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [docCurrency, setDocCurrency] = useState<string>('TND');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [selectedRS, setSelectedRS] = useState<any | null>(null); // Retenue à la Source

  // Selected Retenue à la Source label for select box display
  const selectedRSLabel = useMemo(() => {
    if (!selectedRS) return 'Aucune retenue (0%)';
    return `${selectedRS.name} (${selectedRS.value}%)`;
  }, [selectedRS]);

  // 3. New Article Row State (For adding rows dynamically)
  const [newRowArticle, setNewRowArticle] = useState<Article | null>(null);
  const [newRowArticleSearch, setNewRowArticleSearch] = useState('');
  const [isArticleDropdownOpen, setIsArticleDropdownOpen] = useState(false);
  const [newRowDescription, setNewRowDescription] = useState('');
  const [newRowPackageReference, setNewRowPackageReference] = useState('');
  const [newRowIsInvoiceable, setNewRowIsInvoiceable] = useState(true);
  const [newRowAllowNegativeStock, setNewRowAllowNegativeStock] = useState(false);
  const [newRowUnitPrice, setNewRowUnitPrice] = useState<number>(0);
  const [newRowQuantity, setNewRowQuantity] = useState<number>(0);
  const [newRowDiscount, setNewRowDiscount] = useState<number>(0);
  const newRowTva = useMemo(() => {
    if (!newRowArticle || !allTvas.length) return null;
    return allTvas.find(t => t.id === newRowArticle.tvaid) || null;
  }, [newRowArticle, allTvas]);
  const [newRowLengths, setNewRowLengths] = useState<ListOfLength[]>([]);

  // 4. Transport Addition Selection State
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);

  // Selected Transporter label for select box display
  const selectedTransporterLabel = useMemo(() => {
    if (!selectedTransporter) return 'Sélectionner un transporteur...';
    const carInfo = selectedTransporter.car;
    const carDisplay = carInfo
      ? (typeof carInfo === 'object'
          ? `${(carInfo as any).brand || ''} ${(carInfo as any).serialnumber || ''}`.trim() || 'Véhicule'
          : carInfo)
      : 'Sans matricule';
    return `${selectedTransporter.fullname} (${carDisplay})`;
  }, [selectedTransporter]);

  const [newRowIsLoadingRef, setNewRowIsLoadingRef] = useState(false);

  // Loaded articles filtering
  const filteredArticlesList = useMemo(() => {
    if (!newRowArticleSearch.trim()) return allArticles;
    const q = newRowArticleSearch.toLowerCase();
    return allArticles.filter(art =>
      (art.reference || '').toLowerCase().includes(q) ||
      (art.description || '').toLowerCase().includes(q)
    );
  }, [allArticles, newRowArticleSearch]);

  // Loaded suppliers filtering
  const filteredSuppliersList = useMemo(() => {
    if (!supplierSearchQuery.trim()) return allSuppliers;
    const q = supplierSearchQuery.toLowerCase();
    return allSuppliers.filter(sup => {
      const fullName = sup.name || `${sup.firstname || ''} ${sup.lastname || ''}`;
      return fullName.toLowerCase().includes(q);
    });
  }, [allSuppliers, supplierSearchQuery]);

  // Loading indicator for page operations
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic rows of merchandise in document grid
  const [rows, setRows] = useState<MerchandRow[]>([]);

  // Wood lengths dialog state
  const [woodDialogState, setWoodDialogState] = useState<{
    isOpen: boolean;
    rowIndex: number | null; // null if editing the new item form, number if editing a table row
    article: Article | null;
    currentLengths: ListOfLength[];
  }>({
    isOpen: false,
    rowIndex: null,
    article: null,
    currentLengths: []
  });

  // 5. Load Source Parent Supplier Order for conversions
  useEffect(() => {
    if (sourceDocumentId <= 0 || !allArticles.length || !allSuppliers.length) return;
    setIsLoading(true);
    
    documentService.getById(sourceDocumentId)
      .then((doc: any) => {
        // Find and pre-fill Supplier
        if (doc.counterpart) {
          const match = allSuppliers.find(s => s.id === doc.counterpart.id);
          if (match) {
            setSelectedSupplier(match);
            const fullName = match.name || `${match.firstname || ''} ${match.lastname || ''}`;
            setSupplierSearchQuery(fullName);
          }
        }

        // Map external reference to parent's doc number (supplier order number)
        setSupplierReference(doc.docnumber || '');

        // Pre-fill header parameters
        if (doc.currency) {
          setDocCurrency(doc.currency);
        }
        if (doc.exchangeRate) {
          setExchangeRate(doc.exchangeRate);
        }

        // Map parent merchandise rows (ignoring settled or fully delivered if applicable, but mapping all standard rows)
        if (doc.merchandises) {
          const mapped = doc.merchandises.map((m: any) => {
            const isWood = m.article ? !!m.article.iswood : false;
            
            // Resolve TVA percentage from C# or article
            let tvaVal = 19;
            if (m.article?.tva) {
              tvaVal = parseFloat(m.article.tva.value.replace('%', '')) || 0;
            } else if (m.tva_value && m.cost_net_ht) {
              tvaVal = parseFloat(((m.tva_value / m.cost_net_ht) * 100).toFixed(0));
            }

            const r: MerchandRow = {
              selectedArticle: m.article,
              articleSearchInput: m.article ? `${m.article.reference} - ${m.article.description || ''}` : '',
              filteredArticles: allArticles,
              unit_price_ht: m.unit_price_ht || 0,
              quantity: m.quantity || 0,
              listLengths: m.lisoflengths || [],
              selldiscountpercentage: m.discount_percentage || 0,
              sellcostprice_discountValue: m.cost_discount_value || 0,
              sellcostprice_net_ht: m.cost_net_ht || 0,
              sellcostprice_taxValue: m.tva_value || 0,
              totalWithTax: m.cost_ttc || 0,
              line_type: m.line_type || LineType.Merchandise,
              description: m.description || '',
              isWoodArticle: isWood,
              packagereference: m.packagereference || (m.article?.categoryid === 1 ? '' : 'Standart'),
              isinvoicible: m.isinvoicible ?? true,
              allownegativstock: m.allownegativstock ?? false,
              tva_percentage: tvaVal
            };

            if (m.line_type === LineType.TransportFee) {
              r.transporter_id = m.transporter_id;
              r.transporter_name = m.transporter_name || 'Transporteur';
            }

            return r;
          });
          setRows(mapped);
        }
        
        toast.info(`Commande fournisseur Réf: ${doc.docnumber} chargée avec succès.`);
      })
      .catch(err => {
        console.error('Error fetching parent order:', err);
        toast.error('Impossible de charger la commande fournisseur parente.');
      })
      .finally(() => setIsLoading(false));
  }, [sourceDocumentId, allArticles, allSuppliers]);

  // 6. Handle currency conversions
  const handleCurrencyChange = (curr: string) => {
    setDocCurrency(curr);
    if (curr === 'TND') {
      setExchangeRate(1.0);
    } else {
      // Auto-fetch exchange rates from service
      setIsLoading(true);
      const targetCurrency = curr === 'EUR' ? 'EUR' : 'USD';
      exchangeRateService.getExchangeRate(targetCurrency, 'TND')
        .then((rate: any) => {
          setExchangeRate(rate || (curr === 'EUR' ? 3.4 : 3.1));
        })
        .catch(() => {
          setExchangeRate(curr === 'EUR' ? 3.4 : 3.1); // Fallbacks
        })
        .finally(() => setIsLoading(false));
    }
  };

  // 7. Calculate calculations for a single grid row
  const calculateRowCalculations = (row: MerchandRow): MerchandRow => {
    const qty = row.quantity || 0;
    const priceHT = row.unit_price_ht || 0;
    const discPercent = row.selldiscountpercentage || 0;

    let costHT = priceHT * qty;
    if (row.line_type === LineType.TransportFee) {
      costHT = priceHT; // Transport fees represent direct amount cost
      row.quantity = 1;
    }

    const discountVal = costHT * (discPercent / 100);
    const costNetHT = costHT - discountVal;
    const tvaVal = costNetHT * (row.tva_percentage / 100);
    const costTTC = costNetHT + tvaVal;

    return {
      ...row,
      sellcostprice_discountValue: parseFloat(discountVal.toFixed(3)),
      sellcostprice_net_ht: parseFloat(costNetHT.toFixed(3)),
      sellcostprice_taxValue: parseFloat(tvaVal.toFixed(3)),
      totalWithTax: parseFloat(costTTC.toFixed(3))
    };
  };

  // 8. Generate Package/Colis Reference from backend
  const handleGenerateReference = async () => {
    if (!newRowArticle) {
      toast.info("Veuillez d'abord sélectionner un article.");
      return;
    }
    setNewRowIsLoadingRef(true);
    try {
      const ref = await merchandiseService.getMerchandiseReferenceAsString(newRowArticle.id);
      let finalRef = ref;
      
      // Why: Since multiple rows for the same article can be added in a single receipt form 
      // before saving to the database, querying the backend alone will yield duplicate references.
      // We check our local front-end rows list to find the highest increment for this article-date
      // combination and increment it sequentially.
      const parts = ref.split('-');
      if (parts.length >= 3) {
        const baseWithDate = parts.slice(0, -1).join('-');
        
        // Find the maximum sequence increment already in the grid's local rows
        let maxIncrement = parseInt(parts[parts.length - 1], 10) || 1;
        
        rows.forEach(r => {
          if (r.packagereference) {
            const cleanPackRef = r.packagereference.replace(/"/g, '').trim();
            const rParts = cleanPackRef.split('-');
            if (rParts.length >= 3) {
              const rBaseWithDate = rParts.slice(0, -1).join('-');
              if (rBaseWithDate === baseWithDate) {
                const rInc = parseInt(rParts[rParts.length - 1], 10);
                if (!isNaN(rInc) && rInc >= maxIncrement) {
                  maxIncrement = rInc + 1;
                }
              }
            }
          }
        });
        
        finalRef = `${baseWithDate}-${maxIncrement}`;
      }

      setNewRowPackageReference(finalRef);
      toast.success(`Référence colis générée : ${finalRef}`);
    } catch (err) {
      console.error('Error generating reference:', err);
      toast.error('Échec de génération du code colis.');
    } finally {
      setNewRowIsLoadingRef(false);
    }
  };

  // 9. Watch selected Article in New Row to auto-populate unit price, description
  useEffect(() => {
    if (newRowArticle) {
      setNewRowUnitPrice(newRowArticle.sellprice_ht || 0); // Default to sellprice_ht as safety purchase baseline
      setNewRowDescription(newRowArticle.description || '');
      setNewRowQuantity(0);
      setNewRowDiscount(0);
      setNewRowLengths([]);
    } else {
      setNewRowUnitPrice(0);
      setNewRowDescription('');
      setNewRowQuantity(0);
      setNewRowDiscount(0);
      setNewRowPackageReference('');
      setNewRowLengths([]);
    }
  }, [newRowArticle]);

  // Compute computed new row values
  const newRowComputedValues = useMemo(() => {
    const qty = newRowQuantity || 0;
    const priceHT = newRowUnitPrice || 0;
    const discPercent = newRowDiscount || 0;
    const tvaValPercent = newRowTva ? (parseFloat(newRowTva.value?.replace('%', '')) || 0) : 0;

    const costHT = priceHT * qty;
    const discountVal = costHT * (discPercent / 100);
    const costNetHT = costHT - discountVal;
    const tvaVal = costNetHT * (tvaValPercent / 100);
    const costTTC = costNetHT + tvaVal;

    return {
      netHT: parseFloat(costNetHT.toFixed(3)),
      discount: parseFloat(discountVal.toFixed(3)),
      tva: parseFloat(tvaVal.toFixed(3)),
      ttc: parseFloat(costTTC.toFixed(3))
    };
  }, [newRowUnitPrice, newRowQuantity, newRowDiscount, newRowTva]);

  // 10. Add dynamic merchandise row to document grid
  const handleAddMerchandiseRow = () => {
    if (!newRowArticle) {
      toast.error("Veuillez sélectionner un article.");
      return;
    }
    if (newRowQuantity <= 0) {
      toast.error("La quantité doit être supérieure à 0.");
      return;
    }

    if (newRowArticle.categoryid === 1 && !newRowPackageReference.trim()) {
      toast.error("Veuillez renseigner ou générer la Référence Colis/Paquet pour cet article Bois.");
      return;
    }

    const tvaValPercent = newRowTva ? (parseFloat(newRowTva.value?.replace('%', '')) || 0) : 0;
    const isWood = !!newRowArticle.iswood;

    const newRow: MerchandRow = {
      selectedArticle: newRowArticle,
      articleSearchInput: `${newRowArticle.reference} - ${newRowArticle.description || ''}`,
      filteredArticles: allArticles,
      unit_price_ht: newRowUnitPrice,
      quantity: newRowQuantity,
      listLengths: newRowLengths,
      selldiscountpercentage: newRowDiscount,
      sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0,
      totalWithTax: 0,
      line_type: LineType.Merchandise,
      description: newRowDescription,
      isWoodArticle: isWood,
      packagereference: newRowPackageReference.trim() || (newRowArticle.categoryid === 1 ? '' : 'Standart'),
      isinvoicible: newRowIsInvoiceable,
      allownegativstock: newRowAllowNegativeStock,
      tva_percentage: tvaValPercent
    };

    const calculated = calculateRowCalculations(newRow);
    setRows([...rows, calculated]);

    // Clear new row states
    setNewRowArticle(null);
    setNewRowArticleSearch('');
    setNewRowDescription('');
    setNewRowQuantity(0);
    setNewRowUnitPrice(0);
    setNewRowDiscount(0);
    setNewRowPackageReference('');
    setNewRowLengths([]);
    toast.success("Article ajouté à la liste.");
  };

  // 11. Add transport row dynamically to document grid
  const handleAddTransportRow = () => {
    if (!selectedTransporter) {
      toast.error("Veuillez sélectionner un transporteur.");
      return;
    }

    const newRow: MerchandRow = {
      selectedArticle: null,
      articleSearchInput: '',
      filteredArticles: [],
      unit_price_ht: 0,
      quantity: 1,
      listLengths: [],
      selldiscountpercentage: 0,
      sellcostprice_discountValue: 0,
      sellcostprice_net_ht: 0,
      sellcostprice_taxValue: 0,
      totalWithTax: 0,
      line_type: LineType.TransportFee,
      description: `Frais de transport - ${selectedTransporter.fullname}`,
      isWoodArticle: false,
      packagereference: '',
      isinvoicible: true,
      allownegativstock: false,
      tva_percentage: 19, // C# standard 19% TVA for logistics
      transporter_id: selectedTransporter.id,
      transporter_name: selectedTransporter.fullname
    };

    const calculated = calculateRowCalculations(newRow);
    setRows([...rows, calculated]);
    setSelectedTransporter(null);
    toast.success("Ligne de transport ajoutée à la liste.");
  };

  // Remove row from document grid
  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
    toast.info("Ligne supprimée.");
  };

  // Handle inline changes in table grid rows
  const handleRowFieldChange = (index: number, field: keyof MerchandRow, value: any) => {
    setRows(prevRows => {
      return prevRows.map((row, i) => {
        if (i === index) {
          const updated = { ...row, [field]: value };
          return calculateRowCalculations(updated);
        }
        return row;
      });
    });
  };

  // Wood lengths dialog trigger logic
  const handleOpenWoodLengths = (index: number | null) => {
    if (index === null) {
      // Editing new item form
      if (!newRowArticle) {
        toast.info("Sélectionnez d'abord un article.");
        return;
      }
      setWoodDialogState({
        isOpen: true,
        rowIndex: null,
        article: newRowArticle,
        currentLengths: newRowLengths
      });
    } else {
      // Editing grid table row
      const row = rows[index];
      if (!row.selectedArticle) return;
      setWoodDialogState({
        isOpen: true,
        rowIndex: index,
        article: row.selectedArticle,
        currentLengths: row.listLengths || []
      });
    }
  };

  // Wood lengths confirmation callback
  const handleSaveWoodLengths = (lengths: ListOfLength[], totalVolume: number) => {
    const index = woodDialogState.rowIndex;
    if (index === null) {
      // Save to new item form
      setNewRowLengths(lengths);
      setNewRowQuantity(parseFloat(totalVolume.toFixed(3)));
      toast.success(`Volume de bois configuré : ${totalVolume.toFixed(3)} M³`);
    } else {
      // Save to existing grid row
      setRows(prevRows => {
        return prevRows.map((row, i) => {
          if (i === index) {
            const updated = {
              ...row,
              listLengths: lengths,
              quantity: parseFloat(totalVolume.toFixed(3))
            };
            return calculateRowCalculations(updated);
          }
          return row;
        });
      });
      toast.success(`Volume mis à jour pour la ligne ${index + 1} : ${totalVolume.toFixed(3)} M³`);
    }
  };

  // 12. Document totals computations
  const totals = useMemo(() => {
    const listHTNet = rows.reduce((acc, row) => acc + row.sellcostprice_net_ht, 0);
    const listDiscount = rows.reduce((acc, row) => acc + row.sellcostprice_discountValue, 0);
    const listTva = rows.reduce((acc, row) => acc + row.sellcostprice_taxValue, 0);
    const listTtc = rows.reduce((acc, row) => acc + row.totalWithTax, 0);

    const rsValue = selectedRS ? (listTtc * (parseFloat(selectedRS.value || '0') / 100)) : 0;
    const netPayable = listTtc - rsValue;

    return {
      netHT: parseFloat(listHTNet.toFixed(3)),
      discount: parseFloat(listDiscount.toFixed(3)),
      tva: parseFloat(listTva.toFixed(3)),
      ttc: parseFloat(listTtc.toFixed(3)),
      rs: parseFloat(rsValue.toFixed(3)),
      payable: parseFloat(netPayable.toFixed(3))
    };
  }, [rows, selectedRS]);

  // 13. Form Submission Validations
  const validateForm = () => {
    if (!selectedSupplier) {
      toast.error("Veuillez sélectionner un fournisseur.");
      return false;
    }
    if (!supplierReference.trim()) {
      toast.error("Veuillez saisir la Référence Bon de Livraison (BL) Fournisseur.");
      return false;
    }
    if (!selectedSite) {
      toast.error("Veuillez sélectionner un site de stockage/dépôt.");
      return false;
    }
    if (rows.length === 0) {
      toast.error("Le document doit contenir au moins une ligne de marchandise.");
      return false;
    }

    // Verify row values
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.line_type === LineType.Merchandise && !r.selectedArticle) {
        toast.error(`La ligne ${i + 1} ne contient aucun article.`);
        return false;
      }
      if (r.quantity <= 0) {
        toast.error(`La quantité de la ligne ${i + 1} doit être supérieure à 0.`);
        return false;
      }
      if (r.line_type === LineType.Merchandise && r.selectedArticle?.categoryid === 1 && !r.packagereference.trim()) {
        toast.error(`Veuillez renseigner la Référence Colis/Paquet pour la ligne ${i + 1} (requis pour les articles Bois).`);
        return false;
      }
    }

    return true;
  };

  // 14. API Submission Handler
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      // Map frontend rows to C# backend Merchandise DTO structure
      const merchandisesPayload = rows.map(r => {
        const item: any = {
          id: 0,
          unit_price_ht: r.unit_price_ht,
          cost_ht: parseFloat((r.unit_price_ht * r.quantity).toFixed(3)),
          quantity: r.quantity,
          discount_percentage: r.selldiscountpercentage,
          cost_discount_value: r.sellcostprice_discountValue,
          cost_net_ht: r.sellcostprice_net_ht,
          tva_value: r.sellcostprice_taxValue,
          cost_ttc: r.totalWithTax,
          line_type: r.line_type,
          description: r.description || '',
          creationdate: new Date(),
          updatedate: new Date(),
          updatedbyid: parseInt(user?.id || '0'),
          documentid: 0,
          isdeleted: false
        };

        if (r.line_type === LineType.TransportFee) {
          item.transporter_id = r.transporter_id;
          item.article = null;
          item.packagereference = '';
        } else {
          item.article = r.selectedArticle;
          item.lisoflengths = r.listLengths;
          item.packagereference = r.packagereference.trim() || (r.selectedArticle?.categoryid === 1 ? '' : 'Standart');
          item.isinvoicible = r.isinvoicible;
          item.allownegativstock = r.allownegativstock;
          item.ismergedwith = false;
        }

        return item;
      });

      // Construct C# Document DTO payload
      // Type is 2 for Supplier Receipt (Bon de Réception - BR)
      // Stock transaction type is 1 (entrance of stock / store inventory)
      const documentPayload: any = {
        id: 0,
        type: DocumentTypes.supplierReceipt,
        stocktransactiontype: 1, // Entrance of stock
        docnumber: '',
        description: `Réception Fournisseur via Portail Élancé`,
        supplierReference: supplierReference, // BL Réf
        isinvoiced: false,
        merchandises: merchandisesPayload,
        total_ht_net_doc: totals.netHT,
        total_discount_doc: totals.discount,
        total_tva_doc: totals.tva,
        total_net_ttc: totals.ttc,
        total_net_payable: totals.payable,
        withholdingtax: !!selectedRS,
        counterpart: selectedSupplier,
        sales_site: selectedSite,
        creationdate: new Date(docDate),
        updatedate: new Date(),
        updatedbyid: parseInt(user?.id || '0'),
        isdeleted: false,
        regulationid: 0,
        editing: false,
        docstatus: DocStatus.Created, // 3 = Created
        isservice: false,
        isPaid: false,
        billingstatus: BillingStatus.NotBilled,
        currency: docCurrency,
        exchangeRate: exchangeRate
      };

      // Add withholding tax (RS) holdingtax DTO if selected
      if (selectedRS) {
        documentPayload.holdingtax = {
          id: 0,
          description: selectedRS.name,
          taxpercentage: parseFloat(selectedRS.value || '0'),
          taxvalue: totals.rs,
          newamountdocvalue: totals.payable,
          issigned: false,
          isdeleted: false,
          updatedbyid: parseInt(user?.id || '0')
        };
      }

      console.log('Sending Document DTO to backend:', documentPayload);

      // Perform document creation
      const response = await documentService.add(documentPayload);
      const docRef = response.docRef || '';
      const docId = response.id;
      toast.success(`Bon de Réception créé avec succès ! Réf: ${docRef}`);

      // 🆕 Handle parent order transition logic if originating from a Supplier Order
      if (sourceDocumentId > 0 && docId) {
        try {
          // Step 1: Register parent-child document relationship
          await documentService.registerRelationship({
            parentDocumentId: sourceDocumentId,
            childDocumentId: docId
          });
          console.log('Registered parent-child order-receipt relationship successfully.');

          // Step 2: Reload parent order to compare total ordered vs received quantities
          const parentOrder = await documentService.getById(sourceDocumentId);
          const siblingRefs = parentOrder.deliveryNoteDocNumbers || [];
          if (!siblingRefs.includes(docRef)) siblingRefs.push(docRef);

          // Step 3: Fetch all supplier receipts to compare quantities
          const allReceipts = await documentService.getByType(DocumentTypes.supplierReceipt);
          const siblingReceipts = allReceipts.filter((r: any) => siblingRefs.includes(r.docnumber));

          // Map ordered quantities per article
          const orderedQtities = new Map<number, number>();
          parentOrder.merchandises?.forEach((m: any) => {
            if (m.article) {
              orderedQtities.set(m.article.id, (orderedQtities.get(m.article.id) || 0) + (m.quantity || 0));
            }
          });

          // Map total received quantities per article across all sibling receipts
          const receivedQtities = new Map<number, number>();
          siblingReceipts.forEach((r: any) => {
            r.merchandises?.forEach((m: any) => {
              if (m.article) {
                receivedQtities.set(m.article.id, (receivedQtities.get(m.article.id) || 0) + (m.quantity || 0));
              }
            });
          });

          // Determine if fully received
          let isFullyDelivered = true;
          orderedQtities.forEach((orderedQty, articleId) => {
            const receivedQty = receivedQtities.get(articleId) || 0;
            if (receivedQty < orderedQty) {
              isFullyDelivered = false;
            }
          });

          // Step 4: Update order status (1 = Delivered, 11 = PartiallyDelivered in TypeScript DocStatus)
          const newStatus = isFullyDelivered ? DocStatus.Delivered : DocStatus.PartiallyDelivered;
          await documentService.updateStatus(sourceDocumentId, newStatus);
          
          toast.info(`Statut de la commande mis à jour : ${isFullyDelivered ? "Livrée" : "Livraison Partielle"}`);
        } catch (relationErr) {
          console.error('Error handling parent order status transitions:', relationErr);
          toast.warning('Réception créée, mais la commande parente n’a pas pu être transitionnée.');
        }
      }

      // Invalidate query caches
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['stocks'] });

      // Navigate back to purchases page
      router.push('/purchases');

    } catch (err: any) {
      console.error('Error submitting document:', err);
      if (err.response?.status === 409) {
        toast.error("Une réception avec le même numéro de BL existe déjà.");
      } else {
        toast.error("La création du document a échoué. Veuillez vérifier les paramètres.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
              onClick={() => router.push('/purchases')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight">
                Nouveau Bon de Réception (BR)
              </h1>
              <p className="text-slate-500 font-medium text-xs">
                Réceptionnez les marchandises fournisseurs et alimentez vos dépôts de stockage.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedSite && (
              <Badge className="bg-amber-900/10 hover:bg-amber-900/20 text-amber-900 border border-amber-900/15 font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Destination : {selectedSite.gov} - {selectedSite.address}
              </Badge>
            )}
            {sourceDocumentId > 0 && (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold px-3 py-1.5 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Lien Commande Actif
              </Badge>
            )}
          </div>
        </div>

        {/* 1. Main configuration panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200/60 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-5">
              <CardTitle className="text-sm font-serif font-bold text-amber-50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Informations d&apos;Entête du Document
              </CardTitle>
              <CardDescription className="text-xs text-slate-300 font-medium">
                Configurez le fournisseur, la référence BL externe et les paramètres financiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Supplier Selector */}
              <div className="space-y-2 relative">
                <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block font-mono">Fournisseur *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  <Input 
                    value={supplierSearchQuery}
                    onChange={(e) => {
                      setSupplierSearchQuery(e.target.value);
                      setIsSupplierDropdownOpen(true);
                    }}
                    onFocus={() => setIsSupplierDropdownOpen(true)}
                    placeholder="Sélectionner le fournisseur..."
                    className="pl-9 pr-8 h-11 rounded-xl border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-xs font-bold text-slate-900"
                  />
                  {selectedSupplier && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplier(null);
                        setSupplierSearchQuery('');
                        setIsSupplierDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isSupplierDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsSupplierDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto z-20 rounded-xl border border-slate-100 bg-white shadow-2xl p-1.5 space-y-0.5 animate-in fade-in duration-200">
                      {filteredSuppliersList.map(sup => {
                        const fullName = sup.name || `${sup.firstname || ''} ${sup.lastname || ''}`;
                        return (
                          <button
                            key={sup.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                              selectedSupplier?.id === sup.id 
                                ? "bg-amber-900 text-white" 
                                : "text-slate-900 hover:bg-slate-50"
                            )}
                            onClick={() => {
                              setSelectedSupplier(sup);
                              setSupplierSearchQuery(fullName);
                              setIsSupplierDropdownOpen(false);
                            }}
                          >
                            <span>{fullName}</span>
                            <span className={cn(
                              "text-[0.65rem] font-medium font-mono",
                              selectedSupplier?.id === sup.id ? "text-amber-200" : "text-slate-400"
                            )}>
                              {sup.taxregistrationnumber || 'Pas de matricule'}
                            </span>
                          </button>
                        );
                      })}
                      {filteredSuppliersList.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 italic">
                          Aucun fournisseur trouvé
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Reference BL (supplierReference) */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block font-mono">Référence BL Fournisseur *</label>
                <Input
                  className="h-11 rounded-xl border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-xs font-bold text-slate-900"
                  placeholder="Saisir la référence du bon fournisseur..."
                  value={supplierReference}
                  onChange={(e) => setSupplierReference(e.target.value)}
                />
              </div>

              {/* Destination Storage Site Selector */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block font-mono">Site Dépôt de Stockage *</label>
                <Select 
                  onValueChange={(val) => {
                    const site = allSites.find(s => s.id.toString() === val);
                    setSelectedSite(site || null);
                  }}
                  value={selectedSite?.id?.toString() || ''}
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-xs font-bold text-slate-900 w-full">
                    <SelectValue placeholder="Sélectionner le dépôt...">
                      {selectedSiteLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 font-bold text-xs">
                    {allSites.map(s => {
                      const label = `${s.gov} - ${s.address}`;
                      return (
                        <SelectItem key={s.id} value={s.id.toString()} label={label} className="font-bold text-xs">
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block font-mono">Date Réception *</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  <Input
                    type="date"
                    className="h-11 rounded-xl border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-xs font-bold text-slate-900"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block font-mono">Devise *</label>
                <Select onValueChange={(val) => handleCurrencyChange(val || 'TND')} value={docCurrency}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-xs font-bold text-slate-900">
                    <SelectValue placeholder="TND" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 font-bold text-xs">
                    <SelectItem value="TND" className="font-bold text-xs">TND - Dinar Tunisien</SelectItem>
                    <SelectItem value="EUR" className="font-bold text-xs">EUR - Euro</SelectItem>
                    <SelectItem value="USD" className="font-bold text-xs">USD - Dollar US</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Exchange Rate */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest block font-mono">Taux de change *</label>
                <Input
                  type="number"
                  step="0.000001"
                  className="h-11 rounded-xl border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-xs font-bold text-slate-900"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                  disabled={docCurrency === 'TND'}
                />
              </div>

            </CardContent>
          </Card>

          {/* Right Summary Totals Card */}
          <Card className="border-slate-200/60 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-slate-900 text-white">
            <CardHeader className="border-b border-slate-800 p-5 bg-slate-950">
              <CardTitle className="text-sm font-serif font-bold text-amber-50 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" /> Synthèse Financière (BR)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 font-medium">Calcul des valeurs financières en {docCurrency}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 font-mono text-xs font-bold">
              <div className="flex justify-between items-center text-slate-300">
                <span>TOTAL BRUT HT</span>
                <span className="text-sm">{totals.netHT.toFixed(3)} {docCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>TOTAL REMISES</span>
                <span className="text-rose-400 font-medium">- {totals.discount.toFixed(3)} {docCurrency}</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between items-center text-amber-50">
                <span>TOTAL NET HT</span>
                <span className="text-sm text-amber-400">{totals.netHT.toFixed(3)} {docCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>TOTAL TVA</span>
                <span className="text-sm">{totals.tva.toFixed(3)} {docCurrency}</span>
              </div>
              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between items-center text-white">
                <span>NET TTC</span>
                <span className="text-base text-white">{totals.ttc.toFixed(3)} {docCurrency}</span>
              </div>

              {/* Optional RS holding taxes */}
              <div className="space-y-2 pt-2 border-t border-slate-800 animate-in fade-in duration-300">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Retenue à la Source (RS)</label>
                <Select 
                  onValueChange={(val) => {
                    if (val === 'none') {
                      setSelectedRS(null);
                    } else {
                      const rs = appvariablesRS.find(r => r.id.toString() === val);
                      setSelectedRS(rs || null);
                    }
                  }} 
                  value={selectedRS?.id?.toString() || 'none'}
                >
                  <SelectTrigger className="h-9 rounded-lg border-slate-700 bg-slate-800/80 text-xs font-bold text-white focus:ring-amber-900 w-full">
                    <SelectValue placeholder="Aucune retenue">
                      {selectedRSLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 font-bold text-xs">
                    <SelectItem value="none" label="Aucune retenue (0%)" className="font-bold text-xs text-rose-500">Aucune retenue (0%)</SelectItem>
                    {appvariablesRS.map((rs) => {
                      const label = `${rs.name} (${rs.value}%)`;
                      return (
                        <SelectItem key={rs.id} value={rs.id.toString()} label={label} className="font-bold text-xs">
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedRS && (
                  <div className="flex justify-between items-center text-rose-400 text-[11px] pt-1.5 animate-in slide-in-from-top-1">
                    <span>Retenue appliquée ({selectedRS.value}%)</span>
                    <span>- {totals.rs.toFixed(3)} {docCurrency}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-800 my-1" />
              <div className="flex justify-between items-center text-amber-400 text-sm font-serif font-extrabold pt-2">
                <span>NET À PAYER</span>
                <span className="text-lg">{totals.payable.toFixed(3)} {docCurrency}</span>
              </div>

              <div className="pt-4 flex flex-col gap-2.5">
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  className="w-full h-11 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-lg shadow-amber-900/20 gap-2 flex items-center justify-center transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Enregistrer le Document
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => router.push('/purchases')} 
                  variant="ghost" 
                  disabled={isLoading}
                  className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-bold"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Interactive panel to add Article rows */}
        <Card className="border-slate-200/60 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white">
          <CardHeader className="bg-amber-900/5 border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-serif font-bold text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-700" /> Ajouter des Marchandises à la Liste
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 font-medium">Recherchez et configurez chaque article avant de l&apos;ajouter au tableau.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              
              {/* Autocomplete Article Selector */}
              <div className="space-y-1.5 relative md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Rechercher Article *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  <Input 
                    value={newRowArticleSearch}
                    onChange={(e) => {
                      setNewRowArticleSearch(e.target.value);
                      setIsArticleDropdownOpen(true);
                    }}
                    onFocus={() => setIsArticleDropdownOpen(true)}
                    placeholder="Saisir référence ou description..."
                    className="pl-9 pr-8 h-10 rounded-xl border-slate-200 focus:ring-amber-900 text-xs font-bold text-slate-900 bg-slate-50/50"
                  />
                  {newRowArticle && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewRowArticle(null);
                        setNewRowArticleSearch('');
                        setIsArticleDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isArticleDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsArticleDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto z-20 rounded-xl border border-slate-100 bg-white shadow-2xl p-1.5 space-y-0.5 animate-in fade-in duration-200 font-bold text-xs text-slate-900">
                      {filteredArticlesList.map(art => (
                        <button
                          key={art.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between",
                            newRowArticle?.id === art.id 
                              ? "bg-amber-900 text-white" 
                              : "text-slate-900 hover:bg-slate-50"
                          )}
                          onClick={() => {
                            setNewRowArticle(art);
                            setNewRowArticleSearch(`${art.reference} - ${art.description || ''}`);
                            setIsArticleDropdownOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span>{art.reference}</span>
                            <span className={cn(
                              "text-[10px] font-normal",
                              newRowArticle?.id === art.id ? "text-amber-200" : "text-slate-500"
                            )}>
                              {art.description}
                            </span>
                          </div>
                          {art.iswood && (
                            <Badge className="ml-2 bg-emerald-100 text-emerald-800 text-[9px] rounded-full border-none">BOIS</Badge>
                          )}
                        </button>
                      ))}
                      {filteredArticlesList.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 italic">
                          Aucun article trouvé
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Package/Colis Reference */}
              <div className="space-y-1.5 relative md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                  Référence Colis/Paquet {(!newRowArticle || newRowArticle.categoryid === 1) && '*'}
                </label>
                <div className="relative">
                  <Input
                    className="h-10 rounded-xl border-slate-200 pr-10 focus:ring-amber-900 text-xs font-bold text-slate-900 bg-slate-50/50"
                    placeholder="Saisir ou générer..."
                    value={newRowPackageReference}
                    onChange={(e) => setNewRowPackageReference(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateReference}
                    disabled={newRowIsLoadingRef || !newRowArticle}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-amber-700 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    {newRowIsLoadingRef ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-amber-700"></div>
                    ) : (
                      <Barcode className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Description/Observations */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Observations</label>
                <Input
                  className="h-10 rounded-xl border-slate-200 focus:ring-amber-900 text-xs font-bold text-slate-900 bg-slate-50/50"
                  placeholder="Observations sur la ligne..."
                  value={newRowDescription}
                  onChange={(e) => setNewRowDescription(e.target.value)}
                />
              </div>

              {/* Unit Price HT */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Prix Unitaire HT *</label>
                <Input
                  type="number"
                  step="0.001"
                  className="h-10 rounded-xl border-slate-200 focus:ring-amber-900 text-xs font-bold text-slate-900 bg-slate-50/50 font-mono"
                  value={newRowUnitPrice || ''}
                  onChange={(e) => setNewRowUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.000"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Quantité / Vol M³ *</label>
                {newRowArticle?.iswood ? (
                  <Button
                    type="button"
                    onClick={() => handleOpenWoodLengths(null)}
                    className="w-full h-10 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-900/15 rounded-xl font-bold gap-2 text-xs flex items-center justify-center transition-all"
                  >
                    <TreeDeciduous className="w-4 h-4" /> 
                    {newRowQuantity > 0 ? `${newRowQuantity.toFixed(3)} M³` : "Longueurs Bois"}
                  </Button>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    className="h-10 rounded-xl border-slate-200 focus:ring-amber-900 text-xs font-bold text-slate-900 bg-slate-50/50 font-mono"
                    value={newRowQuantity || ''}
                    onChange={(e) => setNewRowQuantity(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                )}
              </div>

              {/* Discount Percentage */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Remise %</label>
                <Input
                  type="number"
                  max="100"
                  min="0"
                  className="h-10 rounded-xl border-slate-200 focus:ring-amber-900 text-xs font-bold text-slate-900 bg-slate-50/50 font-mono"
                  value={newRowDiscount || ''}
                  onChange={(e) => setNewRowDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0%"
                />
              </div>

              {/* TVA (Disabled, automatically set from selected article) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">TVA % (Article)</label>
                <Input
                  disabled
                  className="h-10 rounded-xl border-slate-200 bg-slate-100 text-slate-400 text-xs font-bold font-mono"
                  value={newRowTva ? newRowTva.value : '—'}
                />
              </div>

              {/* Toggles (Invoiceable & Negative Stock) */}
              <div className="md:col-span-2 flex flex-wrap items-center gap-6 bg-slate-50/50 border border-slate-100 p-3 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="new-invoiceable" 
                    checked={newRowIsInvoiceable} 
                    onCheckedChange={setNewRowIsInvoiceable} 
                  />
                  <label htmlFor="new-invoiceable" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer">Facturable</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="new-negativestock" 
                    checked={newRowAllowNegativeStock} 
                    onCheckedChange={setNewRowAllowNegativeStock} 
                  />
                  <label htmlFor="new-negativestock" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer">Stock Négatif Autorisé</label>
                </div>
              </div>

              {/* Action: Add merchandise */}
              <div className="md:col-span-2 flex items-end">
                <Button
                  onClick={handleAddMerchandiseRow}
                  disabled={!newRowArticle || newRowQuantity <= 0}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl shadow-lg gap-2 flex items-center justify-center transition-all disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Ajouter Article à la Liste
                </Button>
              </div>

            </div>

            {/* Separator for Transporters */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 font-bold text-slate-400 tracking-widest font-mono">Frais de Transport</span>
              </div>
            </div>

            {/* Add Transporter logic */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end bg-amber-50/20 border border-amber-900/5 p-5 rounded-2xl">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Transporteur</label>
                <Select 
                  onValueChange={(val) => {
                    const trans = allTransporters.find(t => t.id.toString() === val);
                    setSelectedTransporter(trans || null);
                  }}
                  value={selectedTransporter?.id?.toString() || ''}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 focus:ring-amber-900 bg-white text-xs font-bold text-slate-900 w-full">
                    <SelectValue placeholder="Sélectionner un transporteur...">
                      {selectedTransporterLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 font-bold text-xs">
                    {allTransporters.map(trans => {
                      const carInfo = trans.car;
                      const carDisplay = carInfo
                        ? (typeof carInfo === 'object'
                            ? `${(carInfo as any).brand || ''} ${(carInfo as any).serialnumber || ''}`.trim() || 'Véhicule'
                            : carInfo)
                        : 'Sans matricule';
                      const label = `${trans.fullname} (${carDisplay})`;
                      return (
                        <SelectItem key={trans.id} value={trans.id.toString()} label={label} className="font-bold text-xs">
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddTransportRow}
                disabled={!selectedTransporter}
                className="w-full h-10 bg-amber-900 hover:bg-amber-950 text-white font-bold rounded-xl gap-2 flex items-center justify-center transition-all disabled:opacity-40"
              >
                <Truck className="w-4 h-4" /> Ajouter Frais Logistique
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* 3. Grid / Table showing added articles */}
        <Card className="border-slate-200/60 shadow-xl shadow-slate-900/5 rounded-[24px] overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-5">
            <CardTitle className="text-sm font-serif font-bold text-amber-50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Nomenclature des Articles Réceptionnés
            </CardTitle>
            <CardDescription className="text-xs text-slate-300 font-medium">Liste des articles entrés en stock. Modifiez les prix unitaires, remises et colis en ligne.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">N°</th>
                    <th className="p-4 min-w-[200px]">Article / Descriptif</th>
                    <th className="p-4 min-w-[120px]">Réf Colis</th>
                    <th className="p-4 w-28">P.U HT ({docCurrency})</th>
                    <th className="p-4 w-28">Qté / M³</th>
                    <th className="p-4 w-24">Remise %</th>
                    <th className="p-4 w-20 text-center">TVA %</th>
                    <th className="p-4 w-32 text-right">Montant Net HT</th>
                    <th className="p-4 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center text-slate-400 font-medium italic">
                          Aucun article ou ligne de transport n&apos;a encore été ajouté à la réception.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, idx) => {
                        const isTransport = row.line_type === LineType.TransportFee;
                        return (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-slate-50/50 transition-all group font-medium"
                          >
                            <td className="p-4 text-center font-bold text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="p-4">
                              {isTransport ? (
                                <div className="flex items-center gap-2 text-amber-900 font-bold">
                                  <Truck className="w-4 h-4 shrink-0" />
                                  <div>
                                    <span>{row.description}</span>
                                    <span className="text-[10px] text-slate-400 block font-normal">Frais de transport logistique</span>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-slate-900 block">{row.selectedArticle?.reference}</span>
                                  <Input
                                    value={row.description}
                                    onChange={(e) => handleRowFieldChange(idx, 'description', e.target.value)}
                                    className="h-7 rounded bg-transparent border-transparent hover:border-slate-200 focus:bg-white text-[11px] px-1 font-medium mt-0.5"
                                  />
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {!isTransport && (
                                <Input
                                  value={row.packagereference}
                                  onChange={(e) => handleRowFieldChange(idx, 'packagereference', e.target.value)}
                                  className="h-8 rounded-lg border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-[11px] font-bold"
                                  placeholder="Réf Colis"
                                />
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.001"
                                value={row.unit_price_ht}
                                onChange={(e) => handleRowFieldChange(idx, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                                className="h-8 rounded-lg border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-[11px] font-mono font-bold"
                              />
                            </td>
                            <td className="p-3">
                              {row.isWoodArticle ? (
                                <Button
                                  type="button"
                                  onClick={() => handleOpenWoodLengths(idx)}
                                  className="w-full h-8 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-900/10 rounded-lg font-bold gap-1 text-[11px] flex items-center justify-center transition-all font-mono"
                                >
                                  <TreeDeciduous className="w-3.5 h-3.5 shrink-0" /> 
                                  {row.quantity.toFixed(3)}
                                </Button>
                              ) : (
                                <Input
                                  type="number"
                                  disabled={isTransport}
                                  value={row.quantity}
                                  onChange={(e) => handleRowFieldChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="h-8 rounded-lg border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-[11px] font-mono font-bold"
                                />
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                disabled={isTransport}
                                value={row.selldiscountpercentage}
                                onChange={(e) => handleRowFieldChange(idx, 'selldiscountpercentage', parseFloat(e.target.value) || 0)}
                                className="h-8 rounded-lg border-slate-200 focus:ring-amber-900 bg-slate-50/50 text-[11px] font-mono font-bold"
                                placeholder="0%"
                              />
                            </td>
                            <td className="p-4 text-center font-bold font-mono text-slate-500">
                              {row.tva_percentage}%
                            </td>
                            <td className="p-4 text-right font-mono font-extrabold text-slate-800 text-sm">
                              {row.sellcostprice_net_ht.toFixed(3)}
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveRow(idx)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Wood Lengths Dialog component */}
      {woodDialogState.isOpen && (
        <WoodLengthsDialog
          isOpen={woodDialogState.isOpen}
          onClose={() => setWoodDialogState(prev => ({ ...prev, isOpen: false }))}
          article={woodDialogState.article!}
          currentLengths={woodDialogState.currentLengths}
          availableStockDetails={[]}
          isPurchase={true}
          onSave={handleSaveWoodLengths}
        />
      )}

    </DashboardLayout>
  );
}

export default function NewSupplierReceiptPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto"></div>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase font-mono">Chargement du formulaire...</p>
        </div>
      </div>
    }>
      <NewSupplierReceiptPageContent />
    </Suspense>
  );
}
