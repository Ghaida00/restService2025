const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

dotenv.config();

require('./config/firebase')

const mainApiRouter = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('short'));
}

app.get('/', (req, res) => {
    res.send('Selamat datang di server API Proyek Anda!');
})

app.use('/api', mainApiRouter);

app.use((req, res, next) => {
    const error = new Error(`Resource tidak ditemukan di ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
})

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'development') {
        console.log('NODE_ENV:', process.env.NODE_ENV);
    }
})

module.exports = app;