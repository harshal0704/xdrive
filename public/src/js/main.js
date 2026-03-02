// --- UI Elements ---
const fileEncodeInput = document.getElementById('file-encode');
const fileDecodeInput = document.getElementById('file-decode');

const dropEncode = document.getElementById('drop-encode');
const stateEncode = document.getElementById('state-encode-result');
const encodePartsCount = document.getElementById('encode-parts-count');
const btnDownloadEncoded = document.getElementById('btn-download-encoded');
const inputEncodeKey = document.getElementById('encode-key');

const dropDecode = document.getElementById('drop-decode');
const stateDecode = document.getElementById('state-decode-result');
const decodeFilename = document.getElementById('decode-filename');
const btnDownloadDecoded = document.getElementById('btn-download-decoded');
const inputDecodeKey = document.getElementById('decode-key');

const loaderOverlay = document.getElementById('loader-overlay');
const loaderText = document.getElementById('loader-text');

// 10MB chunk limit since we are doing this entirely locally now, no Vercel limit!
const CHUNK_SIZE_BYTES = 10 * 1024 * 1024;

// --- WebCrypto Utilities for AES-GCM 256 ---

// Derives a 256-bit AES-GCM key from a raw password string using PBKDF2
async function getKeyMaterial(password) {
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
}

// Uses salt to derive the key
async function deriveKey(passwordKey, salt) {
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypts an ArrayBuffer. Returns { cipherText, iv, salt }
async function encryptBuffer(buffer, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);

    const cipherText = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        buffer
    );

    return { cipherText, iv, salt };
}

// Decrypts an ArrayBuffer. Throws if password is wrong or data corrupted.
async function decryptBuffer(encryptedBuffer, password, iv, salt) {
    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);

    return await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encryptedBuffer
    );
}


// --- Local Canvas Engine for Steganography ---
const MAGIC_HEADER = new Uint8Array([88, 68, 82, 86]); // 'XDRV'

async function encodeToCanvasBlob(payloadBytes, metadataStr) {
    const enc = new TextEncoder();
    const metadataBuf = enc.encode(metadataStr);

    // 4 byte metaLen (Big Endian format)
    const metaLenBuf = new Uint8Array(4);
    new DataView(metaLenBuf.buffer).setUint32(0, metadataBuf.length, false);

    const totalLength = MAGIC_HEADER.length + metaLenBuf.length + metadataBuf.length + payloadBytes.length;
    const finalBuffer = new Uint8Array(totalLength);
    finalBuffer.set(MAGIC_HEADER, 0);
    finalBuffer.set(metaLenBuf, 4);
    finalBuffer.set(metadataBuf, 8);
    finalBuffer.set(payloadBytes, 8 + metadataBuf.length);

    const pixelsNeeded = Math.ceil(finalBuffer.length / 3);
    const side = Math.ceil(Math.sqrt(pixelsNeeded));

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(side, side);

    let bufIdx = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (bufIdx < finalBuffer.length) {
            imageData.data[i] = finalBuffer[bufIdx++];
            imageData.data[i + 1] = bufIdx < finalBuffer.length ? finalBuffer[bufIdx++] : 0;
            imageData.data[i + 2] = bufIdx < finalBuffer.length ? finalBuffer[bufIdx++] : 0;
            imageData.data[i + 3] = 255; // Alpha opaque
        } else {
            imageData.data[i] = 0;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
    });
}

function decodeFromImageFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const bytes = new Uint8Array(img.width * img.height * 3);

            let bIdx = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                bytes[bIdx++] = imageData.data[i];
                bytes[bIdx++] = imageData.data[i + 1];
                bytes[bIdx++] = imageData.data[i + 2];
            }

            // Magic Header Check 'XDRV'
            if (bytes[0] !== 88 || bytes[1] !== 68 || bytes[2] !== 82 || bytes[3] !== 86) {
                return reject(new Error("Invalid XDrive Image Format. Missing Magic Header."));
            }

            const metaLen = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, false);
            const metaBuf = bytes.slice(8, 8 + metaLen);
            const dec = new TextDecoder();
            const metaStr = dec.decode(metaBuf);
            const metadata = JSON.parse(metaStr);

            const payloadBuf = bytes.slice(8 + metaLen, 8 + metaLen + metadata.size);
            resolve({ metadata, payload: payloadBuf });
        };
        img.onerror = () => reject(new Error("Failed to read image pixel data."));
        img.src = url;
    });
}


