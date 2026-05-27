import { readFileSync, writeFileSync } from 'fs';

// Files to process (all that have paymentMethod + handlePayment but NOT showAwaitingConfirmation)
const files = [
  'BoutiquePortal', 'CardapioDigital', 'Catering', 'ClinicaPortal',
  'ConsultingPortal', 'CosmeticsPortal', 'Cuidador',
  'Ecommerce', 'Hairstyle', 'LawyerDigital', 'LogisticPortal',
  'ModernPortal', 'RetreatPortal', 'Shoestore', 'TakeawayDigital'
];

const VARIANTS_DIR = 'src/templates/public-portal/variants';

// NEW handlePayment block (will inject mobile money validation + awaiting confirmation)
const NEW_HANDLE_PAYMENT = `const handlePayment = async () => {
  if (!paymentMethod || paymentMethod === 'none') {
    toast.error('Selecione um método de pagamento');
    return;
  }
  if (!hasValidItems) {
    toast.error('Adicione pelo menos um item ao carrinho');
    return;
  }
  if (!client.name || !client.email) {
    toast.error('Preencha o nome e email para processar o pagamento');
    return;
  }

  // Mobile money prefix validation
  if (paymentMethod === 'mpesa' || paymentMethod === 'emola') {
    if (!mobileMoneyPhone) {
      toast.error(\`Número de \${paymentMethod === 'mpesa' ? 'M-Pesa' : 'E-Mola'} é obrigatório\`);
      return;
    }
    const cleaned = mobileMoneyPhone.replace(/\\D/g, '');
    const isMpesa = paymentMethod === 'mpesa';
    const isEmola = paymentMethod === 'emola';
    const validMpesa = cleaned.startsWith('84') || cleaned.startsWith('85');
    const validEmola = cleaned.startsWith('86') || cleaned.startsWith('87');
    if (isMpesa && !validMpesa) {
      toast.error('Número M-Pesa deve começar com 84 ou 85');
      return;
    }
    if (isEmola && !validEmola) {
      toast.error('Número E-Mola deve começar com 86 ou 87');
      return;
    }
  }

  setSubmitting(true);
  try {
    const effectivePhone = (paymentMethod === 'mpesa' || paymentMethod === 'emola')
      ? mobileMoneyPhone : client.phone;
    const payload = {
      totalAmount: totals.grandTotal,
      method: paymentMethod,
      customer: {
        name: client.name,
        phone: effectivePhone,
        email: client.email,
      },
      companyId: company._id,
      items: cart.map(ci => ({
        itemId: ci.itemId,
        name: ci.name,
        quantity: ci.quantity,
        price: ci.price,
        type: ci.type
      }))
    };
    const resp = await api.checkout.process(payload, true);
    console.log('✅ Resposta do checkout:', resp);
    if (resp?.success) {
      if (resp.awaiting_confirmation || (resp.status === 'pending' && (paymentMethod === 'mpesa' || paymentMethod === 'emola'))) {
        setAwaitingRef(resp.externalRef);
        setPollStatus('waiting');
        setPollAttempts(0);
        setShowAwaitingConfirmation(true);
        return;
      }
      if (resp.url) {
        window.location.href = resp.url;
      } else {
        toast.success(resp.message || 'Pagamento processado com sucesso!');
        setTimeout(() => {
          window.location.href = \`/order-success?ref=\${resp.externalRef}\`;
        }, 1500);
      }
    } else {
      toast.error(resp?.message || 'Não foi possível iniciar o pagamento');
    }
  } catch (err: any) {
    console.error('Payment error:', err);
    if (err.message?.includes('504') || err.response?.status === 504) {
      toast.error('O serviço de pagamento está demorando muito. Tente novamente.');
    } else {
      toast.error(err.message || 'Erro ao processar pagamento');
    }
  } finally {
    setSubmitting(false);
  }
};`;

// Polling useEffect
const POLLING_EFFECT = `  // Poll awaiting confirmation
  useEffect(() => {
    if (!showAwaitingConfirmation || !awaitingRef) return;
    const interval = setInterval(async () => {
      try {
        setPollAttempts(prev => prev + 1);
        const res = await api.checkout.transactionStatus(awaitingRef);
        if (res?.status === 'success' || res?.status === 'completed') {
          setPollStatus('confirmed');
          clearInterval(interval);
          setTimeout(() => {
            window.location.href = \`/order-success?ref=\${awaitingRef}\`;
          }, 2000);
        } else if (res?.status === 'failed' || res?.status === 'cancelled') {
          setPollStatus('failed');
          clearInterval(interval);
        }
      } catch (e) {
        console.log('Poll error (normal while waiting):', e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [showAwaitingConfirmation, awaitingRef]);`;

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

