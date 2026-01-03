"use client";

import { useMemo, useState } from "react";

interface Gap {
  gap_type: string;
  description: string;
  importance: string;
}

interface GapAnalysis {
  skills_gaps: Gap[];
  experience_gaps: Gap[];
  keywords_gaps: Gap[];
  metrics_gaps: Gap[];
  match_score: number;
}

interface GapAnalysisStepProps {
  gapAnalysis: GapAnalysis;
  totalQuestions: number;
  onStartInterview: () => void;
}

export function GapAnalysisStep({
  gapAnalysis,
  totalQuestions,
  onStartInterview,
}: GapAnalysisStepProps) {
  const [showAllGaps, setShowAllGaps] = useState(false);

  const allGaps = useMemo(
    () => [
      ...gapAnalysis.skills_gaps,
      ...gapAnalysis.experience_gaps,
      ...gapAnalysis.keywords_gaps,
      ...gapAnalysis.metrics_gaps,
    ],
    [gapAnalysis]
  );

  const highPriority = allGaps.filter((g) => g.importance === "high");
  const mediumPriority = allGaps.filter((g) => g.importance === "medium");
  const lowPriority = allGaps.filter((g) => g.importance === "low");

  const visibleGaps = showAllGaps ? allGaps : allGaps.slice(0, 6);
  const hiddenCount = Math.max(0, allGaps.length - visibleGaps.length);

  const score = gapAnalysis.match_score;
  const scoreColor = score >= 80 ? "#00a63e" : score >= 60 ? "#f59e0b" : "#dc2626";
  const scoreLabel = score >= 80 ? "Strong match" : score >= 60 ? "Good foundation" : "Needs improvement";

  // Calculate stroke dasharray for circular progress
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00a63e]/[0.08] mb-4">
          <svg className="w-3.5 h-3.5 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-[12px] font-medium text-[#00a63e]">Analysis Complete</span>
        </div>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#0a0a0a] tracking-tight mb-2">
          Your CV analysis
        </h2>
        <p className="text-[15px] text-[#737373]">
          Here&apos;s how your CV matches the job requirements
        </p>
      </div>

      {/* Score card */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-6">
          {/* Circular progress */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke="#f5f5f5" 
                strokeWidth="8" 
              />
              {/* Progress circle */}
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-semibold text-[#0a0a0a]">{score}</span>
              <span className="text-[11px] text-[#a3a3a3] -mt-1">/ 100</span>
            </div>
          </div>

          {/* Score details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: scoreColor }}
              />
              <span className="text-[13px] font-medium" style={{ color: scoreColor }}>
                {scoreLabel}
              </span>
            </div>
            <p className="text-[14px] text-[#525252] leading-relaxed">
              We found <span className="font-medium text-[#0a0a0a]">{allGaps.length} gaps</span> between your CV and the job requirements. We’ll ask{" "}
              <span className="font-medium text-[#0a0a0a]">{totalQuestions}</span> questions{" "}
              <span className="text-[#737373]">(some questions cover multiple gaps)</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Gap summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
            <span className="text-[11px] text-[#737373] font-medium uppercase tracking-wide">High</span>
          </div>
          <p className="text-[24px] font-semibold text-[#0a0a0a]">{highPriority.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span className="text-[11px] text-[#737373] font-medium uppercase tracking-wide">Medium</span>
          </div>
          <p className="text-[24px] font-semibold text-[#0a0a0a]">{mediumPriority.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#a3a3a3]" />
            <span className="text-[11px] text-[#737373] font-medium uppercase tracking-wide">Low</span>
          </div>
          <p className="text-[24px] font-semibold text-[#0a0a0a]">{lowPriority.length}</p>
        </div>
      </div>

      {/* Gap list */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3 bg-[#fafafa] border-b border-black/[0.06] flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-medium text-[#525252]">Identified gaps</h3>
          {allGaps.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllGaps((v) => !v)}
              className="text-[12px] font-medium text-[#0066ff] hover:text-[#0052cc] transition-colors"
            >
              {showAllGaps ? "Show less" : `View all (${allGaps.length})`}
            </button>
          )}
        </div>
        <div className="divide-y divide-black/[0.04] max-h-64 overflow-y-auto">
          {visibleGaps.map((gap, index) => (
            <div key={index} className="px-5 py-3.5 flex items-start gap-3 hover:bg-[#fafafa]/50 transition-colors">
              <span className={`
                mt-1.5 w-2 h-2 rounded-full flex-shrink-0
                ${gap.importance === "high" ? "bg-[#dc2626]" : 
                  gap.importance === "medium" ? "bg-[#f59e0b]" : "bg-[#a3a3a3]"}
              `} />
              <p className="text-[13px] text-[#525252] leading-relaxed flex-1">{gap.description}</p>
              <span className={`
                text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 uppercase tracking-wide
                ${gap.importance === "high" ? "bg-[#dc2626]/10 text-[#dc2626]" : 
                  gap.importance === "medium" ? "bg-[#f59e0b]/10 text-[#f59e0b]" : 
                  "bg-[#f5f5f5] text-[#737373]"}
              `}>
                {gap.importance}
              </span>
            </div>
          ))}
          {!showAllGaps && hiddenCount > 0 && (
            <div className="px-5 py-3 text-center bg-[#fafafa]/50">
              <button
                type="button"
                onClick={() => setShowAllGaps(true)}
                className="text-[12px] text-[#737373] hover:text-[#0a0a0a] transition-colors"
              >
                +{hiddenCount} more gaps
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="card p-5 bg-gradient-to-r from-[#fafafa] to-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-medium text-[#0a0a0a] mb-1">Ready to improve your score?</h3>
            <p className="text-[13px] text-[#737373]">
              Answer {totalQuestions} quick questions <span className="text-[#a3a3a3]">(grouped to cover multiple gaps)</span>
            </p>
          </div>
          <button 
            onClick={onStartInterview}
            className="btn-primary flex-shrink-0"
          >
            <span>Continue</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
