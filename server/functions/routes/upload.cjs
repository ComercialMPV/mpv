// routes/upload.cjs  (ou onde tens as tuas rotas)

const express = require('express');
const router = express.Router();
const { parseMultipart, bucket } = require('../middleware/upload.cjs');

router.post('/uploads', async (req, res) => {
  try {
    const { files } = await parseMultipart(req);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado' });
    }

    const file = files[0];
    const fileName = `uploads/${Date.now()}-${file.originalname}`;

    // Upload para Google Cloud Storage
    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on('error', (err) => {
      console.error(err);
      res.status(500).json({ message: 'Erro ao fazer upload' });
    });

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      res.json({
        success: true,
        url: publicUrl,
        fileName: fileName
      });
    });

    blobStream.end(file.buffer);

  } catch (err) {
    console.error('Erro no upload:', err);
    res.status(500).json({ message: 'Erro interno no upload' });
  }
});

module.exports = router;