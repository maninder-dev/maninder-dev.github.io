const router = require('express').Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { toStoredPath, removeFile } = require('../utils/files');
const pick = require('../utils/pick');

const FIELDS = ['name', 'email', 'password', 'role', 'rollNo', 'course', 'phone'];

router.use(protect, adminOnly);

// GET /api/users?q=&role=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = String(req.query.role);
  if (req.query.q) {
    const rx = new RegExp(pick.escapeRegex(String(req.query.q)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { rollNo: rx }, { course: rx }];
  }
  res.json(await User.find(filter).sort({ createdAt: -1 }));
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// POST /api/users  (multipart, optional "avatar")
router.post('/', upload.single('avatar'), async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.avatar = toStoredPath(req.file) || '';
  res.status(201).json(await User.create(data));
});

// PUT /api/users/:id  (multipart, optional "avatar"; blank password keeps the old one)
router.put('/:id', upload.single('avatar'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    removeFile(toStoredPath(req.file));
    return res.status(404).json({ message: 'User not found' });
  }
  const data = pick(req.body, FIELDS);
  if (!data.password) delete data.password;
  if (user._id.equals(req.user._id)) delete data.role; // an admin can't demote themselves
  Object.assign(user, data);
  if (req.file) {
    removeFile(user.avatar);
    user.avatar = toStoredPath(req.file);
  }
  await user.save();
  res.json(user);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  if (req.user._id.equals(req.params.id)) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  removeFile(user.avatar);
  res.json({ message: 'User deleted' });
});

module.exports = router;
