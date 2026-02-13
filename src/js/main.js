import { encodeFile } from './encoder.js';
import { splitContent } from './splitter.js';
import { saveFileRecord, getAllFileRecords } from './db.js';
import { decodeAndDownload } from './decoder.js';

// --- UI Elements ---
const tabs = {
    encode: document.getElementById('tab-encode'),
    drive: document.getElementById('tab-drive'),
    decode: document.getElementById('tab-decode'),
};

const views = {
    encode: document.getElementById('view-encode'),
    drive: document.getElementById('view-drive'),
    decode: document.getElementById('view-decode'),
};

const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('upload-progress');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const fileList = document.getElementById('file-list');
const threadView = document.getElementById('thread-view');
const decodeBtn = document.getElementById('decodeButton');
const pasteArea = document.getElementById('pasteArea');

// --- Tab Switching Logic ---
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    // Reset classes
    Object.values(tabs).forEach(t => {
        if (t) t.className = 'px-6 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-all cursor-pointer';
    });
    Object.values(views).forEach(v => {
        if (v) {
            v.classList.add('hidden');
            v.classList.remove('flex'); // Ensure flex is removed
        }
    });

    // Activate selected
    if (tabs[tabName] && views[tabName]) {
        tabs[tabName].className = 'px-6 py-2 rounded-lg text-sm font-semibold bg-white shadow-sm text-slate-900 transition-all cursor-default ring-1 ring-black/5';
        views[tabName].classList.remove('hidden');
        views[tabName].classList.add('flex'); // Add flex back for layout
    }

    if (tabName === 'drive') {
        renderDriveList();
    }
}

Object.keys(tabs).forEach(key => {
    if (tabs[key]) {
        tabs[key].addEventListener('click', () => switchTab(key));
    }
});

// --- Encode/Upload Flow ---
if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name);

        // Show Progress
        if (uploadProgress) uploadProgress.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';

        try {
            // 1. Encode
            if (progressBar) progressBar.style.width = '30%';
            if (progressPercent) progressPercent.textContent = '30% (Encoding...)';
            const base64String = await encodeFile(file);

            // 2. Split
            if (progressBar) progressBar.style.width = '60%';
            if (progressPercent) progressPercent.textContent = '60% (Splitting...)';
            const chunkSizeInput = document.querySelector('input[name="limit"]:checked');
            const chunkSize = chunkSizeInput ? chunkSizeInput.value : 280;
            const thread = splitContent(base64String, parseInt(chunkSize), file.name, file.type);

            // 3. Save
            if (progressBar) progressBar.style.width = '80%';
            if (progressPercent) progressPercent.textContent = '80% (Saving to DB...)';

            await saveFileRecord({
                filename: file.name,
                timestamp: Date.now(),
                thread: thread
            });
            console.log('File saved to DB');

            // 4. Finish
            if (progressBar) progressBar.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100% (Done!)';
            setTimeout(() => {
                if (uploadProgress) uploadProgress.classList.add('hidden');
                switchTab('drive');
                // Auto-select the new file (most recent)
                setTimeout(() => {
                    if (fileList && fileList.firstElementChild && fileList.firstElementChild.click) {
                        fileList.firstElementChild.click();
                    }
                }, 100);
            }, 800);

        } catch (err) {
            console.error('Processing Error:', err);
            alert('Error processing file: ' + err.message);
            if (uploadProgress) uploadProgress.classList.add('hidden');
        }
    });
}

