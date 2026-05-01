import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { CounterPartActivities_FR } from '../../../shared/constants/list_of_constants';
import { PricingGridService } from '../../../services/components/pricing-grid.service';
import { PricingGrid } from '../../../models/components/pricing-grid';
// Use ArticleService — the canonical product catalog (same source as customer-add-document)
import { ArticleService } from '../../../services/components/article.service';
import { Article } from '../../../models/components/article';
import { ToastrService } from 'ngx-toastr';
import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'app-customer-details-modal',
    templateUrl: './customer-details-modal.component.html',
    styleUrls: ['./customer-details-modal.component.css']
})
export class CustomerDetailsModalComponent implements OnInit {

    // ── Pricing Grid State ──────────────────────────────────────────────────────
    pricingRules: PricingGrid[] = [];
    dataSource = new MatTableDataSource<PricingGrid>([]);
    displayedColumns: string[] = ['article', 'discount', 'validity', 'actions'];

    // ── Article Catalog (mirrors pattern from customer-add-document) ─────────────
    articles: Article[] = [];
    filteredArticles: Article[] = [];
    articleSearchTerm: string = '';

    // ── Add-Rule Form State ─────────────────────────────────────────────────────
    newRule: Partial<PricingGrid> = {
        discountrate: 0,
        isactive: true
    };
    isAddingRule = false;
    isSaving = false;
    isLoading = false;

    // ── Active Tab tracking ─────────────────────────────────────────────────────
    activeTab = 0;

