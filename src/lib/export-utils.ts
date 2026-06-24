import { formatDate } from "./format-utils";

/**
 * Exports data to an Excel-compatible CSV file.
 * Uses semicolon as a separator (standard for European/French Excel versions)
 * and starts with a UTF-8 BOM (\uFEFF) to display accents properly.
 */
export function exportToCSV<T>(
  data: T[],
  headers: string[],
  mapRow: (item: T) => (string | number | boolean | null | undefined)[],
  filename: string
) {
  // Build the CSV string
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(";"));
  
  // Add data rows
  for (const item of data) {
    const rowValues = mapRow(item);
    const escapedRow = rowValues.map((val) => {
      if (val === null || val === undefined) {
        return "";
      }
      
      const strVal = String(val);
      // Escape double quotes by doubling them, and wrap string in double quotes if it contains semicolon or newline
      if (strVal.includes(";") || strVal.includes("\n") || strVal.includes('"')) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    });
    csvRows.push(escapedRow.join(";"));
  }
  
  const csvContent = "\uFEFF" + csvRows.join("\n");
  
  // Create Blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
