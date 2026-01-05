export const SeriesOptions_FR = [
    { id: 1, value: 'TU' },
    { id: 2, value: 'RS' },
]

export const CounterPartList_FR = [
    { key: 1, value: 'Customer' },
    { key: 1, value: 'Supplier' },
    { key: 1, value: 'Both' }
]

export enum CounterPartType_FR {
    customer = 'Customer',
    supplier = 'Supplier',
    both = 'Both'
}


export enum Prefix {
    STE = 'Société',
    ENT = 'Entreprise',
    PERS = 'Pers. Physique',
    ASS = 'Association',
    AUT = 'Autre'
}

export const SocietyPrefixes_FR = [
    { id: 'STE', name: 'Société' },
    { id: 'ENT', name: 'Entreprise' },
    { id: 'ASS', name: 'Association' }
]

export const CustomerPrefixes_FR = [
    { id: 'MRS', name: 'Monsieur' },
    { id: 'MME', name: 'Madame' }
]

export const fullPrefixes_FR = SocietyPrefixes_FR.concat(CustomerPrefixes_FR);

export enum ProviderCategories {
    BOIS = 'Vente Gros Bois et Dérivés',
    CONSTR = 'Vente Gros Matéiaux de Construction',
    INDUS = 'Industrie Bois et Ameublement',
    ACCSESS = 'Vente Accessoires Industrie'
}

export enum TrueFalseTranslate_FR {
    true = 'Oui',
    false = 'Non'
}

export const SupplierCategories_FR = [
    { id: 1, value: 'Vente Gros Bois et Dérivés' },
    { id: 2, value: 'Vente Gros Matéiaux de Construction' },
    { id: 3, value: 'Industrie Bois et Ameublement' },
    { id: 4, value: 'Vente Accessoires Industrie' }

]

export const CounterPartActivities_FR = [
    { key: 1, value: 'Ameublement et Agencement' },
    { key: 2, value: 'Particulier Ameublement' },
    { key: 3, value: 'Menuiserie' },
    { key: 4, value: 'Divers Traveaux Ameublement' },
    { key: 5, value: 'Construction Immobilière' },
    { key: 6, value: 'Activité Industrielle' },
    { key: 7, value: 'Société de Vente' },
    { key: 8, value: 'Quincaillerie' }
]

export const Months_FR = {
    1: 'Janvier',
    2: 'Février',
    3: 'Mars',
    4: 'Avril',
    5: 'Mai',
    6: 'Juin',
    7: 'Juillet',
    8: 'Août',
    9: 'Septembre',
    10: 'Octobre',
    11: 'Novembre',
    12: 'Décembre'
}