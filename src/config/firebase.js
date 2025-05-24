const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
        serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);
    } else {
        console.log('Mencoba inisialisasi Firebase Admin SDK dengan kredensial default aplikasi...');
    }

    if (serviceAccount) {
        admin.initializeApp( {
            credential: admin.credential.cert(serviceAccount)
        })
        console.log('Firebase Admin SDK berhasil diinisialisasi dengan service account.');
    } else if (!admin.apps.length) {
        admin.initializeApp();
        console.log('Firebase Admin SDK diinisialisasi (mungkin menggunakan kredensial default aplikasi).');
    }
} catch (error) {
    console.error('Error saat inisialisasi Firebase Admin SDK:', error);
    process.exit(1); // Keluar jika Firebase gagal diinisialisasi
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth, admin };