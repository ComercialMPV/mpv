     const form = document.getElementById('public-form');
    const itemsContainer = document.getElementById('items-container');
    const addBtn = document.getElementById('add-item');
    const subtotalEl = document.getElementById('subtotal');
    const penaltyEl = document.getElementById('penalty');
    const penaltyRow = document.getElementById('penalty-row');
    const grandTotalEl = document.getElementById('grandTotal');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');

   let services = window.servicesData || [];// backend injects JSON array of services

    function updateTotals() {
      let subtotal = 0;
      let minInstall = 99;
      let maxPenaltyPct = 0;

      document.querySelectorAll('.item-row').forEach(row => {
        const select = row.querySelector('select');
        const qty = parseInt(row.querySelector('input[type="number"]').value) || 1;
        const service = services.find(s => s._id === select.value);
        if (service) {
          subtotal += service.basePrice * qty;
          if (service.allowedInstallments < minInstall) minInstall = service.allowedInstallments;
          if (service.penaltyPercentagePerInstallment > maxPenaltyPct) maxPenaltyPct = service.penaltyPercentagePerInstallment;
        }
      });

      const installments = parseInt(document.querySelector('[name="requestedInstallments"]').value) || 1;
      let penalty = 0;
      if (installments > minInstall) {
        const extra = installments - minInstall;
        penalty = subtotal * (extra * (maxPenaltyPct / 100));
        penaltyRow.classList.remove('hidden');
      } else {
        penaltyRow.classList.add('hidden');
      }

      subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
      penaltyEl.textContent = `+$${penalty.toFixed(2)}`;
      grandTotalEl.textContent = `$${(subtotal + penalty).toFixed(2)}`;
    }

    addBtn.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'item-row flex items-end gap-4 border-b pb-4';
      row.innerHTML = `
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
          <select class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[var(--primary)]">
            <option value="">Selecione...</option>
            ${services.map(s => `<option value="${s._id}">${s.name} - $${s.basePrice.toFixed(2)}</option>`).join('')}
          </select>
        </div>
        <div class="w-24">
          <label class="block text-sm font-medium text-gray-700 mb-1">Qtd</label>
          <input type="number" min="1" value="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-center" />
        </div>
        <button type="button" class="text-red-500 hover:text-red-700 p-2">
          <svg class="lucide lucide-trash-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      `;
      itemsContainer.appendChild(row);
      row.querySelectorAll('select, input').forEach(el => el.addEventListener('change', updateTotals));
      row.querySelector('button').addEventListener('click', () => { row.remove(); updateTotals(); });
      updateTotals();
    });

    document.querySelector('[name="requestedInstallments"]').addEventListener('change', updateTotals);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      submitBtn.disabled = true;
      btnText.textContent = 'Processando...';

      const formData = new FormData(form);
      const data = {
        companyId: "{{company._id}}",
        clientData: {
          name: formData.get('client.name'),
          contactPerson: formData.get('client.contactPerson'),
          email: formData.get('client.email'),
          // ... collect other fields
          origin: 'external'
        },
        requisitionData: {
          items: [], // collect from .item-row
          requestedInstallments: parseInt(formData.get('requestedInstallments')),
          deliveryDate: formData.get('deliveryDate'),
          notes: formData.get('notes')
        }
      };

      // Collect items
      document.querySelectorAll('.item-row').forEach(row => {
        const serviceId = row.querySelector('select').value;
        const quantity = parseInt(row.querySelector('input[type="number"]').value) || 1;
        if (serviceId) data.requisitionData.items.push({ serviceId, quantity });
      });

      try {
        const res = await fetch('/api/requisitions/public-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Falha no envio');
        alert('Requisição enviada com sucesso!');
        form.reset();
        itemsContainer.innerHTML = '';
        updateTotals();
      } catch (err) {
        alert('Erro: ' + err.message);
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Enviar Requisição';
      }
    });

    // Initial totals
    updateTotals();
    // Extra client-side honeypot defense (optional but recommended)
document.addEventListener('DOMContentLoaded', () => {
  const honeypot = document.querySelector('input[name="website_url"]');
  if (honeypot) {
    honeypot.value = ''; // force empty on load
    // Some advanced bots try to fill on focus — we can reset
    honeypot.addEventListener('focus', () => {
      honeypot.value = '';
    });
  }

  // Optional: disable submit if honeypot filled (extra paranoia)
  const form = document.getElementById('public-form');
  form.addEventListener('submit', (e) => {
    if (honeypot && honeypot.value.trim() !== '') {
      e.preventDefault();
      alert('Por favor, não preencha campos ocultos.');
      return false;
    }
  });
});
