const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { verifyFirebaseToken } = require('../middleware/auth'); 

const { 
    addMusic,
    getMusicById,
    getAllMusic,
    getMusicByUser,
    updateMusic,
    deleteMusic,
    //add more...
} = require('../controllers/musicController');

// POST Music 
router.post('/', 
    verifyFirebaseToken, 
    upload.fields([
    { name: 'music', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), 
    addMusic
);

// GET All Music
router.get('/', getAllMusic);

// GET Music by ID 
router.get('/:id', getMusicById);

// GET Music by User ID
router.get('/user', 
    verifyFirebaseToken, 
    getMusicByUser
);

// PUT Update Music
router.put('/:id',
  verifyFirebaseToken,
  upload.fields([
    { name: 'music', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  updateMusic
);


// DELETE Music
router.delete('/:id', verifyFirebaseToken, deleteMusic);


//add more method...

module.exports = router;
    