const express = require('express');
const cors = require('cors');
const encodeApp = require('./api/encode.js');
const decodeApp = require('./api/decode.js');

const app = express();
app.use(cors());

// Simulate Vercel API routing
app.use('/api/encode', encodeApp);
app.use('/api/decode', decodeApp);

// Simulate public directory serving
app.use(express.static('public'));

app.listen(8080, () => {
    console.log('XDrive Local Vercel Simulator running on port 8080');
});
