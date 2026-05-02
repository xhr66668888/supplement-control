require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');

// -- Route imports --
const authRouter        = require('./routes/auth');
const usersRouter       = require('./routes/users');
const supplementsRouter = require('./routes/supplements');
const inventoryRouter   = require('./routes/inventory');
const elementsRouter    = require('./routes/elements');
const dashboardRouter   = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
initDb();

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);

// Protected routes (require JWT)
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/inventory', requireAuth, inventoryRouter);
app.use('/api/supplements', requireAuth, supplementsRouter);
app.use('/api/elements', requireAuth, elementsRouter);
app.use('/api/users', requireAuth, usersRouter);

// Onboarding alias (uses auth controller with JWT)
const { completeProfile } = require('./controllers/authController');
const { importSupplement } = require('./controllers/ocrController');
const multer = require('multer');
const fs = require('fs');
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const ocrUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp, bmp) are allowed'));
    }
  },
});

app.post('/api/onboard', requireAuth, completeProfile);
app.post('/api/ocr', requireAuth, ocrUpload.single('image'), importSupplement);

// Health check
app.get('/api/health', (_req, res) => {
  const { getDb } = require('./config/database');
  let dbOk = true;
  try { getDb().prepare('SELECT 1').get(); } catch { dbOk = false; }
  res.json({ status: dbOk ? 'ok' : 'degraded', timestamp: new Date().toISOString() });
});

// Fallback: SPA
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] Bio-Nutrient Manager running at http://localhost:${PORT}`);
});

module.exports = app;
