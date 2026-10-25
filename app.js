(() => {
  "use strict";

  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const modes = {
    "image-pdf": {
      accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
      title: "Add your images",
      subtitle: "Combine multiple images into one PDF",
      hint: "JPG, PNG or WEBP · Up to 50 MB per file",
      button: "Convert to PDF",
      formats: ["jpg", "jpeg", "png", "webp"]
    },
    "pdf-image": {
      accept: ".pdf,application/pdf",
      title: "Add your PDFs",
      subtitle: "Each page will be saved as a JPG image",
      hint: "PDF · Up to 50 MB per file",
      button: "Convert to JPG",
      formats: ["pdf"]
    },
    "excel-pdf": {
      accept: ".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
      title: "Add your spreadsheets",
      subtitle: "Every worksheet will be included in the PDF",
      hint: "XLS, XLSX or CSV · Up to 50 MB per file",
      button: "Convert to PDF",
      formats: ["xls", "xlsx", "csv"]
    },
    "pdf-merge": {
      accept: ".pdf,application/pdf",
      title: "Add PDFs to merge",
      subtitle: "Files will be combined in the order shown",
      hint: "PDF · Add two or more files · Up to 50 MB per file",
      button: "Merge PDFs",
      formats: ["pdf"],
      minFiles: 2
    },
    "pdf-compress": {
      accept: ".pdf,application/pdf",
      title: "Add PDFs to compress",
      subtitle: "Each PDF will be compressed separately",
      hint: "PDF · Pages are flattened; searchable text is not retained",
      button: "Compress PDFs",
      formats: ["pdf"]
    },
    "word-pdf": {
      accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      title: "Add Word documents",
      subtitle: "Convert DOCX documents to PDF",
      hint: "DOCX · Up to 50 MB per file",
      button: "Convert to PDF",
      formats: ["docx"]
    }
  };

  const elements = {
    cards: [...document.querySelectorAll(".tool-card")],
    input: document.getElementById("file-input"),
    dropZone: document.getElementById("drop-zone"),
    browse: document.getElementById("browse-button"),
    list: document.getElementById("file-list"),
    clear: document.getElementById("clear-button"),
    title: document.getElementById("upload-title"),
    subtitle: document.getElementById("upload-subtitle"),
    hint: document.getElementById("file-hint"),
    convert: document.getElementById("convert-button"),
    convertLabel: document.getElementById("convert-label"),
    status: document.getElementById("status-message"),
    pageSize: document.getElementById("page-size"),
    imageFit: document.getElementById("image-fit"),
    fitControl: document.getElementById("fit-control"),
    pageSizeControl: document.getElementById("page-size-control"),
    imageSizeControl: document.getElementById("image-size-control"),
    imageQualityControl: document.getElementById("image-quality-control"),
    compressionControl: document.getElementById("compression-control"),
    imageSize: document.getElementById("image-size"),
    imageQuality: document.getElementById("image-quality"),
    compressionLevel: document.getElementById("compression-level")
  };

  let mode = "image-pdf";
  let files = [];
  let busy = false;

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  elements.cards.forEach((card) => {
    card.addEventListener("click", () => setMode(card.dataset.mode));
  });
  elements.browse.addEventListener("click", (event) => {
    event.stopPropagation();
    elements.input.click();
  });
  elements.dropZone.addEventListener("click", (event) => {
    if (!event.target.closest("button")) elements.input.click();
  });
  elements.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.input.click();
    }
  });
  elements.input.addEventListener("change", () => {
    addFiles([...elements.input.files]);
    elements.input.value = "";
  });
  elements.clear.addEventListener("click", clearFiles);
  elements.convert.addEventListener("click", convertFiles);

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("drag-over");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("drag-over");
    });
  });
  elements.dropZone.addEventListener("drop", (event) => {
    addFiles([...event.dataTransfer.files]);
  });

  function setMode(nextMode) {
    if (busy || !modes[nextMode]) return;
    mode = nextMode;
    const config = modes[mode];
    elements.cards.forEach((card) => {
      const active = card.dataset.mode === mode;
      card.classList.toggle("active", active);
      card.setAttribute("aria-pressed", String(active));
    });
    elements.title.textContent = config.title;
    elements.subtitle.textContent = config.subtitle;
    elements.hint.textContent = config.hint;
    elements.input.accept = config.accept;
    elements.convertLabel.textContent = config.button;
    elements.fitControl.hidden = mode !== "image-pdf";
    elements.imageSizeControl.hidden = mode !== "image-pdf";
    elements.imageQualityControl.hidden = mode !== "image-pdf";
    elements.compressionControl.hidden = mode !== "pdf-compress";
    elements.pageSizeControl.hidden = !["image-pdf", "excel-pdf", "word-pdf"].includes(mode);
    clearFiles();
  }

  function addFiles(incoming) {
    if (busy || incoming.length === 0) return;
    const accepted = [];
    const rejected = [];
    const allowed = modes[mode].formats;

    incoming.forEach((file) => {
      const extension = file.name.split(".").pop().toLowerCase();
      if (!allowed.includes(extension)) {
        rejected.push(`${file.name}: unsupported format`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: larger than 50 MB`);
      } else if (files.some((existing) => existing.name === file.name && existing.size === file.size)) {
        rejected.push(`${file.name}: already added`);
      } else {
        accepted.push(file);
      }
    });

    files = [...files, ...accepted];
    renderFiles();
    setStatus(rejected.length ? rejected.join(" · ") : "", rejected.length ? "error" : "");
  }

  function removeFile(index) {
    files.splice(index, 1);
    renderFiles();
    setStatus("");
  }

  function clearFiles() {
    files = [];
    renderFiles();
    setStatus("");
  }

  function renderFiles() {
    elements.list.replaceChildren();
    files.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "file-item";
      const extension = file.name.split(".").pop().toUpperCase();
      const badge = document.createElement("span");
      badge.className = "file-badge";
      badge.textContent = extension.slice(0, 4);
      const meta = document.createElement("div");
      meta.className = "file-meta";
      const name = document.createElement("strong");
      name.textContent = file.name;
      const size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      const remove = document.createElement("button");
      remove.className = "remove-file";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.addEventListener("click", () => removeFile(index));
      meta.append(name, size);
      item.append(badge, meta, remove);
      elements.list.append(item);
    });
    elements.clear.hidden = files.length === 0;
    elements.convert.disabled = files.length < (modes[mode].minFiles || 1) || busy;
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function compressionSummary(inputFiles, outputs) {
    const originalSize = inputFiles.reduce((total, file) => total + file.size, 0);
    const compressedSize = outputs.reduce((total, output) => total + output.blob.size, 0);
    const unchangedCount = outputs.filter((output) => output.unchanged).length;
    if (unchangedCount === outputs.length) {
      return "No size reduction was possible, so the original PDF was kept.";
    }
    const difference = originalSize === 0
      ? 0
      : Math.round(Math.abs(originalSize - compressedSize) / originalSize * 100);
    const unchangedNotice = unchangedCount ? ` ${unchangedCount} original PDF${unchangedCount === 1 ? " was" : "s were"} kept because recompression would increase size.` : "";
    return `Done! ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${difference}% smaller). Compressed pages are flattened; searchable text and links are not retained.${unchangedNotice}`;
  }

  function setStatus(message, kind = "") {
    elements.status.textContent = message;
    elements.status.className = `status-message${kind ? ` ${kind}` : ""}`;
  }

  function setBusy(value, label = "") {
    busy = value;
    elements.convert.classList.toggle("is-busy", value);
    elements.convertLabel.textContent = label || modes[mode].button;
    elements.convert.disabled = busy || files.length < (modes[mode].minFiles || 1);
    elements.cards.forEach((card) => { card.disabled = busy; });
    elements.clear.disabled = busy;
    elements.browse.disabled = busy;
  }

  async function convertFiles() {
    if (busy || files.length < (modes[mode].minFiles || 1)) return;
    if (!window.jspdf?.jsPDF) {
      setStatus("Could not load the PDF library. Check your internet connection and refresh.", "error");
      return;
    }
    if (["pdf-image", "pdf-compress"].includes(mode) && !window.pdfjsLib) {
      setStatus("Could not load the PDF tools. Check your internet connection and refresh.", "error");
      return;
    }
    if (mode === "pdf-image" && !window.JSZip) {
      setStatus("Could not load the ZIP tool. Check your internet connection and refresh.", "error");
      return;
    }
    if (mode === "pdf-merge" && !window.PDFLib) {
      setStatus("Could not load the PDF merge tool. Check your internet connection and refresh.", "error");
      return;
    }
    if (mode === "excel-pdf" && !window.XLSX) {
      setStatus("Could not load the spreadsheet tool. Check your internet connection and refresh.", "error");
      return;
    }
    if (mode === "word-pdf" && (!window.mammoth || !window.html2canvas)) {
      setStatus("Could not load the Word conversion tools. Check your internet connection and refresh.", "error");
      return;
    }

    const inputFiles = [...files];
    const outputs = [];
    setBusy(true, "Preparing…");
    try {
      if (mode === "image-pdf") {
        outputs.push(await imagesToPdf(inputFiles));
      } else if (mode === "pdf-merge") {
        outputs.push(await mergePdfs(inputFiles));
      } else {
        for (let index = 0; index < inputFiles.length; index += 1) {
          const file = inputFiles[index];
          setBusy(true, `Converting ${index + 1} of ${inputFiles.length}…`);
          if (mode === "pdf-image") outputs.push(...await pdfToImages(file));
          else if (mode === "pdf-compress") outputs.push(await compressPdf(file));
          else if (mode === "excel-pdf") outputs.push(await spreadsheetToPdf(file));
          else outputs.push(await wordToPdf(file));
        }
      }

      outputs.forEach((output) => downloadBlob(output.blob, output.name));
      const totalPages = outputs.reduce((total, output) => total + (output.pages || 1), 0);
      setStatus(
        mode === "pdf-image"
          ? `Done! ${totalPages} JPG page${totalPages === 1 ? "" : "s"} downloaded as a ZIP file.`
          : mode === "pdf-compress"
            ? compressionSummary(inputFiles, outputs)
            : `Done! ${outputs.length} file${outputs.length === 1 ? "" : "s"} ready to download.`,
        "success"
      );
    } catch (error) {
      console.error("Conversion failed:", error);
      setStatus(error instanceof Error ? error.message : "Conversion failed. Please try another file.", "error");
    } finally {
      setBusy(false);
    }
  }

  function createPdf(orientation = "portrait") {
    const { jsPDF } = window.jspdf;
    return new jsPDF({
      orientation,
      unit: "mm",
      format: elements.pageSize.value,
      compress: true
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
      reader.readAsArrayBuffer(file);
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not open "${file.name}".`));
      };
      image.src = url;
    });
  }

  async function imagesToPdf(imageFiles) {
    const pdf = createPdf();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      const image = await loadImage(file);
      if (index > 0) pdf.addPage();
      const fit = elements.imageFit.value;
      const scale = fit === "cover"
        ? Math.max((pageWidth - margin * 2) / image.width, (pageHeight - margin * 2) / image.height)
        : Math.min((pageWidth - margin * 2) / image.width, (pageHeight - margin * 2) / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;
      const data = await imageAsJpeg(image);
      pdf.addImage(data, "JPEG", x, y, width, height, undefined, "FAST");
    }

    const blob = pdf.output("blob");
    return { blob, name: `${safeBaseName(imageFiles[0].name)}${imageFiles.length > 1 ? `-and-${imageFiles.length - 1}-more` : ""}.pdf` };
  }

  function imageAsJpeg(image) {
    const canvas = document.createElement("canvas");
    const maxDimension = elements.imageSize.value === "original" ? Infinity : Number(elements.imageSize.value);
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the image for conversion.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/jpeg", Number(elements.imageQuality.value));
  }

  async function mergePdfs(pdfFiles) {
    const merged = await window.PDFLib.PDFDocument.create();
    for (let index = 0; index < pdfFiles.length; index += 1) {
      const file = pdfFiles[index];
      setBusy(true, `Adding PDF ${index + 1} of ${pdfFiles.length}…`);
      let source;
      try {
        source = await window.PDFLib.PDFDocument.load(await readFile(file));
      } catch {
        throw new Error(`Could not open "${file.name}". The PDF may be damaged or password-protected.`);
      }
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }
    const name = `${safeBaseName(pdfFiles[0].name)}-merged.pdf`;
    return { blob: new Blob([await merged.save()], { type: "application/pdf" }), name };
  }

  async function compressPdf(file) {
    let pdf;
    try {
      pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await readFile(file)) }).promise;
    } catch {
      throw new Error(`Could not open "${file.name}". The PDF may be damaged or password-protected.`);
    }

    const quality = elements.compressionLevel.value === "small" ? 0.52 : 0.72;
    const scale = elements.compressionLevel.value === "small" ? 1.15 : 1.5;
    let output = null;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setBusy(true, `Compressing page ${pageNumber} of ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNumber);
      const pageSize = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Could not prepare a PDF page for compression.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const image = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!image) throw new Error(`Could not compress page ${pageNumber} of "${file.name}".`);
      const imageBytes = new Uint8Array(await image.arrayBuffer());
      const { jsPDF } = window.jspdf;
      if (!output) {
        output = new jsPDF({ unit: "pt", format: [pageSize.width, pageSize.height], compress: true });
      } else {
        output.addPage([pageSize.width, pageSize.height]);
      }
      output.addImage(imageBytes, "JPEG", 0, 0, pageSize.width, pageSize.height, undefined, "FAST");
      canvas.width = 0;
      canvas.height = 0;
    }
    if (!output) throw new Error(`"${file.name}" does not contain any pages.`);
    const compressed = output.output("blob");
    if (compressed.size >= file.size) return { blob: file, name: file.name, unchanged: true };
    return { blob: compressed, name: `${safeBaseName(file.name)}-compressed.pdf` };
  }

  async function wordToPdf(file) {
    let converted;
    try {
      converted = await window.mammoth.convertToHtml({ arrayBuffer: await readFile(file) });
    } catch {
      throw new Error(`Could not read "${file.name}". Make sure it is a valid DOCX document.`);
    }
    if (!converted.value.trim()) throw new Error(`"${file.name}" does not contain any document text.`);

    const content = document.createElement("div");
    content.className = "word-document";
    content.innerHTML = converted.value;
    content.querySelectorAll("script,iframe,object,embed,form").forEach((node) => node.remove());
    content.querySelectorAll("*").forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        if (
          /^on/i.test(attribute.name) ||
          (attribute.name === "src" && !attribute.value.startsWith("data:image/")) ||
          (attribute.name === "href" && !/^(https?:|mailto:)/i.test(attribute.value))
        ) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    content.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:36px;background:#fff;color:#222;font:16px Arial,sans-serif;line-height:1.45;";
    document.body.append(content);
    try {
      const pdf = createPdf();
      await new Promise((resolve, reject) => {
        try {
          pdf.html(content, {
            x: 12,
            y: 12,
            width: pdf.internal.pageSize.getWidth() - 24,
            windowWidth: 832,
            autoPaging: "text",
            html2canvas: { scale: 1, useCORS: false },
            callback: resolve
          });
        } catch (error) {
          reject(error);
        }
      });
      return { blob: pdf.output("blob"), name: `${safeBaseName(file.name)}.pdf` };
    } finally {
      content.remove();
    }
  }

  async function pdfToImages(file) {
    const bytes = new Uint8Array(await readFile(file));
    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    } catch {
      throw new Error(`Could not open "${file.name}". The PDF may be damaged or password-protected.`);
    }
    const zip = new JSZip();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setBusy(true, `Rendering page ${pageNumber} of ${pdf.numPages}…`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.7 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Could not prepare a PDF page for conversion.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error(`Could not export page ${pageNumber} from "${file.name}".`);
      zip.file(`${safeBaseName(file.name)}-page-${String(pageNumber).padStart(3, "0")}.jpg`, blob);
      canvas.width = 0;
      canvas.height = 0;
    }
    const blob = await zip.generateAsync({ type: "blob" });
    return [{
      blob,
      name: `${safeBaseName(file.name)}-jpg-pages.zip`,
      pages: pdf.numPages
    }];
  }

  async function spreadsheetToPdf(file) {
    let workbook;
    try {
      workbook = XLSX.read(await readFile(file), { type: "array", cellDates: true });
    } catch {
      throw new Error(`Could not read "${file.name}". Make sure it is a valid Excel or CSV file.`);
    }
    if (!workbook.SheetNames.length) throw new Error(`"${file.name}" does not contain any worksheets.`);
    const pdf = createPdf("landscape");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
      const nonEmptyRows = rows.filter((row) => row.some((cell) => String(cell).trim() !== ""));
      if (sheetIndex > 0) pdf.addPage("landscape");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(35, 47, 76);
      pdf.text(String(sheetName).slice(0, 100), margin, margin + 3);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(125, 136, 156);
      pdf.text(file.name.slice(0, 110), margin, margin + 9);

      if (nonEmptyRows.length === 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(90, 100, 120);
        pdf.text("This worksheet is empty.", margin, margin + 22);
        return;
      }

      const columnCount = Math.max(...nonEmptyRows.map((row) => row.length));
      const weights = Array.from({ length: columnCount }, (_, column) => {
        const maxLength = Math.max(5, ...nonEmptyRows.map((row) => String(row[column] ?? "").length));
        return Math.min(maxLength, 30);
      });
      const availableWidth = pageWidth - margin * 2;
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      const columnWidths = weights.map((weight) => Math.max(12, (weight / totalWeight) * availableWidth));
      const widthTotal = columnWidths.reduce((sum, value) => sum + value, 0);
      const adjustedWidths = columnWidths.map((width) => width * availableWidth / widthTotal);
      const rowPadding = 2;
      const lineHeight = 3.4;
      let y = margin + 15;

      nonEmptyRows.forEach((row, rowIndex) => {
        const cellLines = adjustedWidths.map((width, column) => {
          const value = String(row[column] ?? "");
          return pdf.splitTextToSize(value, Math.max(5, width - rowPadding * 2));
        });
        const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
        const rowHeight = lineCount * lineHeight + rowPadding * 2;
        if (y + rowHeight > pageHeight - margin) {
          pdf.addPage("landscape");
          y = margin;
          pdf.setFontSize(7.5);
          pdf.setTextColor(125, 136, 156);
          pdf.text(`${String(sheetName).slice(0, 90)} · continued`, margin, y - 3);
        }

        let x = margin;
        adjustedWidths.forEach((width, column) => {
          if (rowIndex === 0) {
            pdf.setFillColor(82, 101, 224);
            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "bold");
          } else {
            pdf.setFillColor(rowIndex % 2 === 0 ? 246 : 255, rowIndex % 2 === 0 ? 248 : 255, rowIndex % 2 === 0 ? 252 : 255);
            pdf.setTextColor(57, 67, 88);
            pdf.setFont("helvetica", "normal");
          }
          pdf.rect(x, y, width, rowHeight, "F");
          pdf.setDrawColor(231, 235, 242);
          pdf.rect(x, y, width, rowHeight, "S");
          pdf.text(cellLines[column], x + rowPadding, y + rowPadding + 2.5, { maxWidth: width - rowPadding * 2 });
          x += width;
        });
        y += rowHeight;
      });
    });

    return { blob: pdf.output("blob"), name: `${safeBaseName(file.name)}.pdf` };
  }

  function safeBaseName(name) {
    const base = name.replace(/\.[^.]+$/, "").trim();
    return (base || "converted-file").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").slice(0, 100);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
})();
