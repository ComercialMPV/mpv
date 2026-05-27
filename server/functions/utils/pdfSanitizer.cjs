// utils/pdfSanitizer.cjs – make this much stricter
function sanitizeTemplate(html, css) {
  let cleanCss = css || '';

  // 1. Remove all comments – very common source of "unexpected EOF"
  cleanCss = cleanCss.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Remove @font-face, @import, url(...) – they usually fail in JSDOM
  cleanCss = cleanCss.replace(/@font-face\s*{[^}]*}/gi, '');
  cleanCss = cleanCss.replace(/@import\s+[^;]+;/gi, '');
  cleanCss = cleanCss.replace(/url\([^)]*\)/gi, 'none');   // or '' 

  // 3. Fix common syntax issues
  cleanCss = cleanCss
    .replace(/,\s*}/g, '}')                 // trailing comma before }
    .replace(/;\s*}/g, '}')                 // missing ; is ok, but clean
    .replace(/!important\s*;/g, ';')        // sometimes safer without
    .replace(/\n/g, ' ')                    // flatten
    .replace(/\s+/g, ' ')                   // normalize spaces
    .trim();

  // 4. Optional: remove modern color functions that break old html2canvas
  // cleanCss = cleanCss.replace(/oklch\([^)]*\)/gi, 'rgb(0,0,0)'); // example

  // 5. Rebuild <style> safely
  const cleanHtml = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // remove original style tags
    .trim();

  return { cleanHtml, cleanCss: cleanCss || '' };
}