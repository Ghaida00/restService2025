const { db, admin } = require('../config/firebase');
const { validationResult } = require('express-validator');

exports.createNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { pesan, penerima, pengirim, gambar, idMusic } = req.body;
        const creatorUserId = req.user.uid;

        const notesCollection = db.collection('notes');
        const newNoteRef = notesCollection.doc();

        const newNoteData = {
            noteId: newNoteRef.id,
            pesan: pesan,
            penerima: penerima,
            pengirim: pengirim || creatorUserId,
            gambar: gambar || null,
            idMusic: idMusic || null,
            creatorUserId: creatorUserId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        await newNoteRef.set(newNoteData);

        const userRef = db.collection('users').doc(creatorUserId); // creatorUserId dari req.user.uid
        await userRef.update({
            numberOfPosts: admin.firestore.FieldValue.increment(1)
        });

        return res.status(201).json({
            message: 'Catatan berhasil dibuat.',
            data: newNoteData
        });
    } catch (error) {
        console.error('Error saat membuat catatan:', error);
        next(error);
    }
}

exports.getUserNotes = async (req, res, next) => {
    try {
        const creatorUserId = req.user.uid;

        const notesSnapshot = await db.collection('notes')
            .where('creatorUserId', '==', creatorUserId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (notesSnapshot.empty) {
            return res.status(200).json({
                message: 'Tidak ada catatan yang ditemukan untuk pengguna ini.',
                data: [] // Kembalikan array kosong jika tidak ada catatan
            });
        }

        const userNotes = [];
        notesSnapshot.forEach(doc => {
            userNotes.push({
                id: doc.id,
                ...doc.data()
            });
        })

        res.status(200).json({
            message: 'Catatan berhasil diambil.',
            data: userNotes
        });
    } catch (error) {
        console.error('Error saat mengambil catatan pengguna:', error);
        next(error);
    }
}

exports.getAllPublicNotes = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const lastVisible = req.query.lastVisible || null;

        let query = db.collection('notes')
            .orderBy('createdAt', 'desc');
        
        let notesQuery = query;

        if (lastVisible && page > 1) {
            const lastDocSnapshot = await db.collection('notes').doc(lastVisible).get();
            if (lastDocSnapshot.exists) {
                notesQuery = query.startAfter(lastDocSnapshot).limit(limit);
            } else {
                notesQuery = query.limit(limit);
            }
        } else {
            notesQuery = query.limit(limit);
        }

        const notesSnapshot = await notesQuery.get();

        if (notesSnapshot.empty) {
            return res.status(200).json({
                message: 'Tidak ada catatan publik yang ditemukan.',
                data: [],
                nextPageParams: null
            });
        }
        // Ubah cara Anda memproses notes untuk menyertakan detail musik
        const publicNotesPromises = notesSnapshot.docs.map(async (doc) => {
            const noteData = doc.data();
            let songTitle = null;
            let songArtist = null;
            // Anda juga bisa menambahkan songUrl jika diperlukan di frontend
            // let songUrl = null; 

            if (noteData.idMusic) {
                try {
                    // Ambil dokumen musik berdasarkan idMusic
                    const musicDocRef = db.collection('music').doc(noteData.idMusic);
                    const musicDoc = await musicDocRef.get();

                    if (musicDoc.exists) {
                        const musicData = musicDoc.data();
                        songTitle = musicData.title;   // Ambil judul dari dokumen musik
                        songArtist = musicData.artist; // Ambil artis dari dokumen musik
                        // songUrl = musicData.musicUrl; // Jika URL juga dibutuhkan
                    } else {
                        console.log(`Music with ID ${noteData.idMusic} not found.`);
                    }
                } catch (musicError) {
                    console.error(`Error fetching music details for idMusic ${noteData.idMusic}:`, musicError);
                    // Biarkan songTitle dan songArtist null jika terjadi error
                }
            }

            return {
                id: doc.id, // atau noteData.noteId jika Anda lebih suka itu sebagai ID utama
                ...noteData,
                songTitle: songTitle,   // Tambahkan properti baru
                songArtist: songArtist, // Tambahkan properti baru
                // songUrl: songUrl,    // Tambahkan jika perlu
            };
        });

        const publicNotes = await Promise.all(publicNotesPromises);

        let nextLastVisible = null;
        if (publicNotes.length === limit) {
            nextLastVisible = notesSnapshot.docs[notesSnapshot.docs.length - 1].id;
        }

        res.status(200).json({
            message: 'Catatan publik berhasil diambil.',
            data: publicNotes, // Sekarang publicNotes berisi detail musik
            pagination: {
                currentPage: page,
                limit: limit,
                retrievedCount: publicNotes.length,
                nextPageCursor: nextLastVisible
            }
        });
    } catch (error) {
        console.error('Error saat mengambil semua catatan publik:', error);
        next(error);
    }
}

