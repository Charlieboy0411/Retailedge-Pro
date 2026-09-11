/**
 * Universal clipboard copy utility
 * Works reliably across:
 * 1. Modern Secure Contexts (HTTPS & localhost) via navigator.clipboard
 * 2. Insecure Contexts (HTTP IP deployments like http://13.126.155.96) via document.execCommand('copy') fallback
 * 3. Fallback prompt if clipboard access is denied
 */
export async function copyTextToClipboard(text) {
  if (!text) return false;

  // 1. Try modern navigator.clipboard (available in HTTPS / localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText rejected, attempting fallback:', err);
    }
  }

  // 2. Robust fallback for non-secure HTTP contexts using textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Position out of screen viewport without hiding to allow execCommand to work
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.warn('execCommand copy failed:', err);
  }

  // 3. Fallback window.prompt if both APIs are blocked
  try {
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
      return true;
    }
  } catch (e) {
    console.error('Prompt fallback failed:', e);
  }

  return false;
}
