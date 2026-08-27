'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Copy,
  Download,
  Grid,
  RefreshCw,
  Save,
  Eye,
  Crosshair,
  FileCode,
  ZoomIn,
  ZoomOut,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import {
  FieldTemplateCoordinate,
  PhysicalDimensions,
  TraiteFieldKey,
  TraitePixelMap,
} from '@/types/traite-calibration';
import {
  INITIAL_TRAITE_PIXEL_MAP,
  TEMPLATE_HEIGHT_PX,
  TEMPLATE_WIDTH_PX,
  CONFIRMED_PHYSICAL_WIDTH_MM,
  CONFIRMED_PHYSICAL_HEIGHT_MM,
} from '@/lib/traite-coordinate-map';
import {
  TraiteBusinessData,
} from '@/types/traite-calibration';
import {
  exportPixelMapAsJSON,
  exportPixelMapAsTypeScript,
  templateToPhysical,
  validateAspectRatio,
  mapBusinessDataToPixelMap,
} from '@/lib/traite-coordinate-converter';

interface TraiteCalibrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  liveData?: TraiteBusinessData;
}

const LOCAL_STORAGE_KEY = 'acya_traite_pixel_map_final_v2';
const FIELD_KEYS = Object.keys(INITIAL_TRAITE_PIXEL_MAP) as TraiteFieldKey[];

export type VisibilityMode = 'all' | 'single' | 'none';

