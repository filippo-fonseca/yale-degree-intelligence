import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import PDFParser from 'pdf2json';
import { requireAuth, isAuthError, rateLimit } from '@/lib/apiAuth';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (isAuthError(user)) return user;

  const limited = await rateLimit(`upload:${user.uid}`, 20, 60 * 60 * 1000);
  if (limited) return limited;

  const formData: FormData = await req.formData();
  const uploadedFiles = formData.getAll('filepond');
  let fileName = '';
  let parsedText = '';

  if (!uploadedFiles || uploadedFiles.length === 0) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const uploadedFile = uploadedFiles[0];
  if (!(uploadedFile instanceof File)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

  if (fileBuffer.length > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 413 }
    );
  }

  if (!fileBuffer.subarray(0, 4).toString('ascii').startsWith('%PDF')) {
    return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 });
  }

  fileName = uuidv4();
  const tempFilePath = `/tmp/${fileName}.pdf`;

  try {
    await fs.writeFile(tempFilePath, new Uint8Array(fileBuffer));

    const pdfParser = new (PDFParser as any)(null, 1);

    parsedText = await new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(errData.parserError);
      });

      pdfParser.on('pdfParser_dataReady', () => {
        resolve((pdfParser as any).getRawTextContent());
      });

      pdfParser.loadPDF(tempFilePath);
    });
  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 });
  } finally {
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // temp file may not exist
    }
  }

  return NextResponse.json({ text: parsedText, fileName });
}
