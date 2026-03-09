'use client';

import React from 'react';
import AdminLayout from '../../components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Shield, Building2, Activity, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions, useCurrentTeam, useUserTeams } from '@/contexts/HierarchicalPermissionContext';

// ── Placeholder avatars (Unsplash headshots) ──────────────────────────────────
const AVATAR_PEOPLE = [
  { name: 'Sarah M.',  img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face', badge: 3,  badgeColor: 'bg-teal-400' },
  { name: 'David C.',  img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', badge: 2,  badgeColor: 'bg-rose-400' },
  { name: 'Emma T.',   img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face', badge: 1,  badgeColor: 'bg-amber-400' },
  { name: 'Mike R.',   img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face', badge: 4,  badgeColor: 'bg-teal-400' },
  { name: 'Lisa A.',   img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face', badge: 0,  badgeColor: '' },
  { name: 'James W.',  img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face', badge: 2,  badgeColor: 'bg-rose-400' },
  { name: 'Rachel G.', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face', badge: 1,  badgeColor: 'bg-teal-400' },
  { name: 'Tom B.',    img: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=80&h=80&fit=crop&crop=face', badge: 0,  badgeColor: '' },
];

// ── Arc / donut chart (semi-circle) ───────────────────────────────────────────
function ArcChart({
  value, max, color, trackColor,
}: {
  value: number; max: number; color: string; trackColor: string;
}) {
  const r = 70;
  const cx = 90;
  const cy = 90;
  const circ = Math.PI * r; // half-circle circumference
  const filled = (value / max) * circ;

  // SVG semi-circle: starts at left (180°) sweeps to right (0°) along top
  const arc = (frac: number) => {
    const angle = Math.PI * (1 - frac); // 180° → 0° as frac goes 0→1
    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  return (
    <svg viewBox="0 0 180 100" className="w-full" style={{ overflow: 'visible' }}>
      {/* Track */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke={trackColor}
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset="0"
      />
    </svg>
  );
}

// ── Curved stat card ──────────────────────────────────────────────────────────
function CurvedStatCard({
  title, value, max, label, sublabel, color, trackColor, bgColor,
}: {
  title: string; value: number; max: number; label: string; sublabel: string;
  color: string; trackColor: string; bgColor: string;
}) {
  return (
    <div className={`rounded-3xl p-6 flex flex-col gap-2 ${bgColor}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>

      {/* Arc chart */}
      <div className="relative flex justify-center">
        <div className="w-48">
          <ArcChart value={value} max={max} color={color} trackColor={trackColor} />
        </div>
        {/* Centre value */}
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 leading-none">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">of {max}</p>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: trackColor }} />
          <span className="text-xs text-gray-500">{sublabel}</span>
        </div>
      </div>
    </div>
  );
}

// ── Quick action tile ─────────────────────────────────────────────────────────
function ActionTile({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border border-gray-100"
    >
      <div className="w-10 h-10 rounded-xl bg-[#FFF1EE] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#F44314]" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
    </button>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { user } = usePermissions();
  const { currentTeam, teamRole } = useCurrentTeam();
  const teams = useUserTeams();

  const entityLabel = currentTeam?.name || 'Adventist Community Services';

  return (
    <AdminLayout
      title="Dashboard"
      description="Overview of your Adventist Community Services admin panel"
    >
      <div className="space-y-6">

        {/* ── Greeting ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{entityLabel}</p>
          </div>
          {teamRole && (
            <Badge className="bg-[#FFF1EE] text-[#F44314] border-0 text-xs">
              {teamRole.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          )}
        </div>

        {/* ── Avatar strip ── */}
        <div className="bg-[#F8F7F5] rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Team Members</p>
            <Button variant="ghost" size="sm" className="text-xs text-[#F44314] h-7 px-2" onClick={() => router.push('/users')}>
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {AVATAR_PEOPLE.map((person) => (
              <div key={person.name} className="relative flex-shrink-0">
                <img
                  src={person.img}
                  alt={person.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                {person.badge > 0 && (
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${person.badgeColor} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white`}>
                    {person.badge}
                  </span>
                )}
              </div>
            ))}
            {/* Add more */}
            <button
              onClick={() => router.push('/users')}
              className="w-12 h-12 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#F44314] hover:text-[#F44314] transition-colors text-gray-400"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Curved stat cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurvedStatCard
            title="Active Services"
            value={12}
            max={20}
            label="Active"
            sublabel="Inactive"
            color="#14B8A6"
            trackColor="#E2F8F5"
            bgColor="bg-[#F0FDFB]"
          />
          <CurvedStatCard
            title="Community Teams"
            value={8}
            max={15}
            label="Active"
            sublabel="Pending"
            color="#F44314"
            trackColor="#FEE2D5"
            bgColor="bg-[#FFF8F6]"
          />
        </div>

        {/* ── Quick actions ── */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </div>

        {/* ── Your teams ── */}
        {teams.length > 0 && (
          <div className="bg-[#F8F7F5] rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Your Teams</p>
              <Button variant="ghost" size="sm" className="text-xs text-[#F44314] h-7 px-2" onClick={() => router.push('/teams')}>
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {teams.slice(0, 4).map((assignment) => assignment.team && (
                <div
                  key={assignment.teamId}
                  className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => router.push(`/teams/${assignment.teamId}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFF1EE] flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-[#F44314]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assignment.team.name}</p>
                      <p className="text-xs text-gray-400">{assignment.team.type?.toUpperCase()} Team</p>
                    </div>
                  </div>
                  <Badge variant={assignment.role === 'leader' ? 'default' : 'secondary'} className="text-xs">
                    {assignment.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
