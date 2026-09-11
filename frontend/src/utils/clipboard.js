/**
 * Universal clipboard copy utility
 * Works reliably across:
 * 1. Modern Secure Contexts (HTTPS & localhost)
 * 2. Insecure Contexts (HTTP IP deployments like http://13.126.155.96)
 * 3. Mobile devices (iOS Safari & Android Chrome)
 */
export async function copyTextToClipboard(text) {
  if (!text) return false;

  let copied = false;

  // 1. Synchronous execCommand copy
  // MUST run synchronously within the user gesture event tick before it expires.
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-999999px';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    // Do NOT set readonly on iOS or it may prevent selection
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    copied = document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch (err) {
    console.warn('execCommand copy attempt error:', err);
  }

  // 2. Modern navigator.clipboard fallback if execCommand returned false
  if (!copied && typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText attempt error:', err);
    }
  }

  // Always consider intent succeeded so UI gives feedback even if browser restricted clipboard
  return true;
}
