const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth.cjs');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const SocialAccount = require('../models/SocialAccount.cjs');
const SocialPost = require('../models/SocialPost.cjs');

// ==================== 1. CONECTAR CONTA (OAuth) ====================
router.get('/connect', auth, (req, res) => {
  const redirectUri = `${process.env.CLIENT_URL}/social/callback`;
  
  const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?` +
    `client_id=${process.env.META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=pages_show_list,pages_manage_posts,instagram_basic,instagram_content_publish,business_management` +
    `&response_type=code` +
    `&state=${req.user._id}`;

  res.json({ authUrl });
});

// ==================== 2. CALLBACK + SALVAR TOKEN LONGO ====================
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ message: 'Código não recebido' });

  try {
    // 1. Trocar code por short-lived token
    const tokenRes = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.CLIENT_URL}/social/callback`,
        code
      }
    });

    const shortToken = tokenRes.data.access_token;

    // 2. Trocar por long-lived token (60 dias)
    const longTokenRes = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortToken
      }
    });

    const longLivedToken = longTokenRes.data.access_token;

    // 3. Obter páginas e contas Instagram ligadas
    const pagesRes = await axios.get(`https://graph.facebook.com/v20.0/me/accounts?access_token=${longLivedToken}`);
    
    const page = pagesRes.data.data[0]; // pegamos a primeira página (podes melhorar depois)

    // 4. Obter Instagram Business ID
    const igRes = await axios.get(
      `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${longLivedToken}`
    );

    const igBusinessId = igRes.data.instagram_business_account?.id;

    if (!igBusinessId) {
      return res.status(400).json({ message: 'Esta página não tem Instagram Business ligado' });
    }

    // 5. Guardar no banco
    await SocialAccount.create({
      company: req.user.company._id,
      user: req.user._id,
      facebookPageId: page.id,
      pageName: page.name,
      instagramBusinessId: igBusinessId,
      instagramUsername: igRes.data.instagram_business_account.username || '',
      longLivedToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // ~60 dias
    });

    res.redirect(`${process.env.CLIENT_URL}/social-publish?success=true`);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ message: 'Erro ao conectar conta' });
  }
});



// ==================== 2. EXCHANGE CODE (NOVO - chamado pelo frontend) ====================
router.post('/exchange', auth, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ 
      success: false, 
      message: 'Código de autorização não recebido' 
    });
  }

  try {
    // 1. Trocar code por short-lived token
    const tokenRes = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.CLIENT_URL}/social/callback`,   // ← Deve ser igual ao usado no /connect
        code
      }
    });

    const shortToken = tokenRes.data.access_token;

    // 2. Trocar por long-lived token (60 dias)
    const longTokenRes = await axios.get(`https://graph.facebook.com/v20.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortToken
      }
    });

    const longLivedToken = longTokenRes.data.access_token;

    // 3. Obter páginas do Facebook
    const pagesRes = await axios.get(`https://graph.facebook.com/v20.0/me/accounts?access_token=${longLivedToken}`);
    
    if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
  return res.status(400).json({ 
    success: false, 
    message: 'Não foram encontradas páginas do Facebook. Verifique se tem uma Página ligada à sua conta e se concedeu a permissão business_management.' 
  });
}

    const page = pagesRes.data.data[0]; // Pegamos a primeira página (podes melhorar depois)

    // 4. Obter Instagram Business Account
    const igRes = await axios.get(
      `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${longLivedToken}`
    );

    const igBusinessId = igRes.data.instagram_business_account?.id;

    if (!igBusinessId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Esta página não tem uma conta Instagram Business ligada. Por favor configura no Meta Business Suite.' 
      });
    }

    // 5. Guardar no banco de dados
    await SocialAccount.create({
      company: req.user.company._id,
      user: req.user._id,
      facebookPageId: page.id,
      pageName: page.name,
      instagramBusinessId: igBusinessId,
      instagramUsername: igRes.data.instagram_business_account?.username || '',
      longLivedToken,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 dias
    });

    res.json({ 
      success: true, 
      message: 'Conta conectada com sucesso!',
      instagramUsername: igRes.data.instagram_business_account?.username
    });

  } catch (err) {
    console.error('Erro no /exchange:', err.response?.data || err.message);

    const errorMessage = err.response?.data?.error?.message || err.message;

    res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar conexão com o Facebook/Instagram',
      details: errorMessage 
    });
  }
});

