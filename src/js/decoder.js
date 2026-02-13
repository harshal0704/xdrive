/**
 * Decodes a thread (or pasted chunks) back into a file and triggers download.
 * @param {string} content - The full pasted text from the thread.
 */
export async function decodeAndDownload(content) {
    console.log('Starting decode process...');

    // 1. Extract Base64 parts
    const lines = content.split('\n');
    let base64String = '';
    let filename = 'downloaded-file';
    let fileType = 'application/octet-stream';

    // Try to find Manifest for metadata
    try {
        const manifestMatch = content.match(/Manifest: ({.*})/);
        if (manifestMatch) {
            const manifest = JSON.parse(manifestMatch[1]);
            filename = manifest.name || filename;
            fileType = manifest.type || fileType;
            console.log('Manifest found:', manifest);
        } else {
            // Try to find filename in Header
            const headerMatch = content.match(/📁 (.*)/);
            if (headerMatch) {
                filename = headerMatch[1].trim();
                console.log('Filename found in header:', filename);
            }
        }
    } catch (e) {
        console.warn('Could not parse manifest or header:', e);
    }

    // Process each line to find chunks
    // Regex matches "1/5 <data>" or just "<data>"
    const chunkRegex = /^(\d+\/\d+)?\s*([A-Za-z0-9+/=]+)$/;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        if (line.includes('Manifest:')) return; // Skip manifest line logic here
        if (line.includes('📁')) return; // Skip header line logic here

        const match = line.match(chunkRegex);
        if (match) {
            // match[1] is "1/5" (optional), match[2] is data
            const potentialBase64 = match[2];
            // Basic validation to ensure it looks like base64 and isn't just a short word
            if (potentialBase64.length > 20 && /^[A-Za-z0-9+/=]+$/.test(potentialBase64)) {
                base64String += potentialBase64;
            }
        }
    });

    if (!base64String) {
        throw new Error('No valid Base64 data found in the pasted content.');
    }

    console.log('Decoded Base64 length:', base64String.length);

    try {
        // 2. Convert to Blob
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: fileType });

        // 3. Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        return true;
    } catch (e) {
        console.error('Conversion error:', e);
        throw new Error('Failed to convert base64 to file. The data might be corrupted.');
    }
}
