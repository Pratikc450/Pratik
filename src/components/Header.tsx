import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Bell, 
  User as UserIcon, 
  LogIn, 
  LogOut, 
  Cloud, 
  CheckCircle2, 
  FileText, 
  FolderKanban, 
  X,
  ExternalLink
} from 'lucide-react';
import { UserProfile, Product } from '../types.js';

interface HeaderProps {
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isFirestoreConnected: boolean;
  onNavigateTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  products,
  selectedProductId,
  setSelectedProductId,
  user,
  onSignIn,
  onSignOut,
  isFirestoreConnected,
  onNavigateTab,
  searchQuery,
  setSearchQuery
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: '1',
      title: '19 Artifacts Generated',
      desc: 'PayFlow Enterprise Checkout suite synthesized and validated.',
      time: 'Just now',
      unread: true
    },
    {
      id: '2',
      title: 'PRD Approved',
      desc: 'AI Banking App specification promoted to Official Spec v1.0.',
      time: '2h ago',
      unread: true
    },
    {
      id: '3',
      title: 'Firestore Sync Complete',
      desc: 'Workspace portfolio backed up to cloud Firestore.',
      time: 'Yesterday',
      unread: true
    }
  ];

  const matchingProducts = searchQuery.trim()
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Navigator Brand */}
          <div 
            onClick={() => onNavigateTab('dashboard')}
            className="flex items-center space-x-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-100 text-lg tracking-tight">Navigator</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                  AI PM Platform
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search... Bar (matching ASCII mockup) */}
          <div ref={searchRef} className="flex-1 max-w-md relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Search..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-12 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded">
                  ⌘K
                </kbd>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="pointer-events-auto text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showSearchDropdown && searchQuery.trim() && (
              <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                <div className="p-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Matching Workspaces
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {matchingProducts.length > 0 ? (
                    matchingProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setShowSearchDropdown(false);
                          onNavigateTab('projects');
                        }}
                        className="p-2.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-emerald-400" />
                          <div>
                            <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{p.vision}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500">{p.industry}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No matching projects found for "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Notifications & Profile (matching ASCII mockup) */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Notifications Popover */}
            <div ref={notificationsRef} className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) setUnreadNotifications(0);
                }}
                className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                  <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Notifications</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">Real-time alerts</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-800/60 transition-colors text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{n.title}</span>
                          <span className="text-[10px] text-slate-500">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-800 text-center bg-slate-950/50">
                    <button 
                      onClick={() => {
                        setShowNotifications(false);
                        onNavigateTab('analytics');
                      }}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      View telemetry & audit log
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all text-xs"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                    {user?.displayName ? user.displayName.charAt(0) : 'P'}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    {user?.displayName || 'Product Manager'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Lead PM</div>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 text-xs animate-fadeIn">
                  <div className="p-3 border-b border-slate-800 space-y-1">
                    <div className="font-bold text-slate-100">{user?.displayName || 'Product Manager'}</div>
                    <div className="text-slate-500 font-mono text-[11px] truncate">{user?.email || 'pm-workspace@navigator.ai'}</div>
                    <div className="pt-1 flex items-center gap-1.5 text-[10px]">
                      <Cloud className={`w-3 h-3 ${isFirestoreConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className={isFirestoreConnected ? 'text-emerald-400' : 'text-amber-400'}>
                        {isFirestoreConnected ? 'Firestore Connected' : 'Local Storage Mode'}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onNavigateTab('settings');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>Settings & Account</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    {user ? (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-950/40 text-rose-400 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onSignIn();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign in with Google</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
