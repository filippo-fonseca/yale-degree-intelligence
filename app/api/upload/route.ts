import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import PDFParser from 'pdf2json';

export async function POST(req: NextRequest) {
  const formData: FormData = await req.formData();
  const uploadedFiles = formData.getAll('filepond');
  let fileName = '';
  let parsedText = '';

  if (uploadedFiles && uploadedFiles.length > 0) {
    const uploadedFile = uploadedFiles[0]; // use [0] not [1] for the first file

    if (uploadedFile instanceof File) {
      fileName = uuidv4();
      const tempFilePath = `/tmp/${fileName}.pdf`;
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
      await fs.writeFile(tempFilePath, new Uint8Array(fileBuffer));

      const pdfParser = new (PDFParser as any)(null, 1);

      // Wrap the parser in a Promise so we can wait for it to finish
      parsedText = await new Promise((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          reject(errData.parserError);
        });

        pdfParser.on('pdfParser_dataReady', () => {
          resolve((pdfParser as any).getRawTextContent());
        });

        pdfParser.loadPDF(tempFilePath);
      });
    }
  }

  return NextResponse.json({ text: parsedText, fileName });
}
