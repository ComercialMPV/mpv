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

  // Check if phone input JSX exists (look for phone input in the JSX template, not the handler code)
  const hasPhoneInput = content.includes('placeholder={paymentMethod === \'mpesa\' ? \'+258 84')

  if (!hasPhoneInput) {
    const phoneBlock = '\n              {(paymentMethod === \'mpesa\' || paymentMethod === \'emola\') && (\n                <div className="mt-3">\n                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1.5">\n                    {paymentMethod === \'mpesa\' ? \'N\\u00famero M-Pesa\' : \'N\\u00famero E-Mola\'}\n                  </label>\n                  <input\n                    type="tel"\n                    value={mobileMoneyPhone}\n                    onChange={e => setMobileMoneyPhone(e.target.value)}\n                    placeholder={paymentMethod === \'mpesa\' ? \'+258 84 XXX XXXX\' : \'+258 86 XXX XXXX\'}\n                    className="w-full px-5 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 outline-none transition-all"\n                  />\n                  {paymentMethod === \'mpesa\' && (\n                    <p className="text-[10px] text-zinc-400 mt-1">Os n\\u00fameros M-Pesa come\\u00e7am com 84 ou 85</p>\n                  )}\n                  {paymentMethod === \'emola\' && (\n                    <p className="text-[10px] text-zinc-400 mt-1">Os n\\u00fameros E-Mola come\\u00e7am com 86 ou 87</p>\n                  )}\n                </div>\n              )}';

    // Try to find patterns - look for submit button section
    const patterns = [
      // <div className="flex flex-col gap-3"> before submit button
      /(<div className="flex flex-col gap-3">\s*\n\s*<button)/,
      // Just any button with handlePayment
      /(<button[^>]*onClick=\{handlePayment\}[^>]*>)/
    ];

    let found = false;
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        content = content.replace(match[1], phoneBlock + '\n              ' + match[1]);
        changed = true;
        found = true;
        console.log(name + ': Phone input added');
        break;
      }
    }
    if (!found) {
      console.log(name + ': Could not insert phone input');
    }
  } else {
    console.log(name + ': Phone input exists');
  }

  // Update submit button disabled prop
  const oldDisabled = "disabled={!paymentMethod || paymentMethod === 'none'}";
  const newDisabled = "disabled={!paymentMethod || paymentMethod === 'none' || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)}";
  if (content.includes(oldDisabled) && !content.includes(newDisabled)) {
    content = content.replace(oldDisabled, newDisabled);
    changed = true;
    console.log(name + ': Submit button disabled updated');
  }

  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(name + ': Saved');
  }
}

console.log('\nDone!');
