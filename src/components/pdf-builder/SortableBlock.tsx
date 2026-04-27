import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PdfBlock } from './types';
import { GripVertical, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SortableBlockProps {
  block: PdfBlock;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  defaultLogoUrl?: string;
  isFirstSticky?: boolean;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({ 
  block, 
  isActive, 
  onSelect, 
  onDelete, 
  defaultLogoUrl,
  isFirstSticky 
}) => {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isFirstSticky ? { marginTop: 'auto' } : {})
  };

  const renderContent = () => {
    switch (block.type) {
      case 'header':
        const logoAlign = block.data?.logoAlignment || 'left';
        const textAlign = block.styles?.textAlign || 'right';
        
        const renderLogo = () => {
          const logoUrl = block.data?.logoUrl && block.data.logoUrl !== '' && block.data.logoUrl !== '{{logo_url}}' 
            ? block.data.logoUrl 
            : 'https://placehold.co/200x80/f3f4f6/4b5563?text=LOGO';
          return (
            <img 
              src={logoUrl} 
              alt="Logo" 
              style={{ height: `${block.data?.logoHeight || 64}px`, objectFit: 'contain', marginBottom: '8px' }} 
            />
          );
        };
        const renderText = () => (
          <h2 style={{ margin: 0, fontSize: 'inherit', color: 'inherit', fontWeight: 'inherit', whiteSpace: 'pre-wrap' }}>{block.content || 'Header Text'}</h2>
        );

        return (
          <div style={{ ...block.styles, display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {logoAlign === 'left' && renderLogo()}
              {textAlign === 'left' && renderText()}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {logoAlign === 'center' && renderLogo()}
              {textAlign === 'center' && renderText()}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {logoAlign === 'right' && renderLogo()}
              {textAlign === 'right' && renderText()}
            </div>
          </div>
        );
      case 'text':
        return <p style={block.styles}>{block.content || 'Custom text content...'}</p>;
      case 'company_info':
        let companyLogoUrl = defaultLogoUrl || 'https://placehold.co/200x80/f3f4f6/4b5563?text=COMPANY+LOGO';
        if (block.data?.logoUrl && block.data.logoUrl !== '' && block.data.logoUrl !== '{{logo_url}}') {
          companyLogoUrl = block.data.logoUrl;
        }
        
        return (
          <div style={{ ...block.styles, display: 'flex', gap: '20px', alignItems: 'start' }}>
            {/* Column 1: Main Info */}
            <div style={{ flex: 1.5, textAlign: block.data?.mainInfoAlignment || 'left' }}>
              <h3 className="font-bold mb-1" style={{ fontSize: block.data?.nameFontSize || '18px' }}>{block.data?.name || '{{company_name}}'}</h3>
              <p className="text-gray-600 whitespace-pre-wrap mb-1" style={{ fontSize: block.data?.addressFontSize || '12px' }}>{block.data?.address || '{{company_address}}'}</p>
              {block.data?.tax && <p className="font-bold" style={{ fontSize: block.data?.taxFontSize || '12px' }}>{block.data.tax}</p>}
            </div>
            {/* Column 2: Logo */}
            <div style={{ flex: 1, textAlign: block.data?.logoAlignment || 'left' }}>
              <img 
                src={companyLogoUrl} 
                alt="Company Logo" 
                style={{ height: `${block.data?.logoHeight || 64}px`, objectFit: 'contain' }} 
              />
            </div>
            {/* Column 3: Extra Details */}
            <div style={{ flex: 1.5, textAlign: block.data?.extraContentAlignment || 'right' }}>
              {block.data?.extraHeader && <h4 className="font-bold mb-1" style={{ fontSize: block.data?.extraHeaderFontSize || '14px' }}>{block.data.extraHeader}</h4>}
              {block.data?.content && <p className="text-gray-600 whitespace-pre-wrap" style={{ fontSize: block.data?.contentFontSize || '12px' }}>{block.data.content}</p>}
            </div>
          </div>
        );
      case 'customer_info':
        return (
          <div style={{ ...block.styles, display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '15px', backgroundColor: '#f9fafb', borderRight: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: `calc(${block.styles.fontSize || '14px'} - 2px)`, fontWeight: 'bold', margin: '0 0 8px 0', color: '#4b5563' }}>{block.data?.leftLabel || 'Bill To:'}</h3>
              <p style={{ fontSize: block.styles.fontSize || '14px', fontWeight: 'normal', margin: '0' }} className="whitespace-pre-wrap">{block.data?.leftContent || '{{customer_name}}'}</p>
            </div>
            <div style={{ flex: 1, padding: '15px', backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: `calc(${block.styles.fontSize || '14px'} - 2px)`, fontWeight: 'bold', margin: '0 0 8px 0', color: '#4b5563' }}>{block.data?.rightLabel || 'Job Reference:'}</h3>
              <p style={{ fontSize: block.styles.fontSize || '14px', margin: 0 }} className="whitespace-pre-wrap">{block.data?.rightContent || '{{job_reference}}'}</p>
            </div>
          </div>
        );
      case 'table':
        return (
          <div style={block.styles}>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#10b981', color: 'white' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 8px' }}>Example Product 1</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>2</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>฿1,500.00</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>฿3,000.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case 'totals':
        return (
          <div style={{ ...block.styles, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, paddingRight: '20px', paddingBottom: '12px' }}>
              {block.data?.showThaiBaht && (
                 <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 'bold', color: block.styles.color || '#4b5563', fontSize: '14px' }}>{`({{grand_total_thb}})`}</p>
              )}
            </div>
            <table style={{ width: '350px', borderCollapse: 'collapse', fontSize: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: '#4b5563' }}>{block.data?.subtotalLabel || 'Subtotal:'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', width: '40%' }}>{'{{subtotal}}'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: '#4b5563' }}>{block.data?.discountLabel || 'Discount:'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444' }}>-{'{{discount}}'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: '#4b5563' }}>{block.data?.vatLabel || 'VAT (7%):'}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{'{{vat_amount}}'}</td>
                </tr>
                <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #10b981', borderBottom: '2px solid #10b981' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', fontSize: '16px', textAlign: 'right', color: '#10b981' }}>{block.data?.grandTotalLabel || 'Grand Total:'}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', fontSize: '16px', textAlign: 'right', color: '#10b981' }}>{'{{grand_total}}'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case 'signature':
        const sigs = block.data?.signatures || [{ title: block.data?.label || 'Authorized Signature', labelType: 'custom', label: '', showDate: false, dateType: 'blank' }];
        return (
          <div style={{ ...block.styles, display: 'flex', justifyContent: sigs.length === 1 ? 'flex-end' : 'space-between', gap: '40px', flexWrap: 'wrap' }}>
            {sigs.map((sig: any, index: number) => {
              const nameLabel = sig.labelType === 'sales_name' ? '{{sales_name}}' : sig.labelType === 'manager_name' ? '{{manager_name}}' : sig.labelType !== undefined ? sig.label : '';
              const title = sig.title || sig.label || 'Authorized Signature';
              
              return (
              <div key={index} style={{ flexBasis: 'calc(33.333% - 27px)', minWidth: '150px', maxWidth: '250px', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ borderBottom: '1px solid #000', height: '40px', marginBottom: '5px' }}></div>
                <p style={{ fontSize: '12px', margin: '0 0 2px 0' }}>{nameLabel ? `( ${nameLabel} )` : '( ........................................ )'}</p>
                <p style={{ fontSize: '12px', margin: 0, fontWeight: 'bold' }}>{title}</p>
                {sig.showDate && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginTop: '15px', height: '14px' }}>
                    <span style={{ fontSize: '12px', marginRight: '5px', lineHeight: '1' }}>Date:</span>
                    {sig.dateType === 'system' ? (
                      <span style={{ fontSize: '12px', lineHeight: '1' }}>{'{{date}}'}</span>
                    ) : (
                      <div style={{ borderBottom: '1px dotted #000', width: '120px' }}></div>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        );
      case 'footer':
        return <p style={block.styles}>{block.content || 'Footer notes...'}</p>;
      case 'image':
        return (
          <div style={block.styles}>
            {block.data?.url ? (
              <img src={block.data.url} alt="Custom Image" style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: block.styles.textAlign === 'center' ? '0 auto' : block.styles.textAlign === 'right' ? '0 0 0 auto' : '0' }} />
            ) : (
              <div style={{ padding: '20px', backgroundColor: '#f3f4f6', textAlign: 'center', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '8px' }}>Image Placeholder</div>
            )}
          </div>
        );
      case 'spacer':
        return <div style={{ ...block.styles, height: block.styles.height || '40px' }} />;
      default:
        return <div style={block.styles}>{block.content}</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:ring-1 hover:ring-outline-variant'} rounded-lg mb-2 cursor-pointer transition-colors`}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute left-[-24px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab p-1 text-outline hover:text-primary transition-opacity"
      >
        <GripVertical size={16} />
      </div>
      
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded shadow-sm transition-all"
          title={t('action.delete_block')}
        >
          <Trash2 size={14} /> ลบ
        </button>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-sm">
        {renderContent()}
      </div>
    </div>
  );
};
