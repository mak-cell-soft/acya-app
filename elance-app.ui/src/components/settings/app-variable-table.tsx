'use client';

import * as React from 'react';
import { AppVariable } from '@/types/settings';
import { useUpdateAppVariable, useDeleteAppVariable } from '@/hooks/use-app-variables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Check, X, Trash2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TablePagination } from '@/components/shared/table-pagination';
import { AppVariableFormDialog } from './app-variable-form-dialog';

interface AppVariableTableProps {
  nature: string;
  data: AppVariable[];
}

export function AppVariableTable({ nature, data }: AppVariableTableProps) {
  const updateVar = useUpdateAppVariable();
  const deleteVar = useDeleteAppVariable();
  
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editValues, setEditValues] = React.useState<Partial<AppVariable>>({});
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (data || []).slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data?.length, pageSize]);

  const startEditing = (v: AppVariable) => {
    setEditingId(v.id);
    setEditValues(v);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEditing = () => {
    if (!editingId) return;

    // Validators
    if (nature === 'Tva' || nature === 'RS' || nature === 'Taxe') {
      const val = parseFloat(editValues.value || '0');
      if (isNaN(val) || val < 0) {
        toast.error('Valeur numérique positive requise');
        return;
      }
    }

    updateVar.mutate({ id: editingId, data: editValues }, {
      onSuccess: () => setEditingId(null)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={() => setIsAddOpen(true)}
          size="sm"
          className="rounded-xl bg-forest-600 text-white font-bold h-9 px-4 gap-2 hover:bg-forest-800 transition-all shadow-lg shadow-forest-600/10"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <div className="rounded-xl border border-forest-50 overflow-hidden bg-sand-50/30 flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-forest-50/50 hover:bg-forest-50/50 border-forest-50">
              <TableHead className="text-forest-900 font-bold">Nom</TableHead>
              <TableHead className="text-forest-900 font-bold">Valeur</TableHead>
              <TableHead className="text-forest-900 font-bold text-center">Actif</TableHead>
              <TableHead className="text-forest-900 font-bold text-center">Défaut</TableHead>
              <TableHead className="text-forest-900 font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((v) => (
              <TableRow key={v.id} className="hover:bg-white transition-colors border-forest-50">
                <TableCell className="font-medium text-forest-900">
                  {editingId === v.id ? (
                    <Input 
                      value={editValues.name || ''} 
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="h-9 rounded-lg bg-white border-forest-100"
                    />
                  ) : v.name}
                </TableCell>
                <TableCell className="font-medium text-forest-900">
                  {editingId === v.id ? (
                    <Input 
                      value={editValues.value || ''} 
                      onChange={(e) => setEditValues({ ...editValues, value: e.target.value })}
                      className="h-9 rounded-lg bg-white border-forest-100"
                    />
                  ) : (
                    <span className="font-bold text-forest-600">
                      {(() => {
                        const numVal = parseFloat(v.value?.toString().replace(',', '.') || '0');
                        return isNaN(numVal) ? v.value : numVal;
                      })()}
                      {(nature === 'Tva' || nature === 'RS') && v.value ? '%' : ''}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Switch 
                    disabled={editingId !== v.id}
                    checked={editingId === v.id ? editValues.isactive : v.isactive}
                    onCheckedChange={(val) => setEditValues({ ...editValues, isactive: val })}
                    className="data-[state=checked]:bg-forest-600 scale-90"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch 
                    disabled={editingId !== v.id}
                    checked={editingId === v.id ? editValues.isdefault : v.isdefault}
                    onCheckedChange={(val) => setEditValues({ ...editValues, isdefault: val })}
                    className="data-[state=checked]:bg-forest-600 scale-90"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {editingId === v.id ? (
                      <>
                        <Button onClick={saveEditing} variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button onClick={cancelEditing} variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-lg">
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => startEditing(v)} variant="ghost" size="icon" className="h-8 w-8 text-forest-400 hover:text-forest-600 hover:bg-forest-50 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => deleteVar.mutate({ id: v.id, nature })} variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-sand-400 font-medium">
                  Aucune donnée disponible
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination 
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={data?.length || 0}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <AppVariableFormDialog 
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        nature={nature}
      />
    </div>
  </div>
);
}

