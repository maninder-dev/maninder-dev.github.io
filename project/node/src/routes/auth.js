const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { toStoredPath, removeFile } = require('../utils/files');
const { signToken } = require('../utils/token');
const pick = require('../utils/pick');

const PROFILE_FIELDS = ['name', 'email', 'password', 'rollNo', 'course', 'phone'];

// POST /api/auth/register  (multipart, optional "avatar" image) -> always a student
router.post('/register', upload.single('avatar'), async (req, res) => {
  const data = pick(req.body, PROFILE_FIELDS);
  data.role = 'student';
  data.avatar = toStoredPath(req.file) || '';
  const user = await User.create(data);
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user));

// PUT /api/auth/me  (multipart) - update own profile / avatar; blank password keeps the old one
router.put('/me', protect, upload.single('avatar'), async (req, res) => {
  const user = await User.findById(req.user._id);
  const data = pick(req.body, PROFILE_FIELDS);
  if (!data.password) delete data.password;
  Object.assign(user, data);
  if (req.file) {
    removeFile(user.avatar);
    user.avatar = toStoredPath(req.file);
  }
  await user.save();
  res.json(user);
});

module.exports = router;
