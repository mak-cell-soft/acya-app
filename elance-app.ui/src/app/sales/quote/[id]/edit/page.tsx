'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { DocumentFormShell } from '@/components/sales/document-form-shell';
import { DocumentTypes } from '@/types/document';

function EditQuotePageContent() {
  const params = useParams();
  const idStr = params?.id as string;
  const docId = parseInt(idStr || '0', 10);

  return (
    <DocumentFormShell
      docType={DocumentTypes.customerQuote}
      title="Modifier Devis"
      subtitle="Modification d'un devis client — ajustement de la validité et des conditions commerciales."
      editDocumentId={docId}
    />
  );
}

export default function EditQuotePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-sand-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corp-blue-600 mx-auto"></div>
          <p className="text-xs text-sand-400 font-bold tracking-widest uppercase">Chargement du devis...</p>
        </div>
      </div>
    }>
      <EditQuotePageContent />
    </Suspense>
  );
}
