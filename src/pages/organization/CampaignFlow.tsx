import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Video, Award, Send, Loader2, CalendarRange, HelpCircle, Check, Play, UserCheck } from "lucide-react";
import { 
  campaignApi, 
  Campaign, 
  CampaignCreate,
  CampaignApplicant,
  InterviewQuestionResponse
} from "@/lib/campaign-api";
import { toast } from "sonner";

const CampaignFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  
  const [activeSection, setActiveSection] = useState("description");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [skillsInput, setSkillsInput] = useState("");
  
  // Dynamic API states
  const [applicants, setApplicants] = useState<CampaignApplicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [questions, setQuestions] = useState<InterviewQuestionResponse[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  
  // Question configuration form state
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState<"technical" | "behavioral" | "situational" | "mixed">("mixed");
  const [questionDifficulty, setQuestionDifficulty] = useState<"entry" | "mid" | "senior">("mid");

  // Offer modal selection
  const [selectedApplicant, setSelectedApplicant] = useState<CampaignApplicant | null>(null);

  const [formData, setFormData] = useState<CampaignCreate>({
    title: "",
    description: "",
    location: "",
    is_remote: false,
    min_experience_years: 0,
    max_experience_years: 0,
    salary_range_min: 0,
    salary_range_max: 0,
    required_skills: [],
  });

  const sections = ["description", "scoreboard", "interview", "merit", "verification", "offer"];

  const loadApplicants = useCallback(() => {
    if (!isNew && id) {
      setLoadingApplicants(true);
      campaignApi.getCampaignApplicants(id)
        .then(setApplicants)
        .catch((err) => console.error("Failed to load applicants", err))
        .finally(() => setLoadingApplicants(false));
    }
  }, [id, isNew]);

  const loadQuestions = useCallback(() => {
    if (!isNew && id) {
      setLoadingQuestions(true);
      campaignApi.getCampaignQuestions(id)
        .then(setQuestions)
        .catch((err) => console.error("Failed to load questions", err))
        .finally(() => setLoadingQuestions(false));
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew && id) {
      setIsLoading(true);
      campaignApi.getCampaign(id)
        .then(data => {
          setCampaign(data);
          setFormData({
            title: data.title,
            description: data.description || "",
            location: data.location || "",
            is_remote: data.is_remote || false,
            min_experience_years: data.min_experience_years || 0,
            max_experience_years: data.max_experience_years || 0,
            salary_range_min: data.salary_range_min || 0,
            salary_range_max: data.salary_range_max || 0,
            required_skills: data.required_skills || [],
          });
          setSkillsInput((data.required_skills || []).join(", "));
        })
        .catch(err => {
          console.error("Failed to load campaign", err);
          toast.error("Failed to load campaign");
          navigate("/organization/dashboard");
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, isNew, navigate]);

  useEffect(() => {
    if (activeSection === "scoreboard" || activeSection === "merit" || activeSection === "offer") {
      loadApplicants();
    } else if (activeSection === "interview") {
      loadQuestions();
    }
  }, [activeSection, loadApplicants, loadQuestions]);

  const handleToggleShortlist = async (candidateId: string, currentVal: boolean) => {
    if (!id) return;
    try {
      await campaignApi.updateApplicantStatus(id, candidateId, { is_shortlisted: !currentVal });
      toast.success(!currentVal ? "Candidate shortlisted!" : "Removed from shortlist.");
      loadApplicants();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  const handleGenerateQuestions = async () => {
    if (!id) return;
    setIsGeneratingQuestions(true);
    try {
      await campaignApi.generateCampaignQuestions(id, {
        num_questions: numQuestions,
        question_type: questionType,
        difficulty: questionDifficulty,
      });
      toast.success("AI interview questions generated successfully!");
      loadQuestions();
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate questions.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSendOffer = async () => {
    if (!id || !selectedApplicant) return;
    try {
      await campaignApi.updateApplicantStatus(id, selectedApplicant.candidate.id, { status: "completed" });
      toast.success(`Offer letter sent to ${selectedApplicant.candidate.full_name}!`);
      setShowOfferModal(false);
      loadApplicants();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.");
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    
    setIsSaving(true);
    try {
      if (isNew) {
        const newCampaign = await campaignApi.createCampaign(formData);
        toast.success("Campaign created successfully!");
        navigate(`/organization/campaign/${newCampaign.id}`);
      } else if (id) {
        const updated = await campaignApi.updateCampaign(id, formData);
        setCampaign(updated);
        toast.success("Campaign updated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save campaign");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-neo-blue" />
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold font-mono mb-2">
          {isNew ? "Create New Campaign" : `Campaign: ${campaign?.title}`}
        </h1>
        <p className="text-muted-foreground font-semibold mb-8">Manage the full hiring pipeline</p>

        {/* Section Tabs */}
        {!isNew && (
          <div className="flex flex-wrap gap-2 mb-8">
            {sections.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-2 neo-border font-bold text-sm uppercase neo-hover ${
                  activeSection === s ? "bg-neo-yellow neo-shadow" : "bg-background"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Description */}
        {activeSection === "description" && (
          <div className="neo-border-thick neo-shadow-lg p-6 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Campaign Description</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-sm mb-1 uppercase">Title *</label>
                  <input 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                    placeholder="e.g. Senior React Developer" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Location</label>
                  <input 
                    value={formData.location || ""}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                    placeholder="e.g. New York, NY" 
                  />
                </div>
                <div className="flex items-center gap-2 mt-8">
                  <input 
                    type="checkbox" 
                    checked={formData.is_remote || false}
                    onChange={(e) => setFormData({...formData, is_remote: e.target.checked})}
                    className="w-5 h-5 neo-border bg-background" 
                    id="is_remote"
                  />
                  <label htmlFor="is_remote" className="font-bold text-sm uppercase cursor-pointer">Remote Role</label>
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Min Experience (Years)</label>
                  <input 
                    type="number"
                    value={formData.min_experience_years ?? ""}
                    onChange={(e) => setFormData({...formData, min_experience_years: e.target.value === "" ? 0 : parseInt(e.target.value, 10)})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Max Experience (Years)</label>
                  <input 
                    type="number"
                    value={formData.max_experience_years ?? ""}
                    onChange={(e) => setFormData({...formData, max_experience_years: e.target.value === "" ? null : parseInt(e.target.value, 10)})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Min Salary ($)</label>
                  <input 
                    type="number"
                    value={formData.salary_range_min ?? ""}
                    onChange={(e) => setFormData({...formData, salary_range_min: e.target.value === "" ? null : parseInt(e.target.value, 10)})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Max Salary ($)</label>
                  <input 
                    type="number"
                    value={formData.salary_range_max ?? ""}
                    onChange={(e) => setFormData({...formData, salary_range_max: e.target.value === "" ? null : parseInt(e.target.value, 10)})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-sm mb-1 uppercase">Required Skills (Comma separated)</label>
                  <input 
                    value={skillsInput}
                    onChange={(e) => {
                      setSkillsInput(e.target.value);
                      setFormData({...formData, required_skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean)});
                    }}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold focus:outline-none focus:neo-shadow transition-all" 
                    placeholder="React, TypeScript, Python" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-sm mb-1 uppercase">Description</label>
                  <textarea 
                    value={formData.description || ""}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 neo-border bg-background font-semibold h-32 focus:outline-none focus:neo-shadow transition-all" 
                    placeholder="Looking for an experienced React developer..." 
                  />
                </div>
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-primary-foreground neo-border neo-shadow font-bold uppercase neo-hover flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isNew ? "Create Campaign" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Scoreboard */}
        {activeSection === "scoreboard" && (
          <div className="neo-border-thick neo-shadow-lg overflow-hidden bg-background">
            {loadingApplicants ? (
              <div className="p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-neo-blue" />
              </div>
            ) : applicants.length === 0 ? (
              <div className="p-12 text-center font-bold text-muted-foreground">
                No candidates have applied to this campaign yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b-[3px] border-border bg-muted text-foreground">
                    <th className="text-left p-4 font-bold text-xs uppercase">Candidate</th>
                    <th className="text-left p-4 font-bold text-xs uppercase">ATS Score</th>
                    <th className="text-left p-4 font-bold text-xs uppercase">Interview Score</th>
                    <th className="text-left p-4 font-bold text-xs uppercase">Final Score</th>
                    <th className="text-left p-4 font-bold text-xs uppercase">Status</th>
                    <th className="text-left p-4 font-bold text-xs uppercase">Shortlist</th>
                    <th className="text-left p-4 font-bold text-xs uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((app) => (
                    <tr
                      key={app.interview_id}
                      className={`border-b-[3px] border-border last:border-b-0 ${
                        app.is_shortlisted ? "bg-neo-blue/5" : ""
                      }`}
                    >
                      <td className="p-4 font-bold">
                        <div>{app.candidate.full_name}</div>
                        <div className="text-xs text-muted-foreground font-semibold">{app.candidate.email}</div>
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {app.ats_score != null ? `${app.ats_score.toFixed(0)}%` : "—"}
                      </td>
                      <td className="p-4">
                        {app.interview_score != null ? (
                          <span className={`font-mono font-bold px-2 py-0.5 neo-border bg-success text-success-foreground`}>
                            {app.interview_score.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm font-semibold">Not Completed</span>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {app.final_score != null ? `${app.final_score.toFixed(0)}%` : "—"}
                      </td>
                      <td className="p-4">
                        <Badge className={`neo-border font-bold text-xs uppercase ${
                          app.status === "completed" ? "bg-success text-success-foreground" :
                          app.status === "in_progress" ? "bg-neo-blue text-neo-blue-foreground" :
                          "bg-neo-yellow text-neo-yellow-foreground"
                        }`}>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleShortlist(app.candidate.id, app.is_shortlisted)}
                          className={`px-3 py-1.5 neo-border font-bold text-xs uppercase neo-hover ${
                            app.is_shortlisted ? "bg-success text-success-foreground" : "bg-background text-foreground"
                          }`}
                        >
                          {app.is_shortlisted ? "✓ Shortlisted" : "Shortlist"}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          {app.status === "pending" && (
                            <Link
                              to={`/organization/rec/schedule?interviewId=${app.interview_id}&candidateName=${app.candidate.full_name}&campaignId=${id}&candidateId=${app.candidate.id}`}
                              className="px-3 py-1.5 bg-neo-yellow text-black neo-border font-bold text-xs uppercase neo-hover flex items-center gap-1"
                            >
                              <CalendarRange className="w-3.5 h-3.5" /> Schedule
                            </Link>
                          )}
                          {app.status === "completed" && (
                            <Link
                              to={`/organization/candidate/${app.interview_id}`}
                              className="px-3 py-1.5 bg-neo-purple text-neo-purple-foreground neo-border font-bold text-xs uppercase neo-hover flex items-center gap-1"
                            >
                              <Play className="w-3.5 h-3.5" /> View Review
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* AI Interview Section */}
        {activeSection === "interview" && (
          <div className="bg-polka-purple p-8 neo-border-thick">
            <h3 className="text-2xl font-bold text-neo-purple-foreground mb-4 text-black">AI Interview Configuration</h3>
            <p className="text-neo-purple-foreground/80 font-semibold mb-6 text-black">Configure automated interview questions</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Question Config Form */}
              <div className="bg-background neo-border-thick p-6 space-y-4">
                <h4 className="font-bold text-lg border-b pb-2 uppercase tracking-wide">Generate with Gemini AI</h4>
                <div>
                  <label className="block font-bold text-xs mb-1 uppercase">Number of Questions</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full px-3 py-2 neo-border bg-background font-bold text-sm"
                  >
                    {[3, 5, 8, 10].map((n) => (
                      <option key={n} value={n}>{n} Questions</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1 uppercase">Question Type</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as any)}
                    className="w-full px-3 py-2 neo-border bg-background font-bold text-sm"
                  >
                    <option value="mixed">Mixed</option>
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="situational">Situational</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1 uppercase">Difficulty</label>
                  <select
                    value={questionDifficulty}
                    onChange={(e) => setQuestionDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 neo-border bg-background font-bold text-sm"
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior / Lead</option>
                  </select>
                </div>
                {questions.length > 0 && (
                  <p className="text-[10px] font-bold text-neo-blue text-center uppercase tracking-wider bg-neo-blue/5 p-2 border border-dashed border-neo-blue/20 rounded">
                    💡 Questions are already configured. Regenerating will replace them in the database.
                  </p>
                )}
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingQuestions}
                  className="w-full py-2 bg-neo-purple text-neo-purple-foreground neo-border neo-shadow font-bold uppercase neo-hover flex items-center justify-center gap-2"
                >
                  {isGeneratingQuestions && <Loader2 className="w-4 h-4 animate-spin" />}
                  {questions.length > 0 ? "Regenerate Questions" : "Generate Questions"}
                </button>
              </div>

              {/* Questions List */}
              <div className="lg:col-span-2 bg-background neo-border-thick p-6 space-y-4 max-h-[500px] overflow-y-auto">
                <h4 className="font-bold text-lg border-b pb-2 uppercase tracking-wide flex justify-between items-center">
                  Active Questions 
                  <span className="text-sm text-muted-foreground font-semibold">Count: {questions.length}</span>
                </h4>
                {loadingQuestions ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-neo-blue" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-bold flex flex-col items-center gap-2">
                    <HelpCircle className="w-12 h-12 text-muted-foreground/60" />
                    No questions generated yet. Use the panel on the left to generate questions.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="neo-border p-4 space-y-2 relative bg-background">
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 bg-muted neo-border text-xs font-bold uppercase">
                            Q{idx + 1} — {q.question_type}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground font-mono">Max Score: {q.max_score}</span>
                        </div>
                        <p className="font-bold">{q.question_text}</p>
                        {q.expected_answer_keywords && q.expected_answer_keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs font-bold text-muted-foreground mr-1">Keywords:</span>
                            {q.expected_answer_keywords.map((kw, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-neo-blue/5 border border-dashed border-neo-blue/30 text-xs font-semibold rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Merit List */}
        {activeSection === "merit" && (
          <div className="bg-polka-purple p-8 neo-border-thick">
            <h3 className="text-2xl font-bold text-neo-purple-foreground mb-6 text-black">Final Merit List</h3>
            <p className="text-neo-purple-foreground/80 font-semibold mb-6 text-black">Applicants ranked by final combined interview scores</p>
            
            <div className="space-y-3">
              {loadingApplicants ? (
                <div className="p-12 text-center bg-background neo-border">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-neo-blue" />
                </div>
              ) : applicants.filter(app => app.status === "completed" || app.final_score != null).length === 0 ? (
                <div className="p-12 text-center bg-background neo-border font-bold text-muted-foreground">
                  No applicants have completed their interviews yet.
                </div>
              ) : (
                applicants
                  .filter((app) => app.status === "completed" || app.final_score != null)
                  .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
                  .map((app, i) => (
                    <div key={app.interview_id} className="bg-background neo-border-thick p-4 flex items-center justify-between neo-hover">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neo-yellow neo-border flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold">{app.candidate.full_name}</p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            ATS: {app.ats_score?.toFixed(0)}% • Interview: {app.interview_score?.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {app.is_shortlisted && (
                          <Badge className="bg-success text-success-foreground neo-border font-bold text-xs">Shortlisted</Badge>
                        )}
                        <span className="font-mono font-bold text-lg bg-muted px-2 py-0.5 neo-border">
                          {app.final_score?.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* Verification */}
        {activeSection === "verification" && (
          <div className="neo-border-thick neo-shadow-lg p-6">
            <h3 className="font-bold text-lg mb-4">Document Verification</h3>
            <p className="text-muted-foreground font-semibold">Verify candidate documents before sending offers.</p>
          </div>
        )}

        {/* Offer */}
        {activeSection === "offer" && (
          <div className="neo-border-thick neo-shadow-lg p-6 bg-background">
            <h3 className="font-bold text-lg mb-4">Send Offer Letters</h3>
            <p className="text-muted-foreground font-semibold mb-6">Select candidate to issue formal job offers</p>
            
            {loadingApplicants ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-neo-blue" />
              </div>
            ) : applicants.filter((app) => app.is_shortlisted).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground font-bold">
                No shortlisted candidates available to send offers.
              </div>
            ) : (
              <div className="space-y-3">
                {applicants.filter((app) => app.is_shortlisted).map((app) => (
                  <div key={app.interview_id} className="neo-border p-4 flex items-center justify-between neo-hover bg-background">
                    <div>
                      <span className="font-bold">{app.candidate.full_name}</span>
                      <span className="text-xs font-bold text-muted-foreground ml-3 uppercase">
                        Score: {app.final_score != null ? `${app.final_score.toFixed(0)}%` : "Incomplete"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedApplicant(app);
                        setShowOfferModal(true);
                      }}
                      className="px-4 py-2 bg-success text-success-foreground neo-border neo-shadow font-bold text-xs uppercase neo-hover flex items-center gap-2"
                    >
                      <Send className="w-3 h-3" /> Send Offer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offer Modal */}
        {showOfferModal && selectedApplicant && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background neo-border-thick neo-shadow-lg p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold font-mono mb-4">Send Offer Letter</h3>
              <p className="text-sm text-muted-foreground font-semibold mb-4">
                You are sending a job offer to <strong className="text-foreground">{selectedApplicant.candidate.full_name}</strong>.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Position</label>
                  <input className="w-full px-4 py-2 neo-border font-semibold" defaultValue={campaign?.title || "Position"} disabled />
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1 uppercase">Salary Range</label>
                  <input 
                    className="w-full px-4 py-2 neo-border font-semibold" 
                    defaultValue={
                      campaign?.salary_range_min && campaign?.salary_range_max
                        ? `$${campaign.salary_range_min.toLocaleString()} - $${campaign.salary_range_max.toLocaleString()}`
                        : "$120,000"
                    } 
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSendOffer}
                    className="flex-1 py-2 bg-success text-success-foreground neo-border neo-shadow font-bold uppercase neo-hover flex items-center justify-center gap-1"
                  >
                    <UserCheck className="w-4 h-4" /> Confirm
                  </button>
                  <button onClick={() => setShowOfferModal(false)} className="flex-1 py-2 bg-muted neo-border font-bold uppercase neo-hover">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignFlow;
