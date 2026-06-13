import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { X, Home, Users, BarChart3, FileText, User, Briefcase } from "lucide-react";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links = [
    { label: "Home", path: `/${user.role === "user" ? "user" : user.role}`, icon: Home },
    ...(user.role === "user"
      ? [
          { label: "Jobs", path: "/user/jobs", icon: Briefcase },
          { label: "Resume", path: "/user/resume", icon: FileText },
          { label: "Track", path: "/user/track", icon: BarChart3 },
          { label: "Profile", path: "/user/profile", icon: User },
        ]
      : user.role === "admin"
      ? [
          { label: "Dashboard", path: "/admin", icon: Home },
          { label: "Users", path: "/admin/users", icon: Users },
          { label: "Organizations", path: "/admin/organizations", icon: Users },
        ]
      : [
          { label: "Dashboard", path: "/organization/dashboard", icon: BarChart3 },
          { label: "Org Panel", path: "/organization/rec", icon: Users },
        ]),
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-72 bg-background neo-border-r border-r-[4px] border-border z-50 md:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-[3px] border-border">
            <Link to={`/${user.role === "user" ? "user" : user.role}`} onClick={onClose}>
              <span className="text-xl font-bold tracking-tight font-mono">
                Intervue<span className="bg-neo-yellow px-1">X</span>
              </span>
            </Link>
            <button
              onClick={onClose}
              className="w-8 h-8 neo-border neo-shadow neo-hover bg-background flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                const Icon = link.icon;
                
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 font-semibold transition-all neo-hover rounded ${
                      isActive
                        ? "bg-neo-yellow text-neo-yellow-foreground neo-border neo-shadow"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t-[3px] border-border">
            <div className="flex items-center gap-3 mb-4">
              <Link to={`/${user.role}/profile`} onClick={onClose} className="w-10 h-10 neo-border neo-shadow bg-neo-blue flex items-center justify-center neo-hover">
                <User className="w-5 h-5 text-neo-blue-foreground" />
              </Link>
              <div>
                <p className="font-bold text-sm">{user.email}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full py-2 bg-destructive text-destructive-foreground neo-border neo-shadow font-bold uppercase neo-hover"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
