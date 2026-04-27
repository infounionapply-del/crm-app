import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { X, Save, Eye, Plus, ArrowLeft, ArrowRight, Type, Image as ImageIcon, LayoutTemplate, BoxSelect, Square, Baseline, Building, Users, PenTool as Signature, Trash2 } from 'lucide-react';
import { PdfTemplateLayout, PdfBlock, BlockType, DEFAULT_LAYOUT } from './types';
import { SortableBlock } from './SortableBlock';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface PdfBuilderProps {
  initialLayout?: PdfTemplateLayout;
  onSave: (layout: PdfTemplateLayout) => void;
  onClose: () => void;
}

export const PdfBuilder: React.FC<PdfBuilderProps> = ({ initialLayout, onSave, onClose }) => {
  const { settings } = useData();
  const { t } = useLanguage();
  const [blocks, setBlocks] = useState<PdfBlock[]>(
    initialLayout?.blocks?.length ? initialLayout.blocks : DEFAULT_LAYOUT.blocks
  );
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // History for Undo/Redo
  const [history, setHistory] = useState<PdfBlock[][]>([blocks]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveToHistory = (newBlocks: PdfBlock[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setBlocks(newBlocks);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks(history[historyIndex + 1]);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      const newBlocks = arrayMove(blocks, oldIndex, newIndex) as PdfBlock[];
      saveToHistory(newBlocks);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: PdfBlock = {
      id: `${type}-${Date.now()}`,
      type,
      content: type === 'text' ? 'New Text Block' : '',
      styles: {
        marginBottom: '20px',
        textAlign: type === 'header' ? 'center' : 'left',
        fontSize: type === 'header' ? '24px' : '14px',
      }
    };
    saveToHistory([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const updateActiveBlock = (updates: Partial<PdfBlock>) => {
    if (!activeBlockId) return;
    const newBlocks = blocks.map(b => b.id === activeBlockId ? { ...b, ...updates } : b);
    saveToHistory(newBlocks);
  };

  const updateActiveStyle = (styleKey: string, value: string) => {
    if (!activeBlockId) return;
    const newBlocks = blocks.map(b => {
      if (b.id === activeBlockId) {
        return { ...b, styles: { ...b.styles, [styleKey]: value } };
      }
      return b;
    });
    saveToHistory(newBlocks);
  };

  const deleteBlock = (id: string) => {
    saveToHistory(blocks.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="h-16 border-b ghost-border bg-surface-container-lowest flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <X size={20} className="text-outline" />
          </button>
          <h1 className="font-bold text-lg text-on-surface">PDF Template Builder</h1>
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md uppercase">Draft</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border-r pr-4 border-outline-variant">
            <button 
              onClick={undo} 
              disabled={historyIndex === 0}
              className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50 transition-colors"
              title={t('action.undo')}
            >
              <ArrowLeft size={18} />
            </button>
            <button 
              onClick={redo} 
              disabled={historyIndex === history.length - 1}
              className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50 transition-colors"
              title={t('action.redo')}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-xl font-medium transition-colors"
          >
            <Eye size={18} /> Preview
          </button>
          <button 
            onClick={() => onSave({ blocks })}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Save size={18} /> Save Layout
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Components */}
        <div className="w-64 border-r ghost-border bg-surface-container-lowest overflow-y-auto p-4 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-outline uppercase tracking-wider mb-2">Components</h2>
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => addBlock('header')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Baseline size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Header</span>
            </button>
            <button onClick={() => addBlock('text')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Type size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Text</span>
            </button>
            <button onClick={() => addBlock('company_info')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Building size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Company Info</span>
            </button>
            <button onClick={() => addBlock('customer_info')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Users size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Bill To</span>
            </button>
            <button onClick={() => addBlock('table')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <LayoutTemplate size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Items Table</span>
            </button>
            <button onClick={() => addBlock('totals')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <BoxSelect size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Totals</span>
            </button>
            <button onClick={() => addBlock('signature')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Signature size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Signature</span>
            </button>
            <button onClick={() => addBlock('footer')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Baseline size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Footer</span>
            </button>
            <button onClick={() => addBlock('image')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <ImageIcon size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Image</span>
            </button>
            <button onClick={() => addBlock('spacer')} className="flex flex-col items-center gap-2 p-3 border ghost-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors group">
              <Square size={20} className="text-outline group-hover:text-primary" />
              <span className="text-xs font-medium text-on-surface">Spacer</span>
            </button>
          </div>
        </div>

        {/* Center: A4 Canvas */}
        <div className="flex-1 bg-surface-container overflow-y-auto p-8 flex justify-center items-start">
          <div 
            className="bg-white shadow-lg rounded-sm"
            style={{ 
              width: '794px', 
              minHeight: '1123px',
              padding: '40px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={() => setActiveBlockId(null)}
          >
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block, index) => {
                  const isSticky = block.data?.stickyBottom;
                  const prevIsSticky = index > 0 ? blocks[index - 1].data?.stickyBottom : false;
                  const isFirstSticky = isSticky && !prevIsSticky;

                  return (
                    <SortableBlock 
                      key={block.id}
                      block={block}
                      isActive={activeBlockId === block.id}
                      onSelect={setActiveBlockId}
                      onDelete={deleteBlock}
                      defaultLogoUrl={settings?.logoUrl}
                      isFirstSticky={isFirstSticky}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
            {blocks.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-outline gap-4">
                <LayoutTemplate size={48} className="opacity-50" />
                <p>Drag components here to build your PDF layout.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Properties */}
        <div className="w-80 border-l ghost-border bg-surface-container-lowest overflow-y-auto p-6">
          <h2 className="text-sm font-bold text-outline uppercase tracking-wider mb-6">Properties</h2>
          
          {activeBlock ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">Block Type</label>
                <div className="px-3 py-2 bg-surface-container rounded-lg text-sm font-mono text-outline-variant capitalize">
                  {activeBlock.type.replace('_', ' ')}
                </div>
              </div>

              {(activeBlock.type === 'header' || activeBlock.type === 'text' || activeBlock.type === 'footer') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Content</label>
                    <textarea 
                      value={activeBlock.content}
                      onChange={(e) => updateActiveBlock({ content: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                      placeholder="Enter text..."
                    />
                  </div>
                  {activeBlock.type === 'header' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Logo URL (Optional)</label>
                        <input 
                          type="text" 
                          value={activeBlock.data?.logoUrl || ''} 
                          onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, logoUrl: e.target.value } })} 
                          placeholder="{{logo_url}} or https://..." 
                          className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none mb-4" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Logo Alignment</label>
                        <div className="flex gap-2">
                          {['left', 'center', 'right'].map((align) => (
                            <button
                              key={`logo-${align}`}
                              onClick={() => updateActiveBlock({ data: { ...activeBlock.data, logoAlignment: align } })}
                              className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                                (activeBlock.data?.logoAlignment || 'left') === align 
                                  ? 'bg-primary text-on-primary' 
                                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                              }`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Logo Height (px)</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range" 
                            min="20" 
                            max="200" 
                            value={activeBlock.data?.logoHeight || 64} 
                            onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, logoHeight: parseInt(e.target.value) } })}
                            className="flex-1 accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
                          />
                          <span className="text-xs font-mono w-8 text-right">{activeBlock.data?.logoHeight || 64}px</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeBlock.type === 'company_info' && (
                <div className="space-y-6">
                  {/* Column 1: Logo */}
                  <div className="p-3 bg-surface-container rounded-lg border ghost-border">
                    <h3 className="text-xs font-bold text-outline uppercase mb-3">Column 1: Logo</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Logo URL</label>
                        <input type="text" value={activeBlock.data?.logoUrl || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, logoUrl: e.target.value } })} placeholder="{{logo_url}}" className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-on-surface mb-2">Logo Height (px)</label>
                          <input type="number" value={activeBlock.data?.logoHeight || 64} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, logoHeight: parseInt(e.target.value) } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-on-surface mb-2">Alignment</label>
                          <div className="flex bg-surface p-1 rounded-lg border ghost-border">
                            {['left', 'center', 'right'].map((align) => (
                              <button key={align} onClick={() => updateActiveBlock({ data: { ...activeBlock.data, logoAlignment: align } })} className={`flex-1 py-1 rounded text-xs ${(activeBlock.data?.logoAlignment || 'left') === align ? 'bg-primary text-white' : ''}`}>{align}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Main Info */}
                  <div className="p-3 bg-surface-container rounded-lg border ghost-border">
                    <h3 className="text-xs font-bold text-outline uppercase mb-3">Column 2: Main Info</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Company Name</label>
                        <div className="flex gap-2">
                          <input type="text" value={activeBlock.data?.name || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, name: e.target.value } })} className="flex-1 px-3 py-2 bg-surface border ghost-border rounded-lg text-sm" />
                          <input type="text" value={activeBlock.data?.nameFontSize || '18px'} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, nameFontSize: e.target.value } })} className="w-16 px-2 py-2 bg-surface border ghost-border rounded-lg text-sm" placeholder="18px" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Address</label>
                        <div className="flex gap-2">
                          <textarea value={activeBlock.data?.address || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, address: e.target.value } })} className="flex-1 px-3 py-2 bg-surface border ghost-border rounded-lg text-sm min-h-[60px]" />
                          <input type="text" value={activeBlock.data?.addressFontSize || '12px'} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, addressFontSize: e.target.value } })} className="w-16 px-2 py-2 bg-surface border ghost-border rounded-lg text-sm h-10" placeholder="12px" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Tax ID</label>
                        <div className="flex gap-2">
                          <input type="text" value={activeBlock.data?.tax || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, tax: e.target.value } })} className="flex-1 px-3 py-2 bg-surface border ghost-border rounded-lg text-sm" placeholder="Tax ID: ..." />
                          <input type="text" value={activeBlock.data?.taxFontSize || '12px'} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, taxFontSize: e.target.value } })} className="w-16 px-2 py-2 bg-surface border ghost-border rounded-lg text-sm" placeholder="12px" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Alignment</label>
                        <div className="flex bg-surface p-1 rounded-lg border ghost-border">
                          {['left', 'center', 'right'].map((align) => (
                            <button key={align} onClick={() => updateActiveBlock({ data: { ...activeBlock.data, mainInfoAlignment: align } })} className={`flex-1 py-1 rounded text-xs ${(activeBlock.data?.mainInfoAlignment || 'left') === align ? 'bg-primary text-white' : ''}`}>{align}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Extra Content */}
                  <div className="p-3 bg-surface-container rounded-lg border ghost-border">
                    <h3 className="text-xs font-bold text-outline uppercase mb-3">Column 3: Extra Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Header</label>
                        <div className="flex gap-2">
                          <input type="text" value={activeBlock.data?.extraHeader || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, extraHeader: e.target.value } })} className="flex-1 px-3 py-2 bg-surface border ghost-border rounded-lg text-sm" />
                          <input type="text" value={activeBlock.data?.extraHeaderFontSize || '14px'} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, extraHeaderFontSize: e.target.value } })} className="w-16 px-2 py-2 bg-surface border ghost-border rounded-lg text-sm" placeholder="14px" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Content</label>
                        <div className="flex gap-2">
                          <textarea value={activeBlock.data?.content || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, content: e.target.value } })} className="flex-1 px-3 py-2 bg-surface border ghost-border rounded-lg text-sm min-h-[80px]" />
                          <input type="text" value={activeBlock.data?.contentFontSize || '12px'} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, contentFontSize: e.target.value } })} className="w-16 px-2 py-2 bg-surface border ghost-border rounded-lg text-sm h-10" placeholder="12px" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-2">Alignment</label>
                        <div className="flex bg-surface p-1 rounded-lg border ghost-border">
                          {['left', 'center', 'right'].map((align) => (
                            <button key={align} onClick={() => updateActiveBlock({ data: { ...activeBlock.data, extraContentAlignment: align } })} className={`flex-1 py-1 rounded text-xs ${(activeBlock.data?.extraContentAlignment || 'right') === align ? 'bg-primary text-white' : ''}`}>{align}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeBlock.type === 'customer_info' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Left Column Label</label>
                    <input type="text" value={activeBlock.data?.leftLabel || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, leftLabel: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Left Column Content</label>
                    <textarea value={activeBlock.data?.leftContent || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, leftContent: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-h-[60px]" />
                  </div>
                  <div className="pt-2 border-t ghost-border"></div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Right Column Label</label>
                    <input type="text" value={activeBlock.data?.rightLabel || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, rightLabel: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Right Column Content</label>
                    <textarea value={activeBlock.data?.rightContent || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, rightContent: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-h-[60px]" />
                  </div>
                </>
              )}

              {activeBlock.type === 'totals' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Subtotal Label</label>
                    <input type="text" value={activeBlock.data?.subtotalLabel || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, subtotalLabel: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Discount Label</label>
                    <input type="text" value={activeBlock.data?.discountLabel || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, discountLabel: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">VAT Label</label>
                    <input type="text" value={activeBlock.data?.vatLabel || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, vatLabel: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Grand Total Label</label>
                    <input type="text" value={activeBlock.data?.grandTotalLabel || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, grandTotalLabel: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Grand Total:" />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input 
                        type="checkbox" 
                        checked={activeBlock.data?.showThaiBaht || false} 
                        onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, showThaiBaht: e.target.checked } })} 
                        className="rounded text-primary focus:ring-primary" 
                      />
                      <span className="text-sm font-medium text-on-surface">Show Thai Baht Text</span>
                    </label>
                  </div>
                </>
              )}

              {activeBlock.type === 'signature' && (
                <div className="space-y-4">
                  {(activeBlock.data?.signatures || [{ label: activeBlock.data?.label || 'Authorized Signature', showDate: false, dateType: 'blank' }]).map((sig: any, index: number) => (
                    <div key={index} className="p-3 border ghost-border rounded-lg bg-surface-container-lowest relative group">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-on-surface">Signature {index + 1}</label>
                        <button 
                          onClick={() => {
                            const newSigs = [...(activeBlock.data?.signatures || [{ label: activeBlock.data?.label || 'Authorized Signature', showDate: false, dateType: 'blank' }])];
                            newSigs.splice(index, 1);
                            updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                          }}
                          className="text-error hover:bg-error/10 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-on-surface-variant mb-1">Title (Role)</label>
                          <input type="text" value={sig.title !== undefined ? sig.title : (sig.label || '')} onChange={(e) => {
                            const newSigs = [...(activeBlock.data?.signatures || [])];
                            if(!newSigs[index]) newSigs[index] = {};
                            newSigs[index] = { ...newSigs[index], title: e.target.value, label: newSigs[index].label || '' };
                            updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                          }} className="w-full px-3 py-1.5 mb-3 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Authorized Signature" />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-on-surface-variant mb-1">Name (Signer)</label>
                          <select 
                            value={sig.labelType || 'custom'} 
                            onChange={(e) => {
                              const newSigs = [...(activeBlock.data?.signatures || [])];
                              if(!newSigs[index]) newSigs[index] = {};
                              newSigs[index] = { ...newSigs[index], labelType: e.target.value };
                              updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                            }}
                            className="w-full px-3 py-1.5 mb-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                          >
                            <option value="custom">Custom Text / Blank</option>
                            <option value="sales_name">Sales Name (System)</option>
                            <option value="manager_name">Manager Name (System)</option>
                          </select>
                          
                          {(sig.labelType === 'custom' || !sig.labelType) && (
                            <input type="text" value={sig.labelType !== undefined ? sig.label : ''} onChange={(e) => {
                              const newSigs = [...(activeBlock.data?.signatures || [])];
                              if(!newSigs[index]) newSigs[index] = {};
                              newSigs[index] = { ...newSigs[index], label: e.target.value };
                              updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                            }} className="w-full px-3 py-1.5 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Leave blank for empty line" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={sig.showDate} onChange={(e) => {
                              const newSigs = [...(activeBlock.data?.signatures || [{ label: activeBlock.data?.label || 'Authorized Signature', showDate: false, dateType: 'blank' }])];
                              newSigs[index] = { ...newSigs[index], showDate: e.target.checked };
                              updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                            }} className="rounded text-primary focus:ring-primary" />
                            <span className="text-xs text-on-surface-variant">Include Date</span>
                          </label>
                          {sig.showDate && (
                            <select 
                              value={sig.dateType || 'blank'} 
                              onChange={(e) => {
                                const newSigs = [...(activeBlock.data?.signatures || [{ label: activeBlock.data?.label || 'Authorized Signature', showDate: false, dateType: 'blank' }])];
                                newSigs[index] = { ...newSigs[index], dateType: e.target.value };
                                updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                              }}
                              className="px-2 py-1 bg-surface border ghost-border rounded text-xs outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="blank">Blank Line</option>
                              <option value="system">System Date</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newSigs = [...(activeBlock.data?.signatures || [{ label: activeBlock.data?.label || 'Authorized Signature', showDate: false, dateType: 'blank' }]), { label: 'New Signature', showDate: true, dateType: 'blank' }];
                      updateActiveBlock({ data: { ...activeBlock.data, signatures: newSigs } });
                    }}
                    className="w-full py-2 flex justify-center items-center gap-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors border border-dashed border-primary/30"
                  >
                    <Plus size={16} /> Add Signature
                  </button>
                </div>
              )}

              {activeBlock.type === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Image URL</label>
                  <input type="text" value={activeBlock.data?.url || ''} onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, url: e.target.value } })} className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="https://..." />
                </div>
              )}

              {activeBlock.type === 'spacer' && (
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">Height (px)</label>
                  <input 
                    type="text"
                    value={activeBlock.styles.height || '40px'}
                    onChange={(e) => updateActiveStyle('height', e.target.value)}
                    className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="e.g. 40px"
                  />
                </div>
              )}

              {activeBlock.type !== 'spacer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Text Alignment</label>
                    <div className="flex gap-2">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          onClick={() => updateActiveStyle('textAlign', align)}
                          className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                            activeBlock.styles.textAlign === align 
                              ? 'bg-primary text-on-primary' 
                              : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color"
                        value={activeBlock.styles.color || '#000000'}
                        onChange={(e) => updateActiveStyle('color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                      />
                      <input 
                        type="text"
                        value={activeBlock.styles.color || '#000000'}
                        onChange={(e) => updateActiveStyle('color', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Font Size</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="8" 
                        max="72" 
                        value={parseInt(activeBlock.styles.fontSize || '14')} 
                        onChange={(e) => updateActiveStyle('fontSize', `${e.target.value}px`)}
                        className="flex-1 accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-mono w-10 text-right">{activeBlock.styles.fontSize || '14px'}</span>
                    </div>
                    <input 
                      type="text"
                      value={activeBlock.styles.fontSize || '14px'}
                      onChange={(e) => updateActiveStyle('fontSize', e.target.value)}
                      className="w-full mt-2 px-3 py-1.5 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="e.g. 14px"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-6 p-2 bg-surface border ghost-border rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={activeBlock.data?.stickyBottom || false} 
                        onChange={(e) => updateActiveBlock({ data: { ...activeBlock.data, stickyBottom: e.target.checked } })} 
                        className="rounded text-primary focus:ring-primary" 
                      />
                      <span className="text-sm font-bold text-primary">Stick to bottom of page</span>
                    </label>
                    <label className="block text-sm font-medium text-on-surface mb-2">Margin Bottom</label>
                    <input 
                      type="text"
                      value={activeBlock.styles.marginBottom || '0px'}
                      onChange={(e) => updateActiveStyle('marginBottom', e.target.value)}
                      className="w-full px-3 py-2 bg-surface border ghost-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="e.g. 20px"
                    />
                  </div>
                </>
              )}
              
              <div className="pt-6 border-t ghost-border mt-6">
                <button 
                  onClick={() => deleteBlock(activeBlock.id)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 bg-error/10 text-error hover:bg-error hover:text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Trash2 size={18} /> Delete Component
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-outline text-center">
              <BoxSelect size={48} className="opacity-30 mb-4" />
              <p className="text-sm">Select a block on the canvas to edit its properties.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
