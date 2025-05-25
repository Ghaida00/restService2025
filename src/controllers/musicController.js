const cloudinary = require('../config/cloudinary');
const mm = require('music-metadata');
const fs = require('fs');
const { db } = require('../config/firebase');

// POST Create Music Baru
const addMusic = async (req, res) => {
    try {
        const { title, artist } = req.body;
        const musicFile = req.files?.music?.[0];
        const imageFile = req.files?.cover?.[0];

        if (!title || !artist || !musicFile || !imageFile) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        const userId = req.user.uid;
        const username = req.user.name || req.user.email || 'anonymous';

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
            musicPublicId: musicUpload.public_id,      
            imageUrl: coverUpload.secure_url,
            coverPublicId: coverUpload.public_id,
            duration,
            createdAt: new Date(),
            userId,
            username
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

// GET All Music
const getAllMusic = async (req, res) => {
  try {
    const snapshot = await db.collection('music').get();

    const musics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.status(200).json(musics);
  } catch (err) {
    return res.status(500).json({
      error: 'Gagal mengambil data musik',
      details: err.message
    });
  }
};



// GET Music by ID
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


// GET Music by User ID
const getMusicByUser = async (req, res) => {
    const uid = req.user.uid;
    try {
        const snapshot = await db.collection('music').where('userId', '==', uid).get();
        const musics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(musics);
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil data musik user', details: err.message });
    }
};


// PUT Update Music
const updateMusic = async (req, res) => {
  const musicId = req.params.id;
  const { title, artist } = req.body;
  const musicFile = req.files?.music?.[0];
  const imageFile = req.files?.cover?.[0];

  try {
    const musicRef = db.collection('music').doc(musicId);
    const doc = await musicRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Lagu tidak ditemukan' });
    }

    const musicData = doc.data();
    if (musicData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Akses ditolak: Anda bukan pemilik lagu ini' });
    }

    let updatedFields = {
      updatedAt: new Date()
    };

    if (title) updatedFields.title = title;
    if (artist) updatedFields.artist = artist;

    // Jika ada file musik baru
    if (musicFile) {

       if (musicData.musicPublicId) {
        await cloudinary.uploader.destroy(musicData.musicPublicId, { resource_type: 'video' });
      }

      const upload = await cloudinary.uploader.upload(musicFile.path, {
        resource_type: 'video',
        folder: 'tuneverse/music'
      });

      const buffer = fs.readFileSync(musicFile.path);
      const metadata = await mm.parseBuffer(buffer);
      updatedFields.musicUrl = upload.secure_url;
      updatedFields.musicPublicId = upload.public_id;
      updatedFields.duration = metadata.format.duration;
    }

    // Jika ada file cover baru
    if (imageFile) {

      if (musicData.coverPublicId) {
        await cloudinary.uploader.destroy(musicData.coverPublicId);
      }

      const upload = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'tuneverse/cover'
      });

      updatedFields.imageUrl = upload.secure_url;
      updatedFields.coverPublicId = upload.public_id; 
    }

    await musicRef.update(updatedFields);

    res.status(200).json({ message: 'Lagu berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui lagu', details: err.message });
  }
};

// DELETE Music
const deleteMusic = async (req, res) => {
  const musicId = req.params.id;

  try {
    const musicRef = db.collection('music').doc(musicId);
    const doc = await musicRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Lagu tidak ditemukan' });
    }

    const musicData = doc.data();
    if (musicData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Akses ditolak: Anda bukan pemilik lagu ini' });
    }

    if (musicData.musicPublicId) {
      await cloudinary.uploader.destroy(musicData.musicPublicId, { resource_type: 'video' });
    }
    if (musicData.coverPublicId) {
      await cloudinary.uploader.destroy(musicData.coverPublicId);
    }


    await musicRef.delete();
    res.status(200).json({ message: 'Lagu berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus lagu', details: err.message });
  }
};



module.exports = {
    addMusic,
    getMusicById,
    getAllMusic,
    getMusicByUser,
    updateMusic,
    deleteMusic
    //add more methods...
};