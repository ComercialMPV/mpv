import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { 
  ImagePlus, X, Loader2, AlertCircle, Link as LinkIcon, 
  Calendar, User, Clock, 
  LogOut
} from 'lucide-react';

type Account = {
  _id: string;
  pageName: string;
  instagramUsername: string;
};

type Post = {
  _id: string;
  postId: string;
  caption: string;
  imageUrl: string;
  publishedAt: string;
  account: {
    pageName: string;
    instagramUsername: string;
  };
};

export const SocialPublish: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Estados para criar publicação
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [connected, setConnected] = useState(false);

  // Estados para histórico
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Carregar contas conectadas
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.request('/social/accounts');
        const accs = res.accounts || [];
        setAccounts(accs);
        
        if (accs.length > 0) {
          setSelectedAccountId(accs[0]._id);
          setConnected(true);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar contas conectadas');
      }
    };
    fetchAccounts();
  }, []);

  // Carregar histórico quando mudar para a aba de histórico
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPosts();
    }
  }, [activeTab]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await api.request('/social/posts?limit=20');
      setPosts(res.posts || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar histórico de publicações');
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleConnect = async () => {
    try {
      const res = await api.request('/social/connect');
      window.location.href = res.authUrl;
    } catch (err) {
      toast.error('Erro ao iniciar conexão');
    }
  };
// ==================== DESCONECTAR CONTA ====================
const handleDisconnect = async (accountId: string) => {
  if (!confirm('Tem certeza que deseja desconectar esta conta social? Esta ação não pode ser desfeita.')) 
    return;

  try {
    const response = await api.social.disconnect(accountId);   // ← novo endpoint

    if (response.success) {
      // Atualiza a lista de contas
      setAccounts(prev => prev.filter(acc => acc._id !== accountId));

      // Se a conta desconectada era a selecionada, seleciona outra
      if (selectedAccountId === accountId) {
        const remainingAccounts = accounts.filter(acc => acc._id !== accountId);
        setSelectedAccountId(remainingAccounts[0]?._id || null);
      }

      toast.success('Conta desconectada com sucesso');
    }
  } catch (err: any) {
    console.error(err);
    toast.error(err.message || 'Erro ao desconectar conta');
  }
};
  const handlePublish = async () => {
    if (!selectedAccountId) {
      toast.error('Selecione uma conta conectada');
      return;
    }
    if (!imageFile) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (!caption.trim()) {
      toast.error('Escreva uma legenda');
      return;
    }

    setPublishing(true);
    try {
      // Upload da imagem
      const formData = new FormData();
      formData.append('file', imageFile);

      const uploadRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/uploads`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Falha no upload');

      const { url } = await uploadRes.json();

      // Publicar
      await api.request('/social/publish', {
        method: 'POST',
        body: JSON.stringify({
          caption,
          accountId: selectedAccountId,
          imageUrl: url
        })
      });

      toast.success('Post publicado com sucesso!');

      // Limpar formulário
      setCaption('');
      setImageFile(null);
      setImagePreview(null);

      // Atualizar histórico se estiver na aba de histórico
      if (activeTab === 'history') {
        fetchPosts();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao publicar');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Publicar nas Redes Sociais</h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas publicações no Instagram e Facebook
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'create'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Criar Publicação
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium text-sm transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Histórico de Publicações
        </button>
      </div>

      {!connected ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-amber-500 mb-6" />
          <h2 className="text-2xl font-semibold mb-3">Ainda não conectou suas redes</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Conecte sua conta do Facebook com Instagram Business para começar a publicar diretamente do Meu Ponto de Venda.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-medium hover:opacity-90 transition text-lg"
          >
            <LinkIcon className="mr-3 h-6 w-6" />
            Conectar Instagram & Facebook
          </button>
        </div>
      ) : (
        <>
          {/* ====================== ABA CRIAR PUBLICAÇÃO ====================== */}
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Formulário */}
              <div className="bg-white rounded-3xl shadow-lg p-8">
                <h2 className="text-2xl font-semibold mb-8">Nova Publicação</h2>

               {/* Seleção de Conta com Opção de Desconectar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700">Publicar como:</label>
                    {accounts.length > 1 && (
                      <span className="text-xs text-gray-500">Selecione ou desconecte</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {accounts.map((acc) => (
                      <div
                        key={acc._id}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition ${selectedAccountId === acc._id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {acc.instagramUsername?.[0]?.toUpperCase() || 'IG'}
                          </div>
                          <div>
                            <p className="font-medium">@{acc.instagramUsername}</p>
                            <p className="text-xs text-gray-500">{acc.pageName}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedAccountId(acc._id)}
                            className={`px-4 py-1.5 text-sm rounded-xl ${selectedAccountId === acc._id ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            Selecionar
                          </button>
                          <button
                            onClick={() => handleDisconnect(acc._id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                            title="Desconectar conta"
                          >
                            <LogOut size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload de imagem */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Imagem (obrigatória)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-3xl p-8 text-center hover:border-purple-400 transition">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="max-h-80 mx-auto rounded-2xl" />
                        <button
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-lg"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        <ImagePlus className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-gray-600">Clique ou arraste uma imagem aqui</p>
                        <p className="text-xs text-gray-500 mt-2">JPG ou PNG • Máx. 8MB</p>
                      </label>
                    )}
                  </div>
                </div>

                {/* Legenda */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Legenda
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Escreva a legenda do post... Use emojis 😊"
                    rows={5}
                    className="w-full border border-gray-300 rounded-3xl px-5 py-4 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  onClick={handlePublish}
                  disabled={publishing || !imageFile || !caption.trim()}
                  className={`w-full py-4 rounded-3xl font-bold text-lg transition-all ${
                    publishing || !imageFile || !caption.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-105'
                  }`}
                >
                  {publishing ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="animate-spin" size={22} />
                      A publicar...
                    </span>
                  ) : (
                    'Publicar agora no Instagram'
                  )}
                </button>
              </div>

              {/* Pré-visualização com dados reais da conta */}
              <div className="bg-gray-50 rounded-3xl p-8 border">
                <h2 className="text-2xl font-semibold mb-6">Pré-visualização</h2>
                {(() => {
                  const selectedAccount = accounts.find(acc => acc._id === selectedAccountId);
                  return imagePreview && selectedAccount ? (
                    <div className="bg-white rounded-3xl shadow p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {selectedAccount.instagramUsername?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">@{selectedAccount.instagramUsername}</p>
                          <p className="text-xs text-gray-500">{selectedAccount.pageName}</p>
                        </div>
                      </div>
                      <img src={imagePreview} alt="Preview" className="w-full rounded-2xl mb-4" />
                      <p className="text-gray-800 whitespace-pre-wrap">{caption || 'Sua legenda...'}</p>
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-gray-400 border border-dashed rounded-3xl">
                      Selecione uma imagem para ver a pré-visualização
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ====================== ABA HISTÓRICO ====================== */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-semibold">Histórico de Publicações</h2>
                <button 
                  onClick={fetchPosts}
                  className="text-purple-600 hover:text-purple-700 flex items-center gap-2 text-sm"
                >
                  <Clock size={18} /> Atualizar
                </button>
              </div>

              {loadingPosts ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="animate-spin h-10 w-10 text-purple-600" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  Ainda não tens publicações feitas através desta plataforma.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <div key={post._id} className="bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
                      <img 
                        src={post.imageUrl} 
                        alt="Post" 
                        className="w-full h-64 object-cover"
                      />
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <Calendar size={14} />
                          {new Date(post.publishedAt).toLocaleDateString('pt-MZ', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>

                        <p className="font-medium text-sm line-clamp-3 mb-4">
                          {post.caption || 'Sem legenda'}
                        </p>

                        <div className="text-xs text-purple-600 font-medium">
                          @{post.account?.instagramUsername || post.account?.pageName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};