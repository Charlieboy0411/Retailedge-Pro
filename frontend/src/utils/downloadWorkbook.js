// Helper to convert binary string to ArrayBuffer for maximum browser & SheetJS compatibility
function s2ab(s) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
}

/**
 * Browser-safe Excel download utility.
 * Replaces XLSX.writeFile() which relies on FileSaver.js
 * and can fail silently in Vite/ESM environments.
 *
 * Works by serialising the workbook to a byte array, wrapping it
 * in a Blob, and programmatically clicking a hidden <a> tag.
 *
 * Key fixes vs naive approach:
 * - Uses setAttribute('download', filename) — more reliable than link.download = filename
 * - Delays revokeObjectURL by 15s so the download starts before cleanup
 *
 * @param {object} XLSX     - The XLSX library instance (xlsx or xlsx-js-style)
 * @param {object} wb       - Workbook object created with XLSX.utils.book_new()
 * @param {string} filename - Desired file name including .xlsx extension
 */
export function downloadWorkbook(XLSX, wb, filename) {
  try {
    let blob;
    try {
      // Try writing to Uint8Array directly (standard type: array)
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch (writeErr) {
      console.warn('[downloadWorkbook] type: array failed, falling back to type: binary', writeErr);
      // Fallback to binary string + s2ab conversion
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      const buf = s2ab(wbout);
      blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    // Build object URL
    const url = URL.createObjectURL(blob);

    // Create hidden anchor and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Delay cleanup to ensure browser has started downloading before revoking
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30000);
  } catch (err) {
    console.error('[downloadWorkbook] Failed to download Excel file:', err);
    alert(`Excel Generation/Download Failed:\n${err.message || err}`);
    throw err;
  }
}

/**
 * Browser-safe PPTX download utility.
 * Replaces pptx.writeFile() which can fail silently or download as a UUID in Vite/ESM.
 *
 * @param {object} pptx     - The PptxGenJS instance
 * @param {string} filename - Desired file name including .pptx extension
 */
export async function downloadPPT(pptx, filename) {
  try {
    const rawBlob = await pptx.write({ outputType: 'blob' });
    
    // Explicitly set the PowerPoint presentation MIME type by slicing the blob.
    // Slicing avoids creating a double-wrapped nested blob and works natively in all browsers.
    const blob = rawBlob.slice(0, rawBlob.size, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 30000);
  } catch (err) {
    console.error('[downloadPPT] Failed to download PPTX file:', err);
    alert(`PowerPoint Generation/Download Failed:\n${err.message || err}`);
    throw err;
  }
}





