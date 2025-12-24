// Document text extraction
// Supports: .txt, .pdf, .docx

export async function extractTextFromFile(
  file: File | Buffer,
  filename: string
): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
      if (file instanceof Buffer) {
        return file.toString('utf-8');
      }
      return await (file as File).text();

    case 'pdf':
      return await extractFromPdf(file);

    case 'docx':
      return await extractFromDocx(file);

    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

async function extractFromPdf(file: File | Buffer): Promise<string> {
  // Dynamic import to avoid issues with Next.js
  const pdfParse = (await import('pdf-parse')).default;
  
  let buffer: Buffer;
  if (file instanceof Buffer) {
    buffer = file;
  } else {
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromDocx(file: File | Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  
  let buffer: Buffer;
  if (file instanceof Buffer) {
    buffer = file;
  } else {
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// For CLI usage with file paths
export async function extractTextFromPath(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const buffer = await fs.readFile(filePath);
  const filename = path.basename(filePath);
  
  return extractTextFromFile(buffer, filename);
}
