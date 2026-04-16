'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Users, Shield, Building2, Activity, ArrowRight, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, useCurrentTeam, useUserTeams } from '@/contexts/HierarchicalPermissionContext';
import { serviceManagement } from '@/lib/serviceManagement';
import { teamService } from '@/lib/teams';
import { eventsAPI, EventListItem } from '@/lib/eventsAPI';
import type { Service } from '@/lib/serviceManagement';


// ── Avatar people ─────────────────────────────────────────────────────────────
const AVATAR_PEOPLE = [
  { name: 'Sarah M.',  img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', badge: 3,  badgeColor: '#14B8A6' },
  { name: 'David C.',  img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', badge: 2,  badgeColor: '#F87171' },
  { name: 'Emma T.',   img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face', badge: 1,  badgeColor: '#FBBF24' },
  { name: 'Mike R.',   img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face', badge: 4,  badgeColor: '#14B8A6' },
  { name: 'Lisa A.',   img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face', badge: 2,  badgeColor: '#F87171' },
  { name: 'James W.',  img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face', badge: 1,  badgeColor: '#14B8A6' },
  { name: 'Rachel G.', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face', badge: 0,  badgeColor: '' },
  { name: 'Tom B.',    img: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=80&h=80&fit=crop&crop=face', badge: 0,  badgeColor: '' },
];

// ── SVG semi-circle arc chart ─────────────────────────────────────────────────
function ArcChart({ value, max, color, trackColor }: {
  value: number; max: number; color: string; trackColor: string;
}) {
  const r = 68;
  const cx = 88;
  const cy = 88;
  const circ = Math.PI * r;
  const filled = (value / max) * circ;

  return (
    <svg viewBox="0 0 176 96" className="w-full" style={{ overflow: 'visible' }}>
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`} fill="none" stroke={trackColor} strokeWidth="13" strokeLinecap="round" />
      <path d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`} fill="none" stroke={color} strokeWidth="13" strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`} strokeDashoffset="0" />
    </svg>
  );
}

// ── Arc stat card (no background color — glass-ready) ─────────────────────────
function ArcStatCard({ title, value, max, label, sublabel, color, trackColor }: {
  title: string; value: number; max: number; label: string; sublabel: string;
  color: string; trackColor: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
      <div className="relative flex justify-center">
        <div className="w-44">
          <ArcChart value={value} max={max} color={color} trackColor={trackColor} />
        </div>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 leading-none">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">of {max}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
          <span className="text-xs font-medium text-gray-600">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: trackColor }} />
          <span className="text-xs text-gray-400">{sublabel}</span>
        </div>
      </div>
    </div>
  );
}

// ── Quick action tile ─────────────────────────────────────────────────────────
function ActionTile({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-2xl border border-gray-200/60 p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)' }}
    >
      <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5 text-[#F44314]" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
    </button>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { user } = usePermissions();
  const { currentTeam } = useCurrentTeam();
  const teams = useUserTeams();

  const [loading, setLoading] = useState(true);
  const [serviceStats, setServiceStats] = useState({ active: 0, total: 0 });
  const [teamStats, setTeamStats]       = useState({ active: 0, total: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState<EventListItem[]>([]);
  const [latestServices, setLatestServices] = useState<Service[]>([]);

  useEffect(() => {
    let mounted = true;

    async function fetchDashboardData() {
      const results = await Promise.allSettled([
        // Fetch service stats via dedicated dashboard-stats endpoint
        serviceManagement.getDashboardStats(),
        // Fetch latest services for the list
        serviceManagement.getServices({ sortBy: 'createdAt', sortOrder: 'desc', limit: 5 }),
        // Fetch upcoming events
        eventsAPI.getAllEvents({ dateFrom: new Date().toISOString() }),
        // Fetch teams
        teamService.getAllTeams(),
      ]);

      if (!mounted) return;

      // Service stats
      if (results[0].status === 'fulfilled') {
        const stats = results[0].value;
        setServiceStats({ active: stats.activeServices, total: stats.totalServices });
      }

      // Latest services
      if (results[1].status === 'fulfilled') {
        const d = results[1].value as { services?: Service[] };
        const all = d?.services ?? [];
        setLatestServices([...all].sort((a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        ).slice(0, 5));
      }

      // Upcoming events
      if (results[2].status === 'fulfilled') {
        const events = results[2].value;
        const sorted = [...events].sort((a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
        ).slice(0, 5);
        setUpcomingEvents(sorted);
      }

      // Team stats — backend returns { success, data: [...] }
      if (results[3].status === 'fulfilled') {
        const res = results[3].value as { data?: { isActive?: boolean }[] };
        const all = Array.isArray(res) ? res : res?.data ?? [];
        const active = all.filter((t) => t.isActive !== false).length;
        setTeamStats({ active, total: all.length });
      }

      setLoading(false);
    }

    fetchDashboardData();
    return () => { mounted = false; };
  }, []);

  return (
    <AdminLayout title="Dashboard" description="Overview of your Adventist Community Services admin panel">

      {/* ── Single glass container ────────────────────────────────────────── */}
      <div className="relative">
        {/* Colorful blobs behind the glass — give backdrop-blur something to render */}
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: '#a78bfa' }} />
        <div className="absolute top-20 -right-10 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: '#fb923c' }} />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none" style={{ background: '#34d399' }} />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: '#60a5fa' }} />

        {/* Avatars — centered, overlapping the card top edge */}
        <div className="flex justify-center gap-3 relative z-10 flex-wrap">
          {AVATAR_PEOPLE.map((person) => (
            <div key={person.name} className="relative flex-shrink-0">
              <img
                src={person.img}
                alt={person.name}
                className="w-14 h-14 rounded-full object-cover ring-[3px] ring-white shadow-md"
              />
              {person.badge > 0 && (
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
                  style={{ background: person.badgeColor }}
                >
                  {person.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Glass card — pulled up so avatars overlap the top edge */}
        <div className="-mt-7 rounded-3xl shadow-2xl pt-12 pb-7 px-7" style={{
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>

          {/* View all members link */}
          <div className="flex justify-end mb-6">
            <button onClick={() => router.push('/users')}
              className="flex items-center gap-1 text-xs text-[#F44314] font-semibold hover:underline"
            >
              View all members <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Arc stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ArcStatCard
              title="Active Services"
              value={serviceStats.active}
              max={Math.max(serviceStats.total, 1)}
              label="Active"
              sublabel="Inactive"
              color="#14B8A6"
              trackColor="#CCFBF1"
            />
            <ArcStatCard
              title="Community Teams"
              value={teamStats.active}
              max={Math.max(teamStats.total, 1)}
              label="Active"
              sublabel="Inactive"
              color="#F44314"
              trackColor="#FEE2D5"
            />
          </div>

          {/* Quick actions */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <PermissionGate permission="users.read">
              <ActionTile icon={Users} label="Manage Users" onClick={() => router.push('/users')} />
            </PermissionGate>
            <PermissionGate permission="teams.read">
              <ActionTile icon={Shield} label="Manage Teams" onClick={() => router.push('/teams')} />
            </PermissionGate>
            <PermissionGate permission="organizations.read">
              <ActionTile icon={Building2} label="Organizations" onClick={() => router.push('/organizations')} />
            </PermissionGate>
            <PermissionGate permission="services.read">
              <ActionTile icon={Activity} label="Services" onClick={() => router.push('/services')} />
            </PermissionGate>
          </div>

          {/* Your teams */}
          {teams.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Teams</p>
              <div className="space-y-2">
                {teams.slice(0, 4).map((assignment) => assignment.team && (
                  <div key={assignment.teamId}
                    className="flex items-center justify-between bg-white/50 rounded-2xl px-4 py-3 hover:bg-white/70 transition-colors cursor-pointer"
                    onClick={() => router.push(`/teams/${assignment.teamId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Shield className="w-4 h-4 text-[#F44314]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{assignment.team.name}</p>
                        <p className="text-xs text-gray-400">{assignment.team.type?.toUpperCase()} Team</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${assignment.role === 'leader' ? 'bg-[#F44314] text-white' : 'bg-white/70 text-gray-600'}`}>
                      {assignment.role}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Two vertical cards below ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

        {/* Upcoming Events */}
        <div className="rounded-3xl border border-gray-200/80 shadow-lg overflow-hidden" style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-sm font-semibold text-gray-800">Upcoming Events</p>
            <button onClick={() => router.push('/events')} className="text-xs text-[#F44314] font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100/60 px-5 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No upcoming events</p>
            ) : upcomingEvents.map((event) => {
              const start = new Date(event.start);
              return (
                <div key={event._id} className="flex items-center gap-4 py-3">
                  {/* Square date badge */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5" style={{ background: 'rgba(244,67,20,0.08)', border: '1px solid rgba(244,67,20,0.15)' }}>
                    <span className="text-[10px] font-semibold text-[#F44314] uppercase tracking-wide leading-none">
                      {start.toLocaleString('en', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold text-[#F44314] leading-none">{start.getDate()}</span>
                  </div>
                  {/* Event details */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      {event.locationText && <> · {event.locationText}</>}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{event.service?.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest Services */}
        <div className="rounded-3xl border border-gray-200/80 shadow-lg overflow-hidden" style={{
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-sm font-semibold text-gray-800">Latest Services</p>
            <button onClick={() => router.push('/services')} className="text-xs text-[#F44314] font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-100/60 px-5 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
              </div>
            ) : latestServices.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No services yet</p>
            ) : latestServices.map((service) => (
              <div key={service._id} className="flex items-center gap-3 py-3">
                {/* Type icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)' }}>
                  <Activity className="w-4 h-4 text-teal-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{service.name}</p>
                  <p className="text-xs text-gray-400 truncate">{service.type}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${service.status === 'active' ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
                  {service.status === 'active' ? 'Active' : service.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </AdminLayout>
  );
}
