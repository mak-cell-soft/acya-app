'use client';

import React, { Suspense } from 'react';
import { SupplierReturnForm } from '@/components/purchases/supplier-return-form';

export default function NewSupplierReturnPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-900 mx-auto"></div>
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Chargement du formulaire...</p>
        </div>
      </div>
    }>
      <SupplierReturnForm />
    </Suspense>
  );
}
