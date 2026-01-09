// --- LRU Cache Implementation ---
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }
    get(key) {
        if (!this.cache.has(key)) return null;
        const val = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }
    put(key, val) {
        if (this.cache.has(key)) this.cache.delete(key);
        this.cache.set(key, val);
        if (this.cache.size > this.capacity) {
            this.cache.delete(this.cache.keys().next().value);
        }
    }
}

const translationCache = new LRUCache(100);

// --- State ---
let translationMemory = {}; // { targetLang: { normalizedSource: targetText } }

// Language mapping
const langMap = {
    'eng': 'en', 'spa': 'es', 'fra': 'fr', 'deu': 'de', 'ita': 'it',
    'por': 'pt', 'rus': 'ru', 'chi_sim': 'zh-CN', 'jpn': 'ja',
    'kor': 'ko', 'ara': 'ar', 'hin': 'hi', 'tam': 'ta', 'tel': 'te', 'tur': 'tr'
};

/**
 * Get a single translation from Google Translate API (GTX)
 */
async function getSingleTranslation(text, targetLang, sourceLangCode = null) {
    const cacheKey = `${text}|${targetLang}`;
    const cached = translationCache.get(cacheKey);
    if (cached) return cached;

    const tmSource = translationMemory[targetLang];
    const normalized = text.toLowerCase();
    if (tmSource && tmSource[normalized]) return tmSource[normalized];

    const sourceLang = sourceLangCode || (window.sourceLangSelect ? (langMap[window.sourceLangSelect.value] || 'en') : 'en');
    const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const result = data[0].map(part => part[0]).join('');
        translationCache.put(cacheKey, result);
        return result;
    } catch (e) {
        console.error("Translation API error:", e);
        return text;
    }
}

/**
 * Batch translation logic
 */
async function translateText(text, targetLang, originalTextArea, translatedTextArea, translateAgainBtn) {
    if (!text) return;
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const results = new Array(lines.length);

    updateStatus(`Initializing Deep Engine for ${lines.length} lines...`, true);

    const linesToTranslate = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const normalized = line.toLowerCase();
        const cached = translationCache.get(`${line}|${targetLang}`);
        const tmMatch = translationMemory[targetLang]?.[normalized];

        if (cached) results[i] = cached;
        else if (tmMatch) results[i] = tmMatch;
        else linesToTranslate.push({ index: i, text: line });
    }

    if (linesToTranslate.length === 0) {
        translatedTextArea.value = results.join('\n');
        updateStatus('', false);
        return;
    }

    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < linesToTranslate.length; i += BATCH_SIZE) {
        batches.push(linesToTranslate.slice(i, i + BATCH_SIZE));
    }

    updateStatus(`Neural processing: ${batches.length} vectors in flight...`, true);

    try {
        await Promise.all(batches.map(async (batch) => {
            const batchText = batch.map(item => item.text).join('\n');
            const translatedBatch = await getSingleTranslation(batchText, targetLang);
            const translatedLines = translatedBatch.split('\n');
            batch.forEach((item, idx) => {
                results[item.index] = translatedLines[idx] || item.text;
            });
        }));
    } catch (error) {
        console.error("Batch error:", error);
    }

    translatedTextArea.value = results.join('\n');
    if (translateAgainBtn) translateAgainBtn.classList.remove('hidden');
    updateStatus('Deep Neural Translation Complete', false);
    setTimeout(() => updateStatus('', false), 3000);
}
