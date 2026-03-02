const Jimp = require('jimp');
const express = require('express');
const multer = require('multer');

// Memory storage for serverless environments
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4.5 * 1024 * 1024 } // Max 4.5MB per image for Vercel
});

const app = express();

app.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

    try {
        const image = await Jimp.read(req.file.buffer);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        const extractedBytes = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const color = image.getPixelColor(x, y);
                const { r, g, b } = Jimp.intToRGBA(color);
                extractedBytes.push(r, g, b);
            }
        }

        const buffer = Buffer.from(extractedBytes);

        if (buffer.subarray(0, 4).toString() !== 'XDRV') {
            throw new Error(`Invalid XDrive Image. Missing Magic Header.`);
        }

        const metaLen = buffer.readUInt32BE(4);
        const metaStr = buffer.subarray(8, 8 + metaLen).toString('utf-8');
        const metadata = JSON.parse(metaStr);
        const encryptedPayloadBytes = buffer.subarray(8 + metaLen, 8 + metaLen + metadata.size);

        // Return JSON containing the exact chunk data and metadata for the client to decrypt
        res.status(200).json({
            metadata: metadata,
            payloadBase64: encryptedPayloadBytes.toString('base64')
        });

    } catch (err) {
        console.error('Decode Error:', err);
        res.status(500).json({ error: err.message || 'Failed to extract payload.' });
    }
});

module.exports = app;
