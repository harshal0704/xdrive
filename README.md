# XDrive

**XDrive** turns X.com (Twitter) into your personal, unlimited file storage. It encodes files into X-friendly threaded posts (text chunks) and decodes them back to their original format.

## Features
- **Upload Any File**: Converts images, documents, and archives into Base64 text.
- **Smart Threading**: Automatically splits files into 280-character chunks (or 25k for Premium) and generates a reply chain.
- **Drive History**: Saves your upload history locally in your browser using IndexedDB.
- **Integrated Decoder**: Paste your X thread to instantly recover the file.
- **Private & Secure**: All processing happens 100% in your browser. No backend server.

## How to Run
Since this project uses ES Modules, you need a local web server to run it (opening `index.html` directly may cause CORS errors).

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Local Server**
   ```bash
   npm start
   ```
   This will run the app at `http://127.0.0.1:8080`.

3. **Build CSS (Optional)**
   If you modify styles, rebuild Tailwind:
   ```bash
   npm run build:css
   ```

## Usage
1.  **Upload**: Select a file. The app will encode and split it.
2.  **Post**: Go to "My Drive", click your file, and use the "Post" buttons to send the Header, Chunks, and Manifest to X.
3.  **Decode**: Copy a full thread from X, paste it into the "Decode" tab, and download your original file.

## Tech Stack
- Vanilla JavaScript (ES Modules)
- Tailwind CSS (v4)
- Dexie.js (IndexedDB)
- HTML5 File API

## Future Roadmap
- [ ] Browser Extension for one-click posting/decoding.
- [ ] X API integration for automatic posting (requires backend).
- [ ] Encryption support.
