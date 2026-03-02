chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "downloadSequence") {
        const images = request.images;

        let delayedDownload = (url, index) => {
            setTimeout(() => {
                chrome.downloads.download({
                    url: url,
                    filename: `XDrive_Extract/xdrive_part_${index}.png`,
                    saveAs: false
                });
            }, index * 500); // 500ms stagger to prevent dropping
        };

        images.forEach((url, index) => {
            delayedDownload(url, index + 1);
        });

    }
});
