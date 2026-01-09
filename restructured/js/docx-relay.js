// --- DOCX Translation Logic ---
let currentDocxZip = null;
let docxFileName = "";

async function processDocxTranslation(fileZip, fileName, targetLang, docxLogs, docxProgressBadge, docxDownloadBtn) {
    if (!fileZip) return;

    docxProgressBadge.textContent = 'SYNCHRONIZING...';
    docxProgressBadge.classList.add('animate-pulse');

    addDocxLog(`Initializing deep relay for ${fileName} (Target: ${targetLang})`, 'info', docxLogs);

    try {
        const textFiles = [];
        fileZip.forEach((relativePath, file) => {
            if (relativePath.startsWith("word/document.xml") ||
                relativePath.startsWith("word/header") ||
                relativePath.startsWith("word/footer")) {
                textFiles.push(file);
            }
        });

        let totalTextElements = 0;
        const BATCH_SIZE = 20;

        for (const fileObj of textFiles) {
            addDocxLog(`Relaying segment: ${fileObj.name}`, 'info', docxLogs);
            let xmlText = await fileObj.async("string");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");

            const tTags = Array.from(xmlDoc.getElementsByTagName("w:t"));
            const validTags = tTags.filter(t => t.textContent && t.textContent.trim().length > 0);

            totalTextElements += validTags.length;
            addDocxLog(`Segment ${fileObj.name} has ${validTags.length} valid text units.`, 'info', docxLogs);

            for (let i = 0; i < validTags.length; i += BATCH_SIZE) {
                const batch = validTags.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (tag) => {
                    const original = tag.textContent.trim();
                    if (!original) return;

                    const normalized = original.toLowerCase();
                    const cached = translationCache.get(`${original}|${targetLang}`);
                    const tmMatch = translationMemory[targetLang]?.[normalized];

                    if (tmMatch) {
                        tag.textContent = tag.textContent.replace(original, tmMatch);
                    } else if (cached) {
                        tag.textContent = tag.textContent.replace(original, cached);
                    } else {
                        const translated = await getSingleTranslation(original, targetLang);
                        tag.textContent = tag.textContent.replace(original, translated);
                    }
                }));
                addDocxLog(`Segment ${fileObj.name}: Batch ${Math.floor(i / BATCH_SIZE) + 1} complete.`, 'info', docxLogs);
            }

            const serializer = new XMLSerializer();
            const updatedXml = serializer.serializeToString(xmlDoc);
            fileZip.file(fileObj.name, updatedXml);
        }

        addDocxLog(`Relay complete! Synchronized ${totalTextElements} units across all segments.`, 'success', docxLogs);
        docxProgressBadge.textContent = 'COMPLETED';
        docxProgressBadge.classList.remove('animate-pulse');
        docxProgressBadge.className = 'px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20';
        docxDownloadBtn.disabled = false;

    } catch (err) {
        addDocxLog(`Relay Failed: ${err.message}`, 'error', docxLogs);
        throw err;
    }
}

function addDocxLog(message, typeValue = 'info', docxLogsContainer) {
    const time = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `py-1 ${typeValue === 'error' ? 'text-red-400' : typeValue === 'success' ? 'text-blue-400' : 'text-slate-400'}`;
    logEntry.innerHTML = `<span class="opacity-50 mr-2">[${time}]</span> ${message}`;
    docxLogsContainer.appendChild(logEntry);
    docxLogsContainer.scrollTop = docxLogsContainer.scrollHeight;
}
