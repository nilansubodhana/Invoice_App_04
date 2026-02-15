import { ShootEntry, formatCurrency, formatDate, getMonthName } from './storage';
import { BrandingSettings, DEFAULT_BRANDING } from './branding-context';

interface MonthlyStats {
  totalShoots: number;
  totalIncome: number;
  avgPerShoot: number;
}

interface InvoiceStats {
  totalInvoices: number;
  totalRevenue: number;
  totalAdvance: number;
  totalPending: number;
}

const TYPE_COLORS: Record<string, string> = {
  'Wedding': '#1B4332',
  'Pre-shoot': '#C8A951',
  'Casual': '#6B6560',
  'Commercial': '#2C1810',
};

export function generateMonthlyReportHTML(
  shoots: ShootEntry[],
  stats: MonthlyStats,
  year: number,
  month: number,
  branding: BrandingSettings = DEFAULT_BRANDING,
  invoiceStats: InvoiceStats = { totalInvoices: 0, totalRevenue: 0, totalAdvance: 0, totalPending: 0 },
  totalExpenses: number = 0
): string {
  const typeBreakdown: Record<string, { count: number; income: number }> = {};
  shoots.forEach(s => {
    if (!typeBreakdown[s.shootType]) typeBreakdown[s.shootType] = { count: 0, income: 0 };
    typeBreakdown[s.shootType].count += 1;
    typeBreakdown[s.shootType].income += parseFloat(s.price) || 0;
  });

  const breakdownRows = Object.entries(typeBreakdown).map(([type, data]) => `
    <tr>
      <td style="padding: 8px 12px; font-size: 13px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${TYPE_COLORS[type] || '#999'};margin-right:8px;"></span>
        ${type}
      </td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: center;">${data.count}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; font-weight: 600;">LKR ${formatCurrency(data.income)}</td>
    </tr>
  `).join('');

  const shootRows = shoots.map(s => `
    <tr style="border-bottom: 1px solid #f0ece6;">
      <td style="padding: 8px 12px; font-size: 12px; color: #555;">${formatDate(s.shootDate)}</td>
      <td style="padding: 8px 12px; font-size: 12px;">${s.modelName || s.shootLocation}</td>
      <td style="padding: 8px 12px; font-size: 12px; color: ${TYPE_COLORS[s.shootType] || '#555'};">${s.shootType}</td>
      <td style="padding: 8px 12px; font-size: 12px; color: #555;">${s.shootLocation}</td>
      <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: 600; color: #1B4332;">LKR ${formatCurrency(parseFloat(s.price) || 0)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #333; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; position: relative; }
    .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; pointer-events: none; z-index: 0; }
    .watermark img { width: 300px; }
    .content { position: relative; z-index: 1; }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark"><img src="${branding.logoUri}" /></div>
    <div class="content">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;">
        <div>
          <img src="${branding.logoUri}" style="width:50px;height:50px;border-radius:50%;margin-bottom:8px;" />
          <div style="font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:#2C1810;">Monthly Report</div>
          <div style="font-size:18px;font-weight:600;color:#C8A951;margin-top:4px;">${getMonthName(month)} ${year}</div>
        </div>
        <div style="text-align:right;">
          <div style="background:#C8A951;padding:10px 20px;border-radius:4px;">
            <div style="font-size:12px;font-weight:600;color:#fff;letter-spacing:2px;">${branding.businessName}</div>
            <div style="font-size:9px;color:rgba(255,255,255,0.8);letter-spacing:3px;">${branding.businessSub}</div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#1B4332;border-radius:12px;padding:20px;color:#fff;">
          <div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;">Total Shoots</div>
          <div style="font-size:32px;font-weight:700;margin-top:6px;">${stats.totalShoots}</div>
        </div>
        <div style="flex:1;background:#2C1810;border-radius:12px;padding:20px;color:#fff;">
          <div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;">Shoot Income</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;">LKR ${formatCurrency(stats.totalIncome)}</div>
        </div>
        <div style="flex:1;background:#C8A951;border-radius:12px;padding:20px;color:#fff;">
          <div style="font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;">Avg per Shoot</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;">LKR ${formatCurrency(stats.avgPerShoot)}</div>
        </div>
      </div>

      ${invoiceStats.totalInvoices > 0 ? `
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#fff;border-radius:12px;padding:20px;border:1px solid #E8E4DF;">
          <div style="font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Invoice Income</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:#2C1810;">LKR ${formatCurrency(invoiceStats.totalRevenue)}</div>
          <div style="font-size:11px;color:#999;margin-top:4px;">${invoiceStats.totalInvoices} invoice${invoiceStats.totalInvoices > 1 ? 's' : ''}</div>
        </div>
        <div style="flex:1;background:#fff;border-radius:12px;padding:20px;border:1px solid #E8E4DF;">
          <div style="font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Advance Received</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:#27AE60;">LKR ${formatCurrency(invoiceStats.totalAdvance)}</div>
        </div>
        <div style="flex:1;background:#fff;border-radius:12px;padding:20px;border:1px solid #E8E4DF;">
          <div style="font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Pending Balance</div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:${invoiceStats.totalPending > 0 ? '#C0392B' : '#27AE60'};">LKR ${formatCurrency(invoiceStats.totalPending)}</div>
        </div>
      </div>
      ` : ''}

      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:600;color:#2C1810;margin-bottom:10px;letter-spacing:1px;text-transform:uppercase;">Breakdown by Type</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #1B4332;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;">Type</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;">Count</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#666;">Income</th>
            </tr>
          </thead>
          <tbody>${breakdownRows}</tbody>
        </table>
      </div>

      <div>
        <div style="font-size:14px;font-weight:600;color:#2C1810;margin-bottom:10px;letter-spacing:1px;text-transform:uppercase;">All Shoots</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #1B4332;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;">Date</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;">Name</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;">Type</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#666;">Location</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#666;">Price</th>
            </tr>
          </thead>
          <tbody>${shootRows}</tbody>
        </table>
      </div>

      <div style="margin-top:24px;background:#1B4332;border-radius:12px;padding:20px;color:#fff;">
        <div style="font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Combined Monthly Summary</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;color:rgba(255,255,255,0.7);">Shoot Income</span>
          <span style="font-size:13px;font-weight:600;">LKR ${formatCurrency(stats.totalIncome)}</span>
        </div>
        ${invoiceStats.totalRevenue > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;color:rgba(255,255,255,0.7);">Invoice Income</span>
          <span style="font-size:13px;font-weight:600;">LKR ${formatCurrency(invoiceStats.totalRevenue)}</span>
        </div>
        ` : ''}
        ${totalExpenses > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:12px;color:rgba(255,255,255,0.7);">Expenses</span>
          <span style="font-size:13px;font-weight:600;color:#FF6B6B;">- LKR ${formatCurrency(totalExpenses)}</span>
        </div>
        ` : ''}
        <div style="border-top:1.5px solid rgba(255,255,255,0.3);margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;">
          <span style="font-size:14px;font-weight:700;">Net Profit</span>
          <span style="font-size:20px;font-weight:700;color:${(stats.totalIncome + invoiceStats.totalRevenue - totalExpenses) >= 0 ? '#fff' : '#FF6B6B'};">LKR ${formatCurrency(stats.totalIncome + invoiceStats.totalRevenue - totalExpenses)}</span>
        </div>
      </div>

      <div style="margin-top:30px;padding-top:16px;border-top:2px solid #C8A951;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:10px;color:#999;">Generated by ${branding.businessName} ${branding.businessSub} App</div>
        <div style="font-size:10px;color:#999;">${branding.contactPhone} | ${branding.contactEmail}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