// New states to add after paymentMethod line
const NEW_STATES = `  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [showAwaitingConfirmation, setShowAwaitingConfirmation] = useState(false);
  const [awaitingRef, setAwaitingRef] = useState<string>('');
  const [pollStatus, setPollStatus] = useState<'waiting'|'confirmed'|'failed'>('waiting');
  const [pollAttempts, setPollAttempts] = useState(0);`;

// Mobile money phone input block
const PHONE_INPUT_BLOCK = `              {(paymentMethod === 'mpesa' || paymentMethod === 'emola') && (
                <div className="mt-3">
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-1.5">
                    {paymentMethod === 'mpesa' ? 'Número M-Pesa' : 'Número E-Mola'}
                  </label>
                  <input
                    type="tel"
                    value={mobileMoneyPhone}
                    onChange={e => setMobileMoneyPhone(e.target.value)}
                    placeholder={paymentMethod === 'mpesa' ? '+258 84 XXX XXXX' : '+258 86 XXX XXXX'}
                    className="w-full px-5 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-white outline-none transition-all"
                  />
                  {paymentMethod === 'mpesa' && (
                    <p className="text-[10px] text-zinc-400 mt-1">Os números M-Pesa começam com 84 ou 85</p>
                  )}
                  {paymentMethod === 'emola' && (
                    <p className="text-[10px] text-zinc-400 mt-1">Os números E-Mola começam com 86 ou 87</p>
                  )}
                </div>
              )}`;

for (const name of files) {
  const filePath = `${VARIANTS_DIR}/${name}.tsx`;
  let content = readFileSync(filePath, 'utf-8');

  // === STEP 1: Add new states after paymentMethod line ===
  // Find the paymentMethod useState declaration and add new states after it
  const pmRegex = /const \[paymentMethod, setPaymentMethod\] = useState<[^>]+>\([^)]+\);/;
  const pmMatch = content.match(pmRegex);
  if (pmMatch) {
    const idx = content.indexOf(pmMatch[0]) + pmMatch[0].length;
    // Check if new states already exist
    if (!content.includes('mobileMoneyPhone')) {
      content = content.slice(0, idx) + '\n' + NEW_STATES + content.slice(idx);
      console.log(`${name}: Added new states ✓`);
    } else {
      console.log(`${name}: States already exist ✓`);
    }
  }

  // === STEP 2: Replace handlePayment function ===
  // Find the old handlePayment - match from "const handlePayment" to the closing "}" before closeSuccessModal or return
  const hpRegex = /const handlePayment\s*=\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?\n\};/;
  const hpMatch = content.match(hpRegex);
  if (hpMatch && content.includes('mobileMoneyPhone')) {
    // Only replace if mobileMoneyPhone state was newly added (so we know it's a stale handlePayment)
    // Actually let's just always replace if the old pattern exists (no awaiting_confirmation check)
    if (!hpMatch[0].includes('resp.awaiting_confirmation') && !hpMatch[0].includes('mobileMoneyPhone')) {
      content = content.replace(hpMatch[0], NEW_HANDLE_PAYMENT);
      console.log(`${name}: handlePayment replaced ✓`);
    } else {
      console.log(`${name}: handlePayment already modern ✓`);
    }
  }

  // === STEP 3: Add polling useEffect before the return statement ===
  // Find "const closeSuccessModal = () =>" or just before "return ("
  if (!content.includes('Poll awaiting confirmation')) {
    const closeSuccessMatch = content.match(/const closeSuccessModal\s*=\s*\(\)\s*=>/);
    if (closeSuccessMatch) {
      content = content.replace(closeSuccessMatch[0], POLLING_EFFECT + '\n\n  ' + closeSuccessMatch[0]);
      console.log(`${name}: Polling useEffect added ✓`);
    }
  }

  // === STEP 4: Update submit button disabled prop ===
  // We need to add mobileMoneyPhone requirement for mobile money methods
  // This is harder since each variant has different button markup
  // Let's look for the onClick={handlePayment} button and wrap its disabled
  const submitBtnRegex = /(disabled=\{)([^}]+)(\}[\s\S]*?onClick=\{handlePayment\}[\s\S]*?\{submitting)/;
  const submitMatch = content.match(submitBtnRegex);
  if (submitMatch) {
    let newDisabled = submitMatch[2];
    // Add mobileMoneyPhone check if not already present
    if (!newDisabled.includes('mobileMoneyPhone')) {
      newDisabled = `${newDisabled} || ((paymentMethod === 'mpesa' || paymentMethod === 'emola') && !mobileMoneyPhone)`;
      content = content.replace(submitMatch[0], `disabled={${newDisabled}}${submitMatch[3]}`);
      console.log(`${name}: Submit button updated ✓`);
    }
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`${name}: Saved ✓`);
}

console.log('\nAll files updated!');
