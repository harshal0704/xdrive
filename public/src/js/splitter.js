/**
 * Splits a base64 string into X-friendly chunks and generates a full thread structure.
 * @param {string} base64Content - The full Base64 encoded file.
 * @param {number} chunkSize - Max characters per chunk (280 or 25000).
 * @param {string} filename - Original filename.
 * @param {string} fileType - Original MIME type.
 * @return {Object} Thread object containing header, chunks, and manifest.
 */
export function splitContent(base64Content, chunkSize, filename, fileType) {
    // 1. Calculate chunks
    // We reserve space for "i/n " prefix (approx 10 chars)
    const effectiveChunkSize = chunkSize - 15;
    const numChunks = Math.ceil(base64Content.length / effectiveChunkSize);

    // 2. Generate Header Post
    const header = `📁 ${filename}\n📊 ${(base64Content.length / 1024).toFixed(2)} KB | ${numChunks} parts\n\nDOWNLOAD INSTRUCTIONS:\n1. Copy the full thread below.\n2. Paste into XDrive Decoder.\n\n#XDrive #FileShare`;

    // 3. Generate Data Chunks
    const chunks = [];
    for (let i = 0, j = 0; i < numChunks; ++i, j += effectiveChunkSize) {
        const chunkData = base64Content.substr(j, effectiveChunkSize);
        // Format: "1/5 <data>"
        chunks.push(`${i + 1}/${numChunks} ${chunkData}`);
    }

    // 4. Generate Manifest Post (JSON for auto-recombining)
    const manifest = {
        name: filename,
        type: fileType,
        size: base64Content.length,
        parts: numChunks,
        id: Date.now().toString(36) // Simple unique ID
    };
    const manifestText = `🛑 END OF FILE\nManifest: ${JSON.stringify(manifest)}`;

    return {
        header,
        chunks,
        manifest: manifestText,
        rawManifest: manifest
    };
}
