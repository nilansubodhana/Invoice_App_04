import { Invoice, getTotal, calculateBalance, formatCurrency, formatDate } from './storage';
import { BrandingSettings, DEFAULT_BRANDING } from './branding-context';
import { InvoiceStyleId } from './theme-context';

export interface InvoiceThemeColors {
  primary: string;
  gold: string;
  darkGreen: string;
}

const DEFAULT_COLORS: InvoiceThemeColors = {
  primary: '#2C1810',
  gold: '#C8A951',
  darkGreen: '#1B4332',
};

export function generateInvoiceHTML(
  invoice: Invoice,
  branding: BrandingSettings = DEFAULT_BRANDING,
  themeColors: InvoiceThemeColors = DEFAULT_COLORS,
  style: InvoiceStyleId = 'elegant'
): string {
  const total = getTotal(invoice);
  const advance = parseFloat(invoice.advancePayment) || 0;
  const balance = calculateBalance(total, invoice.advancePayment);
  const c = themeColors;

  const itemRows = invoice.items.map(item => {
    const qty = item.quantity || '---';
    return { description: item.description, qty };
  });

  switch (style) {
    case 'modern': return generateModern(invoice, branding, c, total, advance, balance, itemRows);
    case 'minimal': return generateMinimal(invoice, branding, c, total, advance, balance, itemRows);
    case 'bold': return generateBold(invoice, branding, c, total, advance, balance, itemRows);
    case 'classic': return generateClassic(invoice, branding, c, total, advance, balance, itemRows);
    case 'elegant':
    default: return generateElegant(invoice, branding, c, total, advance, balance, itemRows);
  }
}

interface ItemRow { description: string; qty: string; }

function tableRows(items: ItemRow[], borderColor: string) {
  return items.map(item => `
    <tr>
      <td style="padding: 10px 0; font-size: 14px; color: #333; border-bottom: 1px solid ${borderColor};">${item.description}</td>
      <td style="padding: 10px 0; font-size: 14px; color: #333; text-align: center; border-bottom: 1px solid ${borderColor};">${item.qty}</td>
    </tr>
  `).join('');
}