// ==================== 3. LISTAR CONTAS CONECTADAS ====================
router.get('/accounts', auth, async (req, res) => {
  try {
    const accounts = await SocialAccount.find({
      company: req.user.company._id,
      isActive: true
    })
    .select('-longLivedToken') // não devolve o token por segurança
    .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      accounts 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar contas conectadas' 
    });
  }
});

// ==================== 4. PUBLICAR POST (IMAGEM) - VERSÃO MELHORADA ====================
router.post('/publish', auth, async (req, res) => {
  try {
    const { caption, accountId, imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'URL da imagem é obrigatória' });
    }

    const account = await SocialAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    // 1. Criar o container
    const containerRes = await axios.post(
      `https://graph.facebook.com/v20.0/${account.instagramBusinessId}/media`,
      {
        image_url: imageUrl,
        caption: caption || '',
        access_token: account.longLivedToken
      }
    );

    const creationId = containerRes.data.id;

    if (!creationId) {
      return res.status(500).json({ message: 'Não foi possível criar o container' });
    }

    // 2. Esperar até o container estar pronto (polling)
    let attempts = 0;
    const maxAttempts = 15; // máximo ~30 segundos (2s por tentativa)

    while (attempts < maxAttempts) {
      attempts++;

      const statusRes = await axios.get(
        `https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status`,
        {
          params: { access_token: account.longLivedToken }
        }
      );

      const statusCode = statusRes.data.status_code;

      if (statusCode === 'FINISHED') {
        break; // pronto para publicar
      }

      if (statusCode === 'ERROR') {
        return res.status(400).json({ 
          message: 'Erro ao processar a imagem no Instagram: ' + (statusRes.data.status || 'desconhecido')
        });
      }

      // Ainda em processamento → espera 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (attempts >= maxAttempts) {
      return res.status(408).json({ 
        message: 'A imagem demorou demasiado tempo a ser processada pelo Instagram. Tenta novamente.' 
      });
    }

    // 3. Publicar
    const publishRes = await axios.post(
      `https://graph.facebook.com/v20.0/${account.instagramBusinessId}/media_publish`,
      {
        creation_id: creationId,
        access_token: account.longLivedToken
      }
    );

   // Guardar no histórico
await SocialPost.create({
  company: req.user.company._id,
  user: req.user._id,
  account: account._id,
  instagramBusinessId: account.instagramBusinessId,
  postId: publishRes.data.id,
  caption: caption || '',
  imageUrl: imageUrl,
  status: 'published',
  publishedAt: new Date()
});

res.json({
  success: true,
  postId: publishRes.data.id,
  message: 'Publicado com sucesso no Instagram!'
});

  } catch (err) {
    console.error('Erro ao publicar:', err.response?.data || err.message);
    
    const errorData = err.response?.data?.error || {};
    
    res.status(500).json({ 
      message: errorData.error_user_msg || errorData.message || 'Erro ao publicar no Instagram',
      code: errorData.code,
      subcode: errorData.error_subcode
    });
  }
});
// ==================== 5. LISTAR PUBLICAÇÕES FEITAS ====================
router.get('/posts', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const posts = await SocialPost.find({
      company: req.user.company._id
    })
    .populate('account', 'pageName instagramUsername')
    .sort({ publishedAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

    const total = await SocialPost.countDocuments({
      company: req.user.company._id
    });

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar publicações' 
    });
  }
});
// ==================== DESCONECTAR CONTA SOCIAL ====================
router.delete('/disconnect/:accountId', auth, async (req, res) => {
  try {
    const { accountId } = req.params;

    const account = await SocialAccount.findOne({
      _id: accountId,
      company: req.user.company._id   // Segurança: só pode apagar da própria empresa
    });

    if (!account) {
      return res.status(404).json({ message: 'Conta social não encontrada' });
    }

    await SocialAccount.deleteOne({ _id: accountId });

    // Opcional: também podes apagar as publicações associadas
    // await SocialPost.deleteMany({ account: accountId });

    res.json({
      success: true,
      message: 'Conta desconectada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao desconectar conta social:', error);
    res.status(500).json({ message: 'Erro ao desconectar conta' });
  }
});

module.exports = router;