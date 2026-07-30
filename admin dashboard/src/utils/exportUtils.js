// Utility functions for CSV, Excel (.xlsx), and PDF document exports

function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToCSV(filename, columns, data) {
  const headers = columns.map((col) => escapeCSV(col.header)).join(",");
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let val = item[col.key];
        if (col.getValue) {
          val = col.getValue(item);
        }
        return escapeCSV(val);
      })
      .join(",");
  });

  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportToExcel(filename, title, columns, data) {
  const headers = columns.map((col) => `<th>${col.header}</th>`).join("");
  const rows = data
    .map((item) => {
      const cells = columns
        .map((col) => {
          let val = item[col.key];
          if (col.getValue) val = col.getValue(item);
          return `<td>${val !== undefined && val !== null ? String(val) : ""}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const xmlTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${title || "Operational Report"}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                <x:FreezePanes/>
                <x:FrozenNoSplit/>
                <x:SplitHorizontal>1</x:SplitHorizontal>
                <x:TopRowBottomPane>1</x:TopRowBottomPane>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; }
        th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 8px; text-align: left; border: 1px solid #cbd5e1; }
        td { padding: 6px; border: 1px solid #e2e8f0; text-align: left; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h2>${title || "Operational Report"}</h2>
      <p style="font-size: 11px; color: #64748b;">Exported on: ${new Date().toLocaleString()}</p>
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([xmlTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".xls") || filename.endsWith(".xlsx") ? filename : `${filename}.xls`);
}

export function exportToPDF(filename, title, filterSummary, statsSummary, columns, data) {
  const headers = columns.map((col) => `<th>${col.header}</th>`).join("");
  const rows = data
    .map((item) => {
      const cells = columns
        .map((col) => {
          let val = item[col.key];
          if (col.getValue) val = col.getValue(item);
          return `<td>${val !== undefined && val !== null ? String(val) : ""}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const statsHTML = statsSummary
    ? `<div class="stats-grid">
        ${statsSummary
          .map(
            (s) => `<div class="stat-card">
            <div className="label">${s.label}</div>
            <div className="val">${s.value}</div>
          </div>`,
          )
          .join("")}
      </div>`
    : "";

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 12px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-b: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 15px; }
        .logo { font-size: 18px; font-weight: bold; color: #0f172a; }
        .timestamp { font-size: 10px; color: #64748b; }
        .meta { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
        .stats-grid { display: flex; gap: 10px; margin-bottom: 15px; }
        .stat-card { background: #f1f5f9; border-left: 4px solid #0284c7; padding: 8px 12px; border-radius: 4px; flex: 1; }
        .stat-card .label { font-size: 10px; color: #475569; text-transform: uppercase; font-weight: bold; }
        .stat-card .val { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px; font-size: 11px; font-weight: bold; }
        td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; font-size: 11px; color: #334155; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: right; border-t: 1px solid #e2e8f0; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">AmbuGrid · Operational Report</div>
        <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
      </div>
      <h2 style="margin: 0 0 5px 0;">${title}</h2>
      ${filterSummary ? `<div class="meta"><strong>Applied Filters:</strong> ${filterSummary}</div>` : ""}
      ${statsHTML}
      <table>
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Page 1 of 1 · AmbuGrid Ambulance Priority System Administrator Export</div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(printHTML);
    printWindow.document.close();
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
