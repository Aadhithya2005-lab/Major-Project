// --- DOM Elements ---
const docUpload = document.getElementById('doc-upload');
const processBtn = document.getElementById('process-btn');
const sourceLangSelect = document.getElementById('source-lang');
const targetLangSelect = document.getElementById('target-lang');
const originalTextArea = document.getElementById('original-text');
const translatedTextArea = document.getElementById('translated-text');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const spinner = document.getElementById('spinner');
const copyBtn = document.getElementById('copy-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const downloadDocxBtn = document.getElementById('download-docx-btn');
const translateAgainBtn = document.getElementById('translate-again-btn');
const clearBtn = document.getElementById('clear-btn');

const tabOcr = document.getElementById('tab-ocr');
const tabText = document.getElementById('tab-text');
const tabProduct = document.getElementById('tab-product');
const tabDocx = document.getElementById('tab-docx');

const ocrContent = document.getElementById('ocr-content');
const textContent = document.getElementById('text-content');
const productContent = document.getElementById('product-content');
const docxContent = document.getElementById('docx-content');

const fieldContainer = document.getElementById('field-detection-container');
const fieldsGrid = document.getElementById('fields-grid');
const translateFieldsBtn = document.getElementById('translate-fields-btn');

// TM/Direct Translation
const tmUploadInput = document.getElementById('tm-upload');
const tmStatusBox = document.getElementById('tm-status-box');
const directInput = document.getElementById('direct-input');
const directOutput = document.getElementById('direct-output');
const directTranslateBtn = document.getElementById('direct-translate-btn');
const directTargetLang = document.getElementById('direct-target-lang');
const directCopyBtn = document.getElementById('direct-copy-btn');
const tmMatchIndicator = document.getElementById('tm-match-indicator');
const tmTargetLangSelect = document.getElementById('tm-target-lang');

// Product Labels
const productUpload = document.getElementById('product-upload');
const productTargetLang = document.getElementById('product-target-lang');
const productTranslateBtn = document.getElementById('product-translate-btn');
const productLogs = document.getElementById('product-logs');
const productDownloadBtn = document.getElementById('product-download-btn');
const productProgressBadge = document.getElementById('product-progress-badge');
const productTmStatus = document.getElementById('product-tm-status');

// DOCX
const docxUpload = document.getElementById('docx-upload');
const docxTargetLang = document.getElementById('docx-target-lang');
const docxTranslateBtn = document.getElementById('docx-translate-btn');
const docxLogs = document.getElementById('docx-logs');
const docxDownloadBtn = document.getElementById('docx-download-btn');
const docxProgressBadge = document.getElementById('docx-progress-badge');
const docxTmStatus = document.getElementById('docx-tm-status');

// State
let detectedFields = [];

// PDF JS worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// --- UI Functions ---
function updateStatus(message, showSpinner = true) {
    if (!message) {
        statusContainer.classList.add('hidden');
        return;
    }
    statusContainer.classList.remove('hidden');
    statusText.textContent = message;
    spinner.style.display = showSpinner ? 'block' : 'none';
    if (message.includes('Starting') || message.includes('Processing')) {
        statusContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function switchTab(activeTab) {
    [tabOcr, tabText, tabProduct, tabDocx].forEach(t => t.classList.remove('active', 'text-cyan-400', 'text-purple-300', 'text-emerald-400', 'text-blue-300'));
    [ocrContent, textContent, productContent, docxContent].forEach(c => c.classList.add('hidden'));

    if (activeTab === 'ocr') {
        tabOcr.classList.add('active', 'text-cyan-400');
        ocrContent.classList.remove('hidden');
    } else if (activeTab === 'text') {
        tabText.classList.add('active', 'text-purple-300');
        textContent.classList.remove('hidden');
    } else if (activeTab === 'product') {
        tabProduct.classList.add('active', 'text-emerald-400');
        productContent.classList.remove('hidden');
    } else if (activeTab === 'docx') {
        tabDocx.classList.add('active', 'text-blue-300');
        docxContent.classList.remove('hidden');
    }
}

// --- Event Handlers ---
async function handleFileProcessing() {
    if (!docUpload.files || docUpload.files.length === 0) {
        alert('Please select a file first.');
        return;
    }
    processBtn.disabled = true;
    originalTextArea.value = '';
    translatedTextArea.value = '';
    translateAgainBtn.classList.add('hidden');
    updateStatus('Starting process...', true);

    const file = docUpload.files[0];
    const extension = file.name.split('.').pop().toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'webp'];
    const sourceLangValue = sourceLangSelect.value;

    try {
        let extractedText = '';
        if (extension === 'pdf') extractedText = await handlePdf(await file.arrayBuffer(), sourceLangValue);
        else if (extension === 'docx') extractedText = await handleDocx(await file.arrayBuffer());
        else if (extension === 'xlsx') extractedText = await handleXlsx(await file.arrayBuffer());
        else if (imageExtensions.includes(extension)) extractedText = await handleImage(file, sourceLangValue);
        else throw new Error(`Unsupported file type: ${extension}`);

        const cleanedText = extractedText.trim();
        originalTextArea.value = cleanedText;

        if (!cleanedText) {
            updateStatus('Could not extract any text.', false);
            return;
        }

        detectedFields = detectFields(cleanedText);
        renderFields();
        if (detectedFields.length > 0) fieldContainer.classList.remove('hidden');

        await translateText(cleanedText, targetLangSelect.value, originalTextArea, translatedTextArea, translateAgainBtn);
    } catch (error) {
        console.error(error);
        updateStatus(`Error: ${error.message}`, false);
    } finally {
        processBtn.disabled = false;
    }
}

function renderFields() {
    fieldsGrid.innerHTML = '';
    detectedFields.forEach((field, index) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-3 shadow-lg group';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <label class="field-label text-[10px] font-black text-slate-500 uppercase tracking-widest block">${field.label}</label>
                <button onclick="toggleVoiceInput(${index}, this)" 
                    class="voice-btn p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
                    title="Voice Input">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                    </svg>
                </button>
            </div>
            <input type="text" value="${field.value}" data-index="${index}" 
                class="field-value input-premium w-full rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-200 outline-none" />
        `;
        fieldsGrid.appendChild(div);
    });
}

async function handleTmUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const tmTarget = tmTargetLangSelect.value;

    try {
        const fileName = file.name.toLowerCase();
        let count = 0;
        if (!translationMemory[tmTarget]) translationMemory[tmTarget] = {};

        if (fileName.endsWith('.xlsx')) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            jsonData.forEach(row => {
                if (row && row.length >= 2 && row[0] && row[1]) {
                    const src = String(row[0]).trim().toLowerCase();
                    const tgt = String(row[1]).trim();
                    translationMemory[tmTarget][src] = tgt;
                    count++;
                }
            });
        }
        // ... TMX logic omitted for brevity, same as original
        tmStatusBox.innerHTML = `<div class="text-emerald-400 text-[10px] uppercase font-bold">${count} Units Locked</div>`;
    } catch (e) { console.error(e); }
}

async function handleDirectTranslation() {
    const text = directInput.value.trim();
    if (!text) return;
    const targetLang = directTargetLang.value;
    const normalized = text.toLowerCase();
    const tmSource = translationMemory[targetLang];

    if (tmSource && tmSource[normalized]) {
        directOutput.value = tmSource[normalized];
        tmMatchIndicator.classList.remove('hidden');
    } else {
        tmMatchIndicator.classList.add('hidden');
        updateStatus('Deploying Deep Neural Engine...', true);
        directOutput.value = await getSingleTranslation(text, targetLang);
        updateStatus('', false);
    }
}

// Clear Workspace
function clearAll() {
    originalTextArea.value = '';
    translatedTextArea.value = '';
    statusContainer.classList.add('hidden');
    docUpload.value = '';
    translateAgainBtn.classList.add('hidden');
    fieldContainer.classList.add('hidden');
    fieldsGrid.innerHTML = '';
    detectedFields = [];
    directInput.value = '';
    directOutput.value = '';
}

// Event Listeners
tabOcr.addEventListener('click', () => switchTab('ocr'));
tabText.addEventListener('click', () => switchTab('text'));
tabProduct.addEventListener('click', () => switchTab('product'));
tabDocx.addEventListener('click', () => switchTab('docx'));

processBtn.addEventListener('click', handleFileProcessing);
copyBtn.addEventListener('click', () => copyText(translatedTextArea.value));
downloadTxtBtn.addEventListener('click', () => {
    const { metadata, translation } = prepareExportData(translatedTextArea.value, detectedFields);
    downloadAsTxt(translation, metadata);
});
downloadPdfBtn.addEventListener('click', () => {
    const { metadata, translation } = prepareExportData(translatedTextArea.value, detectedFields);
    downloadAsPdf(translation, metadata);
});
downloadDocxBtn.addEventListener('click', () => {
    const { metadata, translation } = prepareExportData(translatedTextArea.value, detectedFields);
    downloadAsDocx(translation, metadata);
});
clearBtn.addEventListener('click', clearAll);

tmUploadInput.addEventListener('change', handleTmUpload);
directTranslateBtn.addEventListener('click', handleDirectTranslation);
directCopyBtn.addEventListener('click', () => copyText(directOutput.value));

productUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    productData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
});
productTranslateBtn.addEventListener('click', () => translateProductLabels(productData, productTargetLang.value, productLogs, productProgressBadge, productDownloadBtn));

docxUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    docxFileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    currentDocxZip = await JSZip.loadAsync(arrayBuffer);
});
docxTranslateBtn.addEventListener('click', () => processDocxTranslation(currentDocxZip, docxFileName, docxTargetLang.value, docxLogs, docxProgressBadge, docxDownloadBtn));
docxDownloadBtn.addEventListener('click', async () => {
    const blob = await currentDocxZip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = docxFileName.replace(".docx", `_translated_${docxTargetLang.value}.docx`);
    a.click();
});

// Initial tab
switchTab('ocr');
