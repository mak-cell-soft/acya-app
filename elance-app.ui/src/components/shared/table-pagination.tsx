'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-forest-50/50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-sand-400 uppercase tracking-wider">Lignes par page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-8 w-[70px] rounded-lg border-forest-100 bg-white text-xs font-bold text-forest-900 focus:ring-forest-600">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-forest-100">
              {[5, 10, 15].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs font-medium">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs font-bold text-sand-400">
          <span className="text-forest-900 font-black">{startItem}-{endItem}</span> sur <span className="text-forest-900 font-black">{totalItems}</span>
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-forest-400 hover:text-forest-900 hover:bg-forest-50 disabled:opacity-30"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-forest-400 hover:text-forest-900 hover:bg-forest-50 disabled:opacity-30"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-1 px-2">
           <span className="text-xs font-bold text-forest-900">Page</span>
           <span className="h-8 min-w-[32px] flex items-center justify-center rounded-lg bg-forest-600 text-white text-xs font-black shadow-lg shadow-forest-600/20">
              {currentPage}
           </span>
           <span className="text-xs font-bold text-sand-400">sur {totalPages || 1}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-forest-400 hover:text-forest-900 hover:bg-forest-50 disabled:opacity-30"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-forest-400 hover:text-forest-900 hover:bg-forest-50 disabled:opacity-30"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
