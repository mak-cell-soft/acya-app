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
  Maximize2,
  Minimize2,
  Move,
  RefreshCw,
  Save,
  Sliders,
  Check,
  Eye,
  Crosshair,
  FileCode,
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
  TEMPLATE_ASPECT_RATIO,
} from '@/lib/traite-coordinate-map';
import {
  exportPixelMapAsJSON,
  exportPixelMapAsTypeScript,
  templateToPhysical,
  validateAspectRatio,
} from '@/lib/traite-coordinate-converter';

interface TraiteCalibrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LOCAL_STORAGE_KEY = 'acya_traite_pixel_map_v2';
const FIELD_KEYS = Object.keys(INITIAL_TRAITE_PIXEL_MAP) as TraiteFieldKey[];

export function TraiteCalibrationDialog({
  isOpen,
  onClose,
}: TraiteCalibrationDialogProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pixelMap, setPixelMap] = useState<TraitePixelMap>(INITIAL_TRAITE_PIXEL_MAP);
  const [selectedField, setSelectedField] = useState<TraiteFieldKey>('signatureTire');
  const [zoomScale, setZoomScale] = useState<number>(1.2); // Default 120% for crisp inspector view
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showSampleText, setShowSampleText] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [gridStep, setGridStep] = useState<number>(10);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Physical dimension state (for real-time mm calculation)
  const [physicalWidthMm, setPhysicalWidthMm] = useState<number>(280);
  const [physicalHeightMm, setPhysicalHeightMm] = useState<number>(183);

  // Drag & Resize state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se'
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialFieldState, setInitialFieldState] = useState<FieldTemplateCoordinate | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Load saved map from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPixelMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error('Failed to load saved pixel map:', err);
    }
  }, []);

  // ── Save map to localStorage ──────────────────────────────────────────────
  const handleSaveToLocalStorage = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pixelMap));
      toast.success('Calibration enregistrée dans le navigateur avec succès.');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde de la calibration.');
    }
  };

  // ── Reset map ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (confirm('Voulez-vous réinitialiser toutes les coordonnées aux estimations initiales ?')) {
      setPixelMap(INITIAL_TRAITE_PIXEL_MAP);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast.info('Coordonnées réinitialisées.');
    }
  };

  // ── Current active field reference ────────────────────────────────────────
  const activeCoord = pixelMap[selectedField];

  // ── Update selected field coordinate ──────────────────────────────────────
  const updateActiveCoord = useCallback(
    (updates: Partial<FieldTemplateCoordinate>) => {
      setPixelMap((prev) => {
        const current = prev[selectedField];
        let nextX = updates.templateX !== undefined ? updates.templateX : current.templateX;
        let nextY = updates.templateY !== undefined ? updates.templateY : current.templateY;
        let nextW = updates.templateWidth !== undefined ? updates.templateWidth : current.templateWidth;
        let nextH = updates.templateHeight !== undefined ? updates.templateHeight : current.templateHeight;

        // Grid snapping logic if enabled
        if (snapToGrid) {
          nextX = Math.round(nextX / gridStep) * gridStep;
          nextY = Math.round(nextY / gridStep) * gridStep;
          nextW = Math.max(gridStep, Math.round(nextW / gridStep) * gridStep);
          nextH = Math.max(gridStep, Math.round(nextH / gridStep) * gridStep);
        }

        // Bound within canvas (0 to 820 px, 0 to 536 px)
        nextX = Math.max(0, Math.min(TEMPLATE_WIDTH_PX - 10, nextX));
        nextY = Math.max(0, Math.min(TEMPLATE_HEIGHT_PX - 10, nextY));
        nextW = Math.max(10, Math.min(TEMPLATE_WIDTH_PX - nextX, nextW));
        nextH = Math.max(8, Math.min(TEMPLATE_HEIGHT_PX - nextY, nextH));

        return {
          ...prev,
          [selectedField]: {
            ...current,
            ...updates,
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

  // ── Keyboard Navigation (Arrow Keys ±1px / Shift ±5px) ────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input element
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      const step = e.shiftKey ? 5 : 1;

      if (e.altKey) {
        // Resize mode with Alt + Arrows
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
        // Move mode with Arrows
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

  // ── Mouse Drag & Resize Handlers ──────────────────────────────────────────
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
    toast.success('Carte des coordonnées JSON copiée dans le presse-papier !');
  };

  const handleCopyTypeScript = () => {
    const tsStr = exportPixelMapAsTypeScript(pixelMap);
    navigator.clipboard.writeText(tsStr);
    toast.success('Code TypeScript copié dans le presse-papier !');
  };

  const handleDownloadJSON = () => {
    const jsonStr = exportPixelMapAsJSON(pixelMap);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traite_pixel_map_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Fichier JSON téléchargé.');
  };

  // ── Calculated Physical Coordinates ──────────────────────────────────────
  const physicalDimensions: PhysicalDimensions = {
    widthMm: physicalWidthMm,
    heightMm: physicalHeightMm,
  };
  const activePhysical = templateToPhysical(activeCoord, physicalDimensions);
  const aspectInfo = validateAspectRatio(physicalDimensions);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] w-[1400px] h-[92vh] max-h-[950px] p-0 overflow-hidden rounded-2xl flex flex-col bg-slate-900 border-slate-800 text-white">

        {/* ── Dialog Header ───────────────────────────────────────────────── */}
        <DialogHeader className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-corp-blue-600/20 text-corp-blue-400 rounded-xl border border-corp-blue-500/30">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                Inspecteur de Calibration Traite
                <Badge variant="outline" className="text-xs bg-corp-blue-950 text-corp-blue-300 border-corp-blue-700">
                  Ref: 820 × 536 px (1.52985)
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-medium">
                Visualisez et ajustez les 19 zones interactives sur le modèle d&apos;origine en pixels.
              </DialogDescription>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveToLocalStorage}
              className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 gap-1.5 rounded-lg"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              Sauvegarder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyJSON}
              className="h-8 text-xs bg-corp-blue-950/80 border-corp-blue-700/80 hover:bg-corp-blue-900 text-corp-blue-200 gap-1.5 rounded-lg"
            >
              <Copy className="w-3.5 h-3.5 text-corp-blue-400" />
              Exporter JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadJSON}
              className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 gap-1.5 rounded-lg"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Télécharger
            </Button>
          </div>
        </DialogHeader>

        {/* ── Main Dialog Content Area ────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT PANEL: Inspector Toolbar & Field Property Editor ──────── */}
          <div className="w-[380px] bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">

            {/* Section 1: Field Selector */}
            <div className="space-y-2 bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Champ Dynamique ({FIELD_KEYS.length})</span>
                <span className="text-[10px] text-corp-blue-400 font-mono font-normal">
                  Category: {activeCoord.category.toUpperCase()}
                </span>
              </Label>
              <Select value={selectedField} onValueChange={(v) => setSelectedField(v as TraiteFieldKey)}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-xs font-semibold text-white rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-64">
                  {FIELD_KEYS.map((key) => {
                    const item = pixelMap[key];
                    return (
                      <SelectItem key={key} value={key} className="text-xs font-medium focus:bg-slate-800 focus:text-white">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-semibold">{item.label}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({item.templateX},{item.templateY})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Section 2: Active Field Geometry Editor (Pixels) */}
            <fieldset className="border border-corp-blue-900/40 bg-corp-blue-950/20 rounded-xl p-3.5 space-y-3">
              <legend className="text-[10px] font-bold text-corp-blue-400 uppercase tracking-widest px-1">
                Géométrie Modèle (Pixels)
              </legend>

              <div className="grid grid-cols-2 gap-2.5">
                {/* templateX */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>X (Left)</span>
                    <span className="font-mono text-white">{activeCoord.templateX} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
                      onClick={() => updateActiveCoord({ templateX: activeCoord.templateX - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateX}
                      onChange={(e) => updateActiveCoord({ templateX: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-emerald-400"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
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
                    <span className="font-mono text-white">{activeCoord.templateY} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
                      onClick={() => updateActiveCoord({ templateY: activeCoord.templateY - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateY}
                      onChange={(e) => updateActiveCoord({ templateY: parseInt(e.target.value) || 0 })}
                      className="h-7 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-emerald-400"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
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
                    <span className="font-mono text-white">{activeCoord.templateWidth} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
                      onClick={() => updateActiveCoord({ templateWidth: activeCoord.templateWidth - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateWidth}
                      onChange={(e) => updateActiveCoord({ templateWidth: parseInt(e.target.value) || 10 })}
                      className="h-7 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-sky-400"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
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
                    <span className="font-mono text-white">{activeCoord.templateHeight} px</span>
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
                      onClick={() => updateActiveCoord({ templateHeight: activeCoord.templateHeight - 1 })}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={activeCoord.templateHeight}
                      onChange={(e) => updateActiveCoord({ templateHeight: parseInt(e.target.value) || 8 })}
                      className="h-7 text-xs bg-slate-950 border-slate-700 font-mono text-center px-1 text-sky-400"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 bg-slate-900 border-slate-700 text-slate-300 text-xs font-bold"
                      onClick={() => updateActiveCoord({ templateHeight: activeCoord.templateHeight + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Calculated Centers */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                <div>Center X: <span className="text-amber-300 font-bold">{activeCoord.templateX + Math.round(activeCoord.templateWidth / 2)} px</span></div>
                <div>Center Y: <span className="text-amber-300 font-bold">{activeCoord.templateY + Math.round(activeCoord.templateHeight / 2)} px</span></div>
              </div>
            </fieldset>

            {/* Section 3: Physical Dimensions Simulator (Converter) */}
            <fieldset className="border border-slate-800 bg-slate-900/60 rounded-xl p-3.5 space-y-3">
              <legend className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                Conversion en Millimètres Physique
              </legend>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-300">Largeur Papier (mm)</Label>
                  <Input
                    type="number"
                    value={physicalWidthMm}
                    onChange={(e) => setPhysicalWidthMm(parseFloat(e.target.value) || 280)}
                    className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-300">Hauteur Papier (mm)</Label>
                  <Input
                    type="number"
                    value={physicalHeightMm}
                    onChange={(e) => setPhysicalHeightMm(parseFloat(e.target.value) || 183)}
                    className="h-8 text-xs bg-slate-950 border-slate-700 font-mono text-center text-white"
                  />
                </div>
              </div>

              {/* Live Physical MM Position for Selected Field */}
              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1 font-mono">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Position Physique Calculée ({selectedField})
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[11px] text-slate-300">
                  <div>X: <span className="text-emerald-400 font-bold">{activePhysical.x} mm</span></div>
                  <div>Y: <span className="text-emerald-400 font-bold">{activePhysical.y} mm</span></div>
                  <div>W: <span className="text-sky-400 font-bold">{activePhysical.width} mm</span></div>
                  <div>H: <span className="text-sky-400 font-bold">{activePhysical.height} mm</span></div>
                </div>
              </div>

              {/* Aspect Ratio Validation Status */}
              <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-1">
                <span>Ratio Modèle: {aspectInfo.templateAspectRatio}</span>
                <span>Ratio Papier: {aspectInfo.physicalAspectRatio}</span>
              </div>
            </fieldset>

            {/* Section 4: Display & View Options */}
            <div className="border border-slate-800 bg-slate-900/40 rounded-xl p-3 space-y-2.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Options d&apos;Affichage
              </Label>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><Grid className="w-3.5 h-3.5 text-slate-400" /> Grille de référence</span>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-slate-400" /> Règle de pixels</span>
                <Switch checked={showRulers} onCheckedChange={setShowRulers} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><FileCode className="w-3.5 h-3.5 text-slate-400" /> Valeurs d&apos;exemple</span>
                <Switch checked={showSampleText} onCheckedChange={setShowSampleText} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-slate-400" /> Alignement sur grille</span>
                <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-xl">
              <span className="text-xs font-semibold text-slate-400">Zoom: {Math.round(zoomScale * 100)}%</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-slate-950 border-slate-700"
                  onClick={() => setZoomScale((z) => Math.max(0.8, z - 0.1))}
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-slate-950 border-slate-700"
                  onClick={() => setZoomScale(1.0)}
                >
                  100%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-slate-950 border-slate-700"
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.1))}
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleReset}
              className="h-8 text-xs border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950/50 mt-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Réinitialiser les estimations
            </Button>

          </div>

          {/* ── RIGHT PANEL: Interactive Canvas Overlay Inspector ────────────── */}
          <div className="flex-1 bg-slate-950 p-6 overflow-auto relative flex flex-col items-center justify-start select-none">

            {/* Cursor position indicator */}
            <div className="absolute top-3 left-4 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg text-xs font-mono text-slate-300 shadow-lg z-30 flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-corp-blue-400 font-bold">
                <Crosshair className="w-3.5 h-3.5" /> CURSEUR:
              </span>
              {cursorPos ? (
                <span>X: <strong className="text-white">{cursorPos.x}</strong> px | Y: <strong className="text-white">{cursorPos.y}</strong> px</span>
              ) : (
                <span className="text-slate-500">Survolez le modèle</span>
              )}
              <span className="text-slate-500 border-l border-slate-700 pl-3">
                Champ actif: <strong className="text-amber-400 font-semibold">{pixelMap[selectedField].label}</strong>
              </span>
            </div>

            {/* Keyboard shortcuts tip */}
            <div className="absolute top-3 right-4 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg text-[11px] font-mono text-slate-400 shadow-lg z-30">
              <span className="text-emerald-400 font-bold">Raccourcis:</span> Fleches = ±1px | Shift + Fleches = ±5px | Alt + Fleches = Redimensionner
            </div>

            {/* Canvas Scroll Outer Container */}
            <div className="mt-10 relative">

              {/* Pixel Ruler Top */}
              {showRulers && (
                <div
                  className="h-6 bg-slate-900 border border-slate-800 mb-1 relative font-mono text-[9px] text-slate-400 flex items-center overflow-hidden rounded-t-sm"
                  style={{ width: `${TEMPLATE_WIDTH_PX * zoomScale}px` }}
                >
                  {Array.from({ length: Math.ceil(TEMPLATE_WIDTH_PX / 50) + 1 }).map((_, i) => {
                    const px = i * 50;
                    return (
                      <div
                        key={px}
                        className="absolute bottom-0 border-l border-slate-700 pl-0.5 pb-0.5"
                        style={{ left: `${px * zoomScale}px` }}
                      >
                        {px}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Interactive Image Canvas Box */}
              <div
                ref={canvasRef}
                onMouseMove={handleMouseMoveCanvas}
                onMouseLeave={() => setCursorPos(null)}
                onMouseUp={handleMouseUpCanvas}
                className="relative border-2 border-slate-700 rounded-b-sm shadow-2xl overflow-hidden bg-black"
                style={{
                  width: `${TEMPLATE_WIDTH_PX * zoomScale}px`,
                  height: `${TEMPLATE_HEIGHT_PX * zoomScale}px`,
                }}
              >
                {/* 1. Background Scanned Template Image (Unstretched) */}
                <img
                  src="/assets/templates/traite_template_bg.png"
                  alt="Scanned Traite Template Reference"
                  className="absolute top-0 left-0 w-full h-full pointer-events-none object-contain"
                  style={{
                    width: `${TEMPLATE_WIDTH_PX * zoomScale}px`,
                    height: `${TEMPLATE_HEIGHT_PX * zoomScale}px`,
                  }}
                />

                {/* 2. Grid Overlay */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none opacity-25">
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

                {/* 3. Field Bounding Boxes (19 Interactive Fields) */}
                {(Object.keys(pixelMap) as TraiteFieldKey[]).map((fieldKey) => {
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
                      className={`absolute cursor-move border transition-colors flex flex-col justify-between p-0.5 group ${
                        isSelected
                          ? 'border-2 border-amber-400 bg-amber-400/20 z-20 shadow-lg ring-2 ring-amber-400/50'
                          : item.category === 'corps'
                          ? 'border-emerald-500/80 bg-emerald-500/10 hover:bg-emerald-500/20 z-10'
                          : 'border-sky-500/80 bg-sky-500/10 hover:bg-sky-500/20 z-10'
                      }`}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${width}px`,
                        height: `${height}px`,
                      }}
                    >
                      {/* Label & Pixel Box Header */}
                      <div className="flex items-center justify-between text-[9px] font-mono leading-none bg-slate-950/80 px-1 py-0.5 rounded text-white overflow-hidden pointer-events-none">
                        <span className="font-bold truncate text-[10px] text-amber-300">
                          {item.label}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] text-slate-300 font-mono">
                            {item.templateX},{item.templateY} ({item.templateWidth}x{item.templateHeight})
                          </span>
                        )}
                      </div>

                      {/* Sample Value Display */}
                      {showSampleText && (
                        <div className="text-[10px] font-mono font-bold text-emerald-200 truncate px-1 pointer-events-none drop-shadow">
                          {item.sampleValue}
                        </div>
                      )}

                      {/* Active Corner Resize Handles */}
                      {isSelected && (
                        <>
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'nw')}
                            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-400 border border-black cursor-nwse-resize z-30"
                          />
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'ne')}
                            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 border border-black cursor-nesw-resize z-30"
                          />
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'sw')}
                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-400 border border-black cursor-nesw-resize z-30"
                          />
                          <div
                            onMouseDown={(e) => handleMouseDownOnField(e, fieldKey, 'se')}
                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-400 border border-black cursor-nwse-resize z-30"
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
