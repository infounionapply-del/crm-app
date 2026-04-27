export type BlockType = 'header' | 'company_info' | 'customer_info' | 'table' | 'totals' | 'signature' | 'footer' | 'text' | 'image' | 'spacer';

export interface BlockStyle {
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  border?: string;
  borderRadius?: string;
}

export interface PdfBlock {
  id: string;
  type: BlockType;
  content: string; // HTML or Text content, with placeholders like {{customer_name}}
  styles: BlockStyle;
  data?: any; // For complex block configuration (e.g., column labels)
}

export interface PdfTemplateLayout {
  blocks: PdfBlock[];
}

export const DEFAULT_LAYOUT: PdfTemplateLayout = {
  blocks: [
    {
      id: 'header-1',
      type: 'header',
      content: 'QUOTATION',
      styles: {
        textAlign: 'right',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: '20px'
      }
    },
    {
      id: 'company-info-1',
      type: 'company_info',
      content: '',
      data: {
        name: '{{company_name}}',
        address: '{{company_address}}',
        tax: 'Tax ID: {{tax_id}}',
        logoUrl: '{{logo_url}}'
      },
      styles: {
        marginBottom: '20px'
      }
    },
    {
      id: 'customer-info-1',
      type: 'customer_info',
      content: '',
      data: {
        leftLabel: 'Bill To:',
        leftContent: '{{customer_name}}',
        rightLabel: 'Job Reference:',
        rightContent: '{{job_reference}}\nDoc No: {{quotation_number}}\nDate: {{date}}'
      },
      styles: {
        marginBottom: '20px'
      }
    },
    {
      id: 'table-1',
      type: 'table',
      content: '',
      styles: {
        marginBottom: '20px'
      }
    },
    {
      id: 'totals-1',
      type: 'totals',
      content: '',
      data: {
        subtotalLabel: 'Subtotal:',
        discountLabel: 'Discount:',
        vatLabel: 'VAT ({{vat_rate}}%):',
        grandTotalLabel: 'Grand Total:'
      },
      styles: {
        marginBottom: '30px'
      }
    },
    {
      id: 'signature-1',
      type: 'signature',
      content: '',
      data: {
        label: 'Authorized Signature'
      },
      styles: {
        marginTop: '40px'
      }
    },
    {
      id: 'footer-1',
      type: 'footer',
      content: '{{footer_notes}}',
      styles: {
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '20px'
      }
    }
  ]
};
