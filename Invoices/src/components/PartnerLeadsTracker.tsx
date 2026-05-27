export const PartnerLeadsTracker = ({ leads }: { leads: any[] }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
        <h3 className="font-bold text-gray-800">Meus Leads em Negociação</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {leads.map(lead => (
          <div key={lead._id} className="p-4 flex justify-between items-center hover:bg-gray-50">
            <div>
              <p className="font-semibold text-gray-900">{lead.name}</p>
              <p className="text-xs text-gray-500">{lead.email}</p>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                lead.stage === 'negotiation' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {lead.stage}
              </span>
            </div>
            <div className="text-right">
  <p className="text-xs font-bold text-slate-400 uppercase">Potencial</p>
  <p className="text-sm font-black text-slate-700">MT {lead.value?.toLocaleString() || '0'}</p>
</div>
          </div>
        ))}
      </div>
    </div>
  );
};