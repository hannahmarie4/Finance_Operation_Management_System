import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Settings, 
  LogOut,
  User,
  ChevronRight,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAV_CONFIG, ROLE_LABELS } from '../data/seed';
import './GlobalHeader.css';
import { Button } from './Buttons';

import { useNotifications, NotificationItem } from '../context/NotificationContext';

export interface GlobalHeaderProps {}

const GlobalHeader: React.FC<GlobalHeaderProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead, toggleReadStatus, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [bellAnimating, setBellAnimating] = useState(false);

  const formattedDateTime = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Auto-close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications
  const roleRelevantNotifications = notifications;


  // Apply read/unread tabs
  const filtered = useMemo(() => {
    let result = roleRelevantNotifications;
    
    // Read/Unread tab filter
    if (filter === 'unread') {
      result = result.filter(n => !n.read);
    }
    
    return result;
  }, [roleRelevantNotifications, filter]);

  // Priority severity sorting: unread critical alerts first
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aCriticalUnread = a.type === 'alert' && !a.read ? 1 : 0;
      const bCriticalUnread = b.type === 'alert' && !b.read ? 1 : 0;
      return bCriticalUnread - aCriticalUnread; // sorts unread criticals first
    });
  }, [filtered]);

  const handleToggleRead = (n: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!n.read) {
      toggleReadStatus(n.id);
    }
    if (n.link) {
      navigate(n.link);
      setShowNotifications(false);
    }
  };

  // Group sorted notifications into Today vs Earlier
  const todayNotifications = useMemo(() => sortedFiltered.filter(n => n.isToday), [sortedFiltered]);
  const earlierNotifications = useMemo(() => sortedFiltered.filter(n => !n.isToday), [sortedFiltered]);

  // Derive title and subtitle from active route
  const currentTitleInfo = useMemo(() => {
    if (location.pathname.startsWith('/profile')) return { title: 'My Profile', subtitle: 'Settings' };
    if (!user) return { title: 'Dashboard', subtitle: 'Application' };
    const userGroups = NAV_CONFIG[user.role]?.groups || [];
    for (const group of userGroups) {
      for (const item of group.items) {
        if (location.pathname.startsWith(item.path)) {
          return { title: item.label, subtitle: group.label };
        }
      }
    }
    
    // Fallbacks for routes not in the sidebar navigation
    if (location.pathname.startsWith('/invoice-create')) return { title: 'Create Invoice', subtitle: 'Invoicing' };
    
    return { title: 'Dashboard', subtitle: 'Overview' };
  }, [location.pathname, user]);

  const { title: currentTitle, subtitle: currentSubtitle } = currentTitleInfo;

  // Derive profile display info
  const profileName = user?.fullName || 'Guest User';
  const profileRole = user ? ROLE_LABELS[user.role] : 'Unauthenticated';
  const profileInitials = profileName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Helper to determine parent path fallback for detail views
  const getParentFallbackPath = (pathname: string): string => {
    const clean = pathname.replace(/\/+$/, '') || '/';
    const segments = clean.split('/').filter(Boolean);
    if (segments.length > 1) {
      return '/' + segments.slice(0, -1).join('/');
    }
    return '/dashboard';
  };

  // Exact route matching against sidebar routes:
  // Pages directly listed in the FOMS sidebar must NOT show a back button in the Global Header.
  // Show the back button only on pages or detail views NOT directly listed in the sidebar.
  const isSidebarRoute = useMemo(() => {
    const cleanPath = location.pathname.replace(/\/+$/, '') || '/';
    if (cleanPath === '/' || cleanPath === '/dashboard') return true;

    // Check against active user's sidebar routes
    if (user && NAV_CONFIG[user.role]) {
      for (const group of NAV_CONFIG[user.role].groups) {
        for (const item of group.items) {
          const itemClean = item.path.replace(/\/+$/, '') || '/';
          if (itemClean === cleanPath) return true;
          if (item.children) {
            for (const child of item.children) {
              const childClean = child.path.replace(/\/+$/, '') || '/';
              if (childClean === cleanPath) return true;
            }
          }
        }
      }
    }

    // Also check against all sidebar routes defined in NAV_CONFIG
    for (const roleConfig of Object.values(NAV_CONFIG)) {
      for (const group of roleConfig.groups) {
        for (const item of group.items) {
          const itemClean = item.path.replace(/\/+$/, '') || '/';
          if (itemClean === cleanPath) return true;
          if (item.children) {
            for (const child of item.children) {
              const childClean = child.path.replace(/\/+$/, '') || '/';
              if (childClean === cleanPath) return true;
            }
          }
        }
      }
    }

    return false;
  }, [location.pathname, user]);

  const showBackButton = !isSidebarRoute;

  // Track in-app navigation history safely to prevent exiting the application
  const currentFullPath = location.pathname + location.search;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('foms_in_app_history');
      let stack: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stack)) stack = [];

      const lastPath = stack[stack.length - 1];
      const secondLastPath = stack[stack.length - 2];

      if (secondLastPath && secondLastPath === currentFullPath) {
        // User navigated back via browser or in-app control
        stack.pop();
      } else if (lastPath !== currentFullPath) {
        // Record new route, filtering out auth transitions
        if (!currentFullPath.startsWith('/login') && !currentFullPath.startsWith('/logout')) {
          stack.push(currentFullPath);
          if (stack.length > 30) stack.shift();
        }
      }

      sessionStorage.setItem('foms_in_app_history', JSON.stringify(stack));
    } catch {
      // Ignore storage restrictions
    }
  }, [currentFullPath]);

  const handleBackNavigation = () => {
    try {
      const raw = sessionStorage.getItem('foms_in_app_history');
      let stack: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stack)) stack = [];

      // Clean current path from the top of the stack
      while (stack.length > 0 && stack[stack.length - 1] === currentFullPath) {
        stack.pop();
      }

      // Find the most recent valid in-app predecessor
      let targetPath = '';
      while (stack.length > 0) {
        const candidate = stack.pop();
        if (candidate && candidate !== currentFullPath && !candidate.startsWith('/login') && !candidate.startsWith('/logout')) {
          targetPath = candidate;
          break;
        }
      }

      sessionStorage.setItem('foms_in_app_history', JSON.stringify(stack));

      if (targetPath) {
        navigate(targetPath);
      } else {
        // Sensible fallback to parent page or Dashboard
        const fallback = getParentFallbackPath(location.pathname);
        navigate(fallback);
      }
    } catch {
      navigate(getParentFallbackPath(location.pathname));
    }
  };

  return (
    <header className="site-header">
      <nav className="nav-bar">
        {/* Left Side: Page Title */}
        <div className="header-left-group">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBackNavigation}
              className="header-back-btn"
              aria-label="Go back to previous page"
              title="Go back"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          )}
          <div className="header-title-wrapper">
            <span className="header-breadcrumb">
              <span>{profileRole}</span>
              <ChevronRight size={12} strokeWidth={2.5} />
              <span className="header-breadcrumb-current">{currentTitle}</span>
            </span>
            <h1 className="header-title">
              {currentTitle}
            </h1>
          </div>
        </div>
        
        {/* Right Side: Interactive Controls */}
        <div className="header-controls">
          {/* Date Widget (Matching DMS Reference Exactly) */}
          <div className="header-datetime" aria-label="Current date">
            <Calendar size={14} className="header-datetime-icon" aria-hidden="true" />
            <span className="header-datetime-text">{formattedDateTime}</span>
          </div>

          {/* Notification Button & Dropdown */}
          <div className="header-notification-container" ref={notificationRef}>
            <button 
              className={`header-icon-btn ${bellAnimating ? 'bell-pulse' : ''}`}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              aria-label="Notifications"
              aria-expanded={showNotifications}
            >
              <Bell size={20} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="notification-badge-count">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div 
                className="notification-dropdown"
                role="region"
                aria-live="polite"
                aria-label="Notification center"
                style={{ zIndex: 999999 }}
              >
                {/* Header */}
                <div className="notification-dropdown-header">
                  <div className="notification-dropdown-title-group">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="notification-unread-pill">{unreadCount} new</span>
                    )}
                  </div>
                  <button className="notification-mark-all-btn" onClick={markAllAsRead}>
                    <CheckCheck size={14} /> Mark all as read
                  </button>
                </div>
                
                {/* Filter tab bar */}
                <div className="notification-filter-bar">
                  <span 
                    onClick={() => setFilter('all')} 
                    className={`notification-filter-tab ${filter === 'all' ? 'active' : ''}`}
                  >
                    All
                  </span>
                  <span 
                    onClick={() => setFilter('unread')} 
                    className={`notification-filter-tab ${filter === 'unread' ? 'active' : ''}`}
                  >
                    Unread ({unreadCount})
                  </span>
                </div>

 
                {/* Notification Items List */}
                <div className="notification-dropdown-list">
                  {sortedFiltered.length === 0 ? (
                    <div className="notification-dropdown-empty">
                      <div className="empty-bell-icon">
                        <Bell size={32} />
                      </div>
                      <p className="empty-title">You're all caught up!</p>
                      <p className="empty-subtitle">No new alerts for this category.</p>
                    </div>
                  ) : (
                    <>
                      {/* TODAY SECTION */}
                      {todayNotifications.length > 0 && (
                        <div className="notification-group-section">
                          <div className="notification-group-title">Today</div>
                          {todayNotifications.map((n) => {
                            const isCritical = n.type === 'alert';
                            return (
                              <div 
                                key={n.id} 
                                className={`notification-dropdown-item ${!n.read ? 'unread' : ''} ${isCritical ? 'critical' : ''}`}
                                onClick={(e) => handleToggleRead(n, e)}
                                style={{ cursor: n.link ? 'pointer' : 'default' }}
                              >
                                <div className="notification-dropdown-item-content">
                                  <div className={`notification-dropdown-icon-container ${n.type}`}>
                                    {n.type === 'alert' && <AlertTriangle size={14} />}
                                    {n.type === 'success' && <CheckCircle2 size={14} />}
                                    {n.type === 'info' && <Info size={14} />}
                                  </div>
                                  <div className="notification-dropdown-text-container">
                                    <div className="notification-dropdown-item-header">
                                      <span className="notification-dropdown-item-title">{n.title}</span>
                                      <span className="notification-status-indicator-dot" />
                                    </div>
                                    <p className="notification-dropdown-item-desc">{n.description}</p>
                                    
                                    {/* Inline action support for critical items */}
                                    {n.actionLabel && (
                                      <div style={{ marginTop: '6px' }} onClick={e => e.stopPropagation()}>
                                        <button 
                                          className="notification-action-btn"
                                          onClick={() => alert(`Redirecting to: ${n.actionLabel}`)}
                                        >
                                          {n.actionLabel} →
                                        </button>
                                      </div>
                                    )}

                                    <span className="notification-dropdown-item-time">{n.timestamp}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
 
                      {/* EARLIER SECTION */}
                      {earlierNotifications.length > 0 && (
                        <div className="notification-group-section">
                          <div className="notification-group-title">Earlier</div>
                          {earlierNotifications.map((n) => {
                            const isCritical = n.type === 'alert';
                            return (
                              <div 
                                key={n.id} 
                                className={`notification-dropdown-item ${!n.read ? 'unread' : ''} ${isCritical ? 'critical' : ''}`}
                                onClick={(e) => handleToggleRead(n, e)}
                                style={{ cursor: n.link ? 'pointer' : 'default' }}
                              >
                                <div className="notification-dropdown-item-content">
                                  <div className={`notification-dropdown-icon-container ${n.type}`}>
                                    {n.type === 'alert' && <AlertTriangle size={14} />}
                                    {n.type === 'success' && <CheckCircle2 size={14} />}
                                    {n.type === 'info' && <Info size={14} />}
                                  </div>
                                  <div className="notification-dropdown-text-container">
                                    <div className="notification-dropdown-item-header">
                                      <span className="notification-dropdown-item-title">{n.title}</span>
                                      <span className="notification-status-indicator-dot" />
                                    </div>
                                    <p className="notification-dropdown-item-desc">{n.description}</p>

                                    {/* Inline action support for critical items */}
                                    {n.actionLabel && (
                                      <div style={{ marginTop: '6px' }} onClick={e => e.stopPropagation()}>
                                        <button 
                                          className="notification-action-btn"
                                          onClick={() => alert(`Redirecting to: ${n.actionLabel}`)}
                                        >
                                          {n.actionLabel} →
                                        </button>
                                      </div>
                                    )}

                                    <span className="notification-dropdown-item-time">{n.timestamp}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
 
                {/* Footer Link */}
                <div className="notification-dropdown-footer">
                  <button className="view-all-notifications-btn" onClick={() => {
                    navigate('/notifications');
                    setShowNotifications(false);
                  }}>
                    <span>View all notifications</span>
                    <ChevronRight size={14} />
                  </button>
                  {/* Destructive Clear All icon is now linked to confirmation workflow */}
                  <button 
                    className="clear-all-notifications-btn" 
                    onClick={() => setShowClearConfirm(true)} 
                    title="Clear all notifications"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
 
          {/* Profile Avatar & Dropdown */}
          <div className="header-profile-container" ref={profileRef}>
            <button 
              className="header-avatar-btn" 
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              aria-label="User Profile Dropdown"
              aria-expanded={showProfileMenu}
            >
              <div className="avatar-circle-wrapper">
                <div className="avatar-circle">
                  {profileInitials}
                </div>
              </div>
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-user-info">
                  <div className="profile-dropdown-avatar-wrapper">
                    <div className="profile-dropdown-avatar">
                      {profileInitials}
                    </div>
                  </div>
                  <div className="profile-dropdown-meta">
                    <span className="profile-dropdown-name">{profileName}</span>
                    <span className="profile-dropdown-role">{profileRole}</span>
                  </div>
                </div>
 
                <div className="profile-dropdown-divider" />
                
                {/* Options List */}
                <div className="profile-dropdown-options">
                  <button 
                    className="profile-dropdown-option"
                    onClick={() => {
                      navigate('/profile');
                      setShowProfileMenu(false);
                    }}
                  >
                    <User size={15} strokeWidth={2} className="option-icon" />
                    <span>My Profile</span>
                  </button>
                  
                  <button 
                    className="profile-dropdown-option"
                    onClick={() => {
                      alert('Settings Panel opened');
                      setShowProfileMenu(false);
                    }}
                  >
                    <Settings size={15} strokeWidth={2} className="option-icon" />
                    <span>System Settings</span>
                  </button>
                </div>
 
                <div className="profile-dropdown-divider" />
                
                {/* Logout Option */}
                <div className="profile-dropdown-logout-section">
                  <button 
                    className="profile-dropdown-option logout-option"
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                  >
                    <LogOut size={15} strokeWidth={2} className="option-icon" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Structured Confirmation Dialog for Clear All Actions */}
      {showClearConfirm && (
        <div className="header-confirm-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="header-confirm-card" onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="header-confirm-icon-box">
              <Trash2 size={24} />
            </div>
            <h2 className="header-confirm-title">Clear all notifications?</h2>
            <p className="header-confirm-desc">
              This will permanently delete all notifications for your current role. This action is irreversible.
            </p>
            <div className="header-confirm-actions">
              <Button 
                title="Cancel" 
                variant="secondary" 
                onClick={() => setShowClearConfirm(false)} 
              />
              <Button 
                title="Clear Notifications" 
                variant="danger" 
                onClick={() => {
                  clearAll();
                  setShowClearConfirm(false);
                }} 
              />
            </div>
          </div>
        </div>
      )}

    </header>
  );
};
 
export default GlobalHeader;
