import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Clock, QrCode, SignOut, UserCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export const Layout: React.FC = () => {
  const { user, logOut, syncId } = useAuth();

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-50 text-zinc-950 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <CheckCircle weight="bold" className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-zinc-950">FlowForge</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-zinc-100 text-teal-600' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50'}`}>
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Tasks</span>
          </NavLink>
          <NavLink to="/timer" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-zinc-100 text-teal-600' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50'}`}>
            <Clock className="w-5 h-5" />
            <span className="font-medium">Focus</span>
          </NavLink>
          <NavLink to="/link" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-zinc-100 text-teal-600' : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50'}`}>
            <QrCode className="w-5 h-5" />
            <span className="font-medium">Link Device</span>
          </NavLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-200">
          <div className="flex items-center gap-3 px-2 mb-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
            ) : (
              <UserCircle className="w-8 h-8 text-zinc-400" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-950 truncate max-w-[120px]">{user?.displayName || 'Linked Device'}</span>
              <span className="text-xs text-zinc-500 font-mono">{syncId}</span>
            </div>
          </div>
          {user && (
            <button onClick={logOut} className="flex items-center gap-3 px-4 py-2 w-full text-zinc-500 hover:text-red-600 transition-colors rounded-lg hover:bg-zinc-50">
              <SignOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Bar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-t border-zinc-200 flex items-center justify-around px-4 z-50">
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full ${isActive ? 'text-teal-600' : 'text-zinc-500'}`}>
          <CheckCircle className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Tasks</span>
        </NavLink>
        <NavLink to="/timer" className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full ${isActive ? 'text-teal-600' : 'text-zinc-500'}`}>
          <Clock className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Focus</span>
        </NavLink>
        <NavLink to="/link" className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full ${isActive ? 'text-teal-600' : 'text-zinc-500'}`}>
          <QrCode className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Link</span>
        </NavLink>
      </nav>
    </div>
  );
};