    constructor(
        public dialogRef: MatDialogRef<CustomerDetailsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: CounterPart },
        private pricingGridService: PricingGridService,
        private articleService: ArticleService,   // ← ArticleService, not MerchandiseService
        private toastr: ToastrService
    ) { }

    ngOnInit(): void {
        this.loadPricingRules();
        this.loadArticles(); // Fetch the article catalog on init
    }

    // ── Data Loaders ────────────────────────────────────────────────────────────

    /** Load negotiated pricing rules for this customer */
    loadPricingRules(): void {
        this.isLoading = true;
        this.pricingGridService.getForCounterPart(this.data.customer.id).subscribe({
            next: (rules) => {
                this.pricingRules = rules;
                this.dataSource.data = rules;
                this.isLoading = false;
            },
            error: () => {
                this.toastr.error('Erreur lors du chargement des règles tarifaires');
                this.isLoading = false;
            }
        });
    }

    /** Load article catalog — same pattern as customer-add-document.component.ts */
    loadArticles(): void {
        this.articleService.GetAll().subscribe({
            next: (articles) => {
                // Keep only non-deleted articles
                this.articles = articles.filter(a => !a.isdeleted);
                this.filteredArticles = [...this.articles];
            },
            error: () => this.toastr.error('Erreur lors du chargement des articles')
        });
    }

    // ── Article Search Filter ───────────────────────────────────────────────────

    /** Filter the article list by reference or description, matching the document creation pattern */
    filterArticles(): void {
        const term = (this.articleSearchTerm || '').toLowerCase().trim();
        if (!term) {
            this.filteredArticles = [...this.articles];
            return;
        }
        this.filteredArticles = this.articles.filter(a =>
            a.reference.toLowerCase().includes(term) ||
            (a.description || '').toLowerCase().includes(term)
        );
    }

    /** Get a display label for an article: "REF - Description" */
    getArticleLabel(article: Article): string {
        return article.description
            ? `${article.reference} — ${article.description}`
            : article.reference;
    }

    // ── Rule Form Helpers ───────────────────────────────────────────────────────

    toggleAddRule(): void {
        this.isAddingRule = !this.isAddingRule;
        if (!this.isAddingRule) {
            this.resetNewRule();
        }
    }

    resetNewRule(): void {
        this.newRule = { discountrate: 0, isactive: true };
        this.articleSearchTerm = '';
        this.filteredArticles = [...this.articles];
    }

    /** On article selected from dropdown: the ID is already bound via ngModel */
    onArticleSelected(articleId: number): void {
        // No action needed here as ngModel handles it, 
        // but we keep the hook for future logic (e.g. loading specific prices)
        console.log('Selected Article ID:', articleId);
    }

    saveRule(): void {
        if (!this.newRule.merchandiseid || this.newRule.discountrate === undefined) {
            this.toastr.warning('Veuillez sélectionner un article et saisir un taux de remise');
            return;
        }
        if ((this.newRule.discountrate ?? 0) <= 0 || (this.newRule.discountrate ?? 0) > 100) {
            this.toastr.warning('Le taux de remise doit être entre 1 et 100%');
            return;
        }

        // Guard: prevent duplicate rule for same article
        const duplicate = this.pricingRules.find(r => r.articleid === this.newRule.merchandiseid || r.merchandiseid === this.newRule.merchandiseid);
        if (duplicate) {
            this.toastr.warning('Une règle existe déjà pour cet article. Supprimez-la avant d\'en créer une nouvelle.');
            return;
        }

        const ruleToSave: PricingGrid = {
            ...this.newRule as PricingGrid,
            counterpartid: this.data.customer.id,
            updatedbyid: Number(localStorage.getItem('userId')) || 1
        };

        this.isSaving = true;
        this.pricingGridService.create(ruleToSave).subscribe({
            next: () => {
                this.toastr.success('Règle tarifaire ajoutée avec succès');
                this.loadPricingRules();
                this.toggleAddRule();
                this.isSaving = false;
            },
            error: () => {
                this.toastr.error('Erreur lors de l\'ajout de la règle');
                this.isSaving = false;
            }
        });
    }

    deleteRule(rule: PricingGrid): void {
        if (confirm('Voulez-vous vraiment supprimer cette règle tarifaire ?')) {
            this.pricingGridService.delete(rule.id).subscribe({
                next: () => {
                    this.toastr.success('Règle supprimée');
                    this.loadPricingRules();
                },
                error: () => this.toastr.error('Erreur lors de la suppression')
            });
        }
    }

    // ── Modal Helpers ───────────────────────────────────────────────────────────

    onClose(): void {
        this.dialogRef.close();
    }

    getCounterPartJobTitleValue(_k: string): string {
        const key = Number(_k);
        const mapping = CounterPartActivities_FR.reduce(
            (acc, activity) => ({ ...acc, [activity.key]: activity.value }),
            {} as { [key: number]: string }
        );
        return mapping[key] || '** Non Connue **';
    }

    getFullName(): string {
        const element = this.data.customer;
        if (element.prefix === 'MRS' || element.prefix === 'MME') {
            return `${element.prefix} - ${element.firstname} ${element.lastname}`;
        }
        return `${element.prefix} - ${element.name}`;
    }

    /** Lookup article reference for a given rule */
    getArticleRefFallback(rule: PricingGrid): string {
        if (rule.merchandisereference) return rule.merchandisereference;
        const article = this.articles.find(a => a.id === rule.merchandiseid || a.id === rule.articleid);
        return article ? article.reference : '—';
    }

    /** Lookup article name for a given rule */
    getArticleNameFallback(rule: PricingGrid): string {
        if (rule.merchandisename) return rule.merchandisename;
        const article = this.articles.find(a => a.id === rule.merchandiseid || a.id === rule.articleid);
        return article ? article.description || '' : '—';
    }

    /** Generate 1-2 letter initials from the customer's name for the avatar */
    getInitials(): string {
        const c = this.data.customer;
        if (c.firstname && c.lastname) {
            return (c.firstname[0] + c.lastname[0]).toUpperCase();
        }
        if (c.name) {
            const parts = c.name.trim().split(' ');
            return parts.length >= 2
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : c.name.slice(0, 2).toUpperCase();
        }
        return 'CL';
    }
}
