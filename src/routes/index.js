const express = require('express');
const authRoutes = require('./authRoutes');
// const userRoutes = require('./userRoutes');
// const musicRoutes = require('./musicRoutes');
const noteRoutes = require('./noteRoutes');

const router = express.Router();

// Rute dasar untuk API
router.get('/', (req, res) => {
    res.json({
        message: 'Selamat datang di API Proyek Anda! HALOOOOO',
        version: '1.0.0',
    })
})

router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/music', musicRoutes);
router.use('/notes', noteRoutes);

module.exports = router;