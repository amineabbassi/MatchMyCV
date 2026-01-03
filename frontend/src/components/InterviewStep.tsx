"use client";

import { useState } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { transcribeAudio } from "@/lib/api";

interface Question {
  id: string;
  question: string;
  gap_type: string;
  answered: boolean;
  answer?: string;
}

interface InterviewStepProps {
  questions: Question[];
  currentIndex: number;
  onSubmitText: (questionId: string, answer: string) => Promise<void>;
  onSkip: (questionId: string) => Promise<void>;
  onComplete: () => void;
  isLoading: boolean;
}

export function InterviewStep({
  questions,
  currentIndex,
  onSubmitText,
  onSkip,
  onComplete,
  isLoading,
}: InterviewStepProps) {
  const [textAnswer, setTextAnswer] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } =
    useVoiceRecorder();

  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex / questions.length) * 100;
  const isLastQuestion = currentIndex >= questions.length - 1;

  const handleTextSubmit = async () => {
    if (textAnswer.trim() && currentQuestion) {
      await onSubmitText(currentQuestion.id, textAnswer);
      setTextAnswer("");
      clearRecording();
      if (isLastQuestion) onComplete();
    }
  };

  const handleStopAndTranscribe = async () => {
    stopRecording();
  };

  // When audioBlob changes (recording stopped), transcribe it
  const handleTranscribe = async () => {
    if (!audioBlob || isTranscribing) return;
    
    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(audioBlob);
      setTextAnswer(result.transcription);
      clearRecording();
    } catch (error) {
      console.error("Transcription failed:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSkip = async () => {
    if (currentQuestion) {
      await onSkip(currentQuestion.id);
      setTextAnswer("");
      clearRecording();
      if (isLastQuestion) onComplete();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && textAnswer.trim()) {
      handleTextSubmit();
    }
  };

  // Completed state
  if (!currentQuestion) {
    return (
      <div className="animate-fade-in-up text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-[#00a63e]/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-[#0a0a0a] mb-2">All questions answered</h2>
        <p className="text-[15px] text-[#737373] mb-6">Great job! Let&apos;s generate your optimized CV.</p>
        <button onClick={onComplete} className="btn-primary">
          <span>Generate CV</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0066ff]/10 mb-4">
          <svg className="w-5 h-5 text-[#0066ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-[24px] sm:text-[28px] font-semibold text-[#0a0a0a] tracking-tight mb-2">
          Quick interview
        </h2>
        <p className="text-[15px] text-[#737373]">
          Help us understand your experience better
        </p>
      </div>

      {/* Progress */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between text-[13px] mb-2.5">
          <span className="font-medium text-[#0a0a0a]">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-[#737373]">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="card p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-[#0066ff]/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[13px] font-semibold text-[#0066ff]">{currentIndex + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block text-[10px] font-medium text-[#737373] bg-[#f5f5f5] px-2 py-0.5 rounded uppercase tracking-wide mb-2">
              {currentQuestion.gap_type}
            </span>
            <p className="text-[15px] text-[#0a0a0a] leading-relaxed">
              {currentQuestion.question}
            </p>
          </div>
        </div>
      </div>

      {/* Answer input */}
      <div className="card overflow-hidden mb-4">
        <div className="relative">
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here..."
            className="w-full h-28 px-5 py-4 text-[14px] text-[#0a0a0a] placeholder:text-[#a3a3a3] resize-none border-0 focus:outline-none focus:ring-0 leading-relaxed"
            disabled={isLoading || isRecording || isTranscribing}
          />
          
          {/* Transcribing overlay */}
          {isTranscribing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90">
              <div className="flex items-center gap-2.5 text-[#525252]">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[13px]">Transcribing audio...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions bar */}
        <div className="px-4 py-3 bg-[#fafafa] border-t border-black/[0.06] flex items-center justify-between">
          {/* Voice */}
          <div className="flex items-center gap-3">
            {!audioBlob ? (
              <button
                onClick={isRecording ? handleStopAndTranscribe : startRecording}
                disabled={isLoading || textAnswer.length > 0 || isTranscribing}
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200
                  ${isRecording 
                    ? "bg-[#dc2626] text-white" 
                    : "bg-white border border-black/[0.08] text-[#737373] hover:text-[#0a0a0a] hover:border-black/[0.15]"
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
                title={isRecording ? "Stop & transcribe" : "Record voice answer"}
              >
                {isRecording ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
            ) : (
              <button
                onClick={handleTranscribe}
                disabled={isLoading || isTranscribing}
                className="flex items-center gap-2 h-9 px-3 bg-white border border-black/[0.08] text-[#525252] rounded-lg text-[13px] hover:border-black/[0.15] transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-[#00a63e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Use recording
              </button>
            )}
            
            {isRecording && (
              <span className="flex items-center gap-2 text-[12px] text-[#dc2626] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
                Recording...
              </span>
            )}
            
            {audioBlob && !isRecording && !isTranscribing && (
              <button
                onClick={() => clearRecording()}
                className="text-[12px] text-[#a3a3a3] hover:text-[#525252] transition-colors"
              >
                Discard
              </button>
            )}
          </div>

          {/* Submit/Skip */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              disabled={isLoading || isTranscribing}
              className="btn-ghost text-[#a3a3a3]"
            >
              Skip
            </button>

            <button
              onClick={handleTextSubmit}
              disabled={isLoading || !textAnswer.trim() || isTranscribing}
              className="btn-primary h-9 px-4 text-[13px]"
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span>Submit</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tip */}
      <p className="text-center text-[12px] text-[#a3a3a3]">
         Be specific and include metrics when possible
      </p>
    </div>
  );
}
