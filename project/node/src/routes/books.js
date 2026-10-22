const router = require('express').Router();
const Book = require('../models/Book');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { toStoredPath, removeFile } = require('../utils/files');
const pick = require('../utils/pick');

const FIELDS = ['title', 'author', 'isbn', 'category', 'publishedYear', 'copies', 'description'];

router.use(protect);

// GET /api/books?q=&category=   (any logged-in user)
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = String(req.query.category);
  if (req.query.q) {
    const rx = new RegExp(pick.escapeRegex(String(req.query.q)), 'i');
    filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }, { category: rx }];
  }
  res.json(await Book.find(filter).sort({ createdAt: -1 }));
});

// GET /api/books/:id
router.get('/:id', async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  res.json(book);
});

// POST /api/books  (admin, multipart with optional "coverImage")
router.post('/', adminOnly, upload.single('coverImage'), async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.isbn) delete data.isbn; // empty ISBNs must be absent for the sparse unique index
  if (data.publishedYear === '') delete data.publishedYear;
  data.coverImage = toStoredPath(req.file) || '';
  data.createdBy = req.user._id;
  res.status(201).json(await Book.create(data));
});

// PUT /api/books/:id  (admin, multipart with optional "coverImage")
router.put('/:id', adminOnly, upload.single('coverImage'), async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) {
    removeFile(toStoredPath(req.file));
    return res.status(404).json({ message: 'Book not found' });
  }
  const data = pick(req.body, FIELDS);
  Object.assign(book, data);
  if (data.isbn === '') book.isbn = undefined;
  if (data.publishedYear === '') book.publishedYear = undefined;
  if (req.file) {
    removeFile(book.coverImage);
    book.coverImage = toStoredPath(req.file);
  }
  await book.save();
  res.json(book);
});

// DELETE /api/books/:id  (admin)
router.delete('/:id', adminOnly, async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  removeFile(book.coverImage);
  res.json({ message: 'Book deleted' });
});

module.exports = router;
