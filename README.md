<div align="center">
  <img src="public/favicon.svg" alt="XDrive Logo" width="120" height="120">
  <h1>XDrive</h1>
  <p><b>Immersive 3D AES-256 Encrypted Image Storage</b></p>
  <p>
    <img src="https://img.shields.io/badge/Status-Active-success" alt="Status">
    <img src="https://img.shields.io/badge/License-ISC-blue" alt="License">
    <img src="https://img.shields.io/badge/Vercel-Ready-black" alt="Vercel">
  </p>
  <p><i>Made with love by <a href="#">harshalsp</a></i></p>
</div>

<br>

**XDrive** is a stealth, zero-knowledge cloud storage application running on Vercel Serverless Functions. It securely encrypts your arbitrary files in the browser using AES-GCM 256, slices them into chunks, and hides the encrypted data mathematically within the RGB pixels of lossless PNG images.

These encoded images can then be safely uploaded to image hosts (like X or Twitter), allowing you to use social platforms as an infinite, hyper-secure, free file storage system. 

---

## ✨ Features

- 🔒 **Zero-Knowledge Architecture (WebCrypto)**: Your files are encrypted natively in your browser using AES-GCM 256. The server never sees your password or raw data.
- 🕵️ **Stealth Pixel Encoding**: The encrypted binary chunks are translated into RGB pixels with an integrated `XDRV` magic header.
- 🚀 **Vercel Serverless Ready**: Re-engineered to bypass Vercel's free 4.5MB payload limitations by chunking files client-side before streaming them to edge Edge Functions.
- 🎮 **Immersive 3D WebGL UI**: An unparalleled user experience powered by **Three.js**, featuring an interactive Cyberpunk particle matrix, CSS 3D parallax cards, and dynamic immersive lighting.
- 📈 **Aggressive SEO**: Hardcoded Semantic HTML, Twitter Cards, Open Graph tags, and JSON-LD application schemas highly optimized for indexing.

---

## 🛠️ Stack

- **Frontend**: HTML5, Vanilla JS, Tailwind CSS v4, **Three.js**, WebCrypto API
- **Backend/Edge**: Node.js, Express, **Vercel Serverless**, Jimp, Multer (Memory Storage) 
- **Author**: harshalsp

---

## 🚀 Getting Started

### Prerequisites
You need Node.js `v20.x` or higher installed.

### Local Installation & Testing

1. Clone or download this repository.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the local Vercel Express simulator:
   ```bash
   npm start
   ```
4. Open your web browser and navigate to:
**[http://localhost:8080](http://localhost:8080)**

### Vercel Deployment

XDrive is entirely configured for 1-click Vercel deployments via the included `vercel.json` config!
1. Push this repository to GitHub.
2. Link the repository in your Vercel Dashboard.
3. Deploy! (No build steps required). All `/api` routes are inherently handled via Serverless Edge Functions, and the `/public` directory is served statically.

---

## 🕹️ How it Works

#### 1. Encrypt & Encode (File -> Image Sequence)
* Open the XDrive 3D Dashboard.
* Under `HIDE_PAYLOAD`, enter a Secret Password.
* Drag and drop your file over the upload zone.
* Your browser instantly generates an AES-256 derived key + Salt + IV, encrypts the file into a Uint8Array buffer, and slices it into 2MB chunks.
* Each chunk is POSTed to the Vercel Edge (`/api/encode`), where it receives a lossless PNG shell. 
* *Result*: You receive a `.zip` file containing sequentially indexed PNG images. 

#### 2. Decode & Extract (Image Sequence -> File)
* Download your PNG sequence from X.
* Under `EXTRACT_SECRET`, enter your exact Secret Password.
* Select and drop *ALL* the PNG images at once into the zone.
* The Vercel Edge extracts the Base64 payloads and sequence metadata from the pixels.
* Your browser mathematically stitches the encrypted chunks back into a single Buffer, derives your key, and natively decrypts the `ArrayBuffer` back into your exact, original file!

---

## 📄 License
ISC

<div align="center">
<i>Crafted for secure file orchestration</i>
<br><b>harshalsp</b>
</div>
