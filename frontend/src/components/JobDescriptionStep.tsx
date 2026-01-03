"use client";

import { useState } from "react";

interface JobDescriptionStepProps {
  onAnalyze: (jobDescription: string) => Promise<void>;
  isLoading: boolean;
}

export function JobDescriptionStep({ onAnalyze, isLoading }: JobDescriptionStepProps) {
  const [jobDescription, setJobDescription] = useState("");
  
  const charCount = jobDescription.length;
  const isValid = charCount >= 50;

  const handleSubmit = async () => {
    if (isValid && !isLoading) {
      await onAnalyze(jobDescription);
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f5f5f5] mb-4">
          <svg className="w-5 h-5 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#0a0a0a] tracking-tight mb-2">
          Paste the job description
        </h2>
        <p className="text-[15px] text-[#737373]">
          We&apos;ll analyze requirements and identify gaps in your CV
        </p>
      </div>

      {/* Card */}
      <div className="card overflow-hidden">
        {/* Textarea */}
        <div className="relative">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the complete job description here including requirements, responsibilities, and qualifications..."
            className="w-full h-64 px-5 py-4 text-[14px] text-[#0a0a0a] placeholder:text-[#a3a3a3] resize-none border-0 focus:outline-none focus:ring-0 leading-relaxed"
            disabled={isLoading}
          />
          
          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        </div>
        
        {/* Footer */}
        <div className="px-5 py-3 bg-[#fafafa] border-t border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#a3a3a3]">
              {charCount.toLocaleString()} characters
            </span>
            {charCount > 0 && charCount < 50 && (
              <span className="text-[12px] text-[#f59e0b]">
                {50 - charCount} more needed
              </span>
            )}
          </div>
          {isValid && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#00a63e] font-medium animate-fade-in">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Ready to analyze
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 px-4 py-3 rounded-xl bg-[#0066ff]/[0.04] border border-[#0066ff]/[0.08]">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-md bg-[#0066ff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[13px] text-[#525252] leading-relaxed">
            <span className="font-medium text-[#0a0a0a]">Pro tip:</span> Include the full job posting with requirements, responsibilities, and qualifications for the most accurate analysis.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="btn-primary w-full"
        >
          {isLoading ? (
            <>
              <div className="relative">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <span>Analyzing your CV...</span>
            </>
          ) : (
            <>
              <span>Analyze CV</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Testimonial */}
      <div className="mt-8 pt-6 border-t border-black/[0.04]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066ff]/20 to-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[14px] font-semibold text-[#525252]">JM</span>
          </div>
          <div>
            <p className="text-[13px] text-[#525252] leading-relaxed italic">
              &quot;Got 3 interview calls within a week of using my optimized CV. The keyword matching really works.&quot;
            </p>
            <p className="text-[12px] text-[#a3a3a3] mt-1">
              James M. — Software Engineer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
