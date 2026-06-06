'use client';

import * as React from 'react';
import { useBanks, useDeleteBank } from '@/hooks/use-banks';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Landmark, 
  CreditCard, 
  MapPin, 
  Globe, 
  Wallet, 
  Trash2, 
  Edit2, 
  MoreVertical
} from 'lucide-react';
import { TablePagination } from '@/components/shared/table-pagination';
import { BankFormDialog } from './bank-form-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function BankTable() {
  const { data: banks, isLoading } = useBanks();
  const deleteBank = useDeleteBank();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedBank, setSelectedBank] = React.useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (banks || []).slice(start, start + pageSize);
  }, [banks, currentPage, pageSize]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [banks?.length, pageSize]);

  const handleEdit = (bank: any) => {
    setSelectedBank(bank);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedBank(null);
    setIsFormOpen(true);
  };

  if (isLoading) return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-[280px] rounded-2xl bg-sand-100/50 animate-pulse border border-sand-200" />
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-forest-50 shadow-sm">
        <div className="flex items-center gap-4 pl-2">
          <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center text-forest-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-forest-900">Comptes Bancaires</h3>
            <p className="text-xs text-sand-500 font-medium">{banks?.length || 0} comptes configurés</p>
          </div>
        </div>
        <Button 
          onClick={handleAdd}
          className="bg-forest-600 text-white font-bold h-11 px-6 gap-2 hover:bg-forest-800 transition-all shadow-lg shadow-forest-600/10"
        >
          <Plus className="w-4 h-4" /> Ajouter un Compte
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedData.map((bank) => (
          <div 
            key={bank.id} 
            className="group relative bg-white rounded-2xl p-8 border border-forest-100 shadow-sm hover:shadow-xl hover:border-forest-200 transition-all duration-500 overflow-hidden"
          >
            {/* Background Decorative Pattern */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-forest-50/50 rounded-full blur-3xl group-hover:bg-forest-100/50 transition-colors" />
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-forest-600 text-white text-[10px] font-bold uppercase tracking-widest mb-2 shadow-sm">
                    {bank.reference}
                  </span>
                  <h4 className="text-lg font-heading font-bold text-forest-900 leading-tight">
                    {bank.designation}
                  </h4>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-sand-100 transition-colors text-forest-400">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl border-forest-100 p-1 min-w-[140px] shadow-xl">
                    <DropdownMenuItem 
                      onClick={() => handleEdit(bank)}
                      className="rounded-xl gap-2 font-bold text-forest-600 focus:bg-forest-50 focus:text-forest-900 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteBank.mutate(bank.id)}
                      className="rounded-xl gap-2 font-bold text-red-600 focus:bg-red-50 focus:text-red-900 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Card Body - Account Info */}
              <div className="space-y-5 mt-auto">
                <div className="bg-sand-50/80 backdrop-blur-sm p-4 rounded-2xl border border-sand-100">
                  <div className="flex items-center gap-3 mb-1">
                    <CreditCard className="w-4 h-4 text-forest-400" />
                    <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider">Numéro de Compte / RIB</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-forest-800 tracking-wider">
                    {bank.rib}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-forest-400" />
                      <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider">Agence</span>
                    </div>
                    <p className="text-xs font-bold text-forest-900 truncate">{bank.agency}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Globe className="w-3 h-3 text-forest-400" />
                      <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider">IBAN</span>
                    </div>
                    <p className="text-xs font-bold text-forest-900 truncate">{bank.iban}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-forest-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-sand-400 uppercase block leading-none">Solde Initial</span>
                      <p className="text-sm font-bold text-emerald-700 leading-tight">
                        {new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(bank.initialBalance || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {paginatedData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-sand-50/50 rounded-[40px] border-2 border-dashed border-sand-200">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-6">
            <Landmark className="w-10 h-10 text-sand-300" />
          </div>
          <h4 className="text-xl font-heading font-bold text-forest-900">Aucune banque</h4>
          <p className="text-sand-500 font-medium mt-2">Commencez par ajouter votre premier compte bancaire</p>
          <Button 
            onClick={handleAdd}
            variant="outline"
            className="mt-6 border-forest-100 text-forest-600 font-bold gap-2 hover:bg-white"
          >
            <Plus className="w-4 h-4" /> Ajouter une Banque
          </Button>
        </div>
      )}

      <TablePagination 
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={banks?.length || 0}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <BankFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        bank={selectedBank}
      />
    </div>
  );
}

