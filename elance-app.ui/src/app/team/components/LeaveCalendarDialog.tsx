'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  CalendarRange,
  Users
} from 'lucide-react';
import { Leave } from '@/types/hr';
import { useAllLeaves } from '@/hooks/use-hr';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LeaveCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function LeaveCalendarDialog({ isOpen, onClose }: LeaveCalendarDialogProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const { data: allLeaves = [], isLoading } = useAllLeaves();
  const [selectedDayLeaves, setSelectedDayLeaves] = useState<{ day: number; leaves: Leave[] } | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get total days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Get starting day index (0-indexed, where 0 is Monday)
  // standard js getDay() is 0=Sunday, 1=Monday...
  const startingDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  const startingDayIndex = startingDayRaw === 0 ? 6 : startingDayRaw - 1; // Map Sunday to index 6, Monday to index 0

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDayLeaves(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDayLeaves(null);
  };

  // Check if a day has overlapping leaves
  const getLeavesForDay = (day: number): Leave[] => {
    const targetDate = new Date(currentYear, currentMonth, day);
    targetDate.setHours(0, 0, 0, 0);

    return allLeaves.filter(leave => {
      if (leave.status !== 'Approved') return false;
      const start = new Date(leave.startdate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leave.enddate);
      end.setHours(0, 0, 0, 0);
      return targetDate >= start && targetDate <= end;
    });
  };

  // Reset selected day on open
  useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date());
      setSelectedDayLeaves(null);
    }
  }, [isOpen]);

  const daysGrid = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - startingDayIndex + 1;
    const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
    return {
      dayNumber,
      isValidDay,
      leaves: isValidDay ? getLeavesForDay(dayNumber) : [],
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-xl md:max-w-4xl p-0 overflow-hidden border-forest-100 shadow-2xl rounded-none sm:rounded-[32px] bg-background">
        
        {/* Header Section */}
        <DialogHeader className="p-8 bg-forest-900 text-white relative">
          <div className="flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <div className="w-12 h-12 rounded-2xl bg-forest-800 flex items-center justify-center border border-forest-700">
              <CalendarRange className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
                Planning Global des Congés
              </DialogTitle>
              <p className="text-forest-300 text-sm font-medium mt-1">
                Visualisez et planifiez les absences approuvées de l&apos;ensemble de vos équipes.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-h-[70vh] overflow-y-auto">
          
          {/* Calendar Grid Section */}
          <div className="md:col-span-2 space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-forest-50">
              <h3 className="font-heading font-extrabold text-forest-900 text-lg flex items-center gap-2">
                {MONTHS_FR[currentMonth]} {currentYear}
              </h3>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePrevMonth}
                  className="h-9 w-9 rounded-xl border border-forest-50 hover:bg-forest-50 hover:text-forest-900 text-sand-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextMonth}
                  className="h-9 w-9 rounded-xl border border-forest-50 hover:bg-forest-50 hover:text-forest-900 text-sand-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-forest-50 rounded-2xl bg-white p-4 shadow-sm">
              <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                {WEEKDAYS.map(day => (
                  <div key={day} className="text-[10px] font-bold text-sand-400 uppercase tracking-widest py-1.5">
                    {day}
                  </div>
                ))}
              </div>

              {isLoading ? (
                <div className="h-64 flex flex-col justify-center items-center text-sand-400 font-medium">
                  <Loader2 className="w-6 h-6 animate-spin text-forest-600 mb-2" />
                  Chargement du planning...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {daysGrid.map((cell, index) => {
                    const hasLeaves = cell.isValidDay && cell.leaves.length > 0;
                    const isSelected = selectedDayLeaves?.day === cell.dayNumber;

                    return (
                      <button
                        key={index}
                        disabled={!cell.isValidDay}
                        onClick={() => cell.isValidDay && setSelectedDayLeaves({ day: cell.dayNumber, leaves: cell.leaves })}
                        className={cn(
                          "h-12 w-full rounded-xl flex flex-col items-center justify-between p-1.5 relative border border-transparent transition-all duration-300",
                          !cell.isValidDay && "opacity-0 pointer-events-none",
                          cell.isValidDay && "hover:bg-sand-50/50 hover:border-forest-100",
                          isSelected && "bg-forest-600 hover:bg-forest-700 text-white border-forest-600"
                        )}
                      >
                        <span className={cn(
                          "text-xs font-bold font-mono",
                          isSelected ? "text-white" : "text-forest-900"
                        )}>
                          {cell.isValidDay ? cell.dayNumber : ''}
                        </span>

                        {/* Leave Dots */}
                        {hasLeaves && (
                          <div className="flex gap-0.5 justify-center w-full pb-0.5">
                            {cell.leaves.slice(0, 3).map((l, lIdx) => (
                              <span 
                                key={l.id} 
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  isSelected ? "bg-white" : "bg-emerald-500",
                                  l.leavetype === 'Maladie' && !isSelected && "bg-rose-500",
                                  l.leavetype === 'Sans solde' && !isSelected && "bg-amber-500"
                                )}
                              />
                            ))}
                            {cell.leaves.length > 3 && (
                              <span className={cn("text-[7px] font-bold self-center leading-none", isSelected ? "text-white" : "text-emerald-600")}>
                                +
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Details Sidebar Section */}
          <div className="border border-forest-50 rounded-2xl bg-sand-50/40 p-6 flex flex-col justify-between min-h-[300px]">
            {selectedDayLeaves ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right duration-350">
                <div className="flex items-center justify-between pb-2 border-b border-forest-50">
                  <h4 className="font-heading font-extrabold text-forest-950 text-sm">
                    Congés du {selectedDayLeaves.day} {MONTHS_FR[currentMonth]}
                  </h4>
                  <Badge className="bg-forest-600 text-white border-none font-bold">
                    {selectedDayLeaves.leaves.length}
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[35vh] overflow-y-auto scrollbar-hide">
                  {selectedDayLeaves.leaves.length === 0 ? (
                    <p className="text-xs text-sand-400 font-medium py-6 text-center">
                      Aucune absence validée ce jour.
                    </p>
                  ) : (
                    selectedDayLeaves.leaves.map(leave => (
                      <div key={leave.id} className="bg-white border border-forest-50 p-4 rounded-xl space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-forest-950 text-xs">{leave.employeename || 'Collaborateur'}</span>
                          <Badge className={cn(
                            "rounded-full px-2 py-0 font-bold text-[8px] border-none shrink-0",
                            leave.leavetype === 'Maladie' && "bg-rose-50 text-rose-600",
                            leave.leavetype === 'Annuel' && "bg-emerald-50 text-emerald-600",
                            leave.leavetype === 'Sans solde' && "bg-amber-50 text-amber-600"
                          )}>
                            {leave.leavetype}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-bold text-sand-400">
                          Du {new Date(leave.startdate).toLocaleDateString('fr-FR')} au {new Date(leave.enddate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-4 my-auto">
                <div className="w-12 h-12 rounded-full bg-forest-50 flex items-center justify-center text-forest-600 border border-forest-100">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-forest-900 text-sm">Sélectionnez un jour</h4>
                  <p className="text-xs text-sand-300 font-semibold max-w-xs mt-1">
                    Cliquez sur un jour du calendrier ayant des points colorés pour voir le détail des absences de l&apos;équipe.
                  </p>
                </div>
              </div>
            )}

            {/* General Month Summary */}
            <div className="pt-4 border-t border-forest-50 text-xs text-sand-400 font-semibold">
              <div className="flex justify-between items-center">
                <span>Absences approuvées ce mois :</span>
                <span className="font-bold text-forest-950 font-mono">
                  {allLeaves.filter(l => {
                    if (l.status !== 'Approved') return false;
                    const start = new Date(l.startdate);
                    return start.getMonth() === currentMonth && start.getFullYear() === currentYear;
                  }).length}
                </span>
              </div>
            </div>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
