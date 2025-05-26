const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const noteController = require('../controllers/noteController');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');

// POST /api/notes - Membuat catatan baru
// Memerlukan autentikasi
router.post('/', verifyFirebaseToken,
    [
        body('pesan')
            .notEmpty().withMessage('Kolom pesan tidak boleh kosong.')
            .trim()
            .isLength({ min: 1 }).withMessage('Pesan minimal 1 karakter.'),

        body('penerima')
            .optional() // Opsional
            .isString().withMessage('Penerima harus berupa teks.')
            .trim(),

        body('pengirim')
            .optional() // Opsional
            .isString().withMessage('Pengirim harus berupa teks.')
            .trim(),

        body('gambar')
            .optional({ checkFalsy: true }) // Opsional, checkFalsy agar string kosong juga dianggap "tidak ada"
            .isURL().withMessage('Format URL gambar tidak valid.'),
        
        body('idMusic')
            .optional() // Opsional
            .isString().withMessage('ID Musik harus berupa teks.')
            .trim()
    ],
    noteController.createNote);

// GET /api/notes - Mendapatkan semua catatan milik pengguna yang login
// Memerlukan autentikasi
router.get('/', verifyFirebaseToken, noteController.getUserNotes);

// GET /api/notes/public - Mendapatkan semua catatan untuk tampilan publik
router.get('/public', noteController.getAllPublicNotes); 

// GET /api/notes/:noteId - Mendapatkan detail satu catatan
// Memerlukan autentikasi, dan pengguna harus pemilik catatan atau admin
router.get('/:noteId', verifyFirebaseToken, 
    [
        param('noteId')
            .notEmpty().withMessage('Note ID di URL tidak boleh kosong.')
            .isString().withMessage('Note ID harus berupa string.')
    ],
    noteController.getNoteById);

// PUT /api/notes/:noteId - Memperbarui catatan
// Memerlukan autentikasi, dan pengguna harus pemilik catatan
router.put('/:noteId', verifyFirebaseToken, 
    [
        param('noteId')
            .notEmpty().withMessage('Note ID di URL tidak boleh kosong.')
            .isString().withMessage('Note ID harus berupa string.'),

        // Validasi untuk body (semua opsional karena ini update)
        body('pesan')
            .optional()
            .notEmpty().withMessage('Pesan tidak boleh string kosong jika diisi.') // Jika ada, tidak boleh kosong
            .trim()
            .isLength({ min: 1 }).withMessage('Pesan minimal 1 karakter jika diisi.'),

        body('penerima')
            .optional()
            .isString().withMessage('Penerima harus berupa teks jika diisi.')
            .trim(),

        body('pengirim')
            .optional()
            .isString().withMessage('Pengirim harus berupa teks jika diisi.')
            .trim(),

        body('gambar')
            .optional({ checkFalsy: true }) // jika dikirim string kosong, anggap tidak ada/ingin dihapus
            .isURL().withMessage('Format URL gambar tidak valid jika diisi.'),
            
        body('idMusic')
            .optional({ checkFalsy: true }) // jika dikirim string kosong, anggap tidak ada/ingin dihapus
            .isString().withMessage('ID Musik harus berupa teks jika diisi.')
            .trim()
    ],
    noteController.updateNote);

// DELETE /api/notes/:noteId - Menghapus catatan
// Memerlukan autentikasi, dan pengguna harus pemilik catatan
router.delete('/:noteId', verifyFirebaseToken, 
    [
        param('noteId')
            .notEmpty().withMessage('Note ID di URL tidak boleh kosong.')
            .isString().withMessage('Note ID harus berupa string.')
    ],
    noteController.deleteNote);

module.exports = router;