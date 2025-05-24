const { cloudinary } = require('../config/cloudinary');
const mm = require('music-metadata');
const fs = require('fs');
const { db } = require('../config/firebase');

const addMusic = async (req, res) => {
    try {
        const { title, artist } = req.body;
        const musicFile = req.files.music?.[0];
        const imageFile = req.files.image?.[0];

        if ( !title || !artist || !musicFile || !imageFile) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        const musicUpload = await cloudinary.uploader.upload(musicFile.path, {
            resource_type: 'video',
            folder: 'tuneverse/music'
        });

        const buffer = fs.readFileSync(musicFile.path);
        const metadata = await mm.parseBuffer(buffer);
        const duration = metadata.format.duration;

        const coverUpload = await cloudinary.uploader.upload(imageFile.path, {
            folder: 'tuneverse/cover'
        });

        const docRef = await db.collection('music').add({
            title,
            artist,
            musicUrl: musicUpload.secure_url,
            imageUrl: coverUpload.secure_url,
            duration,
            createdAt: new Date()
        });

        rest.status(201).json({
            id: docRef.id,
            message: 'Lagu berhasil diunggah!',
        });

    } catch (err) {
        res.status(500).json({
            error: 'Terjadi kesalahan saat mengunggah lagu',
            details: err.message
        });
     }
    
};

moduole.exports = {
    addMusic
};