// middleware/upload.cjs  (new version – no Multer)
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const Busboy = require('busboy');

const keyPath = path.join(__dirname, '../google-credentials.json');

const storageClient = new Storage({
  keyFilename: keyPath,
  projectId: 'brendkit-3d0ad'
});

const bucket = storageClient.bucket('brendkit-3d0ad.appspot.com');

// Export a Busboy-based parser factory
const parseMultipart = (req, options = {}) => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        ...options.limits
      }
    });

    const files = [];
    const fields = {};

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const buffers = [];
      file.on('data', (data) => buffers.push(data));
      file.on('end', () => {
        const buffer = Buffer.concat(buffers);
        files.push({
          fieldname,
          originalname: filename.filename || filename,
          mimetype,
          size: buffer.length,
          buffer
        });
      });
    });

    busboy.on('finish', () => {
      resolve({ files, fields });
    });

    busboy.on('error', reject);

    // Critical: use .end(rawBody) instead of pipe
    if (req.rawBody) {
      busboy.end(req.rawBody);
    } else {
      req.pipe(busboy);
    }
  });
};

module.exports = { parseMultipart, bucket };