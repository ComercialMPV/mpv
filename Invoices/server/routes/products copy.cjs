const express = require('express');
const Product = require('../models/Product.cjs');
const { auth } = require('../middleware/auth.cjs');
const upload = require('../middleware/upload.cjs');
const router = express.Router();

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
router.post('/', auth, async (req, res) => {
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
router.post('/:id/images', auth, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Nenhuma imagem foi enviada' });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Converter paths dos ficheiros para URLs públicas
    const imagePaths = req.files.map(file => `/uploads/images/${file.filename}`);

    // Adicionar às imagens existentes (ou criar novo array)
    product.images = [...(product.images || []), ...imagePaths];
    await product.save();

    res.json({
      message: 'Imagens enviadas com sucesso',
      images: product.images
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

module.exports = router;