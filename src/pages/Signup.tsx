import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const roles: { value: UserRole; label: string; color: string }[] = [
  { value: "user", label: "Job Seeker", color: "bg-neo-blue" },
  { value: "admin", label: "Admin", color: "bg-neo-yellow" },
  { value: "recruiter", label: "Recruiter", color: "bg-neo-purple" },
];

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [localError, setLocalError] = useState<string | null>(null);

  const { signup, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    try {
      await signup(email, password, name, role);
      const paths: Record<UserRole, string> = {
        user: "/user",
        admin: "/admin",
        recruiter: "/recruiter",
      };
      navigate(paths[role]);
    } catch {
      // Error is stored in Redux state and displayed via `error`
    }
  };

  const displayError = localError ?? error;

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 sm:p-6 md:p-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-background neo-border-thick neo-shadow-lg p-6 sm:p-8 md:p-10"
      >
        <Link to="/" className="block text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono mb-2">
            Intervue<span className="bg-neo-yellow px-1">X</span>
          </h1>
        </Link>
        <p className="text-center font-semibold text-muted-foreground mb-6 sm:mb-8 md:mb-10">
          Create your account
        </p>

        {/* Error banner */}
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-4 py-3 neo-border bg-red-50 text-red-700 text-sm font-semibold"
          >
            {displayError}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              I am a
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  disabled={isLoading}
                  className={`py-2 px-2 sm:px-3 md:px-4 neo-border text-xs sm:text-sm md:text-base font-bold transition-all neo-hover ${
                    role === r.value
                      ? `${r.color} neo-shadow`
                      : "bg-background"
                  } ${role === r.value && r.value !== "admin" ? "text-primary-foreground" : ""}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              disabled={isLoading}
              className="w-full px-3 sm:px-4 md:px-5 py-3 neo-border bg-background font-semibold placeholder:text-muted-foreground focus:outline-none focus:neo-shadow transition-shadow text-sm sm:text-base md:text-lg disabled:opacity-60"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={isLoading}
              className="w-full px-3 sm:px-4 md:px-5 py-3 neo-border bg-background font-semibold placeholder:text-muted-foreground focus:outline-none focus:neo-shadow transition-shadow text-sm sm:text-base md:text-lg disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              disabled={isLoading}
              className="w-full px-3 sm:px-4 md:px-5 py-3 neo-border bg-background font-semibold placeholder:text-muted-foreground focus:outline-none focus:neo-shadow transition-shadow text-sm sm:text-base md:text-lg disabled:opacity-60"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block font-bold text-sm mb-2 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full px-3 sm:px-4 md:px-5 py-3 neo-border bg-background font-semibold placeholder:text-muted-foreground focus:outline-none focus:neo-shadow transition-shadow text-sm sm:text-base md:text-lg disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-neo-purple text-neo-purple-foreground neo-border neo-shadow font-bold text-base sm:text-lg md:text-xl uppercase tracking-wider neo-hover flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create Account →"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm md:text-base font-semibold text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="underline underline-offset-4 font-bold text-foreground">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
