import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Brain,
  Activity,
  ChevronRight,
  ArrowLeft,
  Loader2,
  XCircle,
  Smile,
  Users,
  Monitor,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TOKEN_KEYS } from "@/lib/api-client";
import interviewApi, {
  type InterviewData,
  type InterviewQuestion,
  type RealTimeUpdate,
  type ProctorResults,
} from "@/lib/interview-api";

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "lobby" | "active" | "completed" | "results" | "error";

interface SubmittedAnswer {
  questionId: string;
  text: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const typeColors: Record<string, string> = {
  technical: "bg-neo-blue text-neo-blue-foreground",
  behavioral: "bg-neo-purple text-neo-purple-foreground",
  situational: "bg-neo-yellow text-neo-yellow-foreground",
};

// ── Main Component ─────────────────────────────────────────────────────────

const AIInterview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Phase
  const [phase, setPhase] = useState<Phase>("lobby");
  const [errorMsg, setErrorMsg] = useState("");

  // Interview data
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [submittedAnswers, setSubmittedAnswers] = useState<SubmittedAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera / mic
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  // Timer (per-question, 120s)
  const [timer, setTimer] = useState(120);

  // WebSocket proctoring
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [proctorMetrics, setProctorMetrics] = useState<RealTimeUpdate | null>(null);
  const [proctorAlerts, setProctorAlerts] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Results
  const [results, setResults] = useState<InterviewData | null>(null);
  const [proctorResults, setProctorResults] = useState<ProctorResults | null>(null);

