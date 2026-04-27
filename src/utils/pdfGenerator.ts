import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const THBText = (amount: number): string => {
  if (isNaN(amount) || amount === null) return '';
  const numStr = Math.abs(amount).toFixed(2);
  const [bahtStr, satangStr] = numStr.split('.');
  
  const text = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const unit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  const convertToText = (str: string) => {
    if (str === '0' || str === '00') return '';
    let res = '';
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(str[i]);
      const pos = len - i - 1;
      if (digit === 0) continue;
      if (pos % 6 === 1 && digit === 1) res += 'สิบ';
      else if (pos % 6 === 1 && digit === 2) res += 'ยี่สิบ';
      else if (pos % 6 === 0 && digit === 1 && i > 0 && parseInt(str[i-1]) !== 0) res += 'เอ็ด';
      else res += text[digit] + unit[pos % 6];
      if (pos > 0 && pos % 6 === 0) res += 'ล้าน';
    }
    return res;
  };
  
  const bahtText = convertToText(bahtStr);
  const satangText = convertToText(satangStr);
  
  let result = amount < 0 ? 'ลบ' : '';
  if (bahtText === '' && satangText === '') return 'ศูนย์บาทถ้วน';
  
  if (bahtText) result += bahtText + 'บาท';
  if (satangText) result += satangText + 'สตางค์';
  else result += 'ถ้วน';
  
  return result;
};

const createHtmlContainer = (content: string) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.minHeight = '1123px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = '"Sarabun", "Kanit", "Prompt", "Helvetica", sans-serif'; 
  container.style.color = '#1f2937';
  container.innerHTML = content;
  document.body.appendChild(container);
  return container;
};

const generatePdfFromContainer = async (container: HTMLElement, filename: string, action: 'preview' | 'download' | 'generate') => {
  try {
    // Wait for all images to load
    const images = container.getElementsByTagName('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue anyway if image fails
      });
    });
    await Promise.all(imagePromises);
    // Extra wait for fonts/rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    // Pad container height to next full page multiple to push sticky blocks to the bottom
    const PAGE_HEIGHT_PX = 1123;
    const currentHeight = container.offsetHeight;
    const totalPages = Math.ceil(currentHeight / PAGE_HEIGHT_PX);
    container.style.height = `${totalPages * PAGE_HEIGHT_PX}px`;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });
    
    document.body.removeChild(container);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasPageHeight = (canvas.width * pdfHeight) / pdfWidth;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      
      const sourceY = i * canvasPageHeight;
      const canvasPage = document.createElement('canvas');
      canvasPage.width = canvas.width;
      canvasPage.height = canvasPageHeight;
      
      const ctx = canvasPage.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas, 
          0, sourceY, canvas.width, canvasPageHeight, 
          0, 0, canvas.width, canvasPageHeight
        );
        const pageData = canvasPage.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
    }

    if (action === 'download') {
      pdf.save(filename);
    } else if (action === 'preview') {
      const blobUrl = pdf.output('bloburl');
      const newWindow = window.open(blobUrl, '_blank');
      // Fallback for mobile/strict popup blockers
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.download = filename; // Try to download if we can't preview
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    const blob = pdf.output('blob');
    return {
      blob,
      filename,
      fileLink: `https://storage.crm-engine.com/docs/${filename}`
    };
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw err;
  }
};

const styleObjectToString = (style: any) => {
  if (!style) return '';
  return Object.keys(style).map(key => {
    const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    return `${kebabKey}: ${style[key]};`;
  }).join(' ');
};

const replaceVars = (text: string, vars: any) => {
  if (!text) return '';
  return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
    return vars[key.trim()] !== undefined ? vars[key.trim()] : match;
  });
};

