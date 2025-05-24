const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');

const { 
    addMusic,
    getMusicById,
    //janlup add nama method klen disini ges

} = require('../controllers/musicController');

// ===== BIKIN METHOD MULAI DI BAWAH INI YEAHHH ====

// POST Music (Nofa)
router.post('/', upload.fields([
    { name: 'music', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), addMusic);

// GET Music by ID (Nofa)
router.get('/:id', getMusicById);

module.exports = router;
    