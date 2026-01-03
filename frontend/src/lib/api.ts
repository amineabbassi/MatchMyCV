// For most deployments we keep API calls same-origin via Next rewrites (/api/* -> BACKEND_URL).
// If you want to hit the backend directly, set NEXT_PUBLIC_API_BASE (e.g. "https://api.example.com/api/v1").
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '/api/v1').replace(/\/+$/, '');

// Helper for better error messages
async function handleResponse(res: Response, defaultError: string) {
  if (!res.ok) {
    try {
      const error = await res.json();
      throw new Error(error.detail || defaultError);
    } catch (e) {
      if (e instanceof Error && e.message !== defaultError) throw e;
      throw new Error(defaultError);
    }
  }
  return res.json();
}

export async function createSession(): Promise<{ session_id: string }> {
  const res = await fetch(`${API_BASE}/session/create`, { method: 'POST' });
  return handleResponse(res, 'Unable to start session. Please refresh.');
}

export async function getSessionData(sessionId: string) {
  const res = await fetch(`${API_BASE}/session/${sessionId}/data`);
  return handleResponse(res, 'Failed to restore session. Please refresh.');
}

export async function uploadCV(sessionId: string, file: File) {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE}/cv/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, 'Failed to upload CV. Please try a different file.');
}

export async function analyzeCV(sessionId: string, jobDescription: string) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, job_description: jobDescription }),
  });
  return handleResponse(res, 'Analysis failed. Please try again.');
}

export async function getQuestions(sessionId: string) {
  const res = await fetch(`${API_BASE}/interview/questions?session_id=${sessionId}`);
  return handleResponse(res, 'Failed to load questions.');
}

export async function submitAnswer(sessionId: string, questionId: string, answer: string) {
  const res = await fetch(`${API_BASE}/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, question_id: questionId, answer_text: answer }),
  });
  return handleResponse(res, 'Failed to save answer. Please try again.');
}

export async function submitVoiceAnswer(sessionId: string, questionId: string, audioBlob: Blob) {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  formData.append('question_id', questionId);
  formData.append('audio', audioBlob, 'recording.webm');
  
  const res = await fetch(`${API_BASE}/interview/voice`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, 'Failed to process voice answer.');
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ transcription: string }> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, 'Transcription failed. Please type your answer instead.');
}

export async function generateCV(sessionId: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout
  
  try {
    const res = await fetch(`${API_BASE}/cv/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return handleResponse(res, 'CV generation failed. Please try again.');
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Taking longer than expected. Please try again.');
    }
    throw error;
  }
}

export interface CVComparison {
  original_score: number;
  optimized_score: number;
  gaps_addressed: string[];
  gaps_remaining: string[];
  improvements: string[];
}

export async function deleteSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' });
  return handleResponse(res, 'Failed to delete data.');
}

export function getDownloadUrl(sessionId: string, fileType: 'pdf' | 'docx') {
  return `${API_BASE}/cv/download/${fileType}?session_id=${sessionId}`;
}
