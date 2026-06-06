'use client';

import * as React from 'react';
import { useTransporters, useUpdateTransporter, useDeleteTransporter, useCreateTransporter } from '@/hooks/use-transporters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X, Trash2, Plus, Truck } from 'lucide-react';

import { TablePagination } from '@/components/shared/table-pagination';

export function TransporterTable() {
  const { data: transporters, isLoading } = useTransporters();
  const updateTransporter = useUpdateTransporter();
  const deleteTransporter = useDeleteTransporter();
  const createTransporter = useCreateTransporter();

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editValues, setEditValues] = React.useState<any>({});
  const [isAdding, setIsAdding] = React.useState(false);
  const [newValues, setNewValues] = React.useState({ fullname: '', car: '' });

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (transporters || []).slice(start, start + pageSize);
  }, [transporters, currentPage, pageSize]);

  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [transporters?.length, pageSize]);

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          onClick={() => setIsAdding(true)}
          className="rounded-xl bg-corp-blue-600 text-white font-bold h-10 gap-2"
        >
          <Plus className="w-4 h-4" /> Ajouter un Transporteur
        </Button>
      </div>

      <div className="rounded-2xl border border-corp-blue-100 overflow-hidden bg-white shadow-sm flex flex-col">
        <Table>
          <TableHeader>
            <TableRow className="bg-sand-50/50 hover:bg-sand-50/50">
              <TableHead className="text-corp-blue-900 font-bold">Nom Complet</TableHead>
              <TableHead className="text-corp-blue-900 font-bold">Véhicule / Matricule</TableHead>
              <TableHead className="text-corp-blue-900 font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow className="bg-corp-blue-50/30">
                <TableCell><Input value={newValues.fullname} onChange={e => setNewValues({...newValues, fullname: e.target.value})} className="h-8" placeholder="Nom..." /></TableCell>
                <TableCell><Input value={newValues.car} onChange={e => setNewValues({...newValues, car: e.target.value})} className="h-8" placeholder="Véhicule..." /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button onClick={() => createTransporter.mutate(newValues, { onSuccess: () => setIsAdding(false) })} variant="ghost" size="icon" className="text-emerald-600"><Check className="w-4 h-4" /></Button>
                    <Button onClick={() => setIsAdding(false)} variant="ghost" size="icon" className="text-red-600"><X className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {paginatedData.map((t) => (
              <TableRow key={t.id} className="hover:bg-sand-50/30 transition-colors">
                <TableCell className="font-bold text-corp-blue-900">
                  {editingId === t.id ? <Input value={editValues.fullname || ''} onChange={e => setEditValues({...editValues, fullname: e.target.value})} className="h-8" /> : t.fullname}
                </TableCell>
                <TableCell className="font-medium text-sand-600">
                  {editingId === t.id ? (
                    <Input 
                      value={typeof editValues.car === 'object' && editValues.car !== null ? ((editValues.car as any).serialnumber || '') : (editValues.car || '')} 
                      onChange={e => setEditValues({...editValues, car: e.target.value})} 
                      className="h-8" 
                    />
                  ) : (
                    typeof t.car === 'object' && t.car !== null ? `${(t.car as any).type || ''} ${(t.car as any).serialnumber || ''}` : (t.car as any)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {editingId === t.id ? (
                      <>
                        <Button onClick={() => updateTransporter.mutate({ id: t.id, data: editValues }, { onSuccess: () => setEditingId(null) })} variant="ghost" size="icon" className="text-emerald-600"><Check className="w-4 h-4" /></Button>
                        <Button onClick={() => setEditingId(null)} variant="ghost" size="icon" className="text-red-600"><X className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => { setEditingId(t.id); setEditValues(t); }} variant="ghost" size="icon" className="text-sand-400 hover:text-corp-blue-600"><Edit2 className="w-4 h-4" /></Button>
                        <Button onClick={() => deleteTransporter.mutate(t.id)} variant="ghost" size="icon" className="text-sand-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedData.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-sand-400 font-medium">
                  Aucun transporteur disponible
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination 
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={transporters?.length || 0}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}

