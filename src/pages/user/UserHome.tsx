import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Brain, Target, Shield, Briefcase, Clock, Loader2 } from "lucide-react";
import { campaignApi, Campaign } from "@/lib/campaign-api";
import { toast } from "sonner";

const features = [
  { icon: Brain, title: "AI-Powered Interviews", desc: "Smart questions adapted to your skills" },
  { icon: Target, title: "Precision Matching", desc: "Jobs that actually fit your profile" },
  { icon: Shield, title: "Bias-Free Hiring", desc: "Fair evaluation for everyone" },
  { icon: Zap, title: "Instant Feedback", desc: "Know where you stand immediately" },
];

const UserHome = () => {
  const [jobs, setJobs] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    campaignApi.listCampaignListings()
      .then(setJobs)
      .catch((err) => console.error("Failed to load jobs", err))
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async (campaignId: string) => {
    setApplyingId(campaignId);
    try {
      await campaignApi.applyToCampaign(campaignId);
      toast.success("Applied successfully! Let's start the interview.");
      navigate("/user/track");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to apply. You might have already applied.");
    } finally {
      setApplyingId(null);
    }
  };
  return (
    <div>
      {/* HERO - Grid BG */}
      <section className="bg-grid py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-bold font-mono mb-6 leading-tight"
          >
            Get Hired{" "}
            <span className="bg-neo-yellow px-2 inline-block neo-border neo-shadow">Smarter</span>
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-semibold text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            AI-driven interviews. Zero bias. Real feedback. Your next job is one click away.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/user/track"
              className="px-8 py-4 bg-primary text-primary-foreground neo-border-thick neo-shadow-lg font-bold text-lg uppercase tracking-wider neo-hover"
            >
              Browse Jobs →
            </Link>
            <Link
              to="/user/resume"
              className="px-8 py-4 bg-neo-blue text-neo-blue-foreground neo-border-thick neo-shadow-lg font-bold text-lg uppercase tracking-wider neo-hover"
            >
              Upload Resume
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FEATURES - Purple Polka */}
      <section className="bg-polka-purple py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-neo-purple-foreground text-black">
            Why IntervueX?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-background neo-border-thick neo-shadow-lg p-6 neo-hover ${
                  i % 4 === 0 ? 'card-border-blue' : i % 4 === 1 ? 'card-border-green' : i % 4 === 2 ? 'card-border-red' : 'card-border-pink'
                }`}
              >
                <f.icon className={`w-10 h-10 mb-4 ${
                  i % 4 === 0 ? 'text-blue' : i % 4 === 1 ? 'text-green' : i % 4 === 2 ? 'text-red' : 'text-pink'
                }`} />
                <h3 className={`font-bold text-lg mb-2 dark:text-white light:text-black ${
                  i % 4 === 0 ? 'dark:text-blue-400 light:text-blue-600' : i % 4 === 1 ? 'dark:text-green-400 light:text-green-600' : i % 4 === 2 ? 'dark:text-red-400 light:text-red-600' : 'dark:text-pink-400 light:text-pink-600'
                }`}>{f.title}</h3>
                <p className={`text-sm font-semibold dark:text-white light:text-black ${
                  i % 4 === 0 ? 'dark:text-blue-400 light:text-blue-600' : i % 4 === 1 ? 'dark:text-green-400 light:text-green-600' : i % 4 === 2 ? 'dark:text-red-400 light:text-red-600' : 'dark:text-pink-400 light:text-pink-600'
                }`}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* JOB LISTINGS */}
      <section className="bg-polka py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Open Positions
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-neo-blue" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="neo-border-thick p-8 text-center bg-background font-bold text-muted-foreground">
              No active job openings at the moment. Check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  whileHover={{ x: -2, y: -2 }}
                  className={`bg-card neo-border neo-shadow p-6 ${
                    index % 3 === 0 ? 'card-border-blue' : index % 3 === 1 ? 'card-border-purple' : 'card-border-yellow'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className={`font-bold text-lg ${
                      index % 3 === 0 ? 'text-blue' : index % 3 === 1 ? 'text-purple' : 'text-orange'
                    }`}>{job.title}</h3>
                    <span className={`px-2 py-0.5 neo-border text-xs font-bold dark:text-black light:text-black-on-light ${
                      job.is_remote ? 'bg-success' : 'bg-pink-500'
                    }`}>
                      {job.is_remote ? 'Remote' : 'On-site'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4" />
                    <span className={`font-semibold text-sm dark:text-white light:text-black ${
                      index % 3 === 0 ? 'dark:text-blue-400 light:text-blue-600' : index % 3 === 1 ? 'dark:text-purple-400 light:text-purple-600' : 'dark:text-orange-400 light:text-orange-600'
                    }`}>Campaign Role</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className={`font-semibold text-sm dark:text-white light:text-black ${
                      index % 3 === 0 ? 'dark:text-blue-400 light:text-blue-600' : index % 3 === 1 ? 'dark:text-purple-400 light:text-purple-600' : 'dark:text-orange-400 light:text-orange-600'
                    }`}>
                      {job.salary_range_min && job.salary_range_max
                        ? `$${(job.salary_range_min / 1000).toFixed(0)}k-$${(job.salary_range_max / 1000).toFixed(0)}k`
                        : 'Salary Undisclosed'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={applyingId === job.id}
                    className="w-full text-center py-2 bg-primary text-primary-foreground neo-border font-bold text-sm uppercase neo-hover flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {applyingId === job.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    Apply Now
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RECENT OPENINGS - Grid */}
      <section className="bg-grid py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Recent Openings</h2>
          <div className="max-w-3xl mx-auto space-y-3">
            {jobs.slice(0, 4).map((job, index) => (
              <div key={job.id} className={`bg-background neo-border neo-shadow p-4 flex items-center justify-between neo-hover ${
                index % 4 === 0 ? 'card-border-blue' : index % 4 === 1 ? 'card-border-green' : index % 4 === 2 ? 'card-border-purple' : 'card-border-yellow'
              }`}>
                <div>
                  <span className="font-bold">{job.title}</span>
                  <span className="text-muted-foreground font-semibold text-sm ml-2">— {job.location || 'Remote'}</span>
                </div>
                <span className="px-3 py-1 bg-success text-success-foreground neo-border text-xs font-bold">
                  NEW
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserHome;
