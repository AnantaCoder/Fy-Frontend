import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, LogOut, User, Menu } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MobileSidebar } from "./MobileSidebar";

const navLinks: Record<string, { label: string; path: string }[]> = {
  user: [
    { label: "Home", path: "/user" },
    { label: "Jobs", path: "/user/jobs" },
    { label: "Resume", path: "/user/resume" },
    { label: "Track", path: "/user/track" },
    { label: "Profile", path: "/user/profile" },
  ],
  admin: [
    { label: "Dashboard", path: "/admin" },
    { label: "Users", path: "/admin/users" },
    { label: "Organizations", path: "/admin/organizations" },
  ],
  organization: [
    { label: "Home", path: "/organization" },
    { label: "Dashboard", path: "/organization/dashboard" },
    { label: "Org Panel", path: "/organization/rec" },
  ],
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const links = navLinks[user.role] || [];

  return (
    <nav className="sticky top-0 z-50 bg-background neo-border border-t-0 border-x-0 border-b-[3px]">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to={`/${user.role === "user" ? "user" : user.role}`} className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight font-mono">
            Intervue<span className="bg-neo-yellow px-1">X</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 font-semibold text-sm transition-all neo-hover ${
                  isActive
                    ? "bg-neo-yellow text-neo-yellow-foreground neo-border neo-shadow"
                    : "hover:underline underline-offset-4 decoration-[3px]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden w-9 h-9 neo-border neo-shadow neo-hover bg-background flex items-center justify-center"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Desktop user info and controls */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Link to={`/${user.role}/profile`} className="w-8 h-8 neo-border neo-shadow bg-neo-blue flex items-center justify-center neo-hover cursor-pointer">
                <User className="w-4 h-4 text-neo-blue-foreground" />
              </Link>
              <Badge className="neo-border bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider">
                {user.role}
              </Badge>
            </div>

            <button
              onClick={toggle}
              className="w-9 h-9 neo-border neo-shadow neo-hover bg-background flex items-center justify-center"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              className="w-9 h-9 neo-border neo-shadow neo-hover bg-destructive flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 text-destructive-foreground" />
            </button>
          </div>

          {/* Mobile theme toggle */}
          <button
            onClick={toggle}
            className="md:hidden w-9 h-9 neo-border neo-shadow neo-hover bg-background flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </nav>
  );
};
