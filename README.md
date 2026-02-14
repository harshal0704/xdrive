# XDrive: Secure File Storage on X (Twitter)

XDrive transforms your X (Twitter) profile into unlimited cloud storage. It encodes any file into text-based tweets, which can be stored publicly or privately on X, and decodes them back into original files whenever you need them.

## 🚀 Features
-   **Encode Anything**: Convert images, PDFs, ZIPs, etc., into text threads.
-   **Smart Splitting**: Automatically splits large files into 280-character chunks (or 25k for Premium).
-   **Local Storage**: Saves your encoded files to your browser's local storage (IndexedDB) for easy access.
-   **One-Click Decode**: Paste a thread (or just the text) to get your file back.

## 🛠️ Setup & Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the App**:
    ```bash
    npm start
    ```
    This will launch a local server at `http://localhost:8080` (or 8081).

## 📖 How to Use

### 1. Upload & Encode
1.  Open the app in your browser.
2.  Go to the **"Encode"** tab.
3.  Click **"Select File to Encode"**.
4.  Choose your file. The app will process it and save it to "My Drive".

### 2. Post to X
1.  Go to the **"My Drive"** tab.
2.  Click on the file you just encoded.
3.  You will see a generated **Thread**:
    *   **Step 1 (Header)**: Contains filename and size.
    *   **Step 2 (Chunks)**: The actual file data converting to text.
    *   **Step 3 (Manifest)**: Metadata for reliable decoding.
4.  Click **"Copy Full Thread"** (or copy individual parts) and post them as a thread on X.

### 3. Decode & Download
1.  Go to the tweet thread on X.
2.  Copy the **entire text** of the thread (Header, Chunks, and Manifest).
    *   *Tip: You can just copy the text content, even with extra words like "Replying to...", the decoder is smart enough to find the data.*
3.  Open XDrive and go to the **"Decode"** tab.
4.  Paste the text into the box.
5.  Click **"Decode & Download"**.
6.  Your file will be reconstructed and downloaded!

## ⚠️ Notes
-   This app runs entirely in your browser. No data is sent to any third-party server (other than X when you post).
-   **Do not lose the Manifest!** It contains the file type and name information.