exports.getNoteById = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { noteId } = req.params;
        //const requestingUserId = req.user.uid;

        const noteRef = db.collection('notes').doc(noteId);
        const noteDoc = await noteRef.get();

        if (!noteDoc.exists) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan.' });
        }

        const noteData = noteDoc.data();
        let songTitle = null;
        let songArtist = null;
        let songUrl = null;
        let songAlbumArtUrl = null;
        let songDuration = null;

        // Logika untuk mengambil detail musik jika idMusic ada
        if (noteData.idMusic) {
            try {
                const musicDocRef = db.collection('music').doc(noteData.idMusic);
                const musicDoc = await musicDocRef.get();
                if (musicDoc.exists) {
                    const musicData = musicDoc.data();
                    songTitle = musicData.title;
                    songArtist = musicData.artist;
                    songUrl = musicData.musicUrl;
                    songAlbumArtUrl = musicData.imageUrl;
                    songDuration = musicData.duration;
                } else {
                    console.log(`Peringatan: Musik dengan ID ${noteData.idMusic} tidak ditemukan untuk catatan ${noteId}.`);
                }
            } catch (musicError) {
                console.error(`Error saat mengambil detail musik untuk idMusic ${noteData.idMusic} (catatan ${noteId}):`, musicError);
                // Biarkan detail musik null jika terjadi error saat mengambilnya
            }
        }

        // Gabungkan data catatan dengan detail musik
        const responseData = {
            id: noteDoc.id, // atau noteData.noteId
            ...noteData,
            songTitle: songTitle,
            songArtist: songArtist,
            songUrl: songUrl,
            songAlbumArtUrl: songAlbumArtUrl,
            songDuration: songDuration
        };

        // if (noteData.creatorUserId !== requestingUserId && !req.user.isAdmin) {
        //     return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengakses catatan ini.' });
        // }

        res.status(200).json({
            message: 'Detail catatan berhasil diambil.',
            data: responseData // Kirim data yang sudah digabungkan
        });
    } catch (error) {
        console.error('Error saat mengambil detail catatan:', error);
        // Jika error karena format ID salah, Firestore mungkin throw error spesifik
        if (error.message.includes('Invalid document ID')) { // Contoh penanganan error ID
             return res.status(400).json({ message: 'Format Note ID tidak valid.' });
        }
        next(error);
    }
}

exports.updateNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { noteId } = req.params;
        const requestingUserId = req.user.uid;
        const updateData = req.body;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Tidak ada data untuk diperbarui.' });
        }

        const noteRef = db.collection('notes').doc(noteId);
        const noteDoc = await noteRef.get();

        if (!noteDoc.exists) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan.' });
        }

        const existingNoteData = noteDoc.data();

        if (existingNoteData.creatorUserId !== requestingUserId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Anda tidak memiliki izin untuk memperbarui catatan ini.' });
        }

        const dataToUpdate = {
            ...updateData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        delete dataToUpdate.creatorUserId; // Jangan izinkan update pada creatorUserId
        delete dataToUpdate.createdAt; // Jangan izinkan update pada createdAt
        delete dataToUpdate.noteId; // Jangan izinkan update pada noteId
        
        await noteRef.update(dataToUpdate);

        const updatedDoc = await noteRef.get();

        res.status(200).json({
            message: 'Catatan berhasil diperbarui.',
            data: { id: updatedDoc.id, ...updatedDoc.data() }
        });
    } catch (error) {
        console.error('Error saat memperbarui catatan:', error);
        if (error.message.includes('Invalid document ID')) {
             return res.status(400).json({ message: 'Format Note ID tidak valid.' });
        }
        next(error);
    }
}

exports.deleteNote = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { noteId } = req.params;
        const requestingUserId = req.user.uid;

        const noteRef = db.collection('notes').doc(noteId);
        const noteDoc = await noteRef.get();

        if (!noteDoc.exists) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan.' });
        }

        const existingNoteData = noteDoc.data();

        if (existingNoteData.creatorUserId !== requestingUserId && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Anda tidak memiliki izin untuk menghapus catatan ini.' });
        }

        await noteRef.delete();

        const userRef = db.collection('users').doc(existingNoteData.creatorUserId);
        await userRef.update({
            numberOfPosts: admin.firestore.FieldValue.increment(-1)
        });

        res.status(200).json({
            message: 'Catatan berhasil dihapus.',
            noteId: noteId // Mengembalikan ID catatan yang dihapus sebagai konfirmasi
        });
    } catch (error) {
        console.error('Error saat menghapus catatan:', error);
        if (error.message.includes('Invalid document ID')) {
             return res.status(400).json({ message: 'Format Note ID tidak valid.' });
        }
        next(error);
    }
}