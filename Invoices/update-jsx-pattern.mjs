import { readFileSync, writeFileSync } from 'fs';

// Files that still need JSX updates (those processed by first script)
const files = [
  'BoutiquePortal', 'CardapioDigital', 'Catering', 'ClinicaPortal',
  'ConsultingPortal', 'CosmeticsPortal', 'Cuidador',
  'Ecommerce', 'Hairstyle', 'LawyerDigital', 'LogisticPortal',
  'ModernPortal', 'RetreatPortal', 'Shoestore', 'TakeawayDigital'
];

const VARIANTS_DIR = 'src/templates/public-portal/variants';

// Phone input block — will be inserted after payment method buttons section
// Each variant has unique styling, so we use a generic neutral version
const PHONE_INPUT = `              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div className="mt-3">
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1.5">
                    {paymentMethod === 'mpesa' ? 'Número M-Pesa' : 'Número E-Mola'}
                  </label>
                  <input
                    type="tel"
                    value={mobileMoneyPhone}
                    onChange={e => setMobileMoneyPhone(e.target.value)}
                    placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                    className="w-full px-5 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 outline-none transition-all"
                  />
                  {paymentMethod === 'mpesa' && (
                    <p className="text-[10px] text-zinc-400 mt-1">Os números M-Pesa começam com 84 ou 85</p>
                  )}
                  {paymentMethod === 'emola' && (
                    <p className="text-[10px] text-zinc-400 mt-1">Os números E-Mola começam com 86 ou 87</p>
                  )}
                </div>
              )}`;

// Awaiting confirmation modal
const AWAITING_MODAL = `      {/* Awaiting Confirmation Modal */}
      {showAwaitingConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl text-center">
            {pollStatus === 'waiting' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-2">A aguardar confirmação</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Um pedido de pagamento foi enviado para o seu telemóvel.<br />
                  Introduza o seu PIN no telefone para autorizar o pagamento.
                </p>
                {awaitingRef && (
                  <p className="font-mono text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 inline-block px-3 py-1 rounded-full">
                    Ref: {awaitingRef}
                  </p>
                )}
              </>
            )}
            {pollStatus === 'confirmed' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2">Pagamento Confirmado!</h3>
                <p className="text-sm text-zinc-500">Redirecionando...</p>
              </>
            )}
            {pollStatus === 'failed' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Pagamento não confirmado</h3>
                <p className="text-sm text-zinc-500 mb-4">O pagamento foi recusado ou expirou.</p>
                <button
                  onClick={() => setShowAwaitingConfirmation(false)}
                  className="px-6 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </>
            )}
          </div>
        </div>
      )}`;

for (const name of files) {
  const filePath = `${VARIANTS_DIR}/${name}.tsx`;
  let content = readFileSync(filePath, 'utf-8');
  let changed = false;

  // === 1. Add phone input after payment method buttons ===
  // Look for the pattern: map or buttons section for payment methods, followed by closing </div> of that section
  // We insert the phone input after the payment method buttons section (before the submit button section)
  if (!content.includes('Número M-Pesa')) {
    // Find the submit button area (onClick={handlePayment}) and insert phone input before it
    const submitBtnRegex = /(\s*<button\s+[^>]*onClick=\{handlePayment\}[^>]*>)/;
    const submitMatch = content.match(submitBtnRegex);
    if (submitMatch) {
      content = content.replace(submitMatch[0], '\n' + PHONE_INPUT + '\n' + submitMatch[0]);
      changed = true;
      console.log(`${name}: Phone input added before submit button ✓`);
    } else {
      console.log(`${name}: Could not find submit button pattern ✗`);
    }
  } else {
    console.log(`${name}: Phone input already exists ✓`);
  }

  // === 2. Update submit button disabled prop ===
  if (!content.includes('mobileMoneyPhone)')) {
    const disabledRegex = /(disabled=\{)(!paymentMethod \|\| paymentMethod === 'none')(\})/;
    const disabledMatch = content.match(disabledRegex);
    if (disabledMatch) {
      const newDisabled = `${disabledMatch[1]}${disabledMatch[2]} || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)${disabledMatch[3]}`;
      content = content.replace(disabledMatch[0], newDisabled);
      changed = true;
      console.log(`${name}: Submit button disabled updated ✓`);
    } else {
      console.log(`${name}: Could not find disabled pattern ✗`);
    }
  } else {
    console.log(`${name}: Submit button already updated ✓`);
  }

  // === 3. Add awaiting confirmation modal ===
  // Insert before the final return closing fragment
  if (!content.includes('showAwaitingConfirmation &&')) {
    // Find the last occurrence of the component's return statement
    // Look for closing </div> just before `)}` (section close) or the end of the return
    // Strategy: find where the success modal is rendered or near the end
    const endDivRegex = /(\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\s*$)/m;
    const endDivMatch = content.match(endDivRegex);
    if (endDivMatch) {
      content = content.replace(endDivMatch[0], '\n' + AWAITING_MODAL + '\n' + endDivMatch[0]);
      changed = true;
      console.log(`${name}: Awaiting modal added before final div ✓`);
    } else {
      // Try alternative: add before the last </div> that closes the main component
      // Simple approach: find last </div> before the closing of the component
      const lastDivClose = content.lastIndexOf('</div>');
      const componentEnd = content.lastIndexOf(');');
      if (lastDivClose > 0 && componentEnd > lastDivClose) {
        content = content.slice(0, lastDivClose) + '\n' + AWAITING_MODAL + '\n' + content.slice(lastDivClose);
        changed = true;
        console.log(`${name}: Awaiting modal added at last div ✏`);
      } else {
        console.log(`${name}: Could not find insert point for modal ✗`);
      }
    }
  } else {
    console.log(`${name}: Awaiting modal already exists ✓`);
  }

  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`${name}: Saved ✓`);
  }
}

console.log('\nJSX updates complete!');
