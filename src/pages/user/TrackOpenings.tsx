import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, BarChart3, ExternalLink } from "lucide-react";
import interviewApi, { type CandidateApplication } from "@/lib/interview-api";

const statusColors: Record<string, string> = {
  pending: "bg-neo-yellow text-neo-yellow-foreground",
  in_progress: "bg-neo-blue text-neo-blue-foreground",
  completed: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TrackOpenings = () => {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    interviewApi
      .getApplications()
      .then((data) => {
        setApplications(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.detail ||
            "Failed to load applications. Please try again."
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-32 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-mono mb-2">Track Applications</h1>
          <p className="text-destructive font-semibold mt-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold font-mono mb-2">Track Applications</h1>
        <p className="text-muted-foreground font-semibold mb-10">
          Monitor your job applications and interview status
        </p>

        {applications.length === 0 ? (
          <div className="neo-border-thick neo-shadow-lg p-12 text-center bg-background">
            <p className="text-xl font-bold mb-2">No Applications Yet</p>
            <p className="text-muted-foreground font-semibold mb-6">
              Browse open positions and apply to get started.
            </p>
            <Link
              to="/user"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground neo-border neo-shadow font-bold uppercase neo-hover"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app, index) => (
              <motion.div
                key={app.interview_id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-background neo-border-thick neo-shadow p-5 neo-hover ${
                  index % 4 === 0
                    ? "card-border-blue"
                    : index % 4 === 1
                    ? "card-border-green"
                    : index % 4 === 2
                    ? "card-border-purple"
                    : "card-border-yellow"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{app.campaign_title}</h3>
                    <p className="text-sm text-muted-foreground font-semibold">
                      {app.organization_name ?? "—"}
                      {app.applied_at && (
                        <span className="ml-2">
                          • Applied{" "}
                          {new Date(app.applied_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Scores (if available) */}
                  <div className="flex items-center gap-3">
                    {app.ats_score != null && (
                      <div className="text-center px-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground">
                          ATS
                        </p>
                        <p className="text-lg font-bold font-mono">
                          {app.ats_score.toFixed(0)}
                        </p>
                      </div>
                    )}
                    {app.final_score != null && (
                      <div className="text-center px-3">
                        <p className="text-xs font-bold uppercase text-muted-foreground">
                          Final
                        </p>
                        <p className="text-lg font-bold font-mono">
                          {app.final_score.toFixed(0)}
                        </p>
                      </div>
                    )}
                    {app.is_shortlisted && (
                      <Badge className="neo-border font-bold bg-success text-success-foreground">
                        ★ Shortlisted
                      </Badge>
                    )}
                  </div>

                  {/* Status + Action */}
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`neo-border font-bold ${
                        statusColors[app.status] ?? "bg-muted"
                      }`}
                    >
                      {statusLabels[app.status] ?? app.status}
                    </Badge>

                    {app.status === "pending" && (
                      <Link
                        to={`/user/interview/${app.interview_id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-success text-success-foreground neo-border font-bold text-xs uppercase neo-hover"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </Link>
                    )}
                    {app.status === "in_progress" && (
                      <Link
                        to={`/user/interview/${app.interview_id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-neo-blue text-neo-blue-foreground neo-border font-bold text-xs uppercase neo-hover"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Resume
                      </Link>
                    )}
                    {app.status === "completed" && (
                      <Link
                        to={`/user/interview/${app.interview_id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-neo-purple text-neo-purple-foreground neo-border font-bold text-xs uppercase neo-hover"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Results
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOpenings;
