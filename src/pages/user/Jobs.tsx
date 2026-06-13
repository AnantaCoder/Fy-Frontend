import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Clock, Search, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { campaignApi, Campaign } from "@/lib/campaign-api";
import interviewApi, { type InterviewData } from "@/lib/interview-api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const Jobs = () => {
  const [jobs, setJobs] = useState<Campaign[]>([]);
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [skillsFilter, setSkillsFilter] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      campaignApi.listCampaignListings().catch(() => []),
      interviewApi.listInterviews().catch(() => []),
    ])
      .then(([jobsData, interviewsData]) => {
        setJobs(jobsData);
        setInterviews(interviewsData);
      })
      .catch((err) => {
        console.error("Failed to load jobs list", err);
        toast.error("Failed to load available jobs");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async (campaignId: string) => {
    setApplyingId(campaignId);
    try {
      await campaignApi.applyToCampaign(campaignId);
      toast.success("Applied successfully! Let's take the interview.");
      
      // Refresh interviews to show "Applied" state
      const updatedInterviews = await interviewApi.listInterviews().catch(() => []);
      setInterviews(updatedInterviews);
      
      // Delay navigation slightly so they see the state change
      setTimeout(() => {
        navigate("/user/track");
      }, 800);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to apply. Check your profile and try again.");
    } finally {
      setApplyingId(null);
    }
  };

  const hasApplied = (jobId: string) => {
    return interviews.some((i) => i.job_role_id === jobId);
  };

  // Filter listings
  const filteredJobs = jobs.filter((job) => {
    const matchesTitle = job.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = (job.organization_name || "Company").toLowerCase().includes(companySearch.toLowerCase());
    const matchesSkills = skillsFilter
      ? job.required_skills.some((s) => s.toLowerCase().includes(skillsFilter.toLowerCase()))
      : true;

    return matchesTitle && matchesCompany && matchesSkills;
  });

  return (
    <div className="py-16 bg-polka min-h-[85vh]">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold font-mono mb-2">Available Positions</h1>
        <p className="text-muted-foreground font-semibold mb-10">
          Explore campaign job roles and start your automated AI interview
        </p>

        {/* Filter Section */}
        <div className="bg-background neo-border-thick neo-shadow-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 neo-border bg-background font-semibold text-sm focus:outline-none focus:neo-shadow transition-all"
            />
          </div>
          <div className="relative">
            <Briefcase className="w-5 h-5 text-muted-foreground absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search company..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 neo-border bg-background font-semibold text-sm focus:outline-none focus:neo-shadow transition-all"
            />
          </div>
          <div className="relative">
            <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Filter by skill (e.g. React)..."
              value={skillsFilter}
              onChange={(e) => setSkillsFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 neo-border bg-background font-semibold text-sm focus:outline-none focus:neo-shadow transition-all"
            />
          </div>
        </div>

        {/* Openings Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-neo-blue mx-auto mb-4" />
            <p className="font-bold text-muted-foreground font-mono">Fetching Available Openings...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-background neo-border-thick neo-shadow p-12 text-center text-muted-foreground font-bold flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-muted-foreground/50" />
            <span>No matching jobs found. Try adjusting your search filters!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job, index) => {
              const alreadyApplied = hasApplied(job.id);
              
              return (
                <motion.div
                  key={job.id}
                  whileHover={{ x: -2, y: -2 }}
                  className={`bg-background neo-border-thick neo-shadow p-6 flex flex-col justify-between ${
                    index % 4 === 0 ? "card-border-blue" :
                    index % 4 === 1 ? "card-border-green" :
                    index % 4 === 2 ? "card-border-purple" : "card-border-yellow"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-xl font-bold font-mono">{job.title}</h3>
                        <p className="font-bold text-neo-blue mt-1">
                          {job.organization_name || "Company"}
                        </p>
                      </div>
                      <Badge className={`neo-border font-bold text-xs uppercase ${
                        job.is_remote ? "bg-success text-success-foreground" : "bg-neo-pink text-black"
                      }`}>
                        {job.is_remote ? "Remote" : "On-site"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Experience: {job.min_experience_years}+ years
                      </span>
                    </div>

                    {job.description && (
                      <p className="text-sm font-semibold text-muted-foreground/80 line-clamp-3">
                        {job.description}
                      </p>
                    )}

                    {/* Required Skills */}
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {job.required_skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-muted neo-border text-xs font-bold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-mono font-bold text-sm">
                      {job.salary_range_min && job.salary_range_max
                        ? `$${(job.salary_range_min / 1000).toFixed(0)}k - $${(job.salary_range_max / 1000).toFixed(0)}k`
                        : "Salary Undisclosed"}
                    </span>
                    
                    {alreadyApplied ? (
                      <Link
                        to="/user/track"
                        className="px-4 py-2 bg-success text-success-foreground neo-border neo-shadow font-bold text-xs uppercase neo-hover flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Applied <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleApply(job.id)}
                        disabled={applyingId === job.id}
                        className="px-4 py-2 bg-primary text-primary-foreground neo-border neo-shadow font-bold text-xs uppercase neo-hover flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {applyingId === job.id && <Loader2 className="w-4 h-4 animate-spin" />}
                        Apply Now
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Jobs;
