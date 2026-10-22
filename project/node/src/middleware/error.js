const multer = require('multer');
const { toStoredPath, removeFile } = require('../utils/files');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, _next) {
  // Discard an image that was uploaded as part of a request that failed
  if (req.file) removeFile(toStoredPath(req.file));

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller' : err.message;
    return res.status(400).json({ message });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid ${err.path}` });
  if (err.code === 11000) {
    return res.status(409).json({ message: `${Object.keys(err.keyValue || {}).join(', ')} already exists` });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
};
