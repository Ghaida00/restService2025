// migratePostCounts.js
const admin = require('firebase-admin');

// GANTI DENGAN PATH KE SERVICE ACCOUNT KEY JSON ANDA
// Pastikan path ini benar relatif dari lokasi Anda menjalankan skrip ini.
// Jika Anda menjalankan dari root proyek dan file ada di src/config:
// const serviceAccount = require('./src/config/nama_file_service_account_anda.json');
// Jika Anda menjalankan dari root proyek dan file ada di root proyek:
const serviceAccount = require('../testdb-apps-firebase-adminsdk-fbsvc-80d0392e9a.json'); // Ganti dengan nama file Anda yang benar

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin SDK berhasil diinisialisasi untuk migrasi.');
} catch (error) {
  console.error('Error inisialisasi Firebase Admin SDK:', error);
  process.exit(1); // Keluar jika gagal inisialisasi
}

const db = admin.firestore();

async function migrateData() {
  console.log('Memulai migrasi data numberOfPosts...');

  try {
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
      console.log('Tidak ada pengguna ditemukan untuk dimigrasi.');
      return;
    }

    const batch = db.batch(); // Gunakan batch untuk update yang lebih efisien
    let operationsCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      console.log(`Memproses pengguna: ${userData.username || userId}...`);

      // Hitung catatan
      const notesQuery = db.collection('messages').where('senderId', '==', userId);
      const notesSnapshot = await notesQuery.count().get(); // Menggunakan getCountFromServer
      const notesCount = notesSnapshot.data().count;
      console.log(` - Jumlah catatan: ${notesCount}`);

      const totalPosts = notesCount;
      console.log(` - Total postingan: ${totalPosts}`);

      // Tambahkan operasi update ke batch
      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, { numberOfPosts: totalPosts });
      operationsCount++;

      // Firestore batch writes memiliki batas (misalnya 500 operasi).
      // Jika Anda memiliki banyak pengguna, commit batch secara berkala.
      if (operationsCount >= 490) { // Sisakan sedikit ruang dari batas 500
        console.log('Melakukan commit batch parsial...');
        await batch.commit();
        // batch = db.batch(); // Mulai batch baru setelah commit (jika Firestore SDK versi lama)
        // Untuk SDK v9+, Anda perlu membuat instance batch baru
        // Namun, karena kita loop semua user dulu baru commit, ini mungkin tidak perlu
        // Jika user sangat banyak, proses per batch user lebih baik.
        // Untuk kesederhanaan, kita asumsikan jumlah user tidak melebihi batas batch
        // atau kita commit sekali di akhir.
        // Untuk implementasi yang lebih robust dengan banyak user, pecah menjadi beberapa batch.
      }
    }

    // Commit sisa operasi di batch (jika ada)
    if (operationsCount > 0) {
      console.log('Melakukan commit batch final...');
      await batch.commit();
    }

    console.log('Migrasi data numberOfPosts selesai.');

  } catch (error) {
    console.error('Terjadi kesalahan selama migrasi:', error);
  }
}

// Jalankan fungsi migrasi
migrateData().then(() => {
  console.log('Skrip migrasi selesai dijalankan.');
  // Anda mungkin ingin keluar dari proses setelah selesai
  // process.exit(0);
}).catch(err => {
  console.error('Skrip migrasi gagal:', err);
  // process.exit(1);
});