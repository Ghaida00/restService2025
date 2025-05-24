const { auth, db, admin } = require('../config/firebase');
const { validationResult } = require('express-validator');
const axios = require('axios');

exports.registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, displayName, username } = req.body;

    const usernameCheck = await db.collection('users').where('username', '==', username).get();
    if (!usernameCheck.empty) {
        return res.status(400).json({ message: 'Username sudah digunakan.' });
    }

    try {
        // 1. Buat pengguna di Firebase Authentication
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: displayName || username,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=128`, // Ganti dengan URL foto profil yang sesuai
            disabled: false,
        })

        // 2. (Opsional) Tetapkan custom claims jika perlu (misalnya peran 'user')
        await auth.setCustomUserClaims(userRecord.uid, { role: 'user' })

        // 3. Simpan informasi tambahan pengguna di Firestore (koleksi 'users')
        const userRef = db.collection('users').doc(userRecord.uid);
        await userRef.set({
            userId: userRecord.uid,
            email: userRecord.email,
            username: username,
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

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
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