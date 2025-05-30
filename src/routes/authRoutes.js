const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Endpoint registrasi
// router.post('/register', authController.registerUser);
router.post(
    '/register',
    [
        // Aturan validasi untuk 'email'
        body('email')
            .notEmpty().withMessage('Email tidak boleh kosong.')
            .isEmail().withMessage('Format email tidak valid')
            .normalizeEmail(),

        // Aturan validasi untuk 'password'
        body('password')
            .notEmpty().withMessage('Password tidak boleh kosong.')
            .isLength({ min: 8 }).withMessage('Password harus minimal 8 karakter.')
            .isStrongPassword().withMessage('Password harus mengandung huruf besar, huruf kecil, angka, dan simbol.')
            .trim(),

        // Aturan validasi untuk 'username'
        body('username')
            .notEmpty().withMessage('Username tidak boleh kosong.')
            .isLength({ min: 3 }).withMessage('Username minimal 3 karakter.')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username hanya boleh mengandung huruf, angka, dan garis bawah.')
            .trim(),

        // Aturan validasi untuk 'displayName'
        body('displayName')
            .optional()
            .isLength({ min: 3 }).withMessage('Display name minimal 3 karakter.')
            .trim(),
    ],
    authController.registerUser
)

// Endpoint login
router.post(
    '/login',
    [
        // Aturan validasi untuk 'email'
        body('email')
            .notEmpty().withMessage('Email tidak boleh kosong.')
            .isEmail().withMessage('Format email tidak valid')
            .normalizeEmail(),

        // Aturan validasi untuk 'password'
        body('password')
            .notEmpty().withMessage('Password tidak boleh kosong.')
            .trim(),
    ],
    authController.loginUser);

// Endpoint untuk mendapatkan profil pengguna yang sedang login
router.get('/profile', verifyFirebaseToken, authController.getUserProfile);

// Endpoint untuk update profil pengguna
router.put(
    '/profile',
    verifyFirebaseToken, // Memerlukan autentikasi
    [ // Validasi opsional untuk field yang bisa diupdate
        body('username')
            .optional()
            .isLength({ min: 3 }).withMessage('Username minimal 3 karakter.')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username hanya boleh mengandung huruf, angka, dan garis bawah.')
            .trim(),
        body('displayName')
            .optional()
            .isLength({ min: 3 }).withMessage('Display name minimal 3 karakter.')
            .trim(),
        body('photoURL') // URL dari Cloudinary
            .optional({ checkFalsy: true }) // checkFalsy agar string kosong dianggap tidak ada/ingin dihapus
            .isURL().withMessage('Format URL foto profil tidak valid.'),
        body('userDescription')
            .optional()
            .isString().withMessage('Deskripsi harus teks.')
            .trim(),
        body('userLocation')
            .optional()
            .isString().withMessage('Lokasi harus teks.')
            .trim()
    ],
    authController.updateUserProfile
);

// Endpoint untuk mengubah password pengguna
router.post(
    '/change-password',
    verifyFirebaseToken, // Memerlukan autentikasi
    [
        body('newPassword')
            .notEmpty().withMessage('Password baru tidak boleh kosong.')
            .isLength({ min: 8 }).withMessage('Password baru harus minimal 8 karakter.')
            .isStrongPassword().withMessage('Password baru harus mengandung huruf besar, huruf kecil, angka, dan simbol.')
            // Anda mungkin ingin menambahkan validasi untuk currentPassword jika diperlukan oleh logika Anda
    ],
    authController.changeUserPassword
);

module.exports = router;
