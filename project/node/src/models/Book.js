const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    author: { type: String, required: [true, 'Author is required'], trim: true },
    isbn: { type: String, trim: true, unique: true, sparse: true },
    category: { type: String, trim: true, default: 'General' },
    publishedYear: { type: Number, min: 0 },
    copies: { type: Number, min: 0, default: 1 },
    description: { type: String, trim: true },
    coverImage: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

bookSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Book', bookSchema);
