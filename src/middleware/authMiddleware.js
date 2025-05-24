const { auth } = require('../config/firebase')

// Middleware untuk memverifikasi token Firebase ID
const verifyFirebaseToken = async (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Token tidak ditemukan atau format salah.' });
    }

    const idToken = authorizationHeader.split('Bearer ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken; // Tambahkan informasi pengguna ke objek request
        next(); // Lanjutkan ke handler berikutnya jika token valid
    } catch (error) {
        console.error('Error verifikasi token Firebase:', error);
        if (error.code == 'auth/id-token-expired') {
            return res.status(401).json({ message: 'Unauthorized: Token telah kedaluwarsa.' });
        }
        return res.status(401).json({ message: 'Unauthorized: Token tidak valid.' });
    }
}

// Middleware untuk memeriksa peran pengguna
const checkUserRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Forbidden: Peran pengguna tidak ditemukan.' });
        }

        const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];

        const hasPermission = roles.some(role => userRoles.includes(role));

        if (hasPermission) {
            next(); // Lanjutkan ke handler berikutnya jika pengguna memiliki peran yang sesuai
        } else {
            return res.status(403).json({ message: 'Forbidden: Anda tidak memiliki izin untuk mengakses sumber daya ini.' });
        }
    }
}

module.exports = {
    verifyFirebaseToken,
    checkUserRole
}
