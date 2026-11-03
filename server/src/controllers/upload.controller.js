const ApiError = require('../utils/ApiError');

/** POST /api/admin/uploads/image — stores an uploaded image (student photos, banners). */
const uploadImage = (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');

  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url } });
};

module.exports = { uploadImage };
