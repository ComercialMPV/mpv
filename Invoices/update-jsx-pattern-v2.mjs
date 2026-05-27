import { readFileSync, writeFileSync } from 'fs';

const files = [
  'BoutiquePortal', 'CardapioDigital', 'Catering', 'ClinicaPortal',
  'ConsultingPortal', 'CosmeticsPortal', 'Cuidador',
  'Ecommerce', 'Hairstyle', 'LawyerDigital', 'LogisticPortal',
  'ModernPortal', 'RetreatPortal', 'Shoestore', 'TakeawayDigital'
];

const VARIANTS_DIR = 'src/templates/public-portal/variants';

for (const name of files) {
  const filePath = `${VARIANTS_DIR}/${name}.tsx`;
  let content = readFileSync(filePath, 'utf-8');
  let changed = false;

  // === PHONE INPUT: Insert before the submit "handlePayment" button ===
  // The existing payment method buttons end. The submit button follows.
  // We insert the phone input between them.
  // Pattern: find the closing </div> of the payment methods section
  // then an optional blank line, then a <div with the submit button
  if (!content.includes('mobileMoneyPhone}') && !content.includes('mobileMoneyPhone\n') && !content.includes('setMobileMoneyPhone(e.target.value)')) {
    // Look for the submit button opening div
    const submitDivRegex = /(\s*<div className="flex flex-col gap-3">\s*\n\s*<button[^>]*onClick=\{handlePayment\})/;
    const match = content.match(submitDivRegex);
    if (match) {
      const phoneBlock = `
              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div className="mt-3">
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-1.5">
                    {paymentMethod === 'mpesa' ? 'N\u00famero M-Pesa' : 'N\u00famero E-Mola'}
                  </label>
                  <input
                    type="tel"
                    value={mobileMoneyPhone}
                    onChange={e => setMobileMoneyPhone(e.target.value)}
                    placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                    className="w-full px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-white outline-none transition-all"
                  />
                  {paymentMethod === 'mpesa' && (
                    <p className="text-[10px] text-zinc-400 mt-1">Os n\u00fameros M-Pesa come\u00e7am com 84 ou 85</p>
                  )}
                  {paymentMethod === 'emola' && (
                    <p className="text-[10px] text-zinc-400 mt-1">Os n\u00fameros E-Mola come\u00e7am com 86 ou 87</p>
                  )}
                </div>
              )}
`;
      content = content.replace(match[0], phoneBlock + match[0]);
      changed = true;
      console.log(`${name}: Phone input added ✓`);
    } else {
      console.log(`${name}: Could not find submit div pattern ✗`);
    }
  } else {
    console.log(`${name}: Phone input already exists ✓`);
  }

  // === UPDATE SUBMIT BUTTON DISABLED ===
  if (!content.includes('mobileMoneyPhone)') || content.includes(`disabled={!paymentMethod || paymentMethod === 'none'}`)) {
    // Find disabled that does NOT already have mobileMoneyPhone check
    const disabledRegex = /(disabled=\{)(!paymentMethod \|\| paymentMethod === 'none')(\})/;
    const match = content.match(disabledRegex);
    if (match) {
      const replacement = `${match[1]}${match[2]} || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)${match[3]}`;
      content = content.replace(match[0], replacement);
      changed = true;
      console.log(`${name}: Submit button disabled updated ✓`);
    } else {
      console.log(`${name}: Could not find disabled pattern ✗`);
    }
  } else {
    console.log(`${name}: Submit button already updated ✓`);
  }

  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`${name}: Saved ✓`);
  }
}

console.log('\nDone!');
