'use client';

import * as React from 'react';
import { AppVariable } from '@/types/settings';
import { useUpdateAppVariable, useDeleteAppVariable } from '@/hooks/use-app-variables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Check, X, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TablePagination } from '@/components/shared/table-pagination';
import { AppVariableFormDialog } from './app-variable-form-dialog';
import { Badge } from '@/components/ui/badge';

interface DimensionTableProps {
  nature: string;
  data: AppVariable[];
}

export function DimensionTable({ nature, data }: DimensionTableProps) {
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

    const nameNum = parseFloat(editValues.name || '0');
    const valueNum = parseFloat(editValues.value || '0');

    // centimeterValidator / millimeterValidator logic
    if (!Number.isInteger(nameNum) || nameNum <= 0) {
      toast.error(nature === 'Length' ? 'La valeur en cm doit être un entier positif' : 'La valeur en mm doit être un entier positif');
      return;
    }

    // meterValidator / meterCentimeterValidator logic
    if (nature === 'Length') {
      const expected = nameNum / 100;
      if (Math.abs(valueNum - expected) > 0.0001) {
        toast.error(`La conversion en mètres est incorrecte. Attendu: ${expected}m`);
        return;
      }
    } else {
      const expected = nameNum / 1000;
      if (Math.abs(valueNum - expected) > 0.0001) {
        toast.error(`La conversion en mètres est incorrecte. Attendu: ${expected}m`);
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
          className="rounded-xl bg-corp-blue-600 text-white font-bold h-9 px-4 gap-2 hover:bg-corp-blue-800 transition-all shadow-lg shadow-corp-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <div className="rounded-xl border border-corp-blue-50 overflow-hidden bg-sand-50/30 flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-corp-blue-50/50 hover:bg-corp-blue-50/50 border-corp-blue-50">
                <TableHead className="text-corp-blue-900 font-bold">{nature === 'Length' ? 'Valeur (cm)' : 'Valeur (mm)'}</TableHead>
                <TableHead className="text-corp-blue-900 font-bold">Valeur (m)</TableHead>
                {/* 
                  Mark React-specific pattern:
                  Only render type column if 'nature' prop is 'Dimension' (Thickness & Width combo)
                */}
                {nature === 'Dimension' && (
                  <TableHead className="text-corp-blue-900 font-bold">Épaisseur / Largeur</TableHead>
                )}
                <TableHead className="text-corp-blue-900 font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((v) => (
                <TableRow key={v.id} className="hover:bg-white transition-colors border-corp-blue-50">
                  <TableCell className="font-medium text-corp-blue-900">
                    {editingId === v.id ? (
                      <Input 
                        type="number"
                        value={editValues.name || ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = parseFloat(val);
                          const mVal = nature === 'Length' ? (num / 100).toString() : (num / 1000).toString();
                          setEditValues({ ...editValues, name: val, value: isNaN(num) ? '' : mVal });
                        }}
                        className="h-9 rounded-lg bg-white border-corp-blue-100"
                      />
                    ) : (
                      <span className="font-bold text-corp-blue-600">{v.name} {nature === 'Length' ? 'cm' : 'mm'}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-corp-blue-900 italic">
                    {editingId === v.id ? (
                      <Input 
                        disabled
                        value={editValues.value || ''} 
                        className="h-9 rounded-lg bg-sand-100/50 border-corp-blue-100"
                      />
                    ) : `${v.value} m`}
                  </TableCell>
                  {/* 
                    Intent: Display a distinctive, harmonious visual badge for the nature
                    to allow quick visual identification between Thickness (Épaisseur) and Width (Largeur).
                  */}
                  {nature === 'Dimension' && (
                    <TableCell className="font-medium">
                      {v.nature === 'thickness' ? (
                        <Badge className="bg-corp-blue-50 hover:bg-corp-blue-100 text-corp-blue-700 border border-corp-blue-100 font-bold px-2.5 py-0.5 rounded-lg">
                          Épaisseur
                        </Badge>
                      ) : (
                        <Badge className="bg-sand-100 hover:bg-sand-200/50 text-sand-800 border border-sand-200 font-bold px-2.5 py-0.5 rounded-lg">
                          Largeur
                        </Badge>
                      )}
                    </TableCell>
                  )}
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
                          <Button onClick={() => startEditing(v)} variant="ghost" size="icon" className="h-8 w-8 text-corp-blue-400 hover:text-corp-blue-600 hover:bg-corp-blue-50 rounded-lg">
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
                  <TableCell colSpan={nature === 'Dimension' ? 4 : 3} className="h-32 text-center text-sand-400 font-medium">
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
      </div>

      <AppVariableFormDialog 
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        nature={nature}
      />
    </div>
  );
}

