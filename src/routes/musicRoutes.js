const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer');
const { addMusic } = require('../controllers/musicController');

router.post('/', upload.fields([
    { name: 'music', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), addMusic);

module.exports = router;