// --- Global UI Actions ---
function showLoader(text) {
    loaderText.textContent = text;
    loaderOverlay.classList.remove('hidden');
    setTimeout(() => {
        loaderOverlay.classList.remove('opacity-0', 'pointer-events-none');
        loaderOverlay.classList.add('opacity-100', 'pointer-events-auto', 'flex');
    }, 10);
}

function hideLoader() {
    loaderOverlay.classList.add('opacity-0', 'pointer-events-none');
    loaderOverlay.classList.remove('opacity-100', 'pointer-events-auto');
    setTimeout(() => {
        loaderOverlay.classList.add('hidden');
        loaderOverlay.classList.remove('flex');
    }, 300);
}

window.resetEncode = function () {
    stateEncode.classList.add('hidden');
    dropEncode.classList.remove('hidden');
    fileEncodeInput.value = '';
};

window.resetDecode = function () {
    stateDecode.classList.add('hidden');
    dropDecode.classList.remove('hidden');
    fileDecodeInput.value = '';
};

// JSZIP dependency 
async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        script.onload = () => resolve(window.JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// --- ENCODE LOGIC ---
if (fileEncodeInput) {
    fileEncodeInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const keyStr = inputEncodeKey ? inputEncodeKey.value : '';
        if (!keyStr) {
            alert("SECURITY ALERT: Secret Key is required to encrypt the payload.");
            return resetEncode();
        }

        try {
            showLoader('> INITIATING AES-256 ENCRYPTION SEQUENCE...');

            // 1. Read file as ArrayBuffer
            const fileBuffer = await file.arrayBuffer();

            // 2. Encrypt the *entire* file first client-side
            const { cipherText, iv, salt } = await encryptBuffer(fileBuffer, keyStr);
            const encryptedBytes = new Uint8Array(cipherText);

            showLoader(`> ENCRYPTION COMPLETE. SLICING PAYLOAD (${(encryptedBytes.length / 1024 / 1024).toFixed(2)} MB)...`);

            // 3. Slice the encrypted payload into browser chunks (up to 10MB each realistically)
            const totalChunks = Math.ceil(encryptedBytes.length / CHUNK_SIZE_BYTES);
            const threadId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

            const generatedBlobs = [];

            for (let i = 0; i < totalChunks; i++) {
                showLoader(`> RENDER CHUNK ${i + 1}/${totalChunks} IN LOCAL MATRIX...`);

                const start = i * CHUNK_SIZE_BYTES;
                const end = Math.min(start + CHUNK_SIZE_BYTES, encryptedBytes.length);
                const chunkBytes = encryptedBytes.slice(start, end);

                const metadata = {
                    filename: file.name,
                    size: chunkBytes.length,
                    totalSize: encryptedBytes.length,
                    chunkIndex: i,
                    totalChunks: totalChunks,
                    threadId: threadId,
                    timestamp: Date.now(),
                    iv: Array.from(iv),
                    salt: Array.from(salt)
                };

                // 4. Transform locally in browser via Canvas API! Data never leaves the machine.
                const pngBlob = await encodeToCanvasBlob(chunkBytes, JSON.stringify(metadata));
                generatedBlobs.push({ blob: pngBlob, filename: `XDrive-${threadId}-Part${i + 1}of${totalChunks}.png` });
            }

            hideLoader();
            dropEncode.classList.add('hidden');
            stateEncode.classList.remove('hidden');

            if (generatedBlobs.length === 1) {
                // Single image, download directly
                encodePartsCount.textContent = "1";
                const url = URL.createObjectURL(generatedBlobs[0].blob);
                btnDownloadEncoded.href = url;
                btnDownloadEncoded.download = generatedBlobs[0].filename;
            } else {
                // Zip the images client-side before downloading to save user time
                showLoader('> ZIPPING MULTIPLE PAYLOADS...');
                const JSZip = await loadJSZip();
                const zip = new JSZip();

                generatedBlobs.forEach(item => {
                    zip.file(item.filename, item.blob);
                });

                const zipBlob = await zip.generateAsync({ type: "blob" });

                hideLoader();
                encodePartsCount.textContent = generatedBlobs.length + " (Zipped)";
                const url = URL.createObjectURL(zipBlob);
                btnDownloadEncoded.href = url;
                btnDownloadEncoded.download = `XDrive-Thread-${threadId}.zip`;
            }

        } catch (err) {
            console.error(err);
            hideLoader();
            alert('SYSTEM ERROR: ' + err.message);
            resetEncode();
        }
    });

    setupDragAndDrop(dropEncode, fileEncodeInput, '#ff007f');
}

