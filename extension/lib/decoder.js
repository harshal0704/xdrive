/**
 * Decodes a thread (or pasted chunks) back into a file and triggers download.
 * @param {string} content - The full pasted text from the thread.
 */
async function decodeAndDownload(content) {
    console.log('[XDrive] Starting decode process...');

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
            console.log('[XDrive] Manifest found:', manifest);
        } else {
            // Try to find filename in Header
            const headerMatch = content.match(/📁 (.*)/);
            if (headerMatch) {
                filename = headerMatch[1].trim();
                console.log('[XDrive] Filename found in header:', filename);
            }
        }
    } catch (e) {
        console.warn('[XDrive] Could not parse manifest or header:', e);
    }

    const chunkRegex = /^(\d+\/\d+)?\s*([A-Za-z0-9+/=]+)$/;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        if (line.includes('Manifest:')) return;
        if (line.includes('📁')) return;

        const match = line.match(chunkRegex);
        if (match) {
            const potentialBase64 = match[2];
            if (potentialBase64.length > 20 && /^[A-Za-z0-9+/=]+$/.test(potentialBase64)) {
                base64String += potentialBase64;
            }
        }
    });

    if (!base64String) {
        throw new Error('No valid Base64 data found in the pasted content.');
    }

    console.log('[XDrive] Decoded Base64 length:', base64String.length);

    try {
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: fileType });

        // Use chrome.downloads if available and we have permission, 
        // fallback to anchor tag method which works in content scripts usually
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (e) {
        console.error('[XDrive] Conversion error:', e);
        throw new Error('Failed to convert base64 to file.');
    }
}
