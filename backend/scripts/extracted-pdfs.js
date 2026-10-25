import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";

import { basename, dirname, extname, join, resolve } from "node:path";

import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

// 1. Find the project root from this script's location.
const scriptFile = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptFile);
const projectRoot = resolve(scriptDirectory, "../..");

// 2. Define where PDFs come from and where results go.
const inputDirectory = join(projectRoot, "data", "source-pdfs");

const outputDirectory = join(projectRoot, "data", "extracted");

// 3. Extract one PDF, page by page.
async function extractPdf(fileName) {
  const pdfPath = join(inputDirectory, fileName);
  let parser;

  try {
    console.log(`\nReading: ${fileName}`);

    // Read the PDF file as binary data.
    const pdfBuffer = await readFile(pdfPath);

    // Initialise the parser with the file's bytes.
    parser = new PDFParse({ data: pdfBuffer });

    // Get information about the PDF.
    const info = await parser.getInfo();
    const totalPages = info.total;

    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error("Could not determine the PDF page count.");
    }

    const pages = [];

    // Extract each page separately to preserve its page number.
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const result = await parser.getText({
        partial: [pageNumber],
      });

      const text = (result.text ?? "").trim();

      pages.push({
        pageNumber,
        text,
        characterCount: text.length,
      });

      console.log(
        `  Page ${pageNumber}/${totalPages}: ${text.length} characters`,
      );
    }

    // Identify pages where no text was extracted.
    const emptyPages = pages
      .filter((page) => page.characterCount === 0)
      .map((page) => page.pageNumber);

    // Calculate the total number of extracted characters.
    const totalCharacters = pages.reduce(
      (total, page) => total + page.characterCount,
      0,
    );

    // Put the extracted information into a structured object.
    const extractedDocument = {
      sourceFile: fileName,
      extractedAt: new Date().toISOString(),
      totalPages,
      totalCharacters,
      emptyPages,
      pages,
    };

    // Create a JSON filename matching the original PDF.
    const outputFileName = `${basename(fileName, extname(fileName))}.json`;

    const outputPath = join(outputDirectory, outputFileName);

    // Save the output to disk.
    await writeFile(
      outputPath,
      JSON.stringify(extractedDocument, null, 2),
      "utf8",
    );

    console.log(`Saved: ${outputPath}`);
    console.log(`Total characters: ${totalCharacters}`);

    if (emptyPages.length > 0) {
      console.warn(`Pages with no extracted text: ${emptyPages.join(", ")}`);
      console.warn(
        "Inspect these pages before deciding whether OCR is needed.",
      );
    }
  } finally {
    // Release PDF parser resources, even if extraction fails.
    if (parser) {
      await parser.destroy();
    }
  }
}

// 4. Find all PDF files in the source folder.
async function main() {
  await mkdir(outputDirectory, { recursive: true });

  const entries = await readdir(inputDirectory, {
    withFileTypes: true,
  });

  const pdfFiles = entries
    .filter(
      (entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pdf",
    )
    .map((entry) => entry.name);

  if (pdfFiles.length === 0) {
    console.log("No PDFs found. Add PDF files to data/source-pdfs/.");
    process.exitCode = 1;
    return;
  }

  console.log(`Found ${pdfFiles.length} PDF file(s).`);

  let failedFiles = 0;

  for (const fileName of pdfFiles) {
    try {
      await extractPdf(fileName);
    } catch (error) {
      failedFiles++;
      const message = error instanceof Error ? error.message : String(error);

      console.error(`Failed to extract ${fileName}: ${message}`);
    }
  }

  console.log("\nExtraction finished.");
  console.log(`Successful files: ${pdfFiles.length - failedFiles}`);
  console.log(`Failed files: ${failedFiles}`);

  if (failedFiles > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Extraction script failed:", error);
  process.exitCode = 1;
});
console.log(":akshit")