// --- DECODE LOGIC ---
if (fileDecodeInput) {
    fileDecodeInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const keyStr = inputDecodeKey ? inputDecodeKey.value : '';
        if (!keyStr) {
            alert("SECURITY ALERT: Secret Key is required to extract the payload.");
            return resetDecode();
        }

        try {
            const extractedChunks = [];

            for (let i = 0; i < files.length; i++) {
                showLoader(`> EXTRACTING IMAGE ${i + 1}/${files.length} FROM LOCAL CANVAS...`);

                const data = await decodeFromImageFile(files[i]);

                extractedChunks.push({
                    metadata: data.metadata,
                    payload: data.payload
                });
            }

            // Ensure all chunks are present and sorted
            extractedChunks.sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex);

            const expectedChunks = extractedChunks[0].metadata.totalChunks;
            if (extractedChunks.length !== expectedChunks) {
                throw new Error(`Missing parts! Found ${extractedChunks.length} but expected ${expectedChunks}.`);
            }

            // Concatenate all encrypted payloads mathematically 
            let totalLength = 0;
            extractedChunks.forEach(c => totalLength += c.payload.length);

            const mergedEncryptedBuffer = new Uint8Array(totalLength);
            let offset = 0;
            extractedChunks.forEach(c => {
                mergedEncryptedBuffer.set(c.payload, offset);
                offset += c.payload.length;
            });

            // Retrieve Initialization Vector and Salt from the metadata
            showLoader(`> RECONSTRUCTING BUFFER. INITIATING AES DECRYPTION...`);
            const iv = new Uint8Array(extractedChunks[0].metadata.iv);
            const salt = new Uint8Array(extractedChunks[0].metadata.salt);
            const originalFilename = extractedChunks[0].metadata.filename;

            // Decrypt the merged buffer natively in the browser
            let decryptedBuffer;
            try {
                decryptedBuffer = await decryptBuffer(mergedEncryptedBuffer, keyStr, iv, salt);
            } catch (decErr) {
                throw new Error("DECRYPTION FAILED. ACCESS DENIED. KEY INCORRECT OR DATA CORRUPTED.");
            }

            // Generation the final extracted Blob!
            const finalBlob = new Blob([decryptedBuffer]);
            const finalUrl = URL.createObjectURL(finalBlob);

            hideLoader();
            dropDecode.classList.add('hidden');
            stateDecode.classList.remove('hidden');

            decodeFilename.textContent = originalFilename;
            btnDownloadDecoded.href = finalUrl;
            btnDownloadDecoded.download = originalFilename;

        } catch (err) {
            console.error(err);
            hideLoader();
            alert('FATAL ERROR: ' + err.message);
            resetDecode();
        }
    });

    setupDragAndDrop(dropDecode, fileDecodeInput, '#ccff00');
}


// --- UTILS ---
function setupDragAndDrop(zone, input, highlightColor) {
    if (!zone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, () => {
            zone.style.borderColor = highlightColor;
            zone.style.backgroundColor = 'rgba(255,255,255,0.1)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, () => {
            zone.style.borderColor = '';
            zone.style.backgroundColor = '';
        }, false);
    });

    zone.addEventListener('drop', (e) => {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
    }, false);
}
