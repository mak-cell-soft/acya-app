'use client';

import React, { Suspense } from 'react';
import { DocumentFormShell } from '@/components/sales/document-form-shell';
import { DocumentTypes } from '@/types/document';

function NewAvoirClientPageContent() {
  return (
    <DocumentFormShell
      docType={DocumentTypes.customerInvoiceReturn}
      title="Nouvel Avoir Client"
      subtitle="Retour de marchandise client avec réintégration automatique en stock et déduction financière."
    />
  );
}

export default function NewAvoirClientPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-sand-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600 mx-auto"></div>
          <p className="text-xs text-sand-400 font-bold tracking-widest uppercase">Chargement du formulaire...</p>
        </div>
      </div>
    }>
      <NewAvoirClientPageContent />
    </Suspense>
  );
}
