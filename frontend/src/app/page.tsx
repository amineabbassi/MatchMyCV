"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Steps } from "@/components/Steps";
import { UploadStep } from "@/components/UploadStep";
import { JobDescriptionStep } from "@/components/JobDescriptionStep";
import { GapAnalysisStep } from "@/components/GapAnalysisStep";
import { InterviewStep } from "@/components/InterviewStep";
import { GenerateStep } from "@/components/GenerateStep";
import {
  createSession,
  getSessionData,
  uploadCV,
  analyzeCV,
  getQuestions,
  submitAnswer,
  generateCV,
  deleteSession,
  CVComparison,
} from "@/lib/api";

interface Question {
  id: string;
  question: string;
  gap_type: string;
  answered: boolean;
  answer?: string;
}

interface GapAnalysis {
  skills_gaps: any[];
  experience_gaps: any[];
  keywords_gaps: any[];
  metrics_gaps: any[];
  match_score: number;
}

const STEP_LABELS = ["Upload", "Job Details", "Analysis", "Interview", "Download"];

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);
  const [comparison, setComparison] = useState<CVComparison | null>(null);

  // Single in-flight session init promise (prevents "Continue does nothing" while session is still loading)
  const sessionInitPromiseRef = useRef<Promise<string> | null>(null);

  const fetchWithTimeout = useCallback(async (input: RequestInfo | URL, init?: RequestInit, timeoutMs: number = 8000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...(init || {}), signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    if (sessionInitPromiseRef.current) return await sessionInitPromiseRef.current;

    sessionInitPromiseRef.current = (async () => {
      // Try restore from localStorage (fast path)
      try {
        const savedSession = localStorage.getItem("matchmycv_session");
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          const savedId = parsed?.sessionId as string | undefined;
          if (savedId) {
            // Do not block on server validation here (Render cold starts can take ~60s).
            // We'll optimistically reuse the id and recover on 404 during real actions.
            setSessionId(savedId);
            return savedId;
          }
        }
      } catch {
        // ignore and create new
      }

      // Create new session with a couple retries (cold starts / transient network)
      let lastErr: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { session_id } = await createSession();
          setSessionId(session_id);
          localStorage.setItem("matchmycv_session", JSON.stringify({ sessionId: session_id, step: 0 }));
          return session_id;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }
      throw lastErr;
    })();

    try {
      return await sessionInitPromiseRef.current;
    } finally {
      sessionInitPromiseRef.current = null;
    }
  }, [sessionId]);

  // Session persistence - restore from localStorage if available
  useEffect(() => {
    const initSession = async () => {
      try {
        // Do NOT call the backend on page load (Render cold start causes long wait + perceived failure).
        // We restore locally immediately, and restore server data in the background with a short timeout.
        const savedSession = localStorage.getItem('matchmycv_session');
        if (savedSession) {
          const { sessionId: savedId, step } = JSON.parse(savedSession);
          if (savedId) {
            setSessionId(savedId);
            setCurrentStep(step || 0);

            // Restore full UI state in background (short timeout); if it fails, fall back to a safe step.
            (async () => {
              try {
                const res = await fetchWithTimeout(`/api/v1/session/${savedId}/data`, undefined, 6000);
                if (!res.ok) throw new Error("restore_failed");
                const data = await res.json();
                if (data.gap_analysis) setGapAnalysis(data.gap_analysis);
                if (Array.isArray(data.questions)) setQuestions(data.questions);
                if (typeof data.current_question_index === 'number') setCurrentQuestionIndex(data.current_question_index);
                if (data.comparison) setComparison(data.comparison);
                if (data.has_generated_cv) setIsGenerated(true);

                const desiredStep = step || 0;
                if (desiredStep >= 2 && !data.gap_analysis) setCurrentStep(1);
                else if (desiredStep >= 3 && (!data.questions || data.questions.length === 0)) setCurrentStep(2);
                else setCurrentStep(desiredStep);
              } catch {
                // Avoid blank page if backend is asleep or session no longer exists.
                setCurrentStep(Math.min(step || 0, 1));
              }
            })();
          }
          return;
        }
      } catch {
        setError("Unable to connect. Please refresh the page.");
      }
    };
    initSession();
  }, [fetchWithTimeout]);

  // Save session state on step change
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('matchmycv_session', JSON.stringify({ sessionId, step: currentStep }));
    }
  }, [sessionId, currentStep]);

  const handleUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      let sid = sessionId ?? await ensureSession();
      try {
        await uploadCV(sid, file);
      } catch (e: any) {
        // If session was lost (e.g. backend restart), recreate once and retry.
        if (String(e?.message || "").toLowerCase().includes("session not found")) {
          sid = (await createSession()).session_id;
          setSessionId(sid);
          localStorage.setItem("matchmycv_session", JSON.stringify({ sessionId: sid, step: 0 }));
          await uploadCV(sid, file);
        } else {
          throw e;
        }
      }
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to upload CV. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, ensureSession]);

  const handleAnalyze = useCallback(async (jobDescription: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let sid = sessionId ?? await ensureSession();
      let result: any;
      try {
        result = await analyzeCV(sid, jobDescription);
      } catch (e: any) {
        if (String(e?.message || "").toLowerCase().includes("session not found")) {
          sid = (await createSession()).session_id;
          setSessionId(sid);
          localStorage.setItem("matchmycv_session", JSON.stringify({ sessionId: sid, step: 0 }));
          // Analyze requires CV uploaded; fall back gracefully.
          throw new Error("Session expired. Please re-upload your CV.");
        }
        throw e;
      }
      setGapAnalysis(result.gap_analysis);
      const questionsResult = await getQuestions(sid);
      setQuestions(questionsResult.questions);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, ensureSession]);

  const handleStartInterview = useCallback(() => {
    setCurrentQuestionIndex(0);
    setCurrentStep(3);
  }, []);

  const handleSubmitText = useCallback(async (questionId: string, answer: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const result = await submitAnswer(sessionId, questionId, answer);
      setCurrentQuestionIndex(result.answered);
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, answered: true, answer } : q
      ));
    } catch (err: any) {
      setError(err.message || "Failed to save answer.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleSkip = useCallback(async (questionId: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await submitAnswer(sessionId, questionId, "");
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { ...q, answered: true, answer: "" } : q
      ));
    } catch (err: any) {
      setError(err.message || "Failed to skip question.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleInterviewComplete = useCallback(() => {
    setCurrentStep(4);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateCV(sessionId);
      setIsGenerated(true);
      if (result.comparison) {
        setComparison(result.comparison);
      }
    } catch (err: any) {
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleDelete = useCallback(async () => {
    if (!sessionId) return;
    try {
      await deleteSession(sessionId);
      // Clear localStorage
      localStorage.removeItem('matchmycv_session');
      setSessionId(null);
      setCurrentStep(0);
      setGapAnalysis(null);
      setQuestions([]);
      setIsGenerated(false);
      setComparison(null);
      const { session_id } = await createSession();
      setSessionId(session_id);
      localStorage.setItem('matchmycv_session', JSON.stringify({ sessionId: session_id, step: 0 }));
    } catch (err: any) {
      setError(err.message || "Failed to delete data.");
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center shadow-sm">
                <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round"/>
                  <polyline points="10 9 9 9 8 9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-xl bg-[#0a0a0a] blur-lg opacity-20 -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-[#0a0a0a] tracking-tight">
                MatchMyCV
              </span>
              <span className="text-[11px] text-[#737373] -mt-0.5">
                AI-Powered Optimization
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {currentStep > 0 && (
              <div className="hidden sm:block">
                <Steps currentStep={currentStep} steps={STEP_LABELS} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile steps */}
      {currentStep > 0 && (
        <div className="sm:hidden fixed top-16 left-0 right-0 z-40 glass border-b border-black/[0.06] px-6 py-3">
          <Steps currentStep={currentStep} steps={STEP_LABELS} />
        </div>
      )}

      {/* Main */}
      <main className={`flex-1 px-6 ${currentStep > 0 ? 'pt-32 sm:pt-28' : 'pt-28'} pb-28`}>
        <div className="max-w-2xl lg:max-w-5xl mx-auto">
          {/* Error */}
          {error && (
            <div className="mb-8 animate-fade-in-up">
              <div className="card p-4 border-red-200 bg-red-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-red-700 flex-1">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {currentStep === 0 && (
            <UploadStep onUpload={handleUpload} isLoading={isLoading} />
          )}

          {currentStep === 1 && (
            <JobDescriptionStep onAnalyze={handleAnalyze} isLoading={isLoading} />
          )}

          {currentStep === 2 && gapAnalysis && (
            <GapAnalysisStep
              gapAnalysis={gapAnalysis}
              totalQuestions={questions.length}
              onStartInterview={handleStartInterview}
            />
          )}

          {currentStep === 3 && (
            <InterviewStep
              questions={questions}
              currentIndex={currentQuestionIndex}
              onSubmitText={handleSubmitText}
              onSkip={handleSkip}
              onComplete={handleInterviewComplete}
              isLoading={isLoading}
            />
          )}

          {currentStep === 4 && sessionId && (
            <GenerateStep
              sessionId={sessionId}
              isGenerating={isLoading}
              isGenerated={isGenerated}
              comparison={comparison}
              onGenerate={handleGenerate}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-black/[0.06]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-center">
          <div className="flex items-center gap-2 text-[12px] text-[#a3a3a3]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure processing</span>
            <span className="text-[#d4d4d4]">·</span>
            <span>Delete anytime</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
