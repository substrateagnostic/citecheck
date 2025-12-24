'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChristmasHat, HolidayBanner } from '@/components/HolidayDecorator';

type ProcessingStage = 'idle' | 'uploading' | 'extracting' | 'parsing' | 'verifying' | 'complete';

interface ProgressState {
  stage: ProcessingStage;
  message: string;
  percent: number;
  currentCitation?: number;
  totalCitations?: number;
}

const stageMessages: Record<ProcessingStage, string> = {
  idle: '',
  uploading: 'Uploading document...',
  extracting: 'Extracting text from document...',
  parsing: 'Parsing legal citations...',
  verifying: 'Verifying citations against CourtListener...',
  complete: 'Verification complete!',
};

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    message: '',
    percent: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((selectedFile: File) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const extension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(extension)) {
      setError('Please upload a PDF, DOCX, TXT, or Markdown file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const simulateProgress = async () => {
    const stages: { stage: ProcessingStage; duration: number; percent: number }[] = [
      { stage: 'uploading', duration: 500, percent: 15 },
      { stage: 'extracting', duration: 800, percent: 35 },
      { stage: 'parsing', duration: 600, percent: 50 },
    ];

    for (const { stage, duration, percent } of stages) {
      setProgress({
        stage,
        message: stageMessages[stage],
        percent,
      });
      await new Promise(resolve => setTimeout(resolve, duration));
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress({ stage: 'uploading', message: stageMessages.uploading, percent: 5 });

    try {
      // Start progress simulation
      const progressPromise = simulateProgress();

      const formData = new FormData();
      formData.append('file', file);

      setProgress(prev => ({ ...prev, stage: 'verifying', message: stageMessages.verifying, percent: 55 }));

      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      await progressPromise; // Wait for progress animation

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      setProgress({ stage: 'verifying', message: 'Processing results...', percent: 85 });

      const report = await response.json();

      // Store report in sessionStorage
      sessionStorage.setItem('citationReport', JSON.stringify(report));

      setProgress({ stage: 'complete', message: stageMessages.complete, percent: 100 });

      // Brief pause to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navigate to results
      router.push('/results');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
      setProgress({ stage: 'idle', message: '', percent: 0 });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <HolidayBanner />
      <main className="min-h-screen px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-12 animate-fade-in-down">
            <div className="inline-flex items-center gap-2 bg-legal-navy/10 dark:bg-legal-navy/30 text-legal-navy dark:text-legal-gold px-5 py-2.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              <span>Legal Citation Verification</span>
            </div>

            <div className="relative inline-block">
              <h1 className="text-5xl md:text-7xl font-bold mb-4">
                <span className="gradient-text">Cite</span>
                <span className="text-legal-navy dark:text-white">Check</span>
              </h1>
              <ChristmasHat className="text-3xl" />
            </div>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Verify AI-generated citations before they become <span className="text-red-500 font-semibold">sanctions</span>.
              <br className="hidden md:block" />
              Protect your practice from hallucinated case law.
            </p>
          </header>

          {/* Avianca Warning Banner */}
          <div className="glass-card rounded-2xl p-5 mb-8 border-l-4 border-red-500 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-red-800 dark:text-red-300 text-lg mb-1">
                  The Avianca Problem
                </h2>
                <p className="text-red-700 dark:text-red-200/80 text-sm leading-relaxed">
                  In 2023, attorneys faced <strong>$5,000 sanctions</strong> for submitting AI-generated
                  citations to nonexistent cases. Courts are now scrutinizing AI-assisted
                  research. <strong>Verify before you file.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`
              upload-zone rounded-3xl p-8 md:p-16 text-center cursor-pointer
              transition-all duration-300 animate-fade-in-up
              ${isDragging ? 'dragging scale-[1.02]' : ''}
              ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
              ${file ? 'border-legal-gold' : ''}
            `}
            style={{ animationDelay: '0.2s' }}
            role="button"
            tabIndex={0}
            aria-label="Upload document"
            onKeyDown={(e) => e.key === 'Enter' && !isProcessing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              disabled={isProcessing}
              aria-hidden="true"
            />

            {file ? (
              <div className="animate-scale-in">
                <div className="w-20 h-20 mx-auto mb-6 bg-legal-gold/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-legal-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-legal-navy dark:text-white mb-2">
                  {file.name}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {formatFileSize(file.size)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                             font-medium transition-colors underline underline-offset-2"
                  disabled={isProcessing}
                >
                  Remove and choose different file
                </button>
              </div>
            ) : (
              <div>
                <div className={`w-20 h-20 mx-auto mb-6 bg-legal-navy/10 dark:bg-legal-navy/30 rounded-2xl
                                 flex items-center justify-center transition-transform duration-300
                                 ${isDragging ? 'scale-110' : ''}`}>
                  <svg className="w-10 h-10 text-legal-navy dark:text-legal-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-2xl font-semibold text-legal-navy dark:text-white mb-2">
                  {isDragging ? 'Drop it here!' : 'Drop your legal document here'}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  or click to browse your files
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['PDF', 'DOCX', 'TXT', 'MD'].map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
                                 rounded-full text-xs font-medium"
                    >
                      .{type.toLowerCase()}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  Maximum file size: 10MB
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 glass-card rounded-xl p-4 border-l-4 border-red-500 animate-fade-in">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-8 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-legal-navy/10 dark:bg-legal-navy/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-legal-navy dark:text-legal-gold animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="font-medium text-legal-navy dark:text-white">
                    {progress.message}
                  </span>
                </div>
                <span className="text-sm font-semibold text-legal-gold">
                  {progress.percent}%
                </span>
              </div>
              <div className="progress-bar h-3 rounded-full overflow-hidden">
                <div
                  className="progress-bar-fill h-full rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              {progress.currentCitation && progress.totalCitations && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Verifying citation {progress.currentCitation} of {progress.totalCitations}...
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          {file && !isProcessing && (
            <button
              onClick={handleSubmit}
              className="w-full mt-8 btn-primary py-5 px-8 rounded-2xl font-bold text-lg
                         animate-fade-in-up flex items-center justify-center gap-3"
              style={{ animationDelay: '0.1s' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verify Citations
            </button>
          )}

          {/* How It Works */}
          <section className="mt-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <h2 className="text-2xl md:text-3xl font-bold text-legal-navy dark:text-white text-center mb-10">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  ),
                  title: 'Upload',
                  description: 'Drop your brief, motion, or memo. We support PDF, DOCX, and plain text.',
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                    </svg>
                  ),
                  title: 'Extract',
                  description: 'Our parser identifies citations using Bluebook-aware pattern matching.',
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  title: 'Verify',
                  description: 'Each citation is checked against the CourtListener federal database.',
                },
              ].map((step, index) => (
                <div
                  key={step.title}
                  className="glass-card card-interactive rounded-2xl p-6 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-legal-navy to-legal-navy-light
                                  rounded-2xl flex items-center justify-center text-white shadow-lg shadow-legal-navy/30">
                    {step.icon}
                  </div>
                  <div className="text-sm text-legal-gold font-bold mb-2">Step {index + 1}</div>
                  <h3 className="text-xl font-bold text-legal-navy dark:text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { value: '80+', label: 'Reporter Types' },
              { value: '100%', label: 'Free to Use' },
              { value: '~500ms', label: 'Per Citation' },
              { value: 'Federal', label: 'Coverage' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </section>

          {/* Coverage Note */}
          <div className="mt-12 glass-card rounded-2xl p-5 border-l-4 border-blue-500 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">
                  Database Coverage
                </h3>
                <p className="text-blue-700 dark:text-blue-200/80 text-sm leading-relaxed">
                  CiteCheck uses the{' '}
                  <a
                    href="https://www.courtlistener.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                  >
                    CourtListener
                  </a>{' '}
                  database (Free Law Project), which has comprehensive federal court coverage.
                  State court coverage varies. Citations marked "not found" should be manually verified.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-16 text-center border-t border-gray-200 dark:border-gray-800 pt-8 pb-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              CiteCheck is a verification tool, not legal advice.
              Always perform independent verification before filing.
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              Powered by{' '}
              <a
                href="https://free.law"
                target="_blank"
                rel="noopener noreferrer"
                className="text-legal-navy dark:text-legal-gold hover:underline"
              >
                Free Law Project
              </a>
              {' '}|{' '}
              <span className="text-gray-300 dark:text-gray-600">
                Built with care for the legal profession
              </span>
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