export function TraiteCalibrationDialog({
  isOpen,
  onClose,
  liveData,
}: TraiteCalibrationDialogProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pixelMap, setPixelMap] = useState<TraitePixelMap>(INITIAL_TRAITE_PIXEL_MAP);
  const [selectedField, setSelectedField] = useState<TraiteFieldKey>('echeanceCorps');
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>('all');
  const [zoomScale, setZoomScale] = useState<number>(1.8);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showSampleText, setShowSampleText] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [gridStep, setGridStep] = useState<number>(10);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Confirmed Physical dimensions (280 x 183 mm)
  const [physicalWidthMm, setPhysicalWidthMm] = useState<number>(CONFIRMED_PHYSICAL_WIDTH_MM);
  const [physicalHeightMm, setPhysicalHeightMm] = useState<number>(CONFIRMED_PHYSICAL_HEIGHT_MM);

  // Drag & Resize state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se'
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialFieldState, setInitialFieldState] = useState<FieldTemplateCoordinate | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // ── Load saved map from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      let baseMap = INITIAL_TRAITE_PIXEL_MAP;
      if (saved) {
        const parsed = JSON.parse(saved);
        baseMap = { ...INITIAL_TRAITE_PIXEL_MAP, ...parsed };
      }
      if (liveData) {
        setPixelMap(mapBusinessDataToPixelMap(baseMap, liveData));
      } else {
        setPixelMap(baseMap);
      }
    } catch (err) {
      console.error('Failed to load saved pixel map:', err);
    }
  }, [liveData, isOpen]);

  // ── Fit canvas to container ───────────────────────────────────────────────
  const handleFitToScreen = useCallback(() => {
    if (!rightPanelRef.current) return;
    const containerW = rightPanelRef.current.clientWidth - 64;
    if (containerW > 0) {
      const calculatedScale = Math.min(3.0, Math.max(1.0, containerW / TEMPLATE_WIDTH_PX));
      setZoomScale(Number(calculatedScale.toFixed(2)));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(handleFitToScreen, 150);
    }
  }, [isOpen, handleFitToScreen]);

  // ── Save to localStorage ──────────────────────────────────────────────────
  const handleSaveToLocalStorage = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pixelMap));
      toast.success('Carte des 16 coordonnées enregistrée avec succès.');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde de la calibration.');
    }
  };

  // ── Reset map ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (confirm('Voulez-vous réinitialiser toutes les coordonnées aux 16 valeurs approuvées du périmètre final ?')) {
      setPixelMap(INITIAL_TRAITE_PIXEL_MAP);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast.info('Coordonnées réinitialisées.');
    }
  };

  // ── Active field reference ────────────────────────────────────────────────
  const activeCoord = pixelMap[selectedField];
  const activeCenterX = activeCoord.templateX + Math.round(activeCoord.templateWidth / 2);
  const activeCenterY = activeCoord.templateY + Math.round(activeCoord.templateHeight / 2);

  // ── Update selected field coordinate ──────────────────────────────────────
  const updateActiveCoord = useCallback(
    (updates: Partial<FieldTemplateCoordinate> & { centerX?: number; centerY?: number }) => {
      setPixelMap((prev) => {
        const current = prev[selectedField];
        let nextW = updates.templateWidth !== undefined ? updates.templateWidth : current.templateWidth;
        let nextH = updates.templateHeight !== undefined ? updates.templateHeight : current.templateHeight;

        let nextX = updates.templateX !== undefined ? updates.templateX : current.templateX;
        let nextY = updates.templateY !== undefined ? updates.templateY : current.templateY;

        if (updates.centerX !== undefined) {
          nextX = updates.centerX - Math.round(nextW / 2);
        }
        if (updates.centerY !== undefined) {
          nextY = updates.centerY - Math.round(nextH / 2);
        }

        if (snapToGrid) {
          nextX = Math.round(nextX / gridStep) * gridStep;
          nextY = Math.round(nextY / gridStep) * gridStep;
          nextW = Math.max(gridStep, Math.round(nextW / gridStep) * gridStep);
          nextH = Math.max(gridStep, Math.round(nextH / gridStep) * gridStep);
        }

        nextX = Math.max(0, Math.min(TEMPLATE_WIDTH_PX - 10, nextX));
        nextY = Math.max(0, Math.min(TEMPLATE_HEIGHT_PX - 10, nextY));
        nextW = Math.max(10, Math.min(TEMPLATE_WIDTH_PX - nextX, nextW));
        nextH = Math.max(8, Math.min(TEMPLATE_HEIGHT_PX - nextY, nextH));

        return {
          ...prev,
          [selectedField]: {
            ...current,
            templateX: Math.round(nextX),
            templateY: Math.round(nextY),
            templateWidth: Math.round(nextW),
            templateHeight: Math.round(nextH),
          },
        };
      });
    },
    [selectedField, snapToGrid, gridStep]
  );

  // ── Keyboard Navigation (Arrow keys / Shift / Alt) ────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      const step = e.shiftKey ? 5 : 1;

      if (e.altKey) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          updateActiveCoord({ templateWidth: activeCoord.templateWidth + step });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          updateActiveCoord({ templateWidth: Math.max(10, activeCoord.templateWidth - step) });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          updateActiveCoord({ templateHeight: activeCoord.templateHeight + step });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          updateActiveCoord({ templateHeight: Math.max(8, activeCoord.templateHeight - step) });
        }
      } else {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          updateActiveCoord({ templateX: activeCoord.templateX + step });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          updateActiveCoord({ templateX: activeCoord.templateX - step });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          updateActiveCoord({ templateY: activeCoord.templateY + step });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          updateActiveCoord({ templateY: activeCoord.templateY - step });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeCoord, updateActiveCoord]);

  // ── Mouse Drag & Resize ───────────────────────────────────────────────────
  const handleMouseDownOnField = (e: React.MouseEvent, fieldKey: TraiteFieldKey, resizeDirection?: string) => {
    e.stopPropagation();
    setSelectedField(fieldKey);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialFieldState({ ...pixelMap[fieldKey] });

    if (resizeDirection) {
      setIsResizing(resizeDirection);
    } else {
      setIsDragging(true);
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / zoomScale;
    const rawY = (e.clientY - rect.top) / zoomScale;

    const clampedX = Math.max(0, Math.min(TEMPLATE_WIDTH_PX, Math.round(rawX)));
    const clampedY = Math.max(0, Math.min(TEMPLATE_HEIGHT_PX, Math.round(rawY)));
    setCursorPos({ x: clampedX, y: clampedY });

    if (!initialFieldState) return;

    const deltaX = Math.round((e.clientX - dragStart.x) / zoomScale);
    const deltaY = Math.round((e.clientY - dragStart.y) / zoomScale);

    if (isDragging) {
      updateActiveCoord({
        templateX: initialFieldState.templateX + deltaX,
        templateY: initialFieldState.templateY + deltaY,
      });
    } else if (isResizing) {
      let nextX = initialFieldState.templateX;
      let nextY = initialFieldState.templateY;
      let nextW = initialFieldState.templateWidth;
      let nextH = initialFieldState.templateHeight;

      if (isResizing.includes('e')) nextW = initialFieldState.templateWidth + deltaX;
      if (isResizing.includes('s')) nextH = initialFieldState.templateHeight + deltaY;
      if (isResizing.includes('w')) {
        nextX = initialFieldState.templateX + deltaX;
        nextW = initialFieldState.templateWidth - deltaX;
      }
      if (isResizing.includes('n')) {
        nextY = initialFieldState.templateY + deltaY;
        nextH = initialFieldState.templateHeight - deltaY;
      }

      updateActiveCoord({
        templateX: nextX,
        templateY: nextY,
        templateWidth: nextW,
        templateHeight: nextH,
      });
    }
  };

  const handleMouseUpCanvas = () => {
    setIsDragging(false);
    setIsResizing(null);
    setInitialFieldState(null);
  };

  // ── Export Map Handlers ────────────────────────────────────────────────────
  const handleCopyJSON = () => {
    const jsonStr = exportPixelMapAsJSON(pixelMap);
    navigator.clipboard.writeText(jsonStr);
    toast.success('JSON des 16 champs avec (X,Y,W,H,CenterX,CenterY) copié !');
  };

  const handleDownloadJSON = () => {
    const jsonStr = exportPixelMapAsJSON(pixelMap);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traite_pixel_map_final_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier JSON téléchargé.');
  };

  // ── Calculated Physical Coordinates (mm) ──────────────────────────────────
  const physicalDimensions: PhysicalDimensions = {
    widthMm: physicalWidthMm,
    heightMm: physicalHeightMm,
  };
  const activePhysical = templateToPhysical(activeCoord, physicalDimensions);

  const visibleFields = FIELD_KEYS.filter((fieldKey) => {
    if (visibilityMode === 'none') return false;
    if (visibilityMode === 'single') return fieldKey === selectedField;
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[96vh] max-h-[96vh] p-0 overflow-hidden rounded-3xl flex flex-col bg-slate-950 border-slate-800 text-white antialiased shadow-2xl z-[100]">

        {/* ── Dialog Header ───────────────────────────────────────────────── */}
        <DialogHeader className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-corp-blue-500/20 text-corp-blue-400 rounded-2xl border border-corp-blue-500/30 shadow-sm">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-white tracking-tight text-wrap-balance">
                Inspecteur de Calibration Traite — Périmètre Final (16 Champs)
                <Badge variant="outline" className="text-xs bg-emerald-950 text-emerald-300 border-emerald-700/70 font-mono tabular-nums">
                  {CONFIRMED_PHYSICAL_WIDTH_MM} × {CONFIRMED_PHYSICAL_HEIGHT_MM} mm
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-medium">
                13 champs calibrés conservés · 3 nouveaux champs à calibrer (echeanceTalon, montantSecond, aval).
              </DialogDescription>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveToLocalStorage}
              className="h-9 px-3.5 text-xs bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 gap-1.5 rounded-xl transition-all active:scale-[0.96] min-h-[36px]"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              Sauvegarder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyJSON}
              className="h-9 px-3.5 text-xs bg-corp-blue-950 border-corp-blue-700/80 hover:bg-corp-blue-900 text-corp-blue-200 gap-1.5 rounded-xl transition-all active:scale-[0.96] min-h-[36px]"
            >
              <Copy className="w-4 h-4 text-corp-blue-400" />
              Copier JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadJSON}
              className="h-9 px-3.5 text-xs bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 gap-1.5 rounded-xl transition-all active:scale-[0.96] min-h-[36px]"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Télécharger JSON
            </Button>
          </div>
        </DialogHeader>

        {/* ── Main Content Area ───────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT PANEL: Inspector Controls ────────────────────────────── */}
          <div className="w-[410px] bg-slate-900/60 border-r border-slate-800/80 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-lg">

            {/* Section 1: Field Selector & Visibility Filter */}
            <div className="space-y-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Champ Dynamique ({FIELD_KEYS.length})</span>
                <span className="text-[10px] text-corp-blue-400 font-mono font-bold tracking-widest uppercase">
                  {activeCoord.category}
                </span>
              </Label>

              <Select value={selectedField} onValueChange={(v) => setSelectedField(v as TraiteFieldKey)}>
                <SelectTrigger className="h-10 bg-slate-950 border-slate-700 text-xs font-semibold text-white rounded-xl shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-72 rounded-2xl shadow-2xl">
                  {FIELD_KEYS.map((key) => {
                    const item = pixelMap[key];
                    return (
                      <SelectItem key={key} value={key} className="text-xs font-medium focus:bg-slate-800 focus:text-white min-h-[38px] rounded-lg">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-semibold flex items-center gap-1.5">
                            {item.label}
                            {item.needsCalibration && (
                              <Badge className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono">
                                NEEDS CALIBRATION
                              </Badge>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                            ({item.templateX},{item.templateY})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Visibility Filter Buttons */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-slate-400" /> Affichage sur le modèle
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibilityMode('all')}
                    className={`h-8 text-[11px] font-bold rounded-xl transition-all active:scale-[0.96] min-h-[32px] ${
                      visibilityMode === 'all'
                        ? 'bg-corp-blue-600 text-white border-corp-blue-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Tous les champs
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibilityMode('single')}
                    className={`h-8 text-[11px] font-bold rounded-xl transition-all active:scale-[0.96] min-h-[32px] ${
                      visibilityMode === 'single'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Uniquement actif
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibilityMode('none')}
                    className={`h-8 text-[11px] font-bold rounded-xl transition-all active:scale-[0.96] min-h-[32px] ${
                      visibilityMode === 'none'
                        ? 'bg-red-950 text-red-300 border-red-800 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    Masquer tout
                  </Button>
                </div>
              </div>
            </div>

            {/* Section 2: Active Field Geometry Editor (Pixels: X, Y, W, H, CenterX, CenterY) */}
            <fieldset className="border border-corp-blue-900/50 bg-corp-blue-950/20 rounded-2xl p-4 space-y-3 shadow-xs">
              <legend className="text-[10px] font-black text-corp-blue-400 uppercase tracking-widest px-1 flex items-center justify-between w-full">
                <span>Coordonnées Modèle (Pixels)</span>
                {activeCoord.needsCalibration && (
                  <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> NEEDS CALIBRATION
                  </span>
                )}
              </legend>

              <div className="grid grid-cols-2 gap-3">
                {/* templateX */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>X (Left)</span>
                    <span className="font-mono text-white tabular-nums">{activeCoord.templateX} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateX: activeCoord.templateX - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateX}
                      onChange={(e) => updateActiveCoord({ templateX: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-emerald-400 tabular-nums font-bold"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateX: activeCoord.templateX + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* templateY */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Y (Top)</span>
                    <span className="font-mono text-white tabular-nums">{activeCoord.templateY} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateY: activeCoord.templateY - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateY}
                      onChange={(e) => updateActiveCoord({ templateY: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-emerald-400 tabular-nums font-bold"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateY: activeCoord.templateY + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* templateWidth */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Largeur (W)</span>
                    <span className="font-mono text-white tabular-nums">{activeCoord.templateWidth} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateWidth: activeCoord.templateWidth - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateWidth}
                      onChange={(e) => updateActiveCoord({ templateWidth: parseInt(e.target.value) || 10 })}
                      className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-sky-400 tabular-nums font-bold"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateWidth: activeCoord.templateWidth + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* templateHeight */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Hauteur (H)</span>
                    <span className="font-mono text-white tabular-nums">{activeCoord.templateHeight} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateHeight: activeCoord.templateHeight - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateHeight}
                      onChange={(e) => updateActiveCoord({ templateHeight: parseInt(e.target.value) || 8 })}
                      className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-sky-400 tabular-nums font-bold"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold active:scale-[0.96] transition-transform min-h-[32px]"
                      onClick={() => updateActiveCoord({ templateHeight: activeCoord.templateHeight + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Editable CenterX & CenterY */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                    <span>Center X</span>
                    <span className="font-mono text-amber-300 tabular-nums">{activeCenterX} px</span>
                  </Label>
                  <Input
                    type="number"
                    value={activeCenterX}
                    onChange={(e) => updateActiveCoord({ centerX: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center text-amber-300 tabular-nums font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
                    <span>Center Y</span>
                    <span className="font-mono text-amber-300 tabular-nums">{activeCenterY} px</span>
                  </Label>
                  <Input
                    type="number"
                    value={activeCenterY}
                    onChange={(e) => updateActiveCoord({ centerY: parseInt(e.target.value) || 0 })}
                    className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center text-amber-300 tabular-nums font-bold"
                  />
                </div>
              </div>
            </fieldset>

            {/* Section 3: Physical Paper Conversion (176.5 x 115.2 mm) */}
            <fieldset className="border border-slate-800 bg-slate-900/60 rounded-2xl p-4 space-y-3 shadow-xs">
              <legend className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between w-full">
                <span>Paper Geometry ({physicalWidthMm} × {physicalHeightMm} mm)</span>
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-300">Largeur Papier (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={physicalWidthMm}
                    onChange={(e) => setPhysicalWidthMm(parseFloat(e.target.value) || CONFIRMED_PHYSICAL_WIDTH_MM)}
                    className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center text-white tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-300">Hauteur Papier (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={physicalHeightMm}
                    onChange={(e) => setPhysicalHeightMm(parseFloat(e.target.value) || CONFIRMED_PHYSICAL_HEIGHT_MM)}
                    className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Warning if physical paper dimensions are altered */}
              {(physicalWidthMm !== CONFIRMED_PHYSICAL_WIDTH_MM || physicalHeightMm !== CONFIRMED_PHYSICAL_HEIGHT_MM) && (
                <div className="bg-amber-950/80 border border-amber-600/80 text-amber-200 p-2.5 rounded-xl text-[11px] flex items-start gap-2 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Attention : Dimensions physiques modifiées !</strong>
                    <p className="text-[10px] text-amber-300/90 mt-0.5 leading-snug">
                      Les dimensions mesurées officielles du papier sont {CONFIRMED_PHYSICAL_WIDTH_MM} × {CONFIRMED_PHYSICAL_HEIGHT_MM} mm.
                    </p>
                  </div>
                </div>
              )}

              {/* Aspect Ratio Display */}
              <div className="bg-slate-950 border border-slate-800/90 p-3 rounded-xl text-xs space-y-1 font-mono shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Aspect Ratios & Dimensions
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 tabular-nums">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Template</span>
                    <strong className="text-sky-400">820 × 536 px</strong>
                    <div className="text-[10px] text-slate-400">Ratio: <span className="text-sky-300">{(TEMPLATE_WIDTH_PX / TEMPLATE_HEIGHT_PX).toFixed(5)}</span></div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Physical Paper</span>
                    <strong className="text-emerald-400">{physicalWidthMm} × {physicalHeightMm} mm</strong>
                    <div className="text-[10px] text-slate-400">Ratio: <span className="text-emerald-300">{(physicalWidthMm / physicalHeightMm).toFixed(5)}</span></div>
                  </div>
                </div>
              </div>

              {/* Calculated Physical Coordinates in mm */}
              <div className="bg-slate-950 border border-slate-800/90 p-3 rounded-xl text-xs space-y-1 font-mono shadow-2xs">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Conversion en Millimètres ({selectedField})
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[11px] text-slate-300 tabular-nums">
                  <div>X: <span className="text-emerald-400 font-bold">{activePhysical.x} mm</span></div>
                  <div>Y: <span className="text-emerald-400 font-bold">{activePhysical.y} mm</span></div>
                  <div>W: <span className="text-sky-400 font-bold">{activePhysical.width} mm</span></div>
                  <div>H: <span className="text-sky-400 font-bold">{activePhysical.height} mm</span></div>
                  <div>CenterX: <span className="text-amber-300 font-bold">{activePhysical.centerX} mm</span></div>
                  <div>CenterY: <span className="text-amber-300 font-bold">{activePhysical.centerY} mm</span></div>
                </div>
              </div>
            </fieldset>

            {/* Display Options */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-3.5 space-y-3 shadow-xs">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Options d&apos;Affichage
              </Label>
              <div className="flex items-center justify-between text-xs text-slate-300 min-h-[36px]">
                <span className="flex items-center gap-2 font-medium"><Grid className="w-4 h-4 text-slate-400" /> Grille de référence</span>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 min-h-[36px]">
                <span className="flex items-center gap-2 font-medium"><Eye className="w-4 h-4 text-slate-400" /> Règle graduée en pixels</span>
                <Switch checked={showRulers} onCheckedChange={setShowRulers} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 min-h-[36px]">
                <span className="flex items-center gap-2 font-medium"><FileCode className="w-4 h-4 text-slate-400" /> Valeurs d&apos;exemple dans les cases</span>
                <Switch checked={showSampleText} onCheckedChange={setShowSampleText} />
              </div>
            </div>

            {/* Zoom Controls Bar */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-300 font-mono tabular-nums">Zoom: {Math.round(zoomScale * 100)}%</span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs bg-slate-950 border-slate-700 active:scale-[0.96] transition-transform min-h-[32px]"
                  onClick={() => setZoomScale((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))}
                  title="Dézoomer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs bg-slate-950 border-slate-700 font-semibold active:scale-[0.96] transition-transform min-h-[32px]"
                  onClick={handleFitToScreen}
                  title="Ajuster à la largeur de l'écran"
                >
                  Ajuster
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs bg-slate-950 border-slate-700 font-semibold active:scale-[0.96] transition-transform min-h-[32px]"
                  onClick={() => setZoomScale(2.0)}
                  title="Zoom 200%"
                >
                  2x
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs bg-slate-950 border-slate-700 active:scale-[0.96] transition-transform min-h-[32px]"
                  onClick={() => setZoomScale((z) => Math.min(3.5, Number((z + 0.2).toFixed(1))))}
                  title="Zoomer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleReset}
              className="h-9 text-xs border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950/60 mt-auto rounded-xl active:scale-[0.96] transition-transform min-h-[36px]"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Réinitialiser les 16 champs
            </Button>

          </div>

          {/* ── RIGHT PANEL: Workspace Canvas Overlay ───────────────────────── */}
          <div
            ref={rightPanelRef}
            className="flex-1 bg-slate-950 p-6 overflow-auto relative flex flex-col items-center justify-start select-none shadow-inner"
          >

            {/* Cursor position indicator & Status Bar */}
            <div className="sticky top-0 left-0 right-0 w-full mb-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-2xl text-xs font-mono text-slate-300 shadow-xl z-30 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-corp-blue-400 font-bold">
                  <Crosshair className="w-4 h-4" /> CURSEUR:
                </span>
                {cursorPos ? (
                  <span className="tabular-nums">X: <strong className="text-white">{cursorPos.x}</strong> px | Y: <strong className="text-white">{cursorPos.y}</strong> px</span>
                ) : (
                  <span className="text-slate-500 italic">Survolez le modèle 820 × 536 px</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  Champ actif: <strong className="text-amber-300 font-bold px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 rounded-lg flex-inline items-center gap-1">
                    {pixelMap[selectedField].label}
                    {pixelMap[selectedField].needsCalibration && (
                      <span className="text-amber-400 font-bold text-[10px] ml-1">[NEEDS CALIBRATION]</span>
                    )}
                  </strong>
                </span>
                <span className="text-slate-500 text-[11px] border-l border-slate-800 pl-3">
                  Affichage: <strong className="text-emerald-400 uppercase font-bold">{visibilityMode} ({visibleFields.length}/16)</strong>
                </span>
              </div>
            </div>

            {/* Canvas Scroll Outer Container */}
            <div className="relative flex flex-col items-center justify-center">

              {/* Pixel Ruler Top */}
              {showRulers && (
                <div
                  className="h-7 bg-slate-900 border border-slate-800 mb-1 relative font-mono text-[10px] text-slate-400 flex items-center overflow-hidden rounded-t-xl shadow-xs"
                  style={{ width: `${TEMPLATE_WIDTH_PX * zoomScale}px` }}
                >
                  {Array.from({ length: Math.ceil(TEMPLATE_WIDTH_PX / 50) + 1 }).map((_, i) => {
                    const px = i * 50;
                    return (
                      <div
                        key={px}
                        className="absolute bottom-0 border-l border-slate-700 pl-1 pb-0.5 tabular-nums"
                        style={{ left: `${px * zoomScale}px` }}
                      >
                        {px}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Image Canvas Box */}
              <div
                ref={canvasRef}
                onMouseMove={handleMouseMoveCanvas}
                onMouseLeave={() => setCursorPos(null)}
                onMouseUp={handleMouseUpCanvas}
                className="relative border-2 border-slate-700/80 rounded-b-2xl shadow-2xl overflow-hidden bg-black transition-all"
                style={{
                  width: `${TEMPLATE_WIDTH_PX * zoomScale}px`,
                  height: `${TEMPLATE_HEIGHT_PX * zoomScale}px`,
                }}
              >
                {/* 1. Background Scanned Template Image (820 x 536 px) */}
                <img
                  src="/assets/templates/traite_template_bg.png"
                  alt="Scanned Traite Template Reference (820x536)"
                  className="absolute top-0 left-0 pointer-events-none object-contain select-none"
                  style={{
                    width: `${TEMPLATE_WIDTH_PX * zoomScale}px`,
                    height: `${TEMPLATE_HEIGHT_PX * zoomScale}px`,
                  }}
                />

                {/* 2. Grid Overlay */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none opacity-30">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid50" width={50 * zoomScale} height={50 * zoomScale} patternUnits="userSpaceOnUse">
                          <path d={`M ${50 * zoomScale} 0 L 0 0 0 ${50 * zoomScale}`} fill="none" stroke="cyan" strokeWidth="0.8" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid50)" />
                    </svg>
                  </div>
                )}

                {/* 3. Render Visible Bounding Boxes */}
                {visibleFields.map((fieldKey) => {
                  const item = pixelMap[fieldKey];
                  const isSelected = fieldKey === selectedField;

                  const left = item.templateX * zoomScale;
                  const top = item.templateY * zoomScale;
                  const width = item.templateWidth * zoomScale;
                  const height = item.templateHeight * zoomScale;

                  return (
                    <div
                      key={fieldKey}
                      onClick={() => setSelectedField(fieldKey)}
                      onMouseDown={(e) => handleMouseDownOnField(e, fieldKey)}
                      className={`absolute cursor-move border transition-colors flex flex-col justify-between p-1 group antialiased ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-amber-400/30 z-20 shadow-2xl ring-2 ring-amber-400/60 rounded-md'
                          : item.needsCalibration
                          ? 'border-dashed border-amber-500 bg-amber-500/25 hover:bg-amber-500/35 z-15 rounded-sm'
                          : item.category === 'corps'
                          ? 'border-emerald-500/80 bg-emerald-500/20 hover:bg-emerald-500/30 z-10 rounded-sm'
                          : 'border-sky-500/80 bg-sky-500/20 hover:bg-sky-500/30 z-10 rounded-sm'
                      }`}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                      }}
                    >
                      {/* Box Header Label */}
                      <div className="flex items-center justify-between text-[10px] font-mono leading-none bg-slate-950/90 px-1.5 py-0.5 rounded-md text-white overflow-hidden pointer-events-none shadow-xs border border-white/10">
                        <span className="font-bold truncate text-amber-300 flex items-center gap-1">
                          {item.label}
                          {item.needsCalibration && (
                            <span className="text-[8px] bg-amber-500 text-slate-950 px-1 font-bold rounded">CALIBRATE</span>
                          )}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] text-slate-300 font-mono tabular-nums ml-1">
                            ({item.templateX},{item.templateY}) {item.templateWidth}×{item.templateHeight}
                          </span>
                        )}
                      </div>

                      {/* Sample Value Display */}
                      {showSampleText && (
                        <div className="text-[11px] font-mono font-bold text-emerald-200 truncate px-1 pointer-events-none drop-shadow-md tracking-tight">
                          {item.sampleValue}
                        </div>
                      )}

                      {/* Active Corner Handles */}
                      {isSelected && (
                        <>
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'nw')}
                            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-black rounded-xs cursor-nwse-resize z-30 shadow-md"
                          />
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'ne')}
                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-black rounded-xs cursor-nesw-resize z-30 shadow-md"
                          />
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'sw')}
                            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-black rounded-xs cursor-nesw-resize z-30 shadow-md"
                          />
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'se')}
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border border-black rounded-xs cursor-nwse-resize z-30 shadow-md"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
