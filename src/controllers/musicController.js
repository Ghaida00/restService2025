const cloudinary = require('../config/cloudinary');
const mm = require('music-metadata');
const fs = require('fs');
const { db } = require('../config/firebase');

// ======== HARAP CEK MODULE EXPORT DI PALING BAWAH BUAT TAMBAH METHOD KAMU =========

// POST Create Music Baru (Nofa)
const addMusic = async (req, res) => {
    try {
        const { title, artist } = req.body;
        const musicFile = req.files?.music?.[0];
        const imageFile = req.files?.cover?.[0];

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

        res.status(201).json({
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


// GET Music by ID (Nofa)
const getMusicById = async (req, res) => {
  const musicId = req.params.id;

  try {
    const doc = await db.collection('music').doc(musicId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Lagu tidak ditemukan' });
    }

    return res.status(200).json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Gagal mengambil data lagu',
      details: err.message
    });
  }
};



module.exports = {
    addMusic,
    getMusicById,
    //janlup tambahin nama method klen disini yaa

};