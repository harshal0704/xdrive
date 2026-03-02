const Jimp = require('jimp');
const express = require('express');
const multer = require('multer');

// Setup multer for memory storage since Vercel has an ephemeral filesystem
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4.5 * 1024 * 1024 } // Vercel Free tier limit ~4.5MB
});

const app = express();
const MAGIC_HEADER = Buffer.from('XDRV');

// Vercel serverless functions require exporting the express app directly or an async handler
app.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
        const fileBytes = req.file.buffer;

        // At this point, the fileBytes are ALREADY an AES-encrypted 2MB chunk created by the browser.
        // The backend's ONLY job is to wrap this encrypted chunk into a PNG.

        // Expect metadata from the frontend FormData
        const clientMetadata = req.body.metadata;
        if (!clientMetadata) {
            return res.status(400).json({ error: 'Missing metadata JSON' });
        }

        const metadataBuf = Buffer.from(clientMetadata);
        const metaLenBuf = Buffer.alloc(4);
        metaLenBuf.writeUInt32BE(metadataBuf.length, 0);

        // Payload structure: [XDRV (4)] + [MetaLen (4)] + [JSON Metadata] + [ENCRYPTED CHUNK BYTES]
        const payload = Buffer.concat([MAGIC_HEADER, metaLenBuf, metadataBuf, fileBytes]);

        const pixelsNeeded = Math.ceil(payload.length / 3);
        const side = Math.ceil(Math.sqrt(pixelsNeeded));

        const image = new Jimp(side, side, 0x000000FF);

        let payloadIndex = 0;
        for (let y = 0; y < side; y++) {
            for (let x = 0; x < side; x++) {
                if (payloadIndex >= payload.length) break;

                const r = payloadIndex < payload.length ? payload[payloadIndex++] : 0;
                const g = payloadIndex < payload.length ? payload[payloadIndex++] : 0;
                const b = payloadIndex < payload.length ? payload[payloadIndex++] : 0;

                const color = Jimp.rgbaToInt(r, g, b, 255);
                image.setPixelColor(color, x, y);
            }
            if (payloadIndex >= payload.length) break;
        }

        const pngBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

        // Serverless functions return the raw PNG data back to the client immediately
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="xdrive-chunk.png"`);
        res.send(pngBuffer);

    } catch (err) {
        console.error('Encode Error:', err);
        res.status(500).json({ error: 'Failed to encode payload.' });
    }
});

module.exports = app;
