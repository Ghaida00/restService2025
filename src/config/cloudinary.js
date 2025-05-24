const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dsi0bqoc8',
    api_key: '237853841278558',
    api_secret: '24MeyxnqYVru-GpnIMVutTJWO8U',
    timeout: 60000, // Set timeout to 60 seconds
});

module.exports = cloudinary;