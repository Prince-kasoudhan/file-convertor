# Convertly

A small, private file converter that runs in your browser. It supports:

- JPG, PNG and WEBP images → one multi-page PDF
- PDF pages → JPG images (downloaded together as a ZIP)
- XLS, XLSX and CSV spreadsheets → PDF, including every worksheet
- Multiple PDFs → one merged PDF, preserving the order you add them
- PDF compression with balanced and smaller-file settings
- DOCX documents → PDF
- Image-to-PDF output controls for maximum image dimensions and JPEG quality

Image-to-PDF supports A4 and US Letter page sizes and lets you fit or fill each page. Multiple PDFs and spreadsheets can be converted in one batch. Files are processed locally in your browser and are never uploaded to a server.

## Run it

Open `index.html` in a modern browser while connected to the internet. The conversion libraries are loaded from cdnjs; the app does not need a build step or package installation.

Alternatively, from this folder run:

```powershell
python -m http.server 5500
```

Then visit <http://localhost:5500>.

## Notes

- Each file can be up to 50 MB. Large PDFs or workbooks may need more memory.
- Password-protected PDFs are not supported.
- PDF-to-JPG creates one ZIP download per PDF.
- PDF compression rasterizes pages into JPEG images and removes searchable text, links, and vector detail. If recompression would increase a file's size, the original is kept instead.
- DOCX-to-PDF uses browser-based rendering. Common text formatting, tables, and embedded images are supported, but complex layouts may not match Microsoft Word exactly.
- A network connection is needed to load the conversion libraries; the selected files remain on your device.
