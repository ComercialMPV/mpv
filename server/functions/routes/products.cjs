const express = require('express');
const Product = require('../models/Product.cjs');
const Sale = require('../models/Sale.cjs');
const { auth } = require('../middleware/auth.cjs');
const { parseMultipart, bucket } = require('../middleware/upload.cjs');
const { checkSubscriptionLimit } = require('../middleware/subscriptionLimit.cjs');

const router = express.Router();

/**
 * @route   GET /api/products/profit-stats
 * @desc    Estatísticas de lucro (realizado)
 */
router.get('/profit-stats', auth, async (req, res) => {
  try {
    const companyId = req.user.company._id;

    const result = await Sale.aggregate([
      { 
        $match: { 
          company: companyId,
          status: { $ne: 'Cancelada' }
        } 
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalProfit: { 
            $sum: { 
              $multiply: [
                '$items.quantity', 
                { $subtract: [
                    { $ifNull: ['$items.priceAtSale', 0] },
                    { $ifNull: ['$items.costPrice', { $ifNull: ['$productInfo.costPrice', 0] }] }
                  ] 
                }
              ] 
            } 
          }
        }
      }
    ]);

    const stats = result[0] || { totalRevenue: 0, totalProfit: 0 };

    res.json({
      lucroRealizado: Math.round(stats.totalProfit || 0),
      totalRevenue: Math.round(stats.totalRevenue || 0),
      success: true
    });

  } catch (error) {
    console.error('Erro ao calcular profit-stats:', error);
    res.status(500).json({ message: 'Erro ao calcular estatísticas de lucro' });
  }
});

/**
 * @route   GET /api/products
 * @desc    Listar todos os produtos (independentemente da categoria)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { category, isArchived } = req.query;
    
    // Filtros dinâmicos
    let query = { 
      company: req.user.company._id, 
      isActive: true 
    };

    if (category) query.category = category;
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar produtos' });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Obter detalhes completos de um produto (incluindo campos específicos do setor)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // 1. Procuramos o produto garantindo que pertence à empresa do utilizador
    const product = await Product.findOne({
      _id: req.params.id,
      company: req.user.company._id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado ou inativo.' });
    }

    // 2. Incrementar o contador de visualizações (View Count)
    // Usamos o findByIdAndUpdate para não disparar os middlewares de save desnecessariamente
    product.view_count = (product.view_count || 0) + 1;
    await product.save();

    // O objeto 'product' já virá com os campos específicos (ex: animalOrigin se for Talho)
    // porque o Mongoose identifica o discriminador pela chave 'category'
    res.json(product);
  } catch (error) {
    console.error(`Erro ao obter produto ${req.params.id}:`, error);
    res.status(500).json({ message: 'Erro ao processar a requisição do produto.' });
  }
});


/**
 * @route   POST /api/products
 * @desc    Criar produto usando Discriminators
 */
router.post('/', auth, checkSubscriptionLimit('products'), async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ message: 'A categoria é obrigatória para definir o tipo de produto.' });
    }

    // O Mongoose usará automaticamente o Discriminator correto baseado no campo 'category'
    // que definimos como discriminatorKey no Model.
    const product = new Product({
      ...req.body,
      company: req.user.company._id,
      createdBy: req.user._id // Opcional: rastro de quem criou
      
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(400).json({ message: error.message });
  }
});



/**
 * @route   PUT /api/products/:id
 * @desc    Atualizar produto (suporta campos específicos da categoria)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Nota: Evitamos mudar a 'category' de um produto já criado para não causar 
    // inconsistência nos campos específicos já gravados.
    const { category, ...updateData } = req.body;

    const product = await Product.findOneAndUpdate(
      { 
        _id: req.params.id, 
        company: req.user.company._id 
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Erro na atualização: ' + error.message });
  }
});

/**
 * @route   PATCH /api/products/:id/archive
 * @desc    Arquivar/Desarquivar produto (sem apagar)
 */
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.user.company._id });
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

    product.isArchived = !product.isArchived;
    await product.save();

    res.json({ message: product.isArchived ? 'Produto arquivado' : 'Produto restaurado', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
/**
 * @route   DELETE /api/products/:id
 * @desc    Desativar produto (Eliminação lógica)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Em sistemas ERP, evitamos apagar dados para manter histórico de faturas.
    // Marcamos apenas como inativo.
    const product = await Product.findOneAndUpdate(
      { 
        _id: req.params.id, 
        company: req.user.company._id 
      },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    res.json({ message: 'Produto removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover produto' });
  }
});

/**
 * @route   POST /api/products/:id/images
 * @desc    Fazer upload de imagens para um produto
 */
router.post('/:id/images', auth, async (req, res) => {
  try {
    // 1. Parseia o multipart com limite de 5 ficheiros
    const { files, fields } = await parseMultipart(req, {
      limits: {
        files: 5,                // máximo 5 imagens
        fileSize: 10 * 1024 * 1024  // 10MB por ficheiro
      }
    });

    // 2. Filtra apenas os ficheiros do campo 'images'
    const imageFiles = files.filter(f => f.fieldname === 'images');
    
    if (imageFiles.length === 0) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada no campo "images"' });
    }

    if (imageFiles.length > 5) {
      return res.status(400).json({ message: 'Máximo de 5 imagens permitidas por upload' });
    }

    // 3. Busca o produto
    const product = await Product.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // 4. Upload paralelo para o Google Cloud Storage
    const uploadPromises = imageFiles.map(async (file) => {
      const fileName = `products/${product._id}/${Date.now()}-${file.originalname}`;
      const blob = bucket.file(fileName);

      await blob.save(file.buffer, {
        metadata: { contentType: file.mimetype }
      });

      return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    });

    const newImageUrls = await Promise.all(uploadPromises);

    // 5. Adiciona as novas URLs ao array existente
    product.images = [...(product.images || []), ...newImageUrls];
    await product.save();

    res.json({
      message: 'Imagens enviadas com sucesso',
      images: product.images
    });
  } catch (error) {
    console.error('Erro no upload de imagens do produto:', error);
    res.status(500).json({ 
      message: error.message || 'Erro interno ao fazer upload das imagens' 
    });
  }
});

/**
 * @route   DELETE /api/products/:id/images
 * @desc    Remover uma imagem específica de um produto
 */
router.delete('/:id/images', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl é obrigatório' });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Remover a imagem do array
    product.images = product.images.filter((img) => img !== imageUrl);
    await product.save();

    res.json({
      message: 'Imagem removida com sucesso',
      images: product.images
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Adiciona no final do products.cjs (antes do module.exports)



module.exports = router;