const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../middleware/upload');

// Images are stored in Mongo as "uploads/<filename>"
const toStoredPath = (file) => (file ? `uploads/${file.filename}` : undefined);

function removeFile(storedPath) {
  if (!storedPath) return;
  const full = path.join(UPLOAD_DIR, path.basename(storedPath));
  fs.unlink(full, () => {});
}

module.exports = { toStoredPath, removeFile };
