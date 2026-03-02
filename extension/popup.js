document.getElementById('extractBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: scanAndDownloadImages
        });
    });
});

function scanAndDownloadImages() {
    // Basic array to keep track of unique src URLs
    const uniqueImages = new Set();

    // X.com images are usually embedded in article tags under specific img class selectors
    // We target img tags that look like tweet media. They usually have 'format=jpg' or 'format=png' in the URL
    // We need to fetch the 'format=png' versions for XDrive.
    const imageElements = document.querySelectorAll('img');

    imageElements.forEach(img => {
        let src = img.src;
        if (src.includes('twimg.com/media/')) {
            // Force the URL to fetch the full PNG version
            // e.g. https://pbs.twimg.com/media/Fxxxxxx?format=jpg&name=small
            // -> https://pbs.twimg.com/media/Fxxxxxx?format=png&name=orig

            try {
                const url = new URL(src);
                url.searchParams.set('name', 'orig');
                // Assume it was uploaded as PNG for XDrive. Force format.
                url.searchParams.set('format', 'png');

                uniqueImages.add(url.toString());
            } catch (e) { }
        }
    });

    const imagesArray = Array.from(uniqueImages);

    if (imagesArray.length === 0) {
        alert("XDrive: No thread media found on this page.");
        return;
    }

    // Send the array to background script to trigger downloads
    chrome.runtime.sendMessage({ action: "downloadSequence", images: imagesArray });
}
