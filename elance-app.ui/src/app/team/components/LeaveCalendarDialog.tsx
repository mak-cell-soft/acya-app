'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Loader2, 
  CalendarDays,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leave } from '@/types/hr';
import { useAllLeaves } from '@/hooks/use-hr';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaveCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const LEAVE_THEMES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'Annuel': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60', glow: 'shadow-emerald-500/10' },
  'Congé Payé': { bg: 'bg-corp-blue-50', text: 'text-corp-blue-700', border: 'border-corp-blue-200/60', glow: 'shadow-corp-blue-500/10' },
  'Maladie': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/60', glow: 'shadow-rose-500/10' },
  'Sans solde': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60', glow: 'shadow-amber-500/10' },
  'Autres': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/60', glow: 'shadow-purple-500/10' },
  'default': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/60', glow: 'shadow-slate-500/10' }
};

const getLeaveTheme = (type: string) => LEAVE_THEMES[type] || LEAVE_THEMES['default'];

export function LeaveCalendarDialog({ isOpen, onClose }: LeaveCalendarDialogProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'analytics'>('calendar');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const { data: allLeaves = [], isLoading } = useAllLeaves();
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startingDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  const startingDayIndex = startingDayRaw === 0 ? 6 : startingDayRaw - 1; 

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

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

  const monthlyStats = useMemo(() => {
    const stats = Array.from({ length: 12 }, (_, i) => ({
      name: MONTHS_FR[i].substring(0, 3),
      total: 0
    }));

    allLeaves.forEach(leave => {
      if (leave.status !== 'Approved') return;
      const start = new Date(leave.startdate);
      if (start.getFullYear() === currentYear) {
        const month = start.getMonth();
        stats[month].total += (leave.durationdays || 1);
      }
    });

    return stats;
  }, [allLeaves, currentYear]);

  useEffect(() => {
    if (isOpen) setCurrentDate(new Date());
  }, [isOpen]);

  const totalCellsNeeded = startingDayIndex + daysInMonth;
  const totalRows = Math.ceil(totalCellsNeeded / 7);
  const gridLength = totalRows * 7;

  const daysGrid = Array.from({ length: gridLength }, (_, i) => {
    const dayNumber = i - startingDayIndex + 1;
    const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
    return {
      dayNumber,
      isValidDay,
      leaves: isValidDay ? getLeavesForDay(dayNumber) : [],
      isToday: isValidDay && new Date().getDate() === dayNumber && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-full max-w-[98vw] md:max-w-[90vw] lg:max-w-7xl p-0 overflow-y-auto max-h-[95vh] md:max-h-[90vh] border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] rounded-2xl bg-sand-50 custom-scrollbar">
        
        {/* Editorial Header */}
        <div className="relative bg-corp-navy px-5 py-4 md:px-8 md:py-5 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
          {/* Background subtle noise/glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-corp-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 opacity-50 mix-blend-screen pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-all text-sand-300 hover:text-white shadow-lg hover:rotate-90 duration-300 z-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="p-1.5 bg-corp-blue-500/20 rounded-lg border border-corp-blue-400/30 backdrop-blur-md">
                <CalendarDays className="w-4 h-4 text-corp-blue-300" />
              </div>
              <Badge className="bg-white/10 hover:bg-white/15 text-corp-blue-100 border-none font-medium tracking-wide text-xs md:text-sm px-3 py-1 h-auto whitespace-nowrap">
                Ressources Humaines
              </Badge>
            </div>
            
            <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
            
            <DialogTitle className="font-heading text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight text-white leading-none whitespace-nowrap">
              Planning des <span className="text-transparent bg-clip-text bg-gradient-to-r from-corp-blue-300 to-corp-cyan">Congés</span>
            </DialogTitle>
          </div>

          <div className="relative z-10 flex flex-col items-end gap-3 mt-4 md:mt-0 md:mr-6">
            <div className="flex items-center gap-3 md:gap-4">
              
              {/* View Toggle */}
              <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10">
                <button 
                  onClick={() => setViewMode('calendar')} 
                  className={cn(
                    "px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all",
                    viewMode === 'calendar' ? "bg-white text-corp-navy shadow-sm" : "text-corp-blue-200 hover:text-white hover:bg-white/5"
                  )}
                >
                  <CalendarDays className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Calendrier</span>
                </button>
                <button 
                  onClick={() => setViewMode('analytics')} 
                  className={cn(
                    "px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-all",
                    viewMode === 'analytics' ? "bg-white text-corp-navy shadow-sm" : "text-corp-blue-200 hover:text-white hover:bg-white/5"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Analytique</span>
                </button>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-2xl">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth}
                className="h-8 w-8 hover:bg-white/15 text-corp-blue-200 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="w-32 md:w-36 text-center font-heading font-bold text-white text-lg capitalize">
                {MONTHS_FR[currentMonth]} <span className="text-corp-blue-300 font-light">{currentYear}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                className="h-8 w-8 hover:bg-white/15 text-corp-blue-200 hover:text-white transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        </div>

        <div className="p-3 md:p-5 bg-sand-50 relative flex-1 flex flex-col">
          
          {viewMode === 'calendar' ? (
            <>
              {/* The Grid */}
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-sand-100/50 overflow-hidden flex-1 flex flex-col">
            
            {/* Weekdays */}
            <div className="grid grid-cols-7 border-b border-sand-100 bg-white shrink-0">
              {WEEKDAYS.map((day, idx) => (
                <div key={day} className={cn(
                  "py-3 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]",
                  (idx === 5 || idx === 6) ? "text-sand-400/70" : "text-corp-navy"
                )}>
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            {/* Days Body */}
            {isLoading ? (
              <div className="h-[40vh] md:h-[50vh] flex flex-col justify-center items-center text-corp-blue-600/50">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-corp-blue-500" />
                <span className="font-medium text-xs tracking-widest uppercase">Synchronisation...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 auto-rows-fr bg-sand-100/50 gap-px flex-1">
                {daysGrid.map((cell, index) => {
                  const isWeekend = index % 7 === 5 || index % 7 === 6;
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.015, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className={cn(
                        "min-h-[80px] md:min-h-[110px] p-1.5 md:p-2.5 transition-all duration-300 relative group bg-white hover:z-10 flex flex-col",
                        !cell.isValidDay && "bg-sand-50/40 text-transparent pointer-events-none",
                        cell.isValidDay && "hover:shadow-[0_0_20px_rgba(0,0,0,0.06)] hover:rounded-xl hover:scale-[1.01]",
                        isWeekend && cell.isValidDay && "bg-sand-50/20"
                      )}
                    >
                      {cell.isValidDay && (
                        <>
                          <div className="flex justify-between items-start mb-1.5 shrink-0">
                            <span className={cn(
                              "text-xs md:text-sm font-bold font-heading tabular-nums flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full transition-colors",
                              cell.isToday 
                                ? "bg-corp-blue-600 text-white shadow-md shadow-corp-blue-600/30" 
                                : isWeekend ? "text-sand-400" : "text-corp-navy group-hover:text-corp-blue-600"
                            )}>
                              {cell.dayNumber}
                            </span>
                            {cell.leaves.length > 0 && (
                              <span className="hidden lg:inline-block text-[9px] font-bold text-sand-400 bg-sand-100 px-1.5 py-0.5 rounded-full">
                                {cell.leaves.length} abs.
                              </span>
                            )}
                          </div>

                          <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 custom-scrollbar min-h-0">
                            <AnimatePresence>
                              {cell.leaves.map((leave, lIdx) => {
                                const theme = getLeaveTheme(leave.leavetype);
                                const formattedDate = `Du ${new Date(leave.startdate).toLocaleDateString('fr-FR')} au ${new Date(leave.enddate).toLocaleDateString('fr-FR')}`;
                                
                                return (
                                  <motion.div
                                    key={`${leave.id}-${lIdx}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: lIdx * 0.05 }}
                                    title={`${leave.employeename} - ${leave.leavetype}\n${formattedDate}`}
                                    className={cn(
                                      "w-full px-1.5 py-1 md:px-2 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold flex flex-col gap-0.5 cursor-default border transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5",
                                      theme.bg,
                                      theme.text,
                                      theme.border,
                                      theme.glow
                                    )}
                                  >
                                    <span className="truncate w-full leading-tight">{leave.employeename}</span>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Elegant Bottom Legend */}
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 md:px-6 md:py-5 bg-white rounded-2xl shadow-sm border border-sand-100 shrink-0">
            <div className="flex items-center gap-2 text-corp-navy font-bold text-[10px] md:text-xs uppercase tracking-[0.15em]">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-corp-blue-500" />
              <span>Légende</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
              {Object.entries(LEAVE_THEMES).filter(([k]) => k !== 'default').map(([type, theme]) => (
                <div key={type} className={cn(
                  "flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl border transition-all hover:scale-105 cursor-default shadow-sm",
                  theme.bg, theme.border
                )}>
                  <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", `bg-${theme.text.split('-')[1]}-500`)} style={{ backgroundColor: 'currentColor' }}></div>
                  <span className={cn("text-[9px] md:text-xs font-bold", theme.text)}>{type}</span>
                </div>
              ))}
            </div>
          </div>
          </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-sand-100/50 overflow-hidden flex-1 flex flex-col p-6 md:p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl md:text-2xl font-heading font-black text-corp-navy leading-none mb-1">
                    Bilan Annuel des Congés
                  </h3>
                  <p className="text-sand-500 font-medium text-xs md:text-sm">
                    Distribution des jours de congé par mois pour l'année {currentYear}
                  </p>
                </div>
                <div className="px-4 py-2 bg-corp-blue-50 text-corp-blue-600 rounded-xl font-bold text-sm md:text-base border border-corp-blue-100">
                  {monthlyStats.reduce((acc, curr) => acc + curr.total, 0)} <span className="text-corp-blue-400 font-medium text-xs">Jours Total</span>
                </div>
              </div>

              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }} 
                    />
                    <Tooltip 
                      cursor={{ stroke: '#0EA5E9', strokeWidth: 1, strokeDasharray: '5 5' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-md border border-corp-blue-100 shadow-2xl rounded-2xl p-4 min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                              <p className="font-bold text-corp-navy mb-3 border-b border-corp-blue-50 pb-2">{label}</p>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-sand-500 font-medium">Jours de congé</span>
                                <span className="font-black text-corp-blue-600 font-mono text-sm">{payload[0].value}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      name="Jours de congé" 
                      stroke="#0EA5E9" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                      animationDuration={1500}
                      animationEasing="ease-out"
                      activeDot={{ r: 6, fill: '#0EA5E9', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(100, 116, 139, 0.2);
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(100, 116, 139, 0.4);
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
}


