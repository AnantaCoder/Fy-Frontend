import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Star, ThumbsUp, ThumbsDown, Loader2, ShieldCheck, AlertTriangle, User, ArrowLeft, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import interviewApi, { type InterviewData, type ProctorResults, type InterviewResponseDetail, type InterviewQuestion } from "@/lib/interview-api";
import { toast } from "sonner";

interface QAPair {
  question: string;
  type: string;
  textAnswer: string;
  aiScore: number | null;
  confidence: number | null;
  relevance: number | null;
  cheating: boolean;
  notes: string;
}

const CandidateReview = () => {
  const { id } = useParams<{ id: string }>();

  const [results, setResults] = useState<InterviewData | null>(null);
  const [proctor, setProctor] = useState<ProctorResults | null>(null);
  const [responses, setResponses] = useState<InterviewResponseDetail[]>([]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      interviewApi.getResults(id),
      interviewApi.getProctorResults(id).catch(() => null), // Proctor results might fail or be missing
      interviewApi.getResponses(id).catch(() => []),       // Responses might be empty
      interviewApi.getQuestions(id).catch(() => []),       // Questions might be empty
    ])
      .then(([resData, proctorData, respData, qData]) => {
        setResults(resData);
        setProctor(proctorData);
        setResponses(respData);
        setQuestions(qData.sort((a, b) => a.order_index - b.order_index));
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load review data", err);
        setError(err?.response?.data?.detail || "Failed to load candidate review data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="py-32 flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-neo-blue mx-auto mb-4" />
          <p className="font-bold text-muted-foreground font-mono">Analyzing Interview Session...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="py-16 min-h-[80vh]">
        <div className="container mx-auto px-4 text-center max-w-md">
          <div className="neo-border-thick p-8 bg-background">
            <h2 className="text-2xl font-bold font-mono text-destructive mb-4">Error Loading Review</h2>
            <p className="font-semibold text-sm text-muted-foreground mb-6">{error || "Review details not found."}</p>
            <Link to="/organization/dashboard" className="px-6 py-2 bg-primary text-primary-foreground neo-border font-bold uppercase text-xs neo-hover">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Map questions and answers
  const qaPairs: QAPair[] = questions.map((q) => {
    const response = responses.find((r) => r.question_id === q.id);
    return {
      question: q.question_text,
      type: q.question_type,
      textAnswer: response?.response_text || "No answer recorded.",
      aiScore: response?.response_score != null ? response.response_score : null, // 0-10
      confidence: response?.confidence_level || null,
      relevance: response?.relevance_score || null,
      cheating: response?.cheating_detected || false,
      notes: response?.notes || "No additional AI analysis remarks.",
    };
  });

  return (
    <div className="py-16 min-h-screen bg-polka">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link to={`/organization/campaign/${results.job_role_id}`} className="inline-flex items-center gap-2 mb-6 font-bold uppercase text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Campaign
        </Link>

        {/* Candidate Header */}
        <div className="bg-background neo-border-thick neo-shadow-lg p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-neo-blue neo-border-thick flex items-center justify-center">
              <User className="w-8 h-8 text-neo-blue-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-mono">Candidate Profile Review</h1>
              <p className="text-muted-foreground font-semibold">
                Session ID: <span className="font-mono text-xs">{results.id}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-2 bg-neo-yellow neo-border neo-shadow">
              <p className="text-xs font-bold text-black uppercase">Final Score</p>
              <p className="font-mono font-bold text-3xl text-black">
                {results.final_score != null ? `${results.final_score.toFixed(0)}%` : "N/A"}
              </p>
            </div>
            <Badge className={`neo-border font-bold text-sm px-3 py-1 uppercase ${
              results.is_shortlisted ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {results.is_shortlisted ? "Shortlisted" : "Applied"}
            </Badge>
          </div>
        </div>

        {/* Overview Stats & Proctoring Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-background neo-border-thick p-6 space-y-4">
            <h3 className="font-bold font-mono text-lg border-b pb-2 uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" /> Proctoring Session Metrics
            </h3>
            {proctor ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Integrity", val: proctor.scores.integrity, color: "text-success" },
                  { label: "Attention", val: proctor.scores.attention, color: "text-neo-blue" },
                  { label: "Confidence", val: proctor.scores.confidence, color: "text-neo-purple" },
                  { label: "Posture", val: proctor.scores.posture, color: "text-neo-yellow" },
                ].map((s, idx) => (
                  <div key={idx} className="neo-border p-4 text-center bg-muted">
                    <p className="text-xs font-bold uppercase text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold font-mono mt-1 ${
                      s.val >= 80 ? "text-success" : s.val >= 60 ? "text-neo-yellow" : "text-destructive"
                    }`}>
                      {s.val != null ? `${s.val.toFixed(0)}` : "—"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground font-semibold bg-muted border border-dashed">
                No real-time proctoring data is available for this session.
              </div>
            )}

            {/* Signal Flags count */}
            {proctor && (
              <div className="mt-4 neo-border p-4 bg-muted space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proctoring Signals Flagged:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Face Not Visible", val: proctor.signal_counts.face_not_visible },
                    { label: "Looking Away", val: proctor.signal_counts.gaze_away },
                    { label: "Head Turned Away", val: proctor.signal_counts.head_turn },
                    { label: "Multiple People", val: proctor.signal_counts.multi_person },
                    { label: "Excessive Motion", val: proctor.signal_counts.excessive_movement },
                  ].map((sig, i) => (
                    <span key={i} className={`px-2 py-1 neo-border text-xs font-bold flex items-center gap-1 ${
                      sig.val > 0 ? "bg-neo-yellow/20 border-neo-yellow text-orange-600" : "bg-success/10 border-success/30 text-success"
                    }`}>
                      {sig.val > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                      {sig.label}: <span className="font-mono">{sig.val}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Score Weights */}
          <div className="bg-neo-purple p-6 neo-border-thick text-neo-purple-foreground">
            <h3 className="font-bold font-mono text-lg mb-4 uppercase text-black border-b border-black pb-2">AI Breakdown</h3>
            <div className="space-y-3 font-semibold text-black">
              <div className="flex justify-between">
                <span>ATS Resume Score:</span>
                <span className="font-mono font-bold">{results.ats_score != null ? `${results.ats_score.toFixed(0)}%` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Interview QA Score:</span>
                <span className="font-mono font-bold">{results.interview_score != null ? `${results.interview_score.toFixed(0)}%` : "—"}</span>
              </div>
              <div className="h-[2px] bg-black my-2" />
              <div className="text-xs text-black/70 italic">
                Formula: ATS (30%) + AI Interview (70%). Final combined score represents candidate's overall relevance.
              </div>
            </div>
          </div>
        </div>

        {/* Answer Breakdown */}
        <h2 className="text-2xl font-bold mb-4 font-mono">Answer Breakdown</h2>
        <div className="space-y-6 mb-10">
          {qaPairs.length === 0 ? (
            <div className="bg-background neo-border-thick p-8 text-center text-muted-foreground font-bold">
              No questions or responses recorded for this interview.
            </div>
          ) : (
            qaPairs.map((a, i) => (
              <div key={i} className="bg-background neo-border-thick neo-shadow p-6">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Question {i + 1} • {a.type}</p>
                  {a.cheating && (
                    <Badge className="bg-destructive text-destructive-foreground neo-border font-bold text-xs">
                      ⚠️ Proctor Flagged
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-3">{a.question}</h3>

                <div className="bg-muted neo-border p-4 mb-4">
                  <p className="font-semibold text-sm italic">"{a.textAnswer}"</p>
                </div>

                {/* Score & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Response Scores</p>
                    <div className="space-y-0.5 text-sm font-semibold">
                      <div className="flex justify-between">
                        <span>AI Quality:</span>
                        <span className="font-mono font-bold">{a.aiScore != null ? `${a.aiScore.toFixed(1)}/10` : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Relevance:</span>
                        <span className="font-mono font-bold">{a.relevance != null ? `${a.relevance.toFixed(0)}%` : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-mono font-bold">{a.confidence != null ? `${a.confidence.toFixed(0)}%` : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">AI Notes & Feedback</p>
                    <p className="text-sm font-semibold text-muted-foreground">{a.notes}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI Summary */}
        <div className="bg-polka-purple p-8 neo-border-thick">
          <h2 className="text-2xl font-bold text-neo-purple-foreground mb-4 text-black font-mono">Overall AI Feedback</h2>
          <div className="bg-background neo-border-thick p-6">
            <h4 className="font-bold text-lg mb-2 uppercase tracking-wide">Summary Remarks</h4>
            <p className="font-semibold text-muted-foreground mb-4">
              {results.feedback || "AI is still running evaluation. Complete analysis has not been populated."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateReview;
