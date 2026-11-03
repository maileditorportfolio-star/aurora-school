const express = require('express');
const { upload } = require('../config/upload');
const { uploadImage } = require('../controllers/upload.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/image', requireAdmin, upload.single('image'), uploadImage);

module.exports = router;
