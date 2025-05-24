const { db, admin } = require('../config/firebase');

exports.createNote = async (req, res, next) => {
    try {
        const { pesan, penerima, pengirim, gambar, idMusic } = req.body;
        const creatorUserId = req.user.uid;

        // Validasi input
        if (!pesan) {
            return res.status(400).json({ message: 'Kolom "pesan" wajib diisi.' });
        }
        if (!penerima) {
            return res.status(400).json({ message: 'Kolom "penerima" wajib diisi.' });
        }

        const notesCollection = db.collection('notes');
        const newNoteRef = notesCollection.doc();

        const newNoteData = {
            noteId: newNoteRef.id,
            pesan: pesan,
            penerima: penerima,
            pengirim: pengirim,
            gambar: gambar || null,
            idMusic: idMusic || null,
            creatorUserId: creatorUserId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        await newNoteRef.set(newNoteData);

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

        const publicNotes = [];
        notesSnapshot.forEach(doc => {
            publicNotes.push({
                id: doc.id,
                ...doc.data()
            })
        })

        let nextLastVisible = null;
        if (publicNotes.length === limit) {
            nextLastVisible = notesSnapshot.docs[notesSnapshot.docs.length - 1].id;
        }

        res.status(200).json({
            message: 'Catatan publik berhasil diambil.',
            data: publicNotes,
            pagination: {
                currentPage: page,
                limit: limit,
                retrievedCount: publicNotes.length,
                // Untuk digunakan klien pada request berikutnya: ?page=...&limit=...&lastVisible=...
                nextPageCursor: nextLastVisible 
            }
        });
    } catch (error) {
        console.error('Error saat mengambil semua catatan publik:', error);
        next(error);
    }
}

exports.getNoteById = async (req, res, next) => {
    try {
        const { noteId } = req.params;
        //const requestingUserId = req.user.uid;

        if (!noteId) {
            return res.status(400).json({ message: 'Note ID tidak boleh kosong.' });
        }

        const noteRef = db.collection('notes').doc(noteId);
        const noteDoc = await noteRef.get();

        if (!noteDoc.exists) {
            return res.status(404).json({ message: 'Catatan tidak ditemukan.' });
        }

        const noteData = noteDoc.data();

        // if (noteData.creatorUserId !== requestingUserId && !req.user.isAdmin) {
        //     return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengakses catatan ini.' });
        // }

        res.status(200).json({
            message: 'Detail catatan berhasil diambil.',
            data: { id: noteDoc.id, ...noteData }
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
    try {
        const { noteId } = req.params;
        const requestingUserId = req.user.uid;
        const updateData = req.body;

        if (!noteId) {
            return res.status(400).json({ message: 'Note ID tidak boleh kosong.' });
        }

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
    try {
        const { noteId } = req.params;
        const requestingUserId = req.user.uid;

        if (!noteId) {
            return res.status(400).json({ message: 'Note ID tidak boleh kosong.' });
        }

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