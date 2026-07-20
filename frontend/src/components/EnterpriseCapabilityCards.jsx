import React from 'react';
import { Tv, Target, BarChart3, Building2, Zap } from 'lucide-react';

export default function EnterpriseCapabilityCards() {
  const capabilities = [
    {
      id: 1,
      title: 'Interactive Learning',
      description: 'Deliver engaging trainer-led learning experiences with complete session control.',
      icon: <Tv size={22} className="text-amber-400" />,
      tags: ['Live Sessions', 'QR Join', 'Attendance Tracking'],
      glowColor: 'rgba(212, 175, 55, 0.15)'
    },
    {
      id: 2,
      title: 'Smart Assessments',
      description: 'Evaluate knowledge instantly through interactive assessments and real-time feedback.',
      icon: <Target size={22} className="text-amber-400" />,
      tags: ['MCQ & Polls', 'Timed Quizzes', 'Instant Results'],
      glowColor: 'rgba(255, 215, 0, 0.15)'
    },
    {
      id: 3,
      title: 'Analytics & Reporting',
      description: 'Transform training data into actionable business insights and executive reports.',
      icon: <BarChart3 size={22} className="text-amber-400" />,
      tags: ['Live Dashboards', 'Performance Analytics', 'Executive Reports'],
      glowColor: 'rgba(212, 175, 55, 0.15)'
    },
    {
      id: 4,
      title: 'Enterprise Management',
      description: 'Manage clients, projects, users and certifications from a unified enterprise platform.',
      icon: <Building2 size={22} className="text-amber-400" />,
      tags: ['Client Management', 'Role-Based Access', 'Digital Certificates'],
      glowColor: 'rgba(255, 215, 0, 0.15)'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#070A0F] text-white p-6 md:p-12 flex items-center justify-center font-sans relative overflow-hidden">
      {/* Background Ambient Lighting */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-yellow-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Slide Container */}
      <div className="w-full max-w-[1720px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Hero Dashboard Preview */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-widest uppercase">
              <Zap size={14} className="animate-pulse" /> RetailEdge Pro Ecosystem
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-serif">
              Enterprise Workforce <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Intelligence & Learning Platform
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl font-light">
              Elevate employee engagement, streamline compliance assessments, and drive measurable performance outcomes across all corporate units.
            </p>
          </div>

          {/* Hero Dashboard Glass Window */}
          <div className="relative rounded-2xl border border-amber-500/30 bg-[#0F1420]/80 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden group">
            {/* Top Window Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">retailedge.enterprise / live-arena</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Session Active
              </div>
            </div>

            {/* Mockup Dashboard Grid */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20">
                <span className="text-xs text-slate-400 font-medium">Active Participants</span>
                <div className="text-2xl font-bold text-amber-400 mt-1">1,248</div>
                <span className="text-[10px] text-emerald-400 font-semibold">↑ 18% vs Last Quarter</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20">
                <span className="text-xs text-slate-400 font-medium">Assessment Score</span>
                <div className="text-2xl font-bold text-white mt-1">94.2%</div>
                <span className="text-[10px] text-amber-400 font-semibold">Top Performers: Sales</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20">
                <span className="text-xs text-slate-400 font-medium">Certified Units</span>
                <div className="text-2xl font-bold text-yellow-400 mt-1">42</div>
                <span className="text-[10px] text-slate-400">Global Outlets</span>
              </div>
            </div>

            {/* Live Question Card Mockup */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-amber-500/30 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-amber-400 tracking-wider">Active Q3 / 10 • Live Poll</span>
                <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">⏱ 14s</span>
              </div>
              <p className="text-sm font-semibold text-white mb-3">Which key metric best reflects customer retention in Q3 product lines?</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-amber-500/10 border border-amber-500/40 text-xs font-medium text-amber-200">
                  <span>A. Net Promoter Score (NPS) & Repeat Rate</span>
                  <span className="font-bold text-amber-400">76% (842 votes)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-800/60 border border-slate-700 text-xs font-medium text-slate-400">
                  <span>B. Gross Footfall</span>
                  <span>14% (154 votes)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Premium Enterprise Capability Cards */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {capabilities.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-[16px] bg-[#121620]/75 backdrop-blur-xl border border-amber-500/35 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.2)] hover:border-yellow-400 transition-all duration-300 transform hover:-translate-x-1.5"
            >
              {/* Top Row: Circular Gold Icon & Title */}
              <div className="flex items-start gap-4">
                {/* Circular Metallic Gold Icon Badge */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-yellow-600/5 border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.25)] group-hover:scale-105 transition-transform duration-300">
                  {item.icon}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-slate-300 text-xs md:text-sm font-normal mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Capability Tags */}
              <div className="mt-4 pt-3 border-t border-amber-500/15 flex flex-wrap gap-2">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-0.5 tracking-wide transition-all duration-200 hover:border-amber-400 hover:bg-amber-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
