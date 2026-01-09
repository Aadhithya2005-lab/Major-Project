// --- Utilities & Export ---

function copyText(text) {
    if (!text) return;
    navigator.clipboard.writeText(text);
}

function prepareExportData(translation, detectedFields) {
    const metadata = detectedFields.map(f => `${f.label.toUpperCase()}: ${f.value}`).join('\n');
    return { metadata, translation };
}

function downloadAsTxt(translation, metadata) {
    let content = translation;
    if (metadata) {
        content = `--- METADATA EXTRACTION ---\n${metadata}\n\n--- TRANSLATED CONTENT ---\n${content}`;
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "translation.txt";
    a.click();
}

function downloadAsPdf(translation, metadata) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    let y = 20;
    pdf.setFontSize(10);
    pdf.setTextColor(100);

    if (metadata) {
        pdf.text("METADATA EXTRACTION", 15, y);
        y += 10;
        pdf.setTextColor(0);
        const metaLines = pdf.splitTextToSize(metadata, 180);
        pdf.text(metaLines, 15, y);
        y += (metaLines.length * 7) + 10;
    }

    pdf.setTextColor(100);
    pdf.text("TRANSLATED CONTENT", 15, y);
    y += 10;
    pdf.setTextColor(0);
    const contentLines = pdf.splitTextToSize(translation, 180);
    pdf.text(contentLines, 15, y);

    pdf.save("translation.pdf");
}

function downloadAsDocx(translation, metadata) {
    let metaHtml = "";
    if (metadata) {
        metaHtml = `
            <h3 style="color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">METADATA EXTRACTION</h3>
            <p style="white-space: pre-wrap; margin-bottom: 20px;">${metadata}</p>
        `;
    }

    const content = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            ${metaHtml}
            <h3 style="color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">TRANSLATED CONTENT</h3>
            <p style="white-space: pre-wrap;">${translation}</p>
        </body>
        </html>`;

    const converted = window.htmlDocx.asBlob(content);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(converted);
    a.download = "translation.docx";
    a.click();
}
