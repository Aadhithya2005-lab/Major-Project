// --- Product Label Logic ---
let productWorkbook = null;
let productData = [];

function addProductLog(message, type = 'info', productLogsContainer) {
    const time = new Date().toLocaleTimeString();
    const log = document.createElement('div');
    log.className = `py-1 ${type === 'error' ? 'text-red-400' : type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`;
    log.innerHTML = `<span class="opacity-50 mr-2">[${time}]</span> ${message}`;
    productLogsContainer.appendChild(log);
    productLogsContainer.scrollTop = productLogsContainer.scrollHeight;
}

async function translateProductLabels(data, targetLang, logsContainer, progressBadge, downloadBtn) {
    if (!data || data.length === 0) return;

    const sourceKey = Object.keys(data[0]).find(k => k.toLowerCase() === 'source');

    progressBadge.textContent = 'TRANSLATING...';
    progressBadge.classList.add('animate-pulse');

    addProductLog(`Starting batch translation for ${data.length} labels...`, 'info', logsContainer);

    const BATCH_SIZE = 10;
    const total = data.length;
    let translatedCount = 0;
    let tmMatches = 0;

    try {
        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (row) => {
                const originalText = String(row[sourceKey] || '').trim();
                if (!originalText) return;

                const normalized = originalText.toLowerCase();
                const cached = translationCache.get(`${originalText}|${targetLang}`);
                const tmMatch = translationMemory[targetLang]?.[normalized];

                if (tmMatch) {
                    row['Target'] = tmMatch;
                    tmMatches++;
                } else if (cached) {
                    row['Target'] = cached;
                } else {
                    const translated = await getSingleTranslation(originalText, targetLang);
                    row['Target'] = translated;
                }
                translatedCount++;
            });

            await Promise.all(batchPromises);
            addProductLog(`Batch ${Math.floor(i / BATCH_SIZE) + 1} processing: ${translatedCount}/${total} complete.`, 'info', logsContainer);
        }

        addProductLog(`Translation complete! TM Matches: ${tmMatches}`, 'success', logsContainer);
        progressBadge.textContent = 'COMPLETED';
        progressBadge.classList.remove('animate-pulse');
        progressBadge.className = 'px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20';
        downloadBtn.disabled = false;

    } catch (err) {
        addProductLog(`Translation failed: ${err.message}`, 'error', logsContainer);
        throw err;
    }
}