const buildHtmlFromLayout = (layout: any, vars: any, tableRowsHtml: string) => {
  if (!layout || !layout.blocks || layout.blocks.length === 0) return '';
  
  const blocksHtml = layout.blocks.map((block: any, index: number) => {
    let styleStr = styleObjectToString(block.styles);
    
    // Only apply margin-top: auto to the FIRST block in a sticky sequence
    const isSticky = block.data?.stickyBottom;
    const prevIsSticky = index > 0 ? layout.blocks[index - 1].data?.stickyBottom : false;
    if (isSticky && !prevIsSticky) {
      styleStr += ' margin-top: auto;';
    }
    
    const content = replaceVars(block.content || '', vars);

    switch (block.type) {
      case 'header':
        const headerLogoUrl = block.data?.logoUrl && block.data.logoUrl !== '' && block.data.logoUrl !== '{{logo_url}}' ? block.data.logoUrl : (block.data?.logoUrl === '{{logo_url}}' ? vars.logo_url : '');
        const logoAlign = block.data?.logoAlignment || 'left';
        const textAlign = block.styles?.textAlign || 'right';
        
        const renderLogoPdf = () => headerLogoUrl ? `<img src="${headerLogoUrl}" alt="Logo" style="height: ${block.data?.logoHeight || 64}px; object-fit: contain; margin-bottom: 8px;" />` : '';
        const renderTextPdf = () => `<h2 style="margin: 0; font-size: inherit; color: inherit; font-weight: inherit; white-space: pre-wrap;">${content || 'Header'}</h2>`;
        
        return `
          <div style="${styleStr}; display: flex; align-items: center; width: 100%; text-align: left;">
            <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start;">
              ${logoAlign === 'left' ? renderLogoPdf() : ''}
              ${textAlign === 'left' ? renderTextPdf() : ''}
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
              ${logoAlign === 'center' ? renderLogoPdf() : ''}
              ${textAlign === 'center' ? renderTextPdf() : ''}
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-end;">
              ${logoAlign === 'right' ? renderLogoPdf() : ''}
              ${textAlign === 'right' ? renderTextPdf() : ''}
            </div>
          </div>
        `;
      case 'text':
      case 'footer':
        return `<p style="${styleStr}">${content}</p>`;
      case 'image':
        if (!block.data?.url) return '';
        const alignmentStr = block.styles?.textAlign === 'center' ? '0 auto' : block.styles?.textAlign === 'right' ? '0 0 0 auto' : '0';
        return `
          <div style="${styleStr}">
            <img src="${block.data.url}" alt="Image" style="max-width: 100%; height: auto; display: block; margin: ${alignmentStr};" />
          </div>
        `;
      case 'spacer':
        return `<div style="${styleStr}; height: ${block.styles?.height || '40px'};"></div>`;
      case 'company_info':
        let logoUrl = vars.logo_url; // Default to settings logo
        if (block.data?.logoUrl && block.data.logoUrl !== '' && block.data.logoUrl !== '{{logo_url}}') {
          logoUrl = block.data.logoUrl;
        }
        const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: ${block.data?.logoHeight || 64}px; max-width: 100%; object-fit: contain;" crossOrigin="anonymous" />` : '';
        
        return `
          <div style="${styleStr}; display: flex; gap: 20px; align-items: start; width: 100%;">
            <!-- Column 1: Main Info -->
            <div style="flex: 1.5; text-align: ${block.data?.mainInfoAlignment || 'left'};">
              <h1 style="font-size: ${block.data?.nameFontSize || '18px'}; font-weight: bold; margin: 0 0 5px 0; color: ${block.styles?.color || '#000'}">${replaceVars(block.data?.name || '{{company_name}}', vars)}</h1>
              <p style="font-size: ${block.data?.addressFontSize || '12px'}; margin: 0 0 5px 0; white-space: pre-wrap;">${replaceVars(block.data?.address || '{{company_address}}', vars)}</p>
              ${block.data?.tax ? `<p style="font-size: ${block.data?.taxFontSize || '12px'}; font-weight: bold; margin: 0;">${replaceVars(block.data.tax, vars)}</p>` : ''}
            </div>
            <!-- Column 2: Logo -->
            <div style="flex: 1; text-align: ${block.data?.logoAlignment || 'left'};">
              ${logoHtml}
            </div>
            <!-- Column 3: Extra Details -->
            <div style="flex: 1.5; text-align: ${block.data?.extraContentAlignment || 'right'};">
              ${block.data?.extraHeader ? `<h4 style="font-size: ${block.data?.extraHeaderFontSize || '14px'}; font-weight: bold; margin: 0 0 5px 0;">${replaceVars(block.data.extraHeader, vars)}</h4>` : ''}
              ${block.data?.content ? `<p style="font-size: ${block.data?.contentFontSize || '12px'}; margin: 0; white-space: pre-wrap; color: #666;">${replaceVars(block.data.content, vars)}</p>` : ''}
            </div>
          </div>
        `;
      case 'customer_info':
        const fontSize = block.styles?.fontSize || '14px';
        const labelFontSize = `calc(${fontSize} - 2px)`;
        return `
          <div style="${styleStr}; display: flex; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="flex: 1; padding: 15px; background-color: #f9fafb; border-right: 1px solid #e5e7eb;">
              <h3 style="font-size: ${labelFontSize}; font-weight: bold; margin: 0 0 8px 0; color: #4b5563;">${replaceVars(block.data?.leftLabel || 'Bill To:', vars)}</h3>
              <p style="font-size: ${fontSize}; font-weight: normal; margin: 0; white-space: pre-wrap;">${replaceVars(block.data?.leftContent || '{{customer_name}}', vars)}</p>
            </div>
            <div style="flex: 1; padding: 15px; background-color: #ffffff;">
              <h3 style="font-size: ${labelFontSize}; font-weight: bold; margin: 0 0 8px 0; color: #4b5563;">${replaceVars(block.data?.rightLabel || 'Job Reference:', vars)}</h3>
              <p style="font-size: ${fontSize}; margin: 0; white-space: pre-wrap;">${replaceVars(block.data?.rightContent || '{{job_reference}}\\nDoc No: {{quotation_number}}\\nDate: {{date}}', vars)}</p>
            </div>
          </div>
        `;
      case 'table':
        const tableFontSize = block.styles?.fontSize || '14px';
        return `
          <div style="${styleStr}">
            <table style="width: 100%; border-collapse: collapse; font-size: ${tableFontSize};">
              <thead>
                <tr style="background-color: ${vars.primaryColorHex}; color: white;">
                  <th style="padding: 12px 8px; text-align: center; width: 5%;">#</th>
                  <th style="padding: 12px 8px; text-align: left; width: 45%;">Description</th>
                  <th style="padding: 12px 8px; text-align: center; width: 10%;">Qty</th>
                  <th style="padding: 12px 8px; text-align: right; width: 20%;">Unit Price</th>
                  <th style="padding: 12px 8px; text-align: right; width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        `;
      case 'totals':
        const totalsFontSize = block.styles?.fontSize || '14px';
        return `
          <div style="${styleStr}; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="flex: 1; padding-right: 20px; padding-bottom: 12px;">
              ${block.data?.showThaiBaht ? `<p style="margin: 0; font-style: italic; font-weight: bold; color: ${block.styles?.color || '#4b5563'}; font-size: ${totalsFontSize};">${vars.grand_total_thb}</p>` : ''}
            </div>
            <table style="width: 350px; border-collapse: collapse; font-size: ${totalsFontSize};">
              <tr>
                <td style="padding: 8px; font-weight: bold; text-align: right; color: #4b5563;">${replaceVars(block.data?.subtotalLabel || 'Subtotal:', vars)}</td>
                <td style="padding: 8px; text-align: right; width: 40%;">${vars.subtotal}</td>
              </tr>
              ${vars.discount_raw > 0 ? `
              <tr>
                <td style="padding: 8px; font-weight: bold; text-align: right; color: #4b5563;">${replaceVars(block.data?.discountLabel || 'Discount:', vars)}</td>
                <td style="padding: 8px; text-align: right; color: #ef4444;">-${vars.discount}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px; font-weight: bold; text-align: right; color: #4b5563;">${replaceVars(block.data?.vatLabel || 'VAT ({{vat_rate}}%):', vars)}</td>
                <td style="padding: 8px; text-align: right;">${vars.vat_amount}</td>
              </tr>
              <tr style="background-color: #f3f4f6; border-top: 2px solid ${vars.primaryColorHex}; border-bottom: 2px solid ${vars.primaryColorHex};">
                <td style="padding: 12px 8px; font-weight: bold; font-size: calc(${totalsFontSize} + 2px); text-align: right; color: ${vars.primaryColorHex};">${replaceVars(block.data?.grandTotalLabel || 'Grand Total:', vars)}</td>
                <td style="padding: 12px 8px; font-weight: bold; font-size: calc(${totalsFontSize} + 2px); text-align: right; color: ${vars.primaryColorHex};">${vars.grand_total}</td>
              </tr>
            </table>
          </div>
        `;
      case 'signature':
        const sigs = block.data?.signatures || [{ title: block.data?.label || 'Authorized Signature', labelType: 'custom', label: '', showDate: false, dateType: 'blank' }];
        const sigFontSize = block.styles?.fontSize || '14px';
        const sigsHtml = sigs.map((sig: any) => {
          const dateHtml = sig.showDate ? `
            <div style="display: flex; align-items: flex-end; justify-content: center; margin-top: 15px; height: ${sigFontSize};">
              <span style="font-size: ${sigFontSize}; margin-right: 5px; line-height: 1;">Date:</span>
              ${sig.dateType === 'system' ? `<span style="font-size: ${sigFontSize}; line-height: 1;">${vars.date}</span>` : `<div style="border-bottom: 1px dotted #000; width: 120px;"></div>`}
            </div>
          ` : '';
          
          const nameLabel = sig.labelType === 'sales_name' ? vars.sales_name : sig.labelType === 'manager_name' ? vars.manager_name : sig.labelType !== undefined ? sig.label : '';
          const title = sig.title || sig.label || 'Authorized Signature';
          
          return `
            <div style="flex-basis: calc(33.333% - 27px); min-width: 150px; max-width: 250px; text-align: center; margin-bottom: 20px;">
              <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px;"></div>
              <p style="font-size: ${sigFontSize}; margin: 0 0 2px 0;">${nameLabel ? `( ${replaceVars(nameLabel, vars)} )` : '( ........................................ )'}</p>
              <p style="font-size: ${sigFontSize}; margin: 0; font-weight: bold;">${replaceVars(title, vars)}</p>
              ${dateHtml}
            </div>
          `;
        }).join('');
        
        return `
          <div style="${styleStr}; display: flex; justify-content: ${sigs.length === 1 ? 'flex-end' : 'space-between'}; gap: 40px; flex-wrap: wrap; margin-top: 40px;">
            ${sigsHtml}
          </div>
        `;
      default:
        return `<div style="${styleStr}">${content}</div>`;
    }
  }).join('\n');

  return `<div style="display: flex; flex-direction: column; min-height: 1043px; width: 100%; box-sizing: border-box;">${blocksHtml}</div>`;
};

const getLegacyHtml = (vars: any, tableRowsHtml: string, title: string) => {
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
      <div>
         <h1 style="font-size: 24px; font-weight: bold; color: ${vars.primaryColorHex}; margin: 0 0 5px 0;">${vars.company_name}</h1>
         <p style="font-size: 14px; margin: 0 0 5px 0; max-width: 350px;">${vars.company_address}</p>
         <p style="font-size: 14px; margin: 0;"><strong>Tax ID:</strong> ${vars.tax_id}</p>
      </div>
      <div style="text-align: right;">
         <h2 style="font-size: 32px; font-weight: bold; color: #374151; margin: 0;">${title}</h2>
         <table style="width: 250px; margin-left: auto; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
           <tr>
             <td style="padding: 4px 8px; background-color: #f3f4f6; font-weight: bold; border: 1px solid #e5e7eb;">No.</td>
             <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">${vars.quotation_number}</td>
           </tr>
           <tr>
             <td style="padding: 4px 8px; background-color: #f3f4f6; font-weight: bold; border: 1px solid #e5e7eb;">Date</td>
             <td style="padding: 4px 8px; border: 1px solid #e5e7eb;">${vars.date}</td>
           </tr>
         </table>
      </div>
    </div>
    <div style="display: flex; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="flex: 1; padding: 15px; background-color: #f9fafb; border-right: 1px solid #e5e7eb;">
        <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #4b5563;">Bill To:</h3>
        <p style="font-size: 16px; font-weight: bold; margin: 0 0 4px 0;">${vars.customer_name}</p>
      </div>
      <div style="flex: 1; padding: 15px; background-color: #ffffff;">
        <h3 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #4b5563;">Job Reference:</h3>
        <p style="font-size: 14px; margin: 0;">${vars.job_reference}</p>
      </div>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
      <thead>
        <tr style="background-color: ${vars.primaryColorHex}; color: white;">
          <th style="padding: 12px 8px; text-align: center; width: 5%;">#</th>
          <th style="padding: 12px 8px; text-align: left; width: 45%;">Description</th>
          <th style="padding: 12px 8px; text-align: center; width: 10%;">Qty</th>
          <th style="padding: 12px 8px; text-align: right; width: 20%;">Unit Price</th>
          <th style="padding: 12px 8px; text-align: right; width: 20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
    <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
      <table style="width: 350px; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px; font-weight: bold; text-align: right; color: #4b5563;">Subtotal:</td>
          <td style="padding: 8px; text-align: right; width: 40%;">${vars.subtotal}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold; text-align: right; color: #4b5563;">VAT (${vars.vat_rate}%):</td>
          <td style="padding: 8px; text-align: right;">${vars.vat_amount}</td>
        </tr>
        <tr style="background-color: #f3f4f6; border-top: 2px solid ${vars.primaryColorHex}; border-bottom: 2px solid ${vars.primaryColorHex};">
          <td style="padding: 12px 8px; font-weight: bold; font-size: 16px; text-align: right; color: ${vars.primaryColorHex};">Grand Total:</td>
          <td style="padding: 12px 8px; font-weight: bold; font-size: 16px; text-align: right; color: ${vars.primaryColorHex};">${vars.grand_total}</td>
        </tr>
      </table>
    </div>
    <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280; white-space: pre-wrap;">${vars.footer_notes}</p>
    </div>
  `;
};

export const generateQuotationPDF = async (quote: any, mockPriceList: any[], templateSettings?: any, action: 'download' | 'preview' | 'generate' = 'download') => {
  const settings = templateSettings || {};
  const currentSubtotal = quote.details.subtotal || 0;
  const currentDiscount = quote.details.discountAmount || 0;
  const vatRate = settings.vatRate !== undefined ? settings.vatRate : 7;
  const calculatedVatable = currentSubtotal - currentDiscount;
  const calculatedVatAmount = calculatedVatable * (vatRate / 100);
  const calculatedTotal = calculatedVatable + calculatedVatAmount;

  const vars = {
    logo_url: settings.logoUrl || '',
    company_name: settings.companyName || 'DEFAULT COMPANY CO., LTD.',
    company_address: settings.companyAddress || '',
    tax_id: settings.taxId || '',
    primaryColorHex: settings.primaryColor || '#4285f4',
    customer_name: quote.customer || '',
    customer_address: quote.customer_address || '',
    customer_street: quote.customer_street || '',
    customer_subdistrict: quote.customer_subdistrict || '',
    customer_district: quote.customer_district || '',
    customer_province: quote.customer_province || '',
    customer_email: quote.customer_email || '',
    customer_phone: quote.customer_phone || '',
    customer_company: quote.customer_company || '',
    customer_tax_id: quote.customer_tax_id || '',
    created_by: quote.owner_name || quote.created_by || '-',
    sales_name: quote.owner_name || quote.sales_person || '-',
    manager_name: quote.approver_name || '-',
    job_reference: quote.jobNumber || quote.jobTitle || '-',
    job_title: quote.jobTitle || '-',
    job_description: quote.job_description || quote.description || '-',
    job_number: quote.job_number || quote.jobNumber || '-',
    job_stage: quote.stage || '-',
    job_status: quote.status || '-',
    po_number: quote.po_number || quote.jobPoNumber || '-',
    so_number: quote.so_number || '-',
    quotation_number: quote.quotation_number || 'QT-PENDING',
    revision_count: quote.revision_count || 0,
    date: quote.date || new Date().toLocaleDateString('en-GB'),
    valid_until: quote.validUntil || '-',
    subtotal: `฿${currentSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    discount_raw: currentDiscount,
    discount: `฿${currentDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    vat_rate: vatRate,
    vat_amount: `฿${calculatedVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    grand_total_raw: calculatedTotal,
    grand_total_thb: `(${THBText(calculatedTotal)})`,
    grand_total: `฿${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    footer_notes: settings.footerNotes || 'Thank you for your business!'
  };

  const tableRowsHtml = quote.details.items.map((item: any, index: number) => {
    const product = mockPriceList.find((p: any) => p.id === item.itemId);
    const productName = product ? product.name : item.itemId;
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px 8px;">${productName}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right;">฿${((item.price * item.quantity - (item.discount || 0)) / item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 12px 8px; text-align: right;">฿${(item.price * item.quantity - (item.discount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  let html = '';
  if (settings.layout && settings.layout.blocks && settings.layout.blocks.length > 0) {
    html = buildHtmlFromLayout(settings.layout, vars, tableRowsHtml);
  } else {
    html = getLegacyHtml(vars, tableRowsHtml, 'QUOTATION');
  }

  const container = createHtmlContainer(html);
  const filename = `${quote.quotation_number || 'QT-PENDING'}.pdf`;
  return await generatePdfFromContainer(container, filename, action);
};

export const generatePOPDF = async (quote: any, mockPriceList: any[], templateSettings?: any, action: 'preview' | 'download' | 'generate' = 'download') => {
  const settings = templateSettings || {};
  const currentSubtotal = quote.details.subtotal || 0;
  const currentDiscount = quote.details.discountAmount || 0;
  const vatRate = settings.vatRate !== undefined ? settings.vatRate : 7;
  const calculatedVatable = currentSubtotal - currentDiscount;
  const calculatedVatAmount = calculatedVatable * (vatRate / 100);
  const calculatedTotal = calculatedVatable + calculatedVatAmount;

  const vars = {
    logo_url: settings.logoUrl || '',
    company_name: settings.companyName || 'DEFAULT COMPANY CO., LTD.',
    company_address: settings.companyAddress || '',
    tax_id: settings.taxId || '',
    primaryColorHex: settings.primaryColor || '#10b981', // green for PO
    customer_name: quote.customer || '',
    customer_address: quote.customer_address || '',
    customer_street: quote.customer_street || '',
    customer_subdistrict: quote.customer_subdistrict || '',
    customer_district: quote.customer_district || '',
    customer_province: quote.customer_province || '',
    customer_email: quote.customer_email || '',
    customer_phone: quote.customer_phone || '',
    customer_company: quote.customer_company || '',
    customer_tax_id: quote.customer_tax_id || '',
    created_by: quote.owner_name || quote.created_by || '-',
    sales_name: quote.owner_name || quote.sales_person || '-',
    manager_name: quote.approver_name || '-',
    job_reference: quote.jobNumber || quote.jobTitle || '-',
    job_title: quote.jobTitle || '-',
    job_description: quote.job_description || quote.description || '-',
    job_number: quote.job_number || quote.jobNumber || '-',
    job_stage: quote.stage || '-',
    job_status: quote.status || '-',
    po_number: quote.po_number || quote.jobPoNumber || '-',
    so_number: quote.so_number || '-',
    quotation_number: quote.poNumber || 'PO-PENDING',
    date: new Date().toLocaleDateString('en-GB'),
    valid_until: '-',
    subtotal: `฿${currentSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    discount_raw: currentDiscount,
    discount: `฿${currentDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    vat_rate: vatRate,
    vat_amount: `฿${calculatedVatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    grand_total_raw: calculatedTotal,
    grand_total_thb: `(${THBText(calculatedTotal)})`,
    grand_total: `฿${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    footer_notes: settings.footerNotes || 'Thank you for your business!'
  };

  const tableRowsHtml = quote.details.items.map((item: any, index: number) => {
    const product = mockPriceList.find((p: any) => p.id === item.itemId);
    const productName = product ? product.name : item.itemId;
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px 8px;">${productName}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right;">฿${((item.price * item.quantity - (item.discount || 0)) / item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 12px 8px; text-align: right;">฿${(item.price * item.quantity - (item.discount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  let html = '';
  if (settings.layout && settings.layout.blocks && settings.layout.blocks.length > 0) {
    html = buildHtmlFromLayout(settings.layout, vars, tableRowsHtml);
  } else {
    html = getLegacyHtml(vars, tableRowsHtml, 'PURCHASE ORDER');
  }

  const container = createHtmlContainer(html);
  const filename = quote.po_number ? `${quote.po_number}.pdf` : `PO-${quote.quotation_number || 'PENDING'}.pdf`;
  return await generatePdfFromContainer(container, filename, action);
};
