// --- OCR & Extraction ---

async function handleImage(file, sourceLangValue) {
    updateStatus('Processing image with OCR...', true);
    try {
        const worker = await Tesseract.createWorker();
        await worker.loadLanguage(sourceLangValue);
        await worker.initialize(sourceLangValue);
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        return text;
    } catch (e) {
        console.error("Tesseract error:", e);
        throw new Error("OCR failed. Try another file or language.");
    }
}

async function handlePdf(arrayBuffer, sourceLangValue) {
    const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
    let fullText = '';
    const worker = await Tesseract.createWorker();
    await worker.loadLanguage(sourceLangValue);
    await worker.initialize(sourceLangValue);
    for (let i = 1; i <= pdf.numPages; i++) {
        updateStatus(`Processing PDF page ${i}/${pdf.numPages}...`, true);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const { data: { text } } = await worker.recognize(canvas);
        fullText += text + '\n\n';
    }
    await worker.terminate();
    return fullText;
}

async function handleDocx(arrayBuffer) {
    updateStatus('Extracting text from Word...', true);
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
}

async function handleXlsx(arrayBuffer) {
    updateStatus('Extracting text from Excel...', true);
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
        fullText += `--- Sheet: ${sheetName} ---\n\n`;
        fullText += XLSX.utils.sheet_to_txt(workbook.Sheets[sheetName]) + '\n\n';
    });
    return fullText;
}

// --- Field Detection ---
function detectFields(text) {
    const lines = text.split('\n');
    let fields = [];

    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const label = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            if (label.length > 0 && label.length < 50) {
                fields.push({ label, value });
            }
        }
    });
    return fields;
}
