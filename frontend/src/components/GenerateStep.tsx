"use client";

import { useState, useEffect } from "react";
import { getDownloadUrl, CVComparison } from "@/lib/api";

interface GenerateStepProps {
  sessionId: string;
  isGenerating: boolean;
  isGenerated: boolean;
  comparison: CVComparison | null;
  onGenerate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

const LOADING_MESSAGES = [
  "Analyzing your experience...",
  "Matching keywords to job requirements...",
  "Optimizing bullet points...",
  "Enhancing your professional summary...",
  "Formatting for ATS compatibility...",
  "Adding final touches...",
];

export function GenerateStep({
  sessionId,
  isGenerating,
  isGenerated,
  comparison,
  onGenerate,
  onDelete,
}: GenerateStepProps) {
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Cycle through loading messages
  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessageIndex(0);
      return;
    }
    
    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isGenerating]);
  
  // PRE-GENERATION
  if (!isGenerated) {
    return (
      <div className="animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0066ff]/10 to-[#0066ff]/5 mb-4">
            <svg className="w-6 h-6 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#0a0a0a] tracking-tight mb-2">
            Ready to generate
          </h2>
          <p className="text-[15px] text-[#737373]">
            Our AI will create an optimized CV tailored to the job
          </p>
        </div>

        {/* Features */}
        <div className="card p-6 mb-6">
          <h3 className="text-[13px] font-medium text-[#525252] mb-4">What you&apos;ll get</h3>
          <div className="space-y-4 stagger">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00a63e]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#0a0a0a]">ATS-optimized formatting</p>
                <p className="text-[13px] text-[#737373]">Passes automated screening systems</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0066ff]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#0a0a0a]">Keyword optimization</p>
                <p className="text-[13px] text-[#737373]">Matched to job requirements</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#0a0a0a]">Enhanced content</p>
                <p className="text-[13px] text-[#737373]">Improved phrasing with metrics</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#0a0a0a]">Multiple formats</p>
                <p className="text-[13px] text-[#737373]">PDF and DOCX included</p>
              </div>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn-primary w-full h-12"
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Generating your CV...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Optimized CV</span>
            </>
          )}
        </button>

        {isGenerating && (
          <div className="mt-4 text-center animate-fade-in">
            <p className="text-[13px] text-[#525252] mb-2 transition-all duration-300">
              {LOADING_MESSAGES[loadingMessageIndex]}
            </p>
            <p className="text-[12px] text-[#a3a3a3]">
              This usually takes 30-60 seconds
            </p>
          </div>
        )}
      </div>
    );
  }

  // POST-GENERATION (Success)
  const improvement = comparison ? comparison.optimized_score - comparison.original_score : 0;

  return (
    <div className="animate-fade-in-up">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#00a63e]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {/* Celebration particles */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#f59e0b] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#0066ff] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="absolute top-0 -left-2 w-2 h-2 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#0a0a0a] tracking-tight mb-2">
          Your CV is ready! 
        </h2>
        <p className="text-[15px] text-[#737373]">
          Download and start applying with confidence
        </p>
      </div>

      {/* Score comparison */}
      {comparison && (
        <div className="card p-6 mb-4">
          <h3 className="text-[13px] font-medium text-[#525252] mb-5 text-center">Score improvement</h3>
          <div className="flex items-center justify-center gap-8">
            {/* Before */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#f5f5f5] flex items-center justify-center mb-2">
                <span className="text-[28px] font-semibold text-[#a3a3a3]">{comparison.original_score}</span>
              </div>
              <span className="text-[12px] text-[#a3a3a3]">Before</span>
            </div>
            
            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-[#d4d4d4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-[13px] font-semibold text-[#00a63e]">+{improvement}%</span>
            </div>
            
            {/* After */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] flex items-center justify-center mb-2 shadow-lg">
                <span className="text-[28px] font-semibold text-white">{comparison.optimized_score}</span>
              </div>
              <span className="text-[12px] text-[#525252] font-medium">After</span>
            </div>
          </div>
        </div>
      )}

      {/* Gaps addressed */}
      {comparison && comparison.gaps_addressed.length > 0 && (
        <div className="card p-4 mb-3 border-[#00a63e]/20 bg-[#00a63e]/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[13px] font-medium text-[#00a63e]">
              {comparison.gaps_addressed.length} gaps addressed
            </span>
          </div>
          <ul className="space-y-1.5">
            {comparison.gaps_addressed.map((gap, i) => (
              <li key={i} className="text-[13px] text-[#525252] flex items-start gap-2">
                <span className="text-[#00a63e] mt-0.5">✓</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {comparison && comparison.improvements.length > 0 && (
        <div className="card p-4 mb-3 border-[#0066ff]/20 bg-[#0066ff]/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-[13px] font-medium text-[#0066ff]">Improvements made</span>
          </div>
          <ul className="space-y-1.5">
            {comparison.improvements.map((imp, i) => (
              <li key={i} className="text-[13px] text-[#525252] flex items-start gap-2">
                <span className="text-[#0066ff] mt-0.5">•</span>
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Remaining gaps */}
      {comparison && comparison.gaps_remaining.length > 0 && (
        <div className="card p-4 mb-5 border-[#f59e0b]/20 bg-[#f59e0b]/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-[13px] font-medium text-[#f59e0b]">
              {comparison.gaps_remaining.length} gaps remaining
            </span>
          </div>
          <ul className="space-y-1.5">
            {comparison.gaps_remaining.slice(0, 3).map((gap, i) => (
              <li key={i} className="text-[13px] text-[#525252] flex items-start gap-2">
                <span className="text-[#f59e0b] mt-0.5">○</span>
                <span>{gap}</span>
              </li>
            ))}
            {comparison.gaps_remaining.length > 3 && (
              <li className="text-[12px] text-[#a3a3a3] italic pl-5">
                +{comparison.gaps_remaining.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Download */}
      <div className="card p-5 mb-5">
        <h3 className="text-[13px] font-medium text-[#525252] mb-4">Download your CV</h3>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={getDownloadUrl(sessionId, "pdf")}
            download
            className="group flex items-center gap-3 p-4 rounded-xl border-2 border-black/[0.06] hover:border-[#dc2626]/30 hover:bg-[#dc2626]/[0.02] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#dc2626]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#dc2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#0a0a0a]">PDF</p>
              <p className="text-[12px] text-[#a3a3a3]">Ready to submit</p>
            </div>
          </a>
          
          <a
            href={getDownloadUrl(sessionId, "docx")}
            download
            className="group flex items-center gap-3 p-4 rounded-xl border-2 border-black/[0.06] hover:border-[#0066ff]/30 hover:bg-[#0066ff]/[0.02] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#0066ff]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#0a0a0a]">DOCX</p>
              <p className="text-[12px] text-[#a3a3a3]">Editable version</p>
            </div>
          </a>
        </div>
      </div>

      {/* Privacy & delete */}
      <div className="text-center space-y-3">
        <p className="text-[12px] text-[#a3a3a3] flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          You can delete your data anytime
        </p>
        <button
          onClick={onDelete}
          className="text-[12px] text-[#a3a3a3] hover:text-[#dc2626] transition-colors inline-flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete my data now
        </button>
      </div>
    </div>
  );
}
