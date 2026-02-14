// X Reader - Content Script

console.log('[XDrive] Extension Loaded');

// Utility to create the button
function createDownloadButton(clickHandler) {
    const btn = document.createElement('button');
    btn.className = 'xdrive-download-btn';
    btn.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M12 16L7 11H10V4H14V11H17L12 16ZM4 18H20V20H4V18Z"></path></svg>
        Download
    `;
    btn.title = "Download with XDrive";
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        clickHandler();
    };
    return btn;
}

// Function to extract text from a tweet element
function getTweetText(tweetNode) {
    const textNode = tweetNode.querySelector('[data-testid="tweetText"]');
    return textNode ? textNode.innerText : '';
}

// Function to find the full thread text
// This is heuristics-based since X structure is complex
function collectThreadText(startTweet) {
    // Current heuristic:
    // 1. Get the text of the current tweet (Header)
    // 2. Look for siblings or a connected thread container?
    // Actually, asking the user to expand the thread first might be safer, 
    // OR just scraping all visible text in the thread view if we are on a status page.

    // Strategy: If we are on a /status/ page, we scrape all "tweetText" divs.
    if (window.location.href.includes('/status/')) {
        const allTweets = document.querySelectorAll('[data-testid="tweetText"]');
        let fullText = '';
        allTweets.forEach(t => {
            fullText += t.innerText + '\n';
        });
        return fullText;
    } else {
        // Timeline view: only get this tweet.
        // XDrive splits files, so often the header is separate. 
        // We might just download what's here and see if it's enough (small files).
        return getTweetText(startTweet);
    }
}

// Global observer to handle infinite scrolling
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // Element
                // Check if it's a tweet or contains tweets
                const tweets = node.querySelectorAll ? node.querySelectorAll('[data-testid="tweet"]') : [];
                if (node.getAttribute && node.getAttribute('data-testid') === 'tweet') {
                    processTweet(node);
                }
                tweets.forEach(processTweet);
            }
        }
    }
});

function processTweet(tweetNode) {
    if (tweetNode.dataset.xdriveProcessed) return;

    // Check for XDrive Header Indicator "📁"
    const text = getTweetText(tweetNode);
    if (text && text.includes('📁') && (text.includes('XDrive') || text.includes('parts'))) {

        // Find Action Bar to inject button
        const actionBar = tweetNode.querySelector('[role="group"]');
        if (actionBar) {
            const btn = createDownloadButton(async () => {
                console.log('[XDrive] Download clicked');

                // Check if we are on the full thread view
                if (!window.location.href.includes('/status/')) {
                    alert('⚡ XDrive: Please click on the timestamp to open the full thread, then click Download again.');
                    return;
                }

                btn.innerText = 'Downloading...';

                try {
                    // Collect text
                    const fullText = collectThreadText(tweetNode);
                    console.log('[XDrive] Collected text length:', fullText.length);

                    // Decode
                    if (typeof decodeAndDownload === 'function') {
                        await decodeAndDownload(fullText);
                        btn.innerText = 'Done! ✅';
                    } else {
                        console.error('Decoder not loaded');
                        btn.innerText = 'Error ❌';
                    }
                } catch (e) {
                    console.error(e);
                    btn.innerText = 'Failed ❌';
                    alert('XDrive Error: ' + e.message);
                }

                setTimeout(() => {
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24"><path d="M12 16L7 11H10V4H14V11H17L12 16ZM4 18H20V20H4V18Z"></path></svg>
                        Download
                    `;
                }, 3000);
            });

            // Append to action bar
            // Check if we already added it (sometimes observer fires multiple times)
            if (!actionBar.querySelector('.xdrive-download-btn')) {
                actionBar.appendChild(btn);
            }
            tweetNode.dataset.xdriveProcessed = 'true';
        }
    }
}

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Initial pass
document.querySelectorAll('[data-testid="tweet"]').forEach(processTweet);
