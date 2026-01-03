"use client";

import { useState, useCallback } from "react";

interface UploadStepProps {
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

export function UploadStep({ onUpload, isLoading }: UploadStepProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    setFileError(null);
    if (file.type !== "application/pdf") {
      setFileError("Please upload a PDF file");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File size must be under 10MB");
      return false;
    }
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  return (
    <div className="animate-fade-in-up">
      <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
        {/* Left: copy + trust */}
        <div>
          {/* Hero */}
          <div className="text-center lg:text-left mb-10 lg:mb-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0066ff]/[0.08] mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0066ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0066ff]"></span>
              </span>
              <span className="text-[12px] font-medium text-[#0066ff]">AI-Powered Analysis</span>
            </div>

            {/* Headline */}
            <h1 className="text-[32px] sm:text-[40px] font-semibold text-[#0a0a0a] tracking-tight leading-[1.1] mb-4">
              Land more interviews with<br />
              <span className="text-[#525252]">an optimized CV</span>
            </h1>

            {/* Subtext */}
            <p className="text-[15px] text-[#737373] max-w-sm mx-auto lg:mx-0 leading-relaxed">
              Upload your resume and a job description. Our AI identifies gaps and helps you stand out.
            </p>
          </div>

          {/* Trust badges (desktop) */}
          <div className="hidden lg:flex items-center justify-start gap-6 mt-8">
            <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
              <svg className="w-4 h-4 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure processing</span>
            </div>
            <div className="w-px h-3 bg-[#e5e5e5]" />
            <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
              <svg className="w-4 h-4 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Delete anytime</span>
            </div>
          </div>
        </div>

        {/* Right: upload card */}
        <div>
          {/* Upload card */}
          <div className="card overflow-hidden">
            <div
              className={`
                relative cursor-pointer transition-all duration-200
                ${dragActive ? "bg-[#0066ff]/[0.02]" : selectedFile ? "bg-[#fafafa]" : "hover:bg-[#fafafa]/50"}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("cv-upload")?.click()}
            >
              {/* Drag border overlay */}
              {dragActive && (
                <div className="absolute inset-4 border-2 border-dashed border-[#0066ff] rounded-xl pointer-events-none" />
              )}

              <input
                id="cv-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="px-6 py-10 text-center">
                {selectedFile ? (
                  <div className="animate-fade-in">
                    {/* File icon */}
                    <div className="w-14 h-14 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    {/* File info */}
                    <p className="text-[15px] font-medium text-[#0a0a0a] mb-1">{selectedFile.name}</p>
                    <p className="text-[13px] text-[#a3a3a3] mb-4">
                      {(selectedFile.size / 1024).toFixed(0)} KB · PDF
                    </p>

                    {/* Change file */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setFileError(null);
                      }}
                      className="text-[13px] text-[#737373] hover:text-[#0a0a0a] transition-colors"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Upload icon */}
                    <div className="w-14 h-14 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#ebebeb] transition-colors">
                      <svg className="w-6 h-6 text-[#a3a3a3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>

                    {/* Instructions */}
                    <p className="text-[15px] text-[#525252] mb-1">
                      Drop your CV here, or <span className="text-[#0066ff] font-medium">browse</span>
                    </p>
                    <p className="text-[13px] text-[#a3a3a3]">
                      PDF format · Max 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {fileError && (
              <div className="px-6 py-3 bg-red-50 border-t border-red-100">
                <p className="text-[13px] text-red-600 text-center">{fileError}</p>
              </div>
            )}

            {/* Continue button */}
            {selectedFile && (
              <div className="px-6 py-4 bg-[#fafafa] border-t border-black/[0.06]">
                <button
                  onClick={() => onUpload(selectedFile)}
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Trust badges (mobile) */}
          <div className="mt-8 flex lg:hidden items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
              <svg className="w-4 h-4 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure processing</span>
            </div>
            <div className="w-px h-3 bg-[#e5e5e5]" />
            <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
              <svg className="w-4 h-4 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Delete anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
