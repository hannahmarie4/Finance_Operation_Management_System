import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NAV_CONFIG, ROLE_LABELS } from "../data/seed";
import type { UserRole } from "../types/auth";

export interface SidebarProps {
  logoUrl?: string;
  logoText?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  logoUrl = "/logo.png",
  logoText = "SPEEDEX",
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine which nav groups to show based on role
  const navGroups = user && NAV_CONFIG[user.role] ? NAV_CONFIG[user.role].groups : [];

  // Persist collapse preference
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    Shipments: true,
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo Header */}
      <div className="sidebar-logo">
        <div className="logo-img-wrapper">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="sidebar-logo-img" />
          ) : (
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", fontFamily: "var(--fh, 'Montserrat', sans-serif)" }}>
              {logoText}
            </span>
          )}
        </div>
        <button
          className="sb-toggle-btn"
          onClick={toggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={collapsed ? "ti ti-chevron-right" : "ti ti-chevron-left"} />
        </button>
      </div>

      {/* Role Badge */}
      {!collapsed && user && (
        <div className="sidebar-role-container">
          <div className="sidebar-role-pill">
            <span className="sidebar-role-dot" />
            <span>{ROLE_LABELS[user.role] || user.role}</span>
          </div>
        </div>
      )}

      {/* Navigation Links (DMS-Inspired) */}
      <nav className="sidebar-nav">
        {navGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.label && <span className="nav-module-label">{group.label}</span>}
            {group.items.map((item, itemIndex) => {
              const isChildActive = (childPath: string) => {
                const [pathname, search] = childPath.split('?');
                return location.pathname === pathname && (!search || location.search === `?${search}`);
              };
              const hasActiveChild = item.children?.some(c => isChildActive(c.path));
              const isActive = hasActiveChild ||
                location.pathname === item.path ||
                (item.path !== '/' && item.path !== '/dashboard' && location.pathname.startsWith(item.path)) ||
                (item.path === '/dashboard' && (location.pathname === '/dashboard' || location.pathname === '/'));

              const isExpanded = expandedItems[item.label] ?? false;

              return (
                <div key={itemIndex} className="nav-item-container">
                  <a
                    href="#"
                    title={collapsed ? item.label : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.children) {
                        if (collapsed) {
                          setCollapsed(false);
                          setExpandedItems((prev) => ({ ...prev, [item.label]: true }));
                        } else {
                          toggleExpand(item.label);
                        }
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {/* DMS Signature Left Active Indicator Bar */}
                    {isActive && <span className="nav-active-pill" aria-hidden="true" />}

                    {item.icon && (
                      <span className="nav-icon">
                        <i className={item.icon}></i>
                      </span>
                    )}

                    <span className="nav-label">{item.label}</span>

                    {item.badge && !collapsed && (
                      <span
                        className="nav-item-badge"
                        style={{
                          background: item.badge.bg,
                          color: item.badge.color,
                        }}
                      >
                        {item.badge.text}
                      </span>
                    )}

                    {item.children && !collapsed && (
                      <i
                        className="ti ti-chevron-down nav-chevron-icon"
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    )}
                  </a>

                  {/* DMS-Inspired Inset Submenu Panel */}
                  {item.children && isExpanded && !collapsed && (
                    <div className="nav-children-panel">
                      {item.children.map((child, childIndex) => {
                        const childActive = isChildActive(child.path);
                        return (
                          <a
                            key={childIndex}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const [pathname, search] = child.path.split('?');
                              navigate({ pathname, search: search ? `?${search}` : '' });
                            }}
                            className={`nav-child-link ${childActive ? "active" : ""}`}
                          >
                            <span>{child.label}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </nav>

      {/* User Profile Card & Elevated Popover (DMS Inspired) */}
      {user && (
        <div className="sidebar-footer" ref={profileMenuRef}>
          {isProfileMenuOpen && (
            <div className={`sidebar-profile-dropdown ${collapsed ? "collapsed" : ""}`}>
              <div className="dropdown-identity">
                <span className="dropdown-name">{user.fullName}</span>
                <span className="dropdown-role">{ROLE_LABELS[user.role] || user.role}</span>
              </div>

              <button
                className="dropdown-option"
                onClick={() => {
                  navigate('/profile');
                  setIsProfileMenuOpen(false);
                }}
              >
                <i className="ti ti-user" />
                <span>My Profile</span>
              </button>

              <button
                className="dropdown-option"
                onClick={() => {
                  navigate('/settings');
                  setIsProfileMenuOpen(false);
                }}
              >
                <i className="ti ti-settings" />
                <span>System Settings</span>
              </button>

              <div className="dropdown-divider" />

              <button
                className="dropdown-option logout"
                onClick={() => {
                  logout();
                  setIsProfileMenuOpen(false);
                }}
              >
                <i className="ti ti-logout" />
                <span>Log Out</span>
              </button>
            </div>
          )}

          <div
            className="profile-card"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            title={collapsed ? `${user.fullName} (${ROLE_LABELS[user.role] || user.role})` : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <div className="profile-av">{user.avatarInitials}</div>
              {!collapsed && (
                <div className="profile-info">
                  <span className="profile-name">{user.fullName}</span>
                  <span className="profile-role">{ROLE_LABELS[user.role] || user.role}</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <i className="ti ti-selector profile-selector-icon" />
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
