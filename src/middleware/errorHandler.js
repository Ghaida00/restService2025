const errorHandler = (err, req, res, next) => {
    console.error('Terjadi kesalahan:', err.stack || err.message || err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Terjadi kesalahan pada server.';

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: process.env.NODE_ENV === 'development' ? err.message : (statusCode < 500 ? message : 'Terjadi kesalahan pada server.'), 
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
}

module.exports = errorHandler;