function wrapHTML(title: string, css: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
${css}
</style></head><body>${body}</body></html>`;
}

function generateElegant(inv: Invoice, b: BrandingSettings, c: InvoiceThemeColors, total: number, advance: number, balance: number, items: ItemRow[]) {
  return wrapHTML('Elegant', `
    body { font-family: 'Inter', sans-serif; background: #fff; color: #333; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; background: #fff; min-height: 1120px; position: relative; }
    .stripe-section { position: absolute; bottom: 60px; left: 0; width: 50px; height: 300px; overflow: hidden; }
    .stripe-brown { position: absolute; left: 0; bottom: 0; width: 28px; height: 280px; background: ${c.primary}; border-radius: 0 14px 0 0; }
    .stripe-gold { position: absolute; left: 12px; bottom: 0; width: 24px; height: 180px; background: ${c.gold}; border-radius: 0 12px 0 0; }
    .header { position: relative; padding: 40px 40px 30px; }
    .logo-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; }
    .inv-title { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 900; color: ${c.primary}; letter-spacing: 4px; font-style: italic; }
    .biz-box { position: absolute; top: 40px; right: 40px; background: ${c.gold}; padding: 12px 24px; border-radius: 4px; }
    .biz-name { font-size: 14px; font-weight: 600; color: #fff; letter-spacing: 3px; text-transform: uppercase; }
    .biz-sub { font-size: 10px; color: rgba(255,255,255,0.8); letter-spacing: 4px; text-transform: uppercase; }
    .left-dots { position: absolute; top: 110px; left: 40px; display: flex; gap: 8px; }
    .left-dot { width: 14px; height: 14px; border-radius: 50%; }
    .right-dots { position: absolute; top: 100px; right: 40px; }
    .dot-row { display: flex; gap: 6px; margin-bottom: 4px; justify-content: flex-end; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .details { padding: 20px 40px 10px; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .d-label { font-size: 13px; color: #666; }
    .d-value { font-size: 13px; color: #333; font-weight: 500; }
    .cust-name { font-size: 20px; font-weight: 700; color: ${c.primary}; margin-top: 12px; }
    .event-date { font-size: 16px; font-weight: 600; color: ${c.primary}; margin-top: 4px; }
    .event-loc { font-size: 12px; color: #888; font-style: italic; margin-top: 2px; }
    .phone { font-size: 13px; color: #555; font-weight: 500; }
    .table-section { padding: 20px 40px; position: relative; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; pointer-events: none; z-index: 0; }
    .watermark img { width: 280px; height: auto; }
    table { width: 100%; border-collapse: collapse; position: relative; z-index: 1; }
    .totals { padding: 20px 40px; margin-top: 10px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
    .total-label { font-size: 28px; font-weight: 700; color: ${c.darkGreen}; font-family: 'Playfair Display', serif; }
    .total-amount { font-size: 28px; font-weight: 700; color: ${c.darkGreen}; }
    .adv-row, .bal-row { display: flex; justify-content: flex-end; align-items: center; gap: 40px; padding: 4px 0; }
    .adv-label { font-size: 13px; color: #666; font-weight: 500; }
    .adv-amount { font-size: 14px; color: #666; font-weight: 500; min-width: 120px; text-align: right; }
    .adv-divider { width: 200px; height: 2px; background: ${c.gold}; margin: 4px 0 4px auto; }
    .bal-label { font-size: 14px; color: #555; font-weight: 600; }
    .bal-amount { font-size: 18px; color: ${c.gold}; font-weight: 700; min-width: 120px; text-align: right; }
    .footer { padding: 30px 40px 20px; margin-top: 30px; }
    .bank { font-size: 11px; color: #666; line-height: 1.6; padding-left: 40px; }
    .bank-title { font-weight: 600; color: #555; }
    .contact-bar { background: ${c.darkGreen}; padding: 12px 40px; display: flex; align-items: center; gap: 20px; margin-top: 15px; }
    .contact-label { font-size: 11px; font-weight: 700; color: ${c.gold}; letter-spacing: 2px; text-transform: uppercase; }
    .contact-info { font-size: 12px; color: #fff; }
  `, `
  <div class="page">
    <div class="stripe-section"><div class="stripe-brown"></div><div class="stripe-gold"></div></div>
    <div class="header">
      <img class="logo-img" src="${b.logoUri}" alt="Logo" />
      <div class="inv-title">INVOICE</div>
      <div class="biz-box"><div class="biz-name">${b.businessName}</div><div class="biz-sub">${b.businessSub}</div></div>
      <div class="left-dots"><div class="left-dot" style="background:${c.gold};"></div><div class="left-dot" style="background:${c.primary};"></div></div>
      <div class="right-dots"><div class="dot-row"><div class="dot" style="background:#9E9890;"></div><div class="dot" style="background:${c.darkGreen};"></div><div class="dot" style="background:${c.gold};"></div></div><div class="dot-row"><div class="dot" style="background:${c.primary};"></div><div class="dot" style="background:${c.darkGreen};"></div><div class="dot" style="background:${c.primary};"></div></div></div>
    </div>
    <div class="details">
      <div class="detail-row"><div><span class="d-label">Invoice No &nbsp;&nbsp;: &nbsp;</span><span class="d-value">${inv.invoiceNumber}</span></div></div>
      <div class="detail-row"><div><span class="d-label">Invoice Date : &nbsp;</span><span class="d-value">${formatDate(inv.invoiceDate)}</span></div></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:12px;">
        <div><div class="cust-name">${inv.customerNames}</div><div class="event-date">${formatDate(inv.eventDate)}</div><div class="event-loc">${inv.eventLocation}</div></div>
        <div class="phone">${inv.phoneNumber}</div>
      </div>
    </div>
    <div class="table-section">
      <div class="watermark"><img src="${b.logoUri}" alt="" /></div>
      <table><thead><tr style="border-bottom:2px solid ${c.darkGreen};"><th style="padding:10px 0;font-size:14px;font-weight:600;color:${c.primary};text-align:left;">Description</th><th style="padding:10px 0;font-size:14px;font-weight:600;color:${c.primary};text-align:center;width:60px;">QTY</th></tr></thead><tbody>${tableRows(items, '#f0ece6')}</tbody></table>
    </div>
    <div class="totals"><div style="border-top:2px solid #e8e4de;padding-top:12px;">
      <div class="total-row"><span class="total-label">Total</span><span class="total-amount">${formatCurrency(total)}</span></div>
      <div class="adv-divider"></div>
      <div class="adv-row"><span class="adv-label">Advance</span><span class="adv-amount">- ${formatCurrency(advance)}</span></div>
      <div class="adv-divider"></div>
      <div class="bal-row"><span class="bal-label">Balance</span><span class="bal-amount">${formatCurrency(balance)}</span></div>
    </div></div>
    <div class="footer"><div class="bank"><span class="bank-title">Bank Details :</span><br><div style="padding-left:45px;margin-top:4px;">${b.bankAccount}<br>${b.bankHolder}<br>${b.bankName}<br>${b.bankBranch}</div></div></div>
    <div class="contact-bar"><span class="contact-label">CONTACT US ;</span><span class="contact-info">${b.contactPhone}</span><span class="contact-info">${b.contactEmail}</span></div>
  </div>`);
}

function generateModern(inv: Invoice, b: BrandingSettings, c: InvoiceThemeColors, total: number, advance: number, balance: number, items: ItemRow[]) {
  return wrapHTML('Modern', `
    body { font-family: 'Poppins', sans-serif; background: #fff; color: #222; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; background: #fff; min-height: 1120px; }
    .top-bar { height: 8px; background: linear-gradient(90deg, ${c.primary}, ${c.gold}, ${c.darkGreen}); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 40px; }
    .logo-side { display: flex; align-items: center; gap: 16px; }
    .logo-img { width: 50px; height: 50px; border-radius: 12px; object-fit: cover; }
    .biz-name { font-size: 20px; font-weight: 700; color: ${c.primary}; letter-spacing: 1px; }
    .biz-sub { font-size: 11px; color: #888; letter-spacing: 3px; text-transform: uppercase; }
    .inv-badge { background: ${c.primary}; color: #fff; padding: 14px 28px; border-radius: 12px; text-align: right; }
    .inv-title { font-size: 24px; font-weight: 700; letter-spacing: 2px; }
    .inv-num { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 0 40px 30px; }
    .info-card { background: #f8f7f5; border-radius: 12px; padding: 20px; }
    .info-label { font-size: 10px; color: #999; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
    .info-value { font-size: 15px; color: #222; font-weight: 500; }
    .info-value-lg { font-size: 18px; color: ${c.primary}; font-weight: 600; }
    .table-section { padding: 10px 40px 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: ${c.darkGreen}; }
    thead th { padding: 12px 16px; color: #fff; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .totals { padding: 0 40px 30px; }
    .total-card { background: linear-gradient(135deg, ${c.primary}, ${c.darkGreen}); border-radius: 16px; padding: 24px; color: #fff; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; opacity: 0.85; }
    .total-main { display: flex; justify-content: space-between; padding: 12px 0 0; font-size: 24px; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.2); margin-top: 8px; }
    .footer { padding: 20px 40px; display: flex; justify-content: space-between; align-items: flex-start; border-top: 2px solid #f0f0f0; margin: 0 40px; }
    .bank-info { font-size: 11px; color: #666; line-height: 1.8; }
    .bank-title { font-weight: 600; color: ${c.primary}; font-size: 12px; }
    .contact-info { font-size: 11px; color: #666; text-align: right; line-height: 1.8; }
  `, `
  <div class="page">
    <div class="top-bar"></div>
    <div class="header">
      <div class="logo-side">
        <img class="logo-img" src="${b.logoUri}" alt="Logo" />
        <div><div class="biz-name">${b.businessName}</div><div class="biz-sub">${b.businessSub}</div></div>
      </div>
      <div class="inv-badge"><div class="inv-title">INVOICE</div><div class="inv-num">#${inv.invoiceNumber} | ${formatDate(inv.invoiceDate)}</div></div>
    </div>
    <div class="info-grid">
      <div class="info-card"><div class="info-label">Bill To</div><div class="info-value-lg">${inv.customerNames}</div><div class="info-value" style="margin-top:6px;">${inv.phoneNumber}</div></div>
      <div class="info-card"><div class="info-label">Event Details</div><div class="info-value">${formatDate(inv.eventDate)}</div><div class="info-value" style="margin-top:4px;">${inv.eventLocation}</div></div>
    </div>
    <div class="table-section">
      <table><thead><tr><th style="text-align:left;border-radius:8px 0 0 8px;">Description</th><th style="text-align:center;width:80px;border-radius:0 8px 8px 0;">Qty</th></tr></thead><tbody>${tableRows(items, '#f0f0f0')}</tbody></table>
    </div>
    <div class="totals"><div class="total-card">
      <div class="total-row"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="total-row"><span>Advance Paid</span><span>- ${formatCurrency(advance)}</span></div>
      <div class="total-main"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>
    </div></div>
    <div class="footer" style="padding-top:20px;">
      <div class="bank-info"><div class="bank-title">Bank Details</div>${b.bankAccount}<br>${b.bankHolder}<br>${b.bankName} - ${b.bankBranch}</div>
      <div class="contact-info"><div class="bank-title" style="text-align:right;">Contact</div>${b.contactPhone}<br>${b.contactEmail}</div>
    </div>
  </div>`);
}

function generateMinimal(inv: Invoice, b: BrandingSettings, c: InvoiceThemeColors, total: number, advance: number, balance: number, items: ItemRow[]) {
  return wrapHTML('Minimal', `
    body { font-family: 'Inter', sans-serif; background: #fff; color: #333; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; background: #fff; min-height: 1120px; padding: 60px 50px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; }
    .logo-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .biz-block { display: flex; align-items: center; gap: 14px; }
    .biz-name { font-size: 16px; font-weight: 600; color: #111; letter-spacing: 1px; }
    .biz-sub { font-size: 10px; color: #aaa; letter-spacing: 3px; text-transform: uppercase; }
    .inv-title { font-size: 36px; font-weight: 300; color: ${c.primary}; letter-spacing: 8px; text-align: right; }
    .inv-num { font-size: 12px; color: #999; text-align: right; margin-top: 4px; }
    .sep { height: 1px; background: #e5e5e5; margin: 30px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-col { }
    .info-label { font-size: 9px; color: #bbb; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
    .info-value { font-size: 14px; color: #222; font-weight: 500; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    thead th { font-size: 10px; color: #999; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; padding: 10px 0; border-bottom: 1px solid #ddd; }
    .totals { margin-top: 20px; text-align: right; }
    .total-line { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 13px; color: #666; }
    .total-main { display: flex; justify-content: flex-end; gap: 40px; padding: 14px 0 0; font-size: 20px; font-weight: 600; color: ${c.primary}; border-top: 1px solid ${c.gold}; margin-top: 8px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; line-height: 1.8; }
  `, `
  <div class="page">
    <div class="header">
      <div class="biz-block"><img class="logo-img" src="${b.logoUri}" alt="" /><div><div class="biz-name">${b.businessName}</div><div class="biz-sub">${b.businessSub}</div></div></div>
      <div><div class="inv-title">INVOICE</div><div class="inv-num">#${inv.invoiceNumber} &middot; ${formatDate(inv.invoiceDate)}</div></div>
    </div>
    <div class="sep"></div>
    <div class="info-row">
      <div class="info-col"><div class="info-label">Bill To</div><div class="info-value">${inv.customerNames}<br>${inv.phoneNumber}</div></div>
      <div class="info-col"><div class="info-label">Event</div><div class="info-value">${formatDate(inv.eventDate)}<br>${inv.eventLocation}</div></div>
    </div>
    <table><thead><tr><th style="text-align:left;">Description</th><th style="text-align:center;width:60px;">Qty</th></tr></thead><tbody>${tableRows(items, '#f5f5f5')}</tbody></table>
    <div class="totals">
      <div class="total-line"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="total-line"><span>Advance</span><span>- ${formatCurrency(advance)}</span></div>
      <div class="total-main"><span>Balance</span><span>${formatCurrency(balance)}</span></div>
    </div>
    <div class="footer">
      <div><strong style="color:#888;">Bank Details</strong><br>${b.bankAccount}<br>${b.bankHolder}<br>${b.bankName} - ${b.bankBranch}</div>
      <div style="text-align:right;"><strong style="color:#888;">Contact</strong><br>${b.contactPhone}<br>${b.contactEmail}</div>
    </div>
  </div>`);
}

function generateBold(inv: Invoice, b: BrandingSettings, c: InvoiceThemeColors, total: number, advance: number, balance: number, items: ItemRow[]) {
  return wrapHTML('Bold', `
    body { font-family: 'Poppins', sans-serif; background: #fff; color: #222; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; background: #fff; min-height: 1120px; overflow: hidden; }
    .hero { background: ${c.primary}; padding: 40px; display: flex; justify-content: space-between; align-items: center; }
    .hero-left { display: flex; align-items: center; gap: 16px; }
    .logo-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 3px solid ${c.gold}; }
    .biz-name { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 1px; }
    .biz-sub { font-size: 10px; color: ${c.gold}; letter-spacing: 4px; text-transform: uppercase; }
    .inv-title { font-size: 44px; font-weight: 700; color: ${c.gold}; letter-spacing: 6px; }
    .gold-strip { height: 5px; background: ${c.gold}; }
    .info-section { padding: 30px 40px; display: flex; justify-content: space-between; }
    .info-block {}
    .info-label { font-size: 10px; color: ${c.gold}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
    .info-value { font-size: 15px; color: #222; font-weight: 500; line-height: 1.7; }
    .info-highlight { font-size: 20px; color: ${c.primary}; font-weight: 700; }
    .meta-row { padding: 0 40px 20px; display: flex; gap: 30px; }
    .meta-chip { background: #f5f3f0; padding: 8px 16px; border-radius: 8px; font-size: 12px; color: #555; font-weight: 500; }
    .table-section { padding: 10px 40px 20px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 3px solid ${c.primary}; }
    thead th { padding: 12px 0; font-size: 13px; font-weight: 600; color: ${c.primary}; letter-spacing: 1px; }
    .totals { margin: 10px 40px; background: ${c.darkGreen}; border-radius: 16px; padding: 24px 28px; }
    .t-row { display: flex; justify-content: space-between; padding: 6px 0; color: rgba(255,255,255,0.75); font-size: 14px; }
    .t-main { display: flex; justify-content: space-between; padding: 12px 0 0; color: ${c.gold}; font-size: 26px; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.15); margin-top: 8px; }
    .footer { padding: 30px 40px 20px; display: flex; justify-content: space-between; font-size: 11px; color: #888; line-height: 1.8; }
    .footer strong { color: ${c.primary}; }
    .bottom-bar { height: 6px; background: linear-gradient(90deg, ${c.gold}, ${c.primary}); }
  `, `
  <div class="page">
    <div class="hero">
      <div class="hero-left"><img class="logo-img" src="${b.logoUri}" alt="" /><div><div class="biz-name">${b.businessName}</div><div class="biz-sub">${b.businessSub}</div></div></div>
      <div class="inv-title">INVOICE</div>
    </div>
    <div class="gold-strip"></div>
    <div class="info-section">
      <div class="info-block"><div class="info-label">Bill To</div><div class="info-highlight">${inv.customerNames}</div><div class="info-value">${inv.phoneNumber}</div></div>
      <div class="info-block" style="text-align:right;"><div class="info-label">Invoice</div><div class="info-value">#${inv.invoiceNumber}<br>${formatDate(inv.invoiceDate)}</div></div>
    </div>
    <div class="meta-row">
      <div class="meta-chip">${formatDate(inv.eventDate)}</div>
      <div class="meta-chip">${inv.eventLocation}</div>
    </div>
    <div class="table-section">
      <table><thead><tr><th style="text-align:left;">Description</th><th style="text-align:center;width:80px;">Qty</th></tr></thead><tbody>${tableRows(items, '#f0ece6')}</tbody></table>
    </div>
    <div class="totals">
      <div class="t-row"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="t-row"><span>Advance Paid</span><span>- ${formatCurrency(advance)}</span></div>
      <div class="t-main"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>
    </div>
    <div class="footer">
      <div><strong>Bank Details</strong><br>${b.bankAccount}<br>${b.bankHolder}<br>${b.bankName} - ${b.bankBranch}</div>
      <div style="text-align:right;"><strong>Contact</strong><br>${b.contactPhone}<br>${b.contactEmail}</div>
    </div>
    <div class="bottom-bar"></div>
  </div>`);
}

function generateClassic(inv: Invoice, b: BrandingSettings, c: InvoiceThemeColors, total: number, advance: number, balance: number, items: ItemRow[]) {
  return wrapHTML('Classic', `
    body { font-family: 'Cormorant Garamond', 'Georgia', serif; background: #fff; color: #333; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; background: #fff; min-height: 1120px; border: 2px solid ${c.primary}; position: relative; }
    .corner-tl, .corner-tr, .corner-bl, .corner-br { position: absolute; width: 30px; height: 30px; }
    .corner-tl { top: 8px; left: 8px; border-top: 3px solid ${c.gold}; border-left: 3px solid ${c.gold}; }
    .corner-tr { top: 8px; right: 8px; border-top: 3px solid ${c.gold}; border-right: 3px solid ${c.gold}; }
    .corner-bl { bottom: 8px; left: 8px; border-bottom: 3px solid ${c.gold}; border-left: 3px solid ${c.gold}; }
    .corner-br { bottom: 8px; right: 8px; border-bottom: 3px solid ${c.gold}; border-right: 3px solid ${c.gold}; }
    .header { text-align: center; padding: 50px 40px 20px; border-bottom: 1px solid #ddd; margin: 0 30px; }
    .logo-img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid ${c.gold}; }
    .biz-name { font-size: 28px; font-weight: 700; color: ${c.primary}; letter-spacing: 6px; text-transform: uppercase; }
    .biz-sub { font-size: 13px; color: ${c.gold}; letter-spacing: 8px; text-transform: uppercase; margin-top: 2px; }
    .inv-title { font-size: 18px; font-weight: 600; color: ${c.darkGreen}; letter-spacing: 10px; margin-top: 16px; text-transform: uppercase; }
    .details { padding: 24px 50px; display: flex; justify-content: space-between; }
    .detail-col {}
    .d-label { font-size: 11px; color: #999; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .d-value { font-size: 15px; color: #333; font-weight: 500; margin-bottom: 12px; }
    .d-name { font-size: 22px; color: ${c.primary}; font-weight: 700; }
    .orn-line { text-align: center; padding: 0 50px; color: ${c.gold}; font-size: 18px; letter-spacing: 6px; }
    .table-section { padding: 20px 50px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 0; font-size: 13px; color: ${c.primary}; font-weight: 600; border-bottom: 2px solid ${c.primary}; border-top: 1px solid ${c.gold}; letter-spacing: 1px; }
    .totals { padding: 10px 50px 20px; }
    .t-sep { height: 1px; background: ${c.gold}; width: 220px; margin: 6px 0 6px auto; }
    .t-row { display: flex; justify-content: flex-end; gap: 50px; padding: 5px 0; font-size: 14px; color: #555; }
    .t-main { display: flex; justify-content: flex-end; gap: 50px; padding: 10px 0; font-size: 22px; color: ${c.primary}; font-weight: 700; border-top: 2px solid ${c.primary}; margin-top: 6px; }
    .footer { padding: 20px 50px 15px; border-top: 1px solid #ddd; margin: 20px 30px 0; display: flex; justify-content: space-between; font-size: 11px; color: #777; line-height: 1.8; }
    .footer strong { color: ${c.primary}; }
    .bottom-orn { text-align: center; padding: 10px; color: ${c.gold}; font-size: 14px; letter-spacing: 8px; }
  `, `
  <div class="page">
    <div class="corner-tl"></div><div class="corner-tr"></div><div class="corner-bl"></div><div class="corner-br"></div>
    <div class="header">
      <img class="logo-img" src="${b.logoUri}" alt="" />
      <div class="biz-name">${b.businessName}</div>
      <div class="biz-sub">${b.businessSub}</div>
      <div class="inv-title">Invoice</div>
    </div>
    <div class="orn-line">&bull; &bull; &bull;</div>
    <div class="details">
      <div class="detail-col">
        <div class="d-label">Bill To</div>
        <div class="d-name">${inv.customerNames}</div>
        <div class="d-value" style="margin-top:4px;">${inv.phoneNumber}</div>
      </div>
      <div class="detail-col" style="text-align:right;">
        <div class="d-label">Invoice No</div><div class="d-value">#${inv.invoiceNumber}</div>
        <div class="d-label">Date</div><div class="d-value">${formatDate(inv.invoiceDate)}</div>
        <div class="d-label">Event</div><div class="d-value">${formatDate(inv.eventDate)}<br><em style="color:#888;">${inv.eventLocation}</em></div>
      </div>
    </div>
    <div class="table-section">
      <table><thead><tr><th style="text-align:left;">Description</th><th style="text-align:center;width:60px;">Qty</th></tr></thead><tbody>${tableRows(items, '#f0ece6')}</tbody></table>
    </div>
    <div class="totals">
      <div class="t-row"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="t-sep"></div>
      <div class="t-row"><span>Advance</span><span>- ${formatCurrency(advance)}</span></div>
      <div class="t-sep"></div>
      <div class="t-main"><span>Balance</span><span>${formatCurrency(balance)}</span></div>
    </div>
    <div class="footer">
      <div><strong>Bank Details</strong><br>${b.bankAccount}<br>${b.bankHolder}<br>${b.bankName} - ${b.bankBranch}</div>
      <div style="text-align:right;"><strong>Contact</strong><br>${b.contactPhone}<br>${b.contactEmail}</div>
    </div>
    <div class="bottom-orn">&bull; &bull; &bull;</div>
  </div>`);
}
