import React, { useState, useEffect } from 'react';
import { 
  X, Search, Plus, Trash2, FileUp, Link as LinkIcon, 
  Mail, Users, Package, Send, Loader2, CheckCircle2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api, Product, Service, Bundle, Client, Lead, documentsApi } from '../services/api'; // ajuste o path
import { ImageUploader } from './ImageUploader';

type SelectableItem = Client | Lead;
type ProposalItemType = 'product' | 'service' | 'bundle';

interface ProposalItem {
  type: ProposalItemType;
  id: string;
  name: string;
  price?: number;
  quantity?: number;
}

interface ShareProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelected?: SelectableItem[];          // leads ou clientes já selecionados
  mode: 'leads' | 'clients';                   // para ajustar labels e API
  title?: string;
}

export const ShareProposalModal: React.FC<ShareProposalModalProps> = ({
  isOpen,
  onClose,
  initialSelected = [],
  mode = 'leads',
  title = mode === 'leads' ? 'Enviar Proposta a Leads' : 'Enviar Proposta a Clientes'
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=selecionar contactos, 2=itens, 3=anexos & envio

  // ── Seleção de contactos ───────────────────────────────────────
  const [selectedContacts, setSelectedContacts] = useState<SelectableItem[]>(initialSelected);
  const [searchContact, setSearchContact] = useState('');
  const [allContacts, setAllContacts] = useState<SelectableItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // ── Itens da proposta ──────────────────────────────────────────
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBundles, setAllBundles] = useState<Bundle[]>([]);
  const [searchItem, setSearchItem] = useState('');

  // ── Anexos & mensagem ──────────────────────────────────────────
  const [files, setFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>(['']);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('Proposta Personalizada - [Sua Empresa]');
  const [sending, setSending] = useState(false);
const [uploadedAttachmentUrls, setUploadedAttachmentUrls] = useState<string[]>([]);
  // Carregar contactos e catálogo
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        setLoadingContacts(true);

        // Carregar contactos
        let contactsData: SelectableItem[] = [];
        if (mode === 'leads') {
          contactsData = await api.leads.getAll({});
        } else {
          contactsData = (await api.clients.getAll({ limit: 200 })).clients;
        }
        setAllContacts(contactsData);

        // Carregar catálogo
        const [prods, servs, bundles] = await Promise.all([
          api.products.getAll(),
          api.services.getAll(),
          api.bundles.getAll()
        ]);
        setAllProducts(prods);
        setAllServices(servs);
        setAllBundles(bundles.filter(b => b.isActive));

      } catch (err) {
        toast.error('Não foi possível carregar os dados');
        console.error(err);
      } finally {
        setLoadingContacts(false);
      }
    };

    loadData();
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // ── Handlers ───────────────────────────────────────────────────

  const toggleContact = (contact: SelectableItem) => {
    setSelectedContacts(prev => 
      prev.some(c => c._id === contact._id)
        ? prev.filter(c => c._id !== contact._id)
        : [...prev, contact]
    );
  };

  const addProposalItem = (type: ProposalItemType, item: any) => {
    const alreadyAdded = proposalItems.some(i => i.id === item._id && i.type === type);
    if (alreadyAdded) {
      toast('Item já adicionado', { icon: 'ℹ️' });
      return;
    }

    setProposalItems(prev => [
      ...prev,
      {
        type,
        id: item._id,
        name: item.name,
        price: item.basePrice || item.price || item.billingPricePerCycle,
        quantity: 1
      }
    ]);
    setSearchItem('');
  };

  const removeProposalItem = (id: string, type: ProposalItemType) => {
    setProposalItems(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const addLink = () => setLinks(prev => [...prev, '']);
  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };
  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
 


const handleSend = async () => {
  if (selectedContacts.length === 0) {
    toast.error('Selecione pelo menos um contacto');
    return;
  }
  if (proposalItems.length === 0) {
    toast.error('Adicione pelo menos um item à proposta');
    return;
  }

  setSending(true);

  try {
    const primaryContact = selectedContacts[0];
    const payload = {
      recipients: selectedContacts.map(c => ({
        id: c._id,
        type: mode === 'leads' ? 'lead' : 'client',
        email: (c as any).email || '',
        name: (c as any).name || ''
      })).filter(r => r.email),
      clientId: primaryContact._id,
      subject: subject.trim() || `Proposta Personalizada - ${new Date().toLocaleDateString('pt-MZ')}`,
      message: message.trim(),

      items: proposalItems.map(item => ({
        type: item.type,
        id: item.id,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0
      })),

      links: links.filter(l => l.trim()),

      // Anexos: apenas os campos obrigatórios do schema (filename + publicUrl)
      attachments: uploadedAttachmentUrls.map(url => ({
        filename: url.split('/').pop() || 'anexo-desconhecido',
        publicUrl: url,
        size: 0 
        // NÃO envia gcsPath, mimetype, size → são opcionais agora
      })),

      expiresInDays: 15
    };

    console.log('[DEBUG] Enviando payload para /proposals:', payload); // ← para depurar (remove depois)

    // Chamada ao endpoint /proposals
    const response = await api.request('/proposals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (response.success) {
      toast.success(`Proposta enviada com sucesso para ${selectedContacts.length} contacto(s)!`);
      resetAndClose();
    } else {
      throw new Error(response.message || 'Falha na resposta do servidor');
    }
  } catch (err: any) {
    console.error('Erro ao enviar proposta:', err);
    toast.error(err.message || err.response?.data?.message || 'Falha ao enviar proposta');
  } finally {
    setSending(false);
  }
};

  const resetAndClose = () => {
    setStep(1);
    setSelectedContacts(initialSelected);
    setProposalItems([]);
    setFiles([]);
    setLinks(['']);
    setMessage('');
    setSubject('Proposta Personalizada - [Sua Empresa]');
    onClose();
  };

  // ── Render por etapa ───────────────────────────────────────────

  const renderContactSelection = () => (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-lg"
          placeholder={`Pesquisar ${mode === 'leads' ? 'leads' : 'clientes'}...`}
          value={searchContact}
          onChange={e => setSearchContact(e.target.value)}
        />
      </div>

      <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
        {loadingContacts ? (
          <div className="p-8 text-center text-gray-500">A carregar...</div>
        ) : allContacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum contacto encontrado</div>
        ) : (
          allContacts
            .filter(c => 
              (c as any).name?.toLowerCase().includes(searchContact.toLowerCase()) ||
              (c as any).email?.toLowerCase().includes(searchContact.toLowerCase())
            )
            .map(contact => {
              const isSelected = selectedContacts.some(s => s._id === contact._id);
              return (
                <div
                  key={contact._id}
                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleContact(contact)}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{(contact as any).name}</div>
                    <div className="text-sm text-gray-500 truncate">{(contact as any).email || 'sem email'}</div>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600">
          Selecionados: <strong>{selectedContacts.length}</strong>
        </div>
        <button
          onClick={() => setStep(2)}
          disabled={selectedContacts.length === 0}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-blue-700 transition"
        >
          Próximo: Itens da Proposta
        </button>
      </div>
    </div>
  );

  const renderItemsSelection = () => (
    <div className="space-y-6">
      {/* Busca de itens */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-lg"
          placeholder="Procurar produto, serviço ou pacote..."
          value={searchItem}
          onChange={e => setSearchItem(e.target.value)}
        />

        {searchItem && (
          <div className="absolute w-full bg-white border rounded-lg mt-1 max-h-64 overflow-y-auto shadow-xl z-10 divide-y">
            {/* Produtos */}
            {allProducts
              .filter(p => p.name.toLowerCase().includes(searchItem.toLowerCase()))
              .map(p => (
                <div
                  key={p._id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                  onClick={() => addProposalItem('product', p)}
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">Produto • {p.basePrice?.toLocaleString()} MT</div>
                  </div>
                  <Plus size={18} className="text-blue-600" />
                </div>
              ))}

            {/* Serviços */}
            {allServices
              .filter(s => s.name.toLowerCase().includes(searchItem.toLowerCase()))
              .map(s => (
                <div
                  key={s._id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                  onClick={() => addProposalItem('service', s)}
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">Serviço • {s.basePrice?.toLocaleString()} MT</div>
                  </div>
                  <Plus size={18} className="text-blue-600" />
                </div>
              ))}

            {/* Bundles / Combos */}
            {allBundles
              .filter(b => b.name.toLowerCase().includes(searchItem.toLowerCase()))
              .map(b => (
                <div
                  key={b._id}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                  onClick={() => addProposalItem('bundle', b)}
                >
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-purple-600">{b.type} • {b.price?.toLocaleString()} MT</div>
                  </div>
                  <Plus size={18} className="text-purple-600" />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Itens selecionados */}
      <div className="border rounded-lg divide-y min-h-[180px] bg-gray-50">
        {proposalItems.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Nenhum item adicionado à proposta ainda
          </div>
        ) : (
          proposalItems.map(item => (
            <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {item.type} • {item.price?.toLocaleString() || '?'} MT
                </div>
              </div>
              <button
                onClick={() => removeProposalItem(item.id, item.type)}
                className="text-red-600 hover:text-red-800 p-1"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={() => setStep(1)}
          className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Voltar
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={proposalItems.length === 0}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 hover:bg-green-700 transition"
        >
          <Send size={18} /> Próximo: Anexos & Envio
        </button>
      </div>
    </div>
  );

  const renderAttachmentsAndSend = () => (
    <div className="space-y-6">
      {/* Assunto & Mensagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assunto do Email</label>
        <input
          className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem personalizada (opcional)</label>
        <textarea
          className="w-full px-4 py-3 border rounded-lg min-h-[120px] focus:ring-2 focus:ring-blue-500"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ex: Encontrará em anexo a proposta personalizada com os valores negociados..."
        />
      </div>

      {/* Área de anexos – usando ImageUploader reutilizado */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
      <FileUp size={18} /> Anexar ficheiros (PDF, imagem, contrato, etc.)
    </label>

    <ImageUploader
      itemId="temp-proposal"               // valor dummy, pois não estamos ligando a um item real
      itemType="proposal"                  // novo tipo para lógica interna
      acceptAnyFile={true}                 // ← ativa modo genérico
      accept="*/*"                         // qualquer ficheiro
      maxFiles={5}                         // limite razoável para propostas
      existingImages={[]}                  // começa vazio
      onImagesUpdated={(uploadedUrls) => {
        // Aqui guardamos os URLs retornados para usar no payload
        setUploadedAttachmentUrls(uploadedUrls);
      }}
    />
  </div>

      {/* Links */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
            <LinkIcon size={18} /> Links para documentos / Google Drive / Dropbox...
          </label>
          <button
            type="button"
            onClick={addLink}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <Plus size={14} /> Adicionar link
          </button>
        </div>

        {links.map((link, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              className="flex-1 px-4 py-2 border rounded-lg"
              placeholder="https://..."
              value={link}
              onChange={e => updateLink(idx, e.target.value)}
            />
            {links.length > 1 && (
              <button
                onClick={() => removeLink(idx)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Resumo & Enviar */}
      <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Mail size={18} /> Resumo do envio
        </h4>
        <ul className="space-y-1.5 text-sm">
          <li>Para: <strong>{selectedContacts.length} contacto(s)</strong></li>
          <li>Itens na proposta: <strong>{proposalItems.length}</strong></li>
          <li>Ficheiros anexados: <strong>{files.length}</strong></li>
          <li>Links incluídos: <strong>{links.filter(l => l.trim()).length}</strong></li>
        </ul>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={() => setStep(2)}
          className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-8 py-3 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-60 transition shadow-sm"
        >
          {sending ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Enviando...
            </>
          ) : (
            <>
              <Send size={18} />
              Enviar Proposta por Email
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Passo {step} de 3 • {selectedContacts.length} contacto(s) selecionado(s)
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 hover:bg-gray-200 rounded-full transition"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 p-6 overflow-y-auto">
          {step === 1 && renderContactSelection()}
          {step === 2 && renderItemsSelection()}
          {step === 3 && renderAttachmentsAndSend()}
        </div>
      </div>
    </div>
  );
};