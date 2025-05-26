const { auth, db, admin } = require('../config/firebase');
const { validationResult } = require('express-validator');
const axios = require('axios');

// Fungsi helper untuk membuat username unik
async function generateUniqueUsername(baseUsername, uid) {
    let username = baseUsername;
    let counter = 0;
    let isUnique = false;

    // Hapus karakter yang tidak valid untuk username dari baseUsername
    // dan batasi panjangnya jika perlu
    const sanitize = (name) => name.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
    
    username = sanitize(baseUsername);
    if (!username) { // Jika setelah sanitize jadi kosong (misal email hanya simbol)
        username = 'user'; // Default base
    }

    while (!isUnique) {
        let candidateUsername = counter === 0 ? username : `${username}_${counter}`;
        // Jika kandidat masih terlalu panjang setelah menambah counter, potong lagi
        if (candidateUsername.length > 30) { // Batas panjang username (misalnya 30 karakter)
            candidateUsername = `${username.substring(0, 30 - String(counter).length - 1)}_${counter}`;
        }

        const usernameCheck = await db.collection('users').where('username', '==', candidateUsername).get();
        if (usernameCheck.empty) {
            isUnique = true;
            username = candidateUsername;
        } else {
            counter++;
            if (counter > 100) { // Batas percobaan untuk menghindari loop tak terbatas
                // Jika setelah 100 percobaan masih belum unik, tambahkan bagian dari UID
                // untuk probabilitas unik yang sangat tinggi
                username = `${username}_${uid.substring(0, 8)}`;
                // Anda mungkin ingin melakukan satu pengecekan terakhir di sini atau langsung menganggapnya unik
                // Untuk keamanan, cek sekali lagi:
                const finalCheck = await db.collection('users').where('username', '==', username).get();
                if (!finalCheck.empty) {
                    // Kasus sangat jarang, mungkin perlu strategi lain atau error
                    throw new Error('Tidak dapat membuat username unik setelah banyak percobaan.');
                }
                isUnique = true; // Anggap unik setelah ini
            }
        }
    }
    return username;
}

exports.registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, displayName, username: inputUsername } = req.body;

    const usernameCheck = await db.collection('users').where('username', '==', inputUsername).get();
    if (!usernameCheck.empty) {
        return res.status(400).json({ errors: [{ path: 'username', msg: 'Username sudah digunakan.' }] });
    }

    try {
        // 1. Buat pengguna di Firebase Authentication
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: displayName || inputUsername,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || inputUsername)}&background=random&color=fff&size=128`, // Ganti dengan URL foto profil yang sesuai
            disabled: false,
        })

        // 2. (Opsional) Tetapkan custom claims jika perlu (misalnya peran 'user')
        await auth.setCustomUserClaims(userRecord.uid, { role: 'user' })

        // 3. Simpan informasi tambahan pengguna di Firestore (koleksi 'users')
        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            userId: userRecord.uid,
            email: userRecord.email,
            username: inputUsername,
            displayName: userRecord.displayName,
            role: 'user',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Tambahkan field lain sesuai kebutuhan dari rencana
            numberOfPosts: 0,
            otherAccountDetails: {
                photoURL: userRecord.photoURL,
                userDescription: '',
                userLocation: '',
            }
        })

        res.status(201).json({
            message: 'Pengguna berhasil terdaftar.',
            userId: userRecord.uid,
            email: userRecord.email,
        })
    } catch (error) {
        console.error('Error saat registrasi pengguna:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ errors: [{ path: 'email', msg: 'Email sudah terdaftar.' }] });
            // return res.status(400).json({ message: 'Email sudah terdaftar.' });
        }
        if (error.code === 'auth/invalid-password') {
            return res.status(400).json({ errors: [{ path: 'password', msg: 'Password tidak valid.' }] });
            //return res.status(400).json({ message: 'Password tidak valid' });
        }
        // Tangani error spesifik lainnya jika ada
        next(error); // Teruskan ke error handler umum
    }
}

exports.loginUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY;

    if (!firebaseWebApiKey) {
        console.error('FIREBASE_WEB_API_KEY tidak ditemukan di .env');
        return res.status(500).json({ message: 'Konfigurasi server error.' });
    }

    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`;

    try {
        const response = await axios.post(firebaseAuthUrl, {
            email,
            password,
            returnSecureToken: true
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000 // timeout 15 detik
        });

        const { idToken, refreshToken, localId, expiresIn } = response.data;

        res.status(200).json({
            message: 'Login berhasil.',
            idToken,
            refreshToken,
            localId,
            expiresIn
        });
    } catch (error) {
        if (error.response) {
            const code = error.response.data?.error?.message;

            if (['INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS'].includes(code)) {
                return res.status(401).json({ message: 'Email atau password salah.' });
            }

            console.error('Firebase Auth Error:', code);
            return res.status(error.response.status || 500).json({
                message: code || 'Kesalahan login'
            });
        } else if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ message: 'Timeout: Firebase Auth tidak merespon.' });
        } else {
            console.error('Error internal saat login:', error.message);
            return res.status(500).json({ message: 'Kesalahan internal saat login.' });
        }
    }
}


exports.getUserProfile = async (req, res, next) => {
    // req.user diisi oleh middleware verifyFirebaseToken
    const uid = req.user.uid;
    const firebaseUser = req.user;

    try {
        const userDocRef = db.collection('users').doc(uid);
        let userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            // Pengguna ada di Firebase Auth (karena token valid) tapi belum di Firestore
            // Buat entri pengguna dasar di Firestore
            console.log(`User ${uid} not found in Firestore. Creating profile entry.`);
            
            // Buat kandidat username dasar dari email atau nama displayName
            const baseUsernameCandidate = firebaseUser.name ? firebaseUser.name.split(' ')[0] : firebaseUser.email.split('@')[0];
            const uniqueUsername = await generateUniqueUsername(baseUsernameCandidate, uid);

            const newUserProfileData = {
                userId: uid,
                email: firebaseUser.email,
                // Username bisa diambil dari email atau biarkan kosong untuk diisi nanti
                username: uniqueUsername,
                displayName: firebaseUser.name || uniqueUsername,
                role: 'user', // Default role
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                numberOfPosts: 0,
                otherAccountDetails: {
                    photoURL: firebaseUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.name || firebaseUser.email.split('@')[0])}&background=random&color=fff&size=128`,
                    userDescription: '',
                    userLocation: '',
                }
            };
            await userDocRef.set(newUserProfileData);
            userDoc = await userDocRef.get(); // Ambil lagi dokumen yang baru dibuat
        }

        res.status(200).json({
            message: 'Profil pengguna berhasil diambil.',
            userProfile: userDoc.data()
        })
    } catch (error) {
        console.error('Error saat mengambil profil pengguna:', error);
        next(error);
    }
}

// Fungsi helper untuk mengecek keunikan username (jika username diubah)
async function isUsernameTakenByOther(username, excludeUserId) {
    const snapshot = await db.collection('users')
                             .where('username', '==', username)
                             .get();
    if (snapshot.empty) {
        return false; // Username belum ada
    }
    // Cek apakah username yang sama dimiliki oleh user lain
    for (const doc of snapshot.docs) {
        if (doc.id !== excludeUserId) {
            return true; // Username sudah dipakai user lain
        }
    }
    return false; // Username dipakai oleh user saat ini (excludeUserId) atau tidak ada sama sekali
}


exports.updateUserProfile = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const uid = req.user.uid; // UID dari token pengguna yang login
    const { username, displayName, photoURL, userDescription, userLocation } = req.body;

    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Profil pengguna tidak ditemukan.' });
        }

        // Jika username diubah, cek keunikannya terhadap pengguna lain
        if (username && username !== userDoc.data().username) {
            if (await isUsernameTakenByOther(username, uid)) {
                return res.status(400).json({ errors: [{ path: 'username', msg: 'Username ini sudah digunakan oleh pengguna lain.' }] });
            }
        }

        const updateData = {};
        if (username !== undefined) updateData.username = username;
        // Jika displayName dikirim, gunakan itu. Jika tidak, fallback ke displayName yang sudah ada atau username.
        if (displayName !== undefined) {
            updateData.displayName = displayName;
        } else if (username && !userDoc.data().displayName) { // Hanya set jika displayName belum ada dan username berubah
            updateData.displayName = username;
        }

        // Untuk photoURL, userDescription, userLocation:
        // Jika dikirim string kosong, anggap ingin dihapus/dikosongkan.
        // Jika dikirim null/undefined, jangan ubah field yang sudah ada.
        // Jika dikirim string berisi, update.
        if (photoURL !== undefined) { // photoURL dari Cloudinary
            if (updateData.otherAccountDetails === undefined) updateData.otherAccountDetails = {};
            updateData.otherAccountDetails.photoURL = photoURL === '' ? null : photoURL;
        }
        if (userDescription !== undefined) {
            if (updateData.otherAccountDetails === undefined) updateData.otherAccountDetails = {};
            updateData.otherAccountDetails.userDescription = userDescription;
        }
        if (userLocation !== undefined) {
            if (updateData.otherAccountDetails === undefined) updateData.otherAccountDetails = {};
            updateData.otherAccountDetails.userLocation = userLocation;
        }
        
        // Hanya update otherAccountDetails jika ada isinya
        if (updateData.otherAccountDetails && Object.keys(updateData.otherAccountDetails).length === 0) {
            delete updateData.otherAccountDetails; // Hapus jika kosong
        }


        if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            await userRef.update(updateData);

            // Update displayName dan photoURL di Firebase Auth juga jika berubah
            const authUpdatePayload = {};
            if (updateData.displayName) authUpdatePayload.displayName = updateData.displayName;
            if (updateData.otherAccountDetails && updateData.otherAccountDetails.photoURL !== undefined) {
                 authUpdatePayload.photoURL = updateData.otherAccountDetails.photoURL;
            }

            if (Object.keys(authUpdatePayload).length > 0) {
                await auth.updateUser(uid, authUpdatePayload);
            }
        } else {
            return res.status(200).json({ message: 'Tidak ada data yang diubah.', userProfile: userDoc.data() });
        }
        
        const updatedUserDoc = await userRef.get();
        res.status(200).json({
            message: 'Profil berhasil diperbarui.',
            userProfile: updatedUserDoc.data()
        });

    } catch (error) {
        console.error('Error saat update profil pengguna:', error);
        if (error.code === 'auth/user-not-found') {
             return res.status(404).json({ message: 'Pengguna Firebase Auth tidak ditemukan.' });
        }
        next(error);
    }
};

exports.changeUserPassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const uid = req.user.uid; // UID dari token pengguna yang login
    const { newPassword } = req.body;
    // Untuk keamanan tambahan, Anda BISA meminta password lama dan memverifikasinya
    // dengan cara memanggil endpoint login Firebase REST API seperti di fungsi loginUser.
    // Namun, Admin SDK bisa langsung update password tanpa password lama.
    // Keputusan ini ada di tangan Anda terkait tingkat keamanan vs kompleksitas.

    try {
        await auth.updateUser(uid, {
            password: newPassword
        });
        res.status(200).json({ message: 'Password berhasil diubah.' });
    } catch (error) {
        console.error('Error saat mengubah password:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        if (error.code === 'auth/weak-password') {
            return res.status(400).json({ errors: [{path: 'newPassword', msg: 'Password terlalu lemah.'}] });
        }
        // Tangani error lain jika perlu
        next(error);
    }
};