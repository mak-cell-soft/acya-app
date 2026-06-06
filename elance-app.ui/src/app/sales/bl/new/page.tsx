'use client';

import React, { Suspense } from 'react';
import { DocumentFormShell } from '@/components/sales/document-form-shell';
import { DocumentTypes } from '@/types/document';

function NewDeliveryNotePageContent() {
  return (
    <DocumentFormShell
      docType={DocumentTypes.customerDeliveryNote}
      title="Nouveau Bon de Livraison"
      subtitle="Création d'un bon de livraison client avec impact sur les stocks."
    />
  );
}

export default function NewDeliveryNotePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-sand-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600 mx-auto"></div>
          <p className="text-xs text-sand-400 font-bold tracking-widest uppercase">Chargement du formulaire...</p>
        </div>
      </div>
    }>
      <NewDeliveryNotePageContent />
    </Suspense>
  );
}

