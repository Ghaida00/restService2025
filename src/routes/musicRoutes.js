const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');


const { 
    addMusic,
    getMusicById,
    getAllMusic,
    getMusicByUser,
    updateMusic,
    deleteMusic,
    getExploreMusic,
    getTopArtists,
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

// GET Music by User ID
router.get('/user', 
    verifyFirebaseToken, 
    getMusicByUser
);

// GET Explore Music
router.get('/explore', getExploreMusic);

// GET Top Artists
router.get('/top-artists', getTopArtists);

// GET Music by ID 
router.get('/:id', getMusicById);

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
    