// --- Drive View Logic ---
async function renderDriveList() {
    if (!fileList) return;
    fileList.innerHTML = '<div class="p-8 text-center text-slate-400 text-sm">Loading...</div>';

    try {
        const records = await getAllFileRecords();
        records.reverse(); // Newest first

        fileList.innerHTML = '';
        if (records.length === 0) {
            fileList.innerHTML = '<div class="p-8 text-center text-slate-400 text-sm">No files encoded yet.</div>';
            return;
        }

        records.forEach(record => {
            const item = document.createElement('div');
            item.className = 'p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group';
            item.innerHTML = `
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mr-3 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div class="overflow-hidden">
                        <div class="font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">${record.filename}</div>
                        <div class="text-xs text-slate-400 font-medium">${new Date(record.timestamp).toLocaleDateString()} ${new Date(record.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => renderThread(record));
            fileList.appendChild(item);
        });
    } catch (e) {
        console.error('DB Error:', e);
        fileList.innerHTML = '<div class="p-8 text-center text-red-500 text-sm">Error loading files.</div>';
    }
}

function renderThread(record) {
    if (!threadView) return;
    const thread = record.thread;
    const isPremium = thread.chunks.length > 0 && thread.chunks[0].length > 500; // Rough check

    threadView.innerHTML = `
        <!-- Sticky Header for File Info -->
        <div class="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
            <div>
                <h3 class="font-bold text-lg text-slate-800">${record.filename}</h3>
                <div class="flex items-center space-x-2 mt-1">
                    <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase tracking-wide">${thread.chunks.length} Parts</span>
                    <span class="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-xs font-bold uppercase tracking-wide">${isPremium ? 'Premium' : 'Standard'}</span>
                </div>
            </div>
            <button onclick="navigator.clipboard.writeText('${thread.header.replace(/'/g, "\\'")}\\n\\n${thread.chunks.join('\\n').replace(/'/g, "\\'")}\\n\\n${thread.manifest.replace(/'/g, "\\'")}')" class="text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
                Copy Full Thread
            </button>
        </div>

        <!-- Scrollable Thread Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
            
            <!-- 1. Header Post -->
            <div class="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-6 relative">
                 <span class="absolute top-4 right-4 text-xs font-bold text-indigo-300 bg-white/80 px-2 py-1 rounded">START</span>
                <div class="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-3 flex items-center">
                    <span class="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                    Step 1: The Header
                </div>
                <div class="bg-white p-4 rounded-xl text-sm font-mono text-slate-600 whitespace-pre-wrap select-all border border-indigo-100 shadow-sm mb-4">${thread.header}</div>
                <div class="flex justify-start space-x-3">
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(thread.header)}" target="_blank" class="bg-black hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Post Header
                    </a>
                    <button class="text-slate-500 hover:text-slate-700 text-sm font-semibold px-3" onclick="navigator.clipboard.writeText(\`${thread.header.replace(/`/g, '\\`')}\`)">Copy Text</button>
                </div>
            </div>

            <!-- 2. Chunks -->
            <div class="space-y-6">
                 <div class="flex items-center justify-center">
                    <div class="h-px bg-slate-200 flex-1"></div>
                    <span class="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data Chunks</span>
                    <div class="h-px bg-slate-200 flex-1"></div>
                </div>

                ${thread.chunks.map((chunk, idx) => `
                    <div class="group relative pl-8 border-l-2 border-slate-200 hover:border-indigo-400 transition-colors">
                        <!-- Connector Dot -->
                        <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200 group-hover:border-indigo-500 transition-colors"></div>
                        
                        <div class="mb-2 flex justify-between items-baseline">
                             <div class="text-sm font-bold text-slate-700">Part ${idx + 1}/${thread.chunks.length}</div>
                             <div class="text-xs font-mono text-slate-400">${chunk.length} chars</div>
                        </div>
                        
                        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-500 truncate h-12 group-hover:h-auto group-hover:whitespace-pre-wrap transition-all cursor-pointer mb-3 select-all" title="Click to expand">${chunk}</div>
                        
                        <div class="flex space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
                            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(chunk)}" target="_blank" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg">
                                <svg class="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                                Reply
                            </a>
                            <button class="text-slate-400 hover:text-slate-600 text-xs font-medium" onclick="navigator.clipboard.writeText(\`${chunk.replace(/`/g, '\\`')}\`)">Copy</button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- 3. Manifest -->
            <div class="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6 relative">
                <span class="absolute top-4 right-4 text-xs font-bold text-emerald-300 bg-white/80 px-2 py-1 rounded">END</span>
                <div class="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3 flex items-center">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    Step 3: The Manifest
                </div>
                <div class="bg-white p-4 rounded-xl text-sm font-mono text-slate-600 whitespace-pre-wrap select-all border border-emerald-100 shadow-sm mb-4">${thread.manifest}</div>
                <div class="flex justify-start space-x-3">
                    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(thread.manifest)}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                        Post Manifest
                    </a>
                    <button class="text-slate-500 hover:text-slate-700 text-sm font-semibold px-3" onclick="navigator.clipboard.writeText(\`${thread.manifest.replace(/`/g, '\\`')}\`)">Copy Text</button>
                </div>
            </div>

        </div>
    `;
}

// --- Decoder Logic Integration ---
if (decodeBtn) {
    decodeBtn.addEventListener('click', async () => {
        const content = pasteArea.value;
        if (!content.trim()) return alert('Please paste the thread content first.');

        try {
            await decodeAndDownload(content);
        } catch (e) {
            alert('Decoding failed: ' + e.message);
        }
    });
}

// Initial Render
switchTab('encode');
renderDriveList();
