async function calculateCommissionForSale(sale, user) {
  const rules = await CommissionRule.find({
    company: sale.company,
    userRole: user.role,
    isActive: true
  }).sort({ 'ranges.minQuantity': 1 });

  let applicableRule = null;
  let totalQuantityThisPeriod = 0;

  // 1. Somar quantidade vendida no período atual (exemplo mensal)
  const period = 'monthly'; // viria da regra ou config
  const start = getPeriodStart(new Date(), period);
  const end   = getPeriodEnd(new Date(), period);

  const match = {
    company: sale.company,
    createdAt: { $gte: start, $lt: end },
    status: { $in: ['Pago 100%', 'Pago 50%'] } // ou o que contar
  };

  if (sale.partnerId) match.partnerId = sale.partnerId;
  else if (sale.createdBy) match.createdBy = sale.createdBy;

  // Exemplo simples – soma quantidade de um target específico
  // Ajuste conforme necessário (pode ser soma ponderada, valor monetário, etc.)
  const agg = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    // aqui filtrar pelo targetType/targetId desejado
    { $group: { _id: null, totalQty: { $sum: '$items.quantity' } } }
  ]);

  totalQuantityThisPeriod = agg[0]?.totalQty || 0;

  // 2. Adicionar quantidade desta venda (se ainda não está no aggregate)
  const thisSaleQty = sale.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const projectedTotal = totalQuantityThisPeriod + thisSaleQty;

  // 3. Encontrar regra e tier
  for (const rule of rules) {
    if (!matchesTarget(rule, sale)) continue;

    const matchingRange = rule.ranges.find(r => 
      projectedTotal >= r.minQuantity && 
      (r.maxQuantity === null || projectedTotal <= r.maxQuantity)
    );

    if (matchingRange) {
      applicableRule = rule;
      const base = sale.total; // ou sale.items.reduce(...) se for por item
      let commission = 0;

      if (matchingRange.commissionType === 'percentage') {
        commission = base * (matchingRange.value / 100);
      } else {
        commission = matchingRange.value * thisSaleQty; // ou outra lógica
      }

      return {
        rule: rule._id,
        tier: matchingRange,
        projectedTotalQty: projectedTotal,
        commissionAmount: commission
      };
    }
  }

  return null; // sem comissão
}