  // Lobby loading & Preparation states
  const [loadingLobby, setLoadingLobby] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationStep, setPreparationStep] = useState("");
  const [prepSteps, setPrepSteps] = useState({
    start: false,
    questions: false,
    proctor: false,
  });

  // ── Lobby: prefetch interview data & questions ───────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoadingLobby(true);
    Promise.all([
      interviewApi.getResults(id),
      interviewApi.getQuestions(id).catch(() => []) // Prefetch questions; fallback to empty if none generated yet
    ])
      .then(([data, qs]) => {
        setInterview(data);
        setQuestions(qs);
        if (data.status === "completed") {
          // Already completed → go straight to results
          setResults(data);
          setPhase("results");
          interviewApi.getProctorResults(id).then(setProctorResults).catch(() => {});
        }
      })
      .catch((err) => {
        setErrorMsg(
          err?.response?.data?.detail || "Failed to load interview. Check the interview ID."
        );
        setPhase("error");
      })
      .finally(() => {
        setLoadingLobby(false);
      });
  }, [id]);

  // ── Camera setup ─────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setCameraError(false);
    } catch {
      setCameraError(true);
      setCameraReady(false);
    }
  }, []);

  // Sync the video stream with the video element whenever the camera is ready or phase changes
  useEffect(() => {
    if (cameraReady && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady, phase]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      stopProctoring();
    };
  }, []);

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    }
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    }
    setCamOn((v) => !v);
  };

  // ── WebSocket proctoring ─────────────────────────────────────────────────

  const startProctoring = useCallback(() => {
    if (!id) return;
    const token = localStorage.getItem(TOKEN_KEYS.access);
    if (!token) return;

    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/v1/ws/proctoring/${id}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Start sending frames every 300ms
      frameIntervalRef.current = setInterval(() => {
        sendFrame();
      }, 300);
    };

    ws.onmessage = (event) => {
      try {
        const data: RealTimeUpdate = JSON.parse(event.data);
        if (data.error) {
          console.warn("Proctor error:", data.error);
          return;
        }
        setProctorMetrics(data);
        // We only show side alerts, not the top alert banner for proctoring violations.
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };
  }, [id]);

  const sendFrame = useCallback(() => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      !videoRef.current ||
      !canvasRef.current
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 320; // Send half-res for performance
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    wsRef.current.send(dataUrl);
  }, []);

  const stopProctoring = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  // ── Begin interview ──────────────────────────────────────────────────────

  const handleBeginInterview = async () => {
    if (!id) return;
    setIsPreparing(true);
    setPrepSteps({ start: false, questions: false, proctor: false });
    
    try {
      // Step 1: Initialize interview
      setPreparationStep("Initializing interview session...");
      const updated = await interviewApi.startInterview(id);
      setInterview(updated);
      setPrepSteps(prev => ({ ...prev, start: true }));
      await new Promise(r => setTimeout(r, 600));

      // Step 2: Fetch / Validate questions
      setPreparationStep("Loading interview questions...");
      let qs = questions;
      if (qs.length === 0) {
        qs = await interviewApi.getQuestions(id);
        setQuestions(qs);
      }
      setPrepSteps(prev => ({ ...prev, questions: true }));
      await new Promise(r => setTimeout(r, 600));

      // Step 3: Secure webcam & proctoring
      setPreparationStep("Establishing AI proctoring connection...");
      if (cameraReady) {
        startProctoring();
      }
      setPrepSteps(prev => ({ ...prev, proctor: true }));
      await new Promise(r => setTimeout(r, 600));

      // Complete preparation
      setTimer(120);
      setPhase("active");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to start interview";
      setErrorMsg(msg);
      setPhase("error");
    } finally {
      setIsPreparing(false);
    }
  };

  // ── Submit answer ────────────────────────────────────────────────────────

  const handleSubmitAnswer = async () => {
    if (!id || isSubmitting) return;
    const question = questions[currentQ];
    if (!question) return;

    const currentTextAnswer = textAnswer;
    const isLastQ = currentQ === questions.length - 1;

    if (!isLastQ) {
      // Transition immediately to the next question with zero delay/loading
      setCurrentQ((c) => c + 1);
      setTimer(120);
      setTextAnswer("");
      setSubmittedAnswers((prev) => [
        ...prev,
        { questionId: question.id, text: currentTextAnswer },
      ]);

      // Run API submission asynchronously in the background
      interviewApi.submitResponse(id, {
        interview_id: id,
        question_id: question.id,
        response_text: currentTextAnswer || null,
      }).catch((err) => {
        console.error("Failed to submit response in background:", err);
      });
    } else {
      // Last question: require loading/blocking UI to complete the session
      setIsSubmitting(true);
      try {
        await interviewApi.submitResponse(id, {
          interview_id: id,
          question_id: question.id,
          response_text: currentTextAnswer || null,
        });

        setSubmittedAnswers((prev) => [
          ...prev,
          { questionId: question.id, text: currentTextAnswer },
        ]);
        setTextAnswer("");

        await handleCompleteInterview();
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Failed to submit response";
        if (msg.includes("already submitted")) {
          await handleCompleteInterview();
        } else {
          setProctorAlerts([msg]);
          setTimeout(() => setProctorAlerts([]), 3000);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ── Complete interview ───────────────────────────────────────────────────

  const handleCompleteInterview = async () => {
    if (!id) return;
    try {
      stopProctoring();
      stopCamera();

      const completed = await interviewApi.completeInterview(id);
      setResults(completed);

      // Fetch proctor results
      try {
        const pr = await interviewApi.getProctorResults(id);
        setProctorResults(pr);
      } catch {
        // Proctor results may not exist
      }

      setPhase("results");
    } catch {
      setPhase("results");
    }
  };

  // ── Timer countdown ──────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "active") return;
    if (timer <= 0) {
      handleSubmitAnswer();
      return;
    }
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, phase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ERROR
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-polka-purple flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-background neo-border-thick neo-shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-destructive neo-border-thick mx-auto mb-6 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive-foreground" />
          </div>
          <h2 className="text-2xl font-bold font-mono mb-2">Error</h2>
          <p className="text-muted-foreground font-semibold mb-8">{errorMsg}</p>
          <button
            onClick={() => navigate("/user/track")}
            className="px-8 py-3 bg-primary text-primary-foreground neo-border neo-shadow font-bold uppercase neo-hover"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: LOBBY
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === "lobby" && loadingLobby) {
    return (
      <div className="min-h-screen bg-polka-purple flex items-center justify-center p-4">
        <div className="bg-background neo-border-thick neo-shadow-lg p-8 text-center max-w-sm w-full">
          <Loader2 className="w-12 h-12 animate-spin text-neo-blue mx-auto mb-4" />
          <p className="font-bold text-muted-foreground font-mono">Loading Setup...</p>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-polka-purple flex items-center justify-center p-4">
        {/* Progress Overlay */}
        <AnimatePresence>
          {isPreparing && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-background neo-border-thick neo-shadow-lg p-8 max-w-md w-full text-center space-y-6"
              >
                <div className="flex justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-neo-blue" />
                </div>
                <h3 className="text-xl font-bold font-mono">Preparing Interview Room</h3>
                <div className="space-y-3 text-left font-semibold">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold ${
                      prepSteps.start ? "bg-success text-success-foreground" : "bg-muted"
                    }`}>
                      {prepSteps.start ? "✓" : "1"}
                    </div>
                    <span className={prepSteps.start ? "text-foreground font-bold" : "text-muted-foreground"}>
                      Initialize interview session
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold ${
                      prepSteps.questions ? "bg-success text-success-foreground" : "bg-muted"
                    }`}>
                      {prepSteps.questions ? "✓" : "2"}
                    </div>
                    <span className={prepSteps.questions ? "text-foreground font-bold" : "text-muted-foreground"}>
                      Fetch interview questions
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full border border-black flex items-center justify-center text-[10px] font-bold ${
                      prepSteps.proctor ? "bg-success text-success-foreground" : "bg-muted"
                    }`}>
                      {prepSteps.proctor ? "✓" : "3"}
                    </div>
                    <span className={prepSteps.proctor ? "text-foreground font-bold" : "text-muted-foreground"}>
                      Secure webcam & proctoring stream
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-muted neo-border text-xs text-center font-mono font-bold animate-pulse">
                  {preparationStep}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-background neo-border-thick neo-shadow-lg p-8 max-w-2xl w-full"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/user/track")}
              className="w-10 h-10 neo-border neo-shadow neo-hover flex items-center justify-center bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold font-mono">Interview Lobby</h2>
              <p className="text-muted-foreground font-semibold text-sm">
                Complete the checklist to begin
              </p>
            </div>
          </div>

          {/* Webcam Preview */}
          <div className="neo-border-thick neo-shadow bg-primary relative overflow-hidden aspect-video mb-6">
            {cameraReady ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-4 left-4 bg-success/90 neo-border px-3 py-1 font-bold text-xs uppercase text-success-foreground">
                  ✓ Camera Active
                </div>
              </>
            ) : cameraError ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <CameraOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-bold text-destructive">Camera Access Denied</p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    You can still proceed in text-only mode
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-bold text-muted-foreground">Camera Preview</p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    Click "Enable Camera" to start
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Checklist */}
          <div className="space-y-3 mb-6">
            <ChecklistItem
              label="Camera & Microphone"
              checked={cameraReady}
              action={
                !cameraReady && !cameraError ? (
                  <button
                    onClick={startCamera}
                    className="px-4 py-1.5 bg-neo-blue text-neo-blue-foreground neo-border font-bold text-xs uppercase neo-hover"
                  >
                    Enable Camera
                  </button>
                ) : cameraError ? (
                  <button
                    onClick={startCamera}
                    className="px-4 py-1.5 bg-neo-yellow text-neo-yellow-foreground neo-border font-bold text-xs uppercase neo-hover"
                  >
                    Retry
                  </button>
                ) : null
              }
            />
            <ChecklistItem
              label="Stable Internet Connection"
              checked={true}
            />
            <ChecklistItem
              label="Quiet Environment"
              checked={true}
            />
            <ChecklistItem
              label={`Interview Duration: ${interview?.duration_minutes ?? 30} minutes`}
              checked={true}
            />
          </div>

          {/* Missing Questions Warning Card */}
          {questions.length === 0 && (
            <div className="bg-destructive/10 border-destructive border-2 p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-destructive mb-1">Recruiter Setup Required</p>
                <p className="text-xs text-muted-foreground font-semibold">
                  No questions have been configured for this interview campaign yet. You cannot start the interview. Please contact the organization/recruiter to generate questions.
                </p>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-neo-yellow/10 neo-border p-4 mb-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm mb-1">AI Proctoring Active</p>
                <p className="text-xs text-muted-foreground font-semibold">
                  Your webcam feed will be analyzed in real-time for face visibility, gaze
                  direction, head pose, and posture. This data contributes to your final score.
                </p>
              </div>
            </div>
          </div>

          {/* Begin button */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/user/track")}
              className="flex-1 py-3 bg-muted neo-border font-bold uppercase neo-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleBeginInterview}
              disabled={questions.length === 0}
              className="flex-1 py-3 bg-success text-success-foreground neo-border neo-shadow font-bold uppercase neo-hover flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Begin Interview
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: RESULTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-polka-purple p-4">
        <div className="container mx-auto max-w-4xl py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-background neo-border-thick neo-shadow-lg p-8 mb-6 text-center"
          >
            <div className="w-20 h-20 bg-success neo-border-thick mx-auto mb-6 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success-foreground" />
            </div>
            <h2 className="text-3xl font-bold font-mono mb-2">Interview Complete!</h2>
            <p className="text-muted-foreground font-semibold mb-4">
              You answered {submittedAnswers.length} of {questions.length || "all"} questions
            </p>

            {/* Score cards */}
            {results && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <ScoreCard
                  label="Final Score"
                  value={results.final_score}
                  color="card-border-purple"
                />
                <ScoreCard
                  label="Interview"
                  value={results.interview_score}
                  color="card-border-blue"
                />
                <ScoreCard
                  label="ATS Score"
                  value={results.ats_score}
                  color="card-border-yellow"
                />
                <ScoreCard
                  label="Shortlisted"
                  value={results.is_shortlisted ? "Yes" : "No"}
                  color={results.is_shortlisted ? "card-border-green" : "card-border-red"}
                />
              </div>
            )}

            {results?.feedback && (
              <div className="mt-6 bg-muted neo-border p-4 text-left">
                <p className="font-bold text-sm mb-1 flex items-center gap-2">
                  <Brain className="w-4 h-4" /> AI Feedback
                </p>
                <p className="text-sm text-muted-foreground font-semibold">
                  {results.feedback}
                </p>
              </div>
            )}
          </motion.div>

          {/* Proctoring results */}
          {proctorResults && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-background neo-border-thick neo-shadow-lg p-8 mb-6"
            >
              <h3 className="text-xl font-bold font-mono mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Proctoring Analysis
              </h3>

              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <ScoreCard
                  label="Confidence"
                  value={proctorResults.scores.confidence}
                  color="card-border-blue"
                />
                <ScoreCard
                  label="Attention"
                  value={proctorResults.scores.attention}
                  color="card-border-purple"
                />
                <ScoreCard
                  label="Integrity"
                  value={proctorResults.scores.integrity}
                  color="card-border-green"
                />
                <ScoreCard
                  label="Posture"
                  value={proctorResults.scores.posture}
                  color="card-border-yellow"
                />
              </div>

              {/* Signal counts */}
              <h4 className="font-bold text-sm uppercase mb-3 text-muted-foreground">
                Signals Detected
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <SignalCard
                  icon={<Eye className="w-4 h-4" />}
                  label="Face Hidden"
                  count={proctorResults.signal_counts.face_not_visible}
                />
                <SignalCard
                  icon={<Monitor className="w-4 h-4" />}
                  label="Gaze Away"
                  count={proctorResults.signal_counts.gaze_away}
                />
                <SignalCard
                  icon={<Activity className="w-4 h-4" />}
                  label="Head Turn"
                  count={proctorResults.signal_counts.head_turn}
                />
                <SignalCard
                  icon={<Users className="w-4 h-4" />}
                  label="Multi-Person"
                  count={proctorResults.signal_counts.multi_person}
                />
                <SignalCard
                  icon={<Activity className="w-4 h-4" />}
                  label="Movement"
                  count={proctorResults.signal_counts.excessive_movement}
                />
              </div>

              {/* Emotion distribution */}
              {proctorResults.emotion_distribution &&
                Object.keys(proctorResults.emotion_distribution).length > 0 && (
                  <>
                    <h4 className="font-bold text-sm uppercase mb-3 text-muted-foreground">
                      Emotion Distribution
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(proctorResults.emotion_distribution)
                        .sort(([, a], [, b]) => b - a)
                        .map(([emotion, count]) => (
                          <div
                            key={emotion}
                            className="neo-border px-3 py-2 bg-muted flex items-center gap-2"
                          >
                            <Smile className="w-3 h-3" />
                            <span className="font-bold text-xs uppercase">{emotion}</span>
                            <span className="text-xs text-muted-foreground font-semibold">
                              {count}
                            </span>
                          </div>
                        ))}
                    </div>
                  </>
                )}

              <p className="text-xs text-muted-foreground font-semibold mt-4">
                Total frames analyzed: {proctorResults.total_frames}
              </p>
            </motion.div>
          )}

          <button
            onClick={() => navigate("/user/track")}
            className="w-full py-3 bg-primary text-primary-foreground neo-border-thick neo-shadow font-bold uppercase neo-hover"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: ACTIVE INTERVIEW ROOM
  // ═══════════════════════════════════════════════════════════════════════════

  const isTextOnly = !cameraReady;
  const question = questions[currentQ];

  return (
    <div className="min-h-screen bg-polka-purple">
      {/* Text-only warning */}
      {isTextOnly && (
        <div className="bg-warning text-warning-foreground neo-border border-t-0 border-x-0 py-2 px-4 flex items-center justify-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          Camera not available — Text-only mode (proctoring disabled)
        </div>
      )}

      {/* Mic muted warning */}
      {!micOn && (
        <div className="bg-warning text-warning-foreground neo-border border-t-0 border-x-0 py-2 px-4 flex items-center justify-center gap-2 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          Microphone is muted — Voice analysis is disabled
        </div>
      )}

      {/* Proctor alerts */}
      <AnimatePresence>
        {proctorAlerts.length > 0 && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 font-bold text-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            {proctorAlerts.join(" • ")}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6">
        {/* SPLIT SCREEN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* LEFT — Camera Feed + Proctoring Overlay */}
          <div className="neo-border-thick neo-shadow-lg bg-primary relative overflow-hidden aspect-video">
            {!isTextOnly ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* REC indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1 neo-border font-bold text-xs uppercase">
                  <div className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                  REC
                </div>

                {/* WS status */}
                <div
                  className={`absolute top-4 right-4 px-3 py-1 neo-border font-bold text-xs uppercase ${
                    wsConnected
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {wsConnected ? "● PROCTOR" : "○ OFFLINE"}
                </div>

                {/* Label */}
                <div className="absolute bottom-4 left-4 bg-background/90 neo-border px-3 py-1 font-bold text-xs uppercase">
                  YOU (LIVE)
                </div>

                {/* Proctoring mini-scores overlay */}
                {proctorMetrics && (
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <MiniScore
                      label="ATN"
                      value={proctorMetrics.current_scores.attention}
                    />
                    <MiniScore
                      label="CNF"
                      value={proctorMetrics.current_scores.confidence}
                    />
                    <MiniScore
                      label="INT"
                      value={proctorMetrics.current_scores.integrity}
                    />
                  </div>
                )}

                {/* Face/gaze indicators */}
                {proctorMetrics && (
                  <div className="absolute top-14 left-4 space-y-1">
                    <IndicatorDot
                      ok={proctorMetrics.face_visible}
                      label={proctorMetrics.face_visible ? "Face OK" : "No Face"}
                    />
                    <IndicatorDot
                      ok={proctorMetrics.gaze_on_screen}
                      label={proctorMetrics.gaze_on_screen ? "Gaze OK" : "Looking Away"}
                    />
                    <IndicatorDot
                      ok={!proctorMetrics.head_turned_away}
                      label={
                        proctorMetrics.head_turned_away ? "Head Turned" : "Head OK"
                      }
                    />
                    {proctorMetrics.multi_person_detected && (
                      <IndicatorDot
                        ok={false}
                        label={`${proctorMetrics.person_count} people`}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <CameraOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-bold text-muted-foreground">Camera Disabled</p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    Using text-only mode
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Question Panel */}
          <div className="bg-background neo-border-thick neo-shadow-lg p-6 flex flex-col">
            {/* Timer + Status */}
            <div className="flex items-center justify-between mb-6">
              <div
                className={`flex items-center gap-2 px-3 py-1 neo-border font-mono font-bold ${
                  timer <= 30
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-neo-yellow text-neo-yellow-foreground"
                }`}
              >
                <Clock className="w-4 h-4" />
                {formatTime(timer)}
              </div>
              {question && (
                <Badge
                  className={`neo-border font-bold text-xs uppercase ${
                    typeColors[question.question_type] ?? ""
                  }`}
                >
                  {question.question_type}
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 neo-border ${
                    i < currentQ
                      ? "bg-success"
                      : i === currentQ
                      ? "bg-neo-yellow"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
              Question {currentQ + 1} of {questions.length}
            </p>

            <AnimatePresence mode="wait">
              <motion.h2
                key={currentQ}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="text-xl md:text-2xl font-bold leading-snug flex-1"
              >
                {question?.question_text ?? "Loading question..."}
              </motion.h2>
            </AnimatePresence>

            {/* Emotion indicator */}
            {proctorMetrics && (
              <div className="mt-4 flex items-center gap-2">
                <Smile className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Mood: {proctorMetrics.dominant_emotion}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROL BAR */}
        <div className="bg-background neo-border-thick neo-shadow-lg p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex gap-2">
            {!isTextOnly && (
              <button
                onClick={toggleMic}
                className={`w-12 h-12 neo-border neo-shadow neo-hover flex items-center justify-center ${
                  micOn ? "bg-success" : "bg-destructive"
                }`}
              >
                {micOn ? (
                  <Mic className="w-5 h-5 text-success-foreground" />
                ) : (
                  <MicOff className="w-5 h-5 text-destructive-foreground" />
                )}
              </button>
            )}
          </div>

          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={2}
            className="flex-1 px-4 py-3 neo-border bg-background font-semibold placeholder:text-muted-foreground focus:outline-none focus:neo-shadow resize-none"
          />

          <button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || !question}
            className="px-6 py-3 bg-neo-purple text-neo-purple-foreground neo-border neo-shadow font-bold uppercase tracking-wider neo-hover flex items-center gap-2 disabled:opacity-50 justify-center whitespace-nowrap"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentQ === questions.length - 1 ? (
              <Send className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {currentQ === questions.length - 1 ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

function ChecklistItem({
  label,
  checked,
  action,
}: {
  label: string;
  checked: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between neo-border p-3 bg-muted/50">
      <div className="flex items-center gap-3">
        <div
          className={`w-6 h-6 neo-border flex items-center justify-center ${
            checked ? "bg-success" : "bg-muted"
          }`}
        >
          {checked && <CheckCircle2 className="w-4 h-4 text-success-foreground" />}
        </div>
        <span className="font-bold text-sm">{label}</span>
      </div>
      {action}
    </div>
  );
}

function ScoreCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string | null | undefined;
  color: string;
}) {
  const displayValue =
    typeof value === "number"
      ? value.toFixed(1)
      : value ?? "—";
  return (
    <div className={`neo-border neo-shadow p-4 text-center ${color}`}>
      <p className="text-2xl font-bold font-mono">{displayValue}</p>
      <p className="text-xs font-bold uppercase text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SignalCard({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div
      className={`neo-border p-3 text-center ${
        count > 0 ? "bg-destructive/10" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
      <p className="text-lg font-bold font-mono">{count}</p>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70
      ? "bg-success/90 text-success-foreground"
      : value >= 40
      ? "bg-neo-yellow/90 text-neo-yellow-foreground"
      : "bg-destructive/90 text-destructive-foreground";
  return (
    <div className={`px-2 py-1 neo-border font-mono text-[10px] font-bold ${color}`}>
      {label} {value.toFixed(0)}
    </div>
  );
}

function IndicatorDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 neo-border text-[10px] font-bold uppercase ${
        ok
          ? "bg-success/80 text-success-foreground"
          : "bg-destructive/80 text-destructive-foreground"
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          ok ? "bg-success-foreground" : "bg-destructive-foreground animate-pulse"
        }`}
      />
      {label}
    </div>
  );
}

export default AIInterview;
