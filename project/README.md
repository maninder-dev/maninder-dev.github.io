# Student Library — MEAN & MERN

One Node/Express + MongoDB API, two interchangeable frontends:

| Folder     | Stack                                   | URL                    |
|------------|-----------------------------------------|------------------------|
| `node/`    | Express 5, Mongoose, JWT, Multer        | http://localhost:5000  |
| `angular/` | Angular 20 (standalone) → **MEAN**      | http://localhost:4200  |
| `react/`   | React 19 + Vite + React Router → **MERN** | http://localhost:5173 |

## Features

- **Student registration / login** (JWT, bcrypt-hashed passwords), with optional profile photo
- **Roles**: `student` (browse books, edit own profile) and `admin` (everything below)
- **Books CRUD** (admin): title, author, ISBN, category, year, copies, description, **cover image upload**
- **Users CRUD** (admin): create/edit/delete students or admins, **avatar upload**
- Search on books and users; images stored in `node/uploads/` and served at `/uploads/...`

## Setup

```bash
# 1. API
cd node
npm install
# edit .env: replace <db_username> in MONGO_URI with your Atlas user, set JWT_SECRET
npm run seed        # creates admin@library.com / Admin@123 (from .env)
npm run dev

# 2a. MEAN frontend
cd angular && npm install && npm start

# 2b. MERN frontend
cd react && npm install && npm run dev
```

Both frontends talk to the same API, so data is shared between them. Change the API address in
`angular/src/environments/environment.ts` or `react/.env` (`VITE_API_URL`, see `.env.example`).

In MongoDB Atlas → Network Access, allow your IP address, or the API can't connect.

## API

| Method | Endpoint             | Access        | Notes                                   |
|--------|----------------------|---------------|-----------------------------------------|
| POST   | `/api/auth/register` | public        | multipart, `avatar` image; always student |
| POST   | `/api/auth/login`    | public        | `{ email, password }` → `{ token, user }` |
| GET    | `/api/auth/me`       | logged in     |                                         |
| PUT    | `/api/auth/me`       | logged in     | multipart, `avatar`; blank password = unchanged |
| GET    | `/api/books?q=`      | logged in     |                                         |
| GET    | `/api/books/:id`     | logged in     |                                         |
| POST   | `/api/books`         | admin         | multipart, `coverImage`                 |
| PUT    | `/api/books/:id`     | admin         | multipart, `coverImage`                 |
| DELETE | `/api/books/:id`     | admin         | also deletes the cover file             |
| GET    | `/api/users?q=&role=`| admin         |                                         |
| GET    | `/api/users/:id`     | admin         |                                         |
| POST   | `/api/users`         | admin         | multipart, `avatar`                     |
| PUT    | `/api/users/:id`     | admin         | multipart, `avatar`                     |
| DELETE | `/api/users/:id`     | admin         | can't delete yourself                   |

Send `Authorization: Bearer <token>` on protected routes. Images: JPG/PNG/GIF/WEBP, max 2 MB.
