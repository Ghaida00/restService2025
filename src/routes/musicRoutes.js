const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');

const { 
    addMusic,
    getMusicById,
    getAllMusic
    //add more...
} = require('../controllers/musicController');

// POST Music 
router.post('/', upload.fields([
    { name: 'music', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), addMusic);

// GET All Music
router.get('/', getAllMusic);

// GET Music by ID 
router.get('/:id', getMusicById);

//add more method...

module.exports = router;
    