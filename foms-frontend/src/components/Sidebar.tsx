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
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", fontFamily: "var(--fh)" }}>
              {logoText}
            </span>
          )}
        </div>
        <button
          className="sb-toggle-btn"
          onClick={toggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={collapsed ? "ti ti-chevron-right" : "ti ti-chevron-left"} />
        </button>
      </div>

      {/* Role Badge */}
      {!collapsed && user && (
        <div style={{ padding: '0 24px', marginBottom: '24px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            padding: '8px 12px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            {ROLE_LABELS[user.role] || user.role}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.label && <span className="nav-module-label">{group.label}</span>}
            {group.items.map((item, itemIndex) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <div key={itemIndex} className="nav-item-container">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.children) {
                        toggleExpand(item.label);
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`nav-item ${isActive ? "active" : ""}`}
                  >
                    {item.icon && (
                      <span className="nav-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <i className={item.icon} style={{ fontSize: "18px" }}></i>
                      </span>
                    )}
                    <span className="nav-label">{item.label}</span>
                    {item.children && !collapsed && (
                      <i className={`ti ti-chevron-${expandedItems[item.label] ? 'down' : 'right'}`} style={{ marginLeft: 'auto', fontSize: '14px', opacity: 0.7 }} />
                    )}
                  </a>
                  
                  {item.children && expandedItems[item.label] && !collapsed && (
                    <div className="nav-children" style={{ display: 'flex', flexDirection: 'column', marginLeft: '42px', marginTop: '4px', gap: '4px' }}>
                      {item.children.map((child, childIndex) => {
                        const isChildActive = location.pathname + location.search === child.path;
                        return (
                          <a
                            key={childIndex}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const [pathname, search] = child.path.split('?');
                              navigate({ pathname, search: search ? `?${search}` : '' });
                            }}
                            className={`nav-child-item ${isChildActive ? "active" : ""}`}
                            style={{ 
                              padding: '8px 12px', 
                              borderRadius: '8px', 
                              fontSize: '0.85rem', 
                              color: isChildActive ? '#fff' : '#94A3B8',
                              background: isChildActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                              textDecoration: 'none',
                              display: 'block'
                            }}
                          >
                            {child.label}
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

      {/* Profile Card */}
      {user && (
        <div className="sidebar-footer" ref={profileMenuRef} style={{ position: 'relative' }}>
          
          {isProfileMenuOpen && !collapsed && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '16px',
              right: '16px',
              background: '#fff',
              borderRadius: '12px',
              padding: '16px 0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 100
            }}>
              <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid #E2E8F0', marginBottom: '8px' }}>
                <div style={{ fontWeight: 700, color: '#1B254B', fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fullName}</div>
                <div style={{ color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ROLE_LABELS[user.role]}</div>
              </div>
              
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1B254B', fontSize: '14px', fontWeight: 600, textAlign: 'left' }} onClick={() => { navigate('/profile'); setIsProfileMenuOpen(false); }}>
                <i className="ti ti-user" style={{ fontSize: '18px', color: '#64748B' }}></i> My Profile
              </button>
              
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1B254B', fontSize: '14px', fontWeight: 600, textAlign: 'left' }}>
                <i className="ti ti-settings" style={{ fontSize: '18px', color: '#64748B' }}></i> System Settings
              </button>
              
              <div style={{ height: '1px', background: '#E2E8F0', margin: '8px 0' }}></div>
              
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '14px', fontWeight: 600, textAlign: 'left' }} onClick={() => { logout(); setIsProfileMenuOpen(false); }}>
                <i className="ti ti-logout" style={{ fontSize: '18px' }}></i> Log Out
              </button>
            </div>
          )}

          <div 
            className="profile-card" 
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <div className="profile-av">{user.avatarInitials}</div>
              {!collapsed && (
                <div className="profile-info" style={{ overflow: 'hidden' }}>
                  <span className="profile-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.fullName}</span>
                  <span className="profile-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ROLE_LABELS[user.role]}</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <i className="ti ti-chevron-up" style={{ color: '#94A3B8', fontSize: '14px', flexShrink: 0 }}></i>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
