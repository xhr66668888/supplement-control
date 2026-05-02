const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importSupplement } = require('../controllers/ocrController');

const router = Router();

// Configure multer for image uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `supplement-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp, bmp) are allowed'));
    }
  },
});

// POST /api/supplements/import — OCR import (alias for /api/ocr)
router.post('/import', upload.single('image'), importSupplement);

// POST /api/ocr — alias
router.post('/ocr', upload.single('image'), importSupplement);

module.exports = router;
