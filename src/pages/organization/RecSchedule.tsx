import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, User, Loader2 } from "lucide-react";
import { campaignApi } from "@/lib/campaign-api";
import { toast } from "sonner";

const RecSchedule = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const interviewId = searchParams.get("interviewId");
  const candidateName = searchParams.get("candidateName") || "";
  const campaignId = searchParams.get("campaignId");
  const candidateId = searchParams.get("candidateId");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!campaignId || !candidateId || !date || !time) {
      toast.error("Please pick a date and a time");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Combine date and time to ISO string
      const scheduledDateTime = new Date(`${date}T${time}`).toISOString();
      
      await campaignApi.updateApplicantStatus(campaignId, candidateId, {
        scheduled_at: scheduledDateTime,
        status: "pending",
      });
      
      toast.success(`Interview scheduled for ${candidateName}!`);
      navigate(`/organization/campaign/${campaignId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to schedule interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-16 bg-polka min-h-[80vh]">
      <div className="container mx-auto px-4 max-w-lg">
        <h1 className="text-4xl font-bold font-mono mb-2">Schedule Interview</h1>
        <p className="text-muted-foreground font-semibold mb-10">Pick a candidate and time slot</p>

        <div className="bg-background neo-border-thick neo-shadow-lg p-8 space-y-6">
          {/* Candidate */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              <User className="w-4 h-4 inline mr-1" /> Candidate
            </label>
            <input
              type="text"
              value={candidateName}
              disabled
              className="w-full px-4 py-3 neo-border bg-muted font-bold text-foreground cursor-not-allowed opacity-80"
              placeholder="No candidate selected"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              <Calendar className="w-4 h-4 inline mr-1" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 neo-border bg-background font-semibold"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              <Clock className="w-4 h-4 inline mr-1" /> Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 neo-border bg-background font-semibold"
            />
          </div>

          <button
            onClick={handleSchedule}
            disabled={isSubmitting}
            className="w-full py-3 bg-neo-purple text-neo-purple-foreground neo-border neo-shadow font-bold text-lg uppercase neo-hover flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            Schedule Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecSchedule;
