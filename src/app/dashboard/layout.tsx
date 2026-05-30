'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from "@clerk/nextjs";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      name: 'Brix Agent',
      href: '/dashboard/brix',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      name: 'Iris Agent',
      href: '/dashboard/iris',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      name: 'Nova Agent',
      href: '/internal/opportunitywatch-v2',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: 'Fetch Engine',
      href: '/dashboard/fetch',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      name: 'Lead Command',
      href: '/leads',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      href: '/agents', // Mapped to the top-level agents page to resolve the 404
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-[#12100e] text-[#f0f4f8] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1E1B16] border-r border-[#3a352d] flex flex-col justify-between">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-[#3a352d] flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#C17B2A] flex items-center justify-between p-1.5">
              <svg className="w-full h-full text-[#1E1B16]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2zm0 3.99L19.53 19H4.47L12 5.99z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider text-white">BaraTrust</h1>
              <p className="text-[10px] text-[#C17B2A] tracking-widest uppercase">Intelligence</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#2d261e] text-[#C17B2A] border-l-4 border-[#C17B2A] pl-3'
                      : 'text-[#9ca3af] hover:bg-[#231f19] hover:text-white'
                  }`}
                >
                  <span className={isActive ? 'text-[#C17B2A]' : 'text-[#6b7280]'}>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Status Panel */}
        <div className="p-4 border-t border-[#3a352d] bg-[#1a1713] flex items-center justify-between text-xs text-[#6b7280]">
          <span>v2.1.0</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
            System Live
          </span>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header Row */}
        <header className="h-16 bg-[#1E1B16] border-b border-[#3a352d] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6b7280] uppercase tracking-wider">Dashboard</span>
            <span className="text-xs text-[#3a352d]">/</span>
            <span className="text-xs text-[#C17B2A] font-semibold tracking-wider capitalize">
              {pathname === '/dashboard' ? 'Overview' : pathname?.split('/').pop()}
            </span>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-semibold text-white">Todd M. Tebo</p>
              <p className="text-[10px] text-[#6b7280]">Lead Architect</p>
            </div>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8 border border-[#C17B2A]/40 shadow-[0_0_10px_rgba(193,123,42,0.2)]" } }} />
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <div className="p-8 max-w-[1600px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
