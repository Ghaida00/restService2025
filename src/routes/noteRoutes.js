const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');

// POST /api/notes - Membuat catatan baru
// Memerlukan autentikasi
router.post('/', verifyFirebaseToken, noteController.createNote);

// GET /api/notes - Mendapatkan semua catatan milik pengguna yang login
// Memerlukan autentikasi
router.get('/', verifyFirebaseToken, noteController.getUserNotes);

// GET /api/notes/public - Mendapatkan semua catatan untuk tampilan publik
router.get('/public', noteController.getAllPublicNotes); 

// GET /api/notes/:noteId - Mendapatkan detail satu catatan
// Memerlukan autentikasi, dan pengguna harus pemilik catatan atau admin
router.get('/:noteId', verifyFirebaseToken, noteController.getNoteById);

// PUT /api/notes/:noteId - Memperbarui catatan
// Memerlukan autentikasi, dan pengguna harus pemilik catatan
router.put('/:noteId', verifyFirebaseToken, noteController.updateNote);

// DELETE /api/notes/:noteId - Menghapus catatan
// Memerlukan autentikasi, dan pengguna harus pemilik catatan
router.delete('/:noteId', verifyFirebaseToken, noteController.deleteNote);

module.exports = router;