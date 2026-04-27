import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppDispatch } from "@/store/hooks";
import { updateProfile } from "@/store/authSlice";
import { Mail, MapPin, Calendar, Edit2, Check, X, Phone, Briefcase, Clock } from "lucide-react";
import { toast } from "sonner";

const timeline = [
  { date: "Mar 28", event: "Applied to Senior React Developer", status: "Interview" },
  { date: "Mar 25", event: "Applied to Product Designer", status: "Applied" },
  { date: "Mar 20", event: "Received offer from DataFlow", status: "Offered" },
  { date: "Mar 15", event: "Rejected by CloudBase", status: "Rejected" },
];

const statusDot: Record<string, string> = {
  Interview: "bg-neo-yellow",
  Applied: "bg-neo-blue",
  Offered: "bg-success",
  Rejected: "bg-destructive",
};

const UserProfile = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    address: "",
    phone_number: "",
    job_role: "",
    year_of_experience: 0,
    skills: "",
  });

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.name || "",
        address: user.address || "",
        phone_number: user.phoneNumber || "",
        job_role: user.jobRole || "",
        year_of_experience: user.yearOfExperience || 0,
        skills: user.skills ? user.skills.join(", ") : "",
      });
    }
  }, [user, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    const skillsArray = formData.skills
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      const resultAction = await dispatch(updateProfile({
        full_name: formData.full_name,
        address: formData.address,
        phone_number: formData.phone_number,
        job_role: formData.job_role,
        year_of_experience: formData.year_of_experience,
        skills: skillsArray,
      }));

      if (updateProfile.fulfilled.match(resultAction)) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-16 bg-polka min-h-[80vh]">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className={`bg-background neo-border-thick neo-shadow-lg p-8 mb-8 card-border-blue relative`}>
          
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              disabled={isSaving}
              className="absolute top-4 right-4 p-2 bg-neo-yellow neo-border neo-hover flex items-center gap-2 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          ) : (
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 bg-success text-success-foreground neo-border neo-hover flex items-center gap-2 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="p-2 bg-neo-pink text-black dark:text-white neo-border neo-hover flex items-center gap-2 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start gap-6 mt-4">
            <div className="w-20 h-20 bg-neo-purple neo-border-thick flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-neo-purple-foreground">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            
            <div className="flex-1 w-full">
              {!isEditing ? (
                <>
                  <h1 className="text-3xl font-bold font-mono">{user?.name || "User"}</h1>
                  <h2 className="text-lg font-bold text-neo-blue mt-1 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {user?.jobRole || "No role specified"}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm font-semibold text-muted-foreground">
                    <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{user?.email}</span>
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{user?.address || "No address"}</span>
                    <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{user?.phoneNumber || "No phone"}</span>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{user?.yearOfExperience === 0 ? "Fresher" : `${user?.yearOfExperience || 0} years experience`}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {user?.skills && user.skills.length > 0 ? (
                      user.skills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-neo-yellow neo-border text-xs font-bold">{skill}</span>
                      ))
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">No skills added yet</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="w-full p-2 neo-border bg-background focus:outline-none focus:neo-shadow transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Job Role</label>
                      <input 
                        type="text" 
                        value={formData.job_role}
                        onChange={e => setFormData({...formData, job_role: e.target.value})}
                        className="w-full p-2 neo-border bg-background focus:outline-none focus:neo-shadow transition-all"
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Years of Exp</label>
                      <input 
                        type="number" 
                        value={formData.year_of_experience}
                        onChange={e => setFormData({...formData, year_of_experience: parseInt(e.target.value) || 0})}
                        className="w-full p-2 neo-border bg-background focus:outline-none focus:neo-shadow transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        value={formData.phone_number}
                        onChange={e => setFormData({...formData, phone_number: e.target.value})}
                        className="w-full p-2 neo-border bg-background focus:outline-none focus:neo-shadow transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Address</label>
                      <input 
                        type="text" 
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="w-full p-2 neo-border bg-background focus:outline-none focus:neo-shadow transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Skills (comma separated)</label>
                    <input 
                      type="text" 
                      value={formData.skills}
                      onChange={e => setFormData({...formData, skills: e.target.value})}
                      className="w-full p-2 neo-border bg-background focus:outline-none focus:neo-shadow transition-all"
                      placeholder="React, TypeScript, Python"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Application Timeline</h2>
        <div className="space-y-0">
          {timeline.map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 neo-border ${statusDot[item.status]}`} />
                {i < timeline.length - 1 && <div className="w-[3px] h-16 bg-border" />}
              </div>
              <div className={`bg-background neo-border neo-shadow p-4 flex-1 mb-4 ${
                i % 4 === 0 ? 'card-border-blue' : i % 4 === 1 ? 'card-border-green' : i % 4 === 2 ? 'card-border-purple' : 'card-border-yellow'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">{item.date}</span>
                </div>
                <p className="font-bold text-sm">{item.event}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
