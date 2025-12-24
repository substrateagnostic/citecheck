import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/document-parser';
import { extractCitations } from '@/lib/extractor';
import { verifyCitations } from '@/lib/verifier';
import { generateReport } from '@/lib/report';

export const maxDuration = 60; // Allow up to 60 seconds

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: PDF, DOCX, TXT' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Extract text from document
    let text: string;
    try {
      text = await extractTextFromFile(file, file.name);
    } catch (err) {
      console.error('Text extraction error:', err);
      return NextResponse.json(
        { error: 'Failed to extract text from document. Please ensure the file is not corrupted.' },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document appears to be empty or could not be read.' },
        { status: 400 }
      );
    }

    // Extract citations
    const citations = extractCitations(text);

    if (citations.length === 0) {
      return NextResponse.json({
        documentName: file.name,
        totalCitations: 0,
        verified: 0,
        notFound: 0,
        partialMatches: 0,
        formatErrors: 0,
        apiErrors: 0,
        results: [],
        processedAt: new Date().toISOString(),
        message: 'No legal citations found in document.',
      });
    }

    // Verify citations against CourtListener
    const results = await verifyCitations(citations);

    // Generate report
    const report = generateReport(file.name, results);

    return NextResponse.json(report);

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during verification.' },
      { status: 500 }
    );
  }
}
