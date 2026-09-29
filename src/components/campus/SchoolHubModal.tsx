/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ChevronRight, School, Sparkles, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Realistic3DIcon, IconModuleName } from '../common/Realistic3DIcon';
import { useToast } from '../common/Toast';

interface SchoolHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule?: (moduleName: string) => void;
}

interface ModuleItem {
  id: IconModuleName;
  name: string;
  category: 'academics' | 'admin' | 'finance' | 'communication' | 'system';
  description: string;
  badge?: string;
}

const SCHOOL_MODULES: ModuleItem[] = [
  // Academics
  { id: 'students', name: 'Students', category: 'academics', description: 'Student directory, profiles & records', badge: '1,248' },
  { id: 'teachers', name: 'Teachers', category: 'academics', description: 'Faculty staff, departments & allocations', badge: '64' },
  { id: 'classes', name: 'Classes', category: 'academics', description: 'Primary & Secondary grades & streams', badge: '18' },
  { id: 'sections', name: 'Sections', category: 'academics', description: 'Stream divisions & classroom allocations' },
  { id: 'subjects', name: 'Subjects', category: 'academics', description: 'Curriculum topics, syllabi & credit units' },
  { id: 'attendance', name: 'Attendance', category: 'academics', description: 'Daily attendance logs & biometric registers', badge: '98.2%' },
  { id: 'timetable', name: 'Timetable', category: 'academics', description: 'Weekly schedules & lecture rooms' },
  { id: 'assignments', name: 'Assignments', category: 'academics', description: 'Homework tasks, rubrics & submissions', badge: '12 Due' },
  { id: 'syllabus', name: 'Syllabus', category: 'academics', description: 'Term progression & topic breakdown' },
  { id: 'exams', name: 'Exams', category: 'academics', description: 'Term assessments & examination timetables', badge: 'Term 3' },
  { id: 'marks', name: 'Marks', category: 'academics', description: 'Subject grading & gradebook inputs' },
  { id: 'results', name: 'Results', category: 'academics', description: 'Report cards & academic analytics' },
  { id: 'grades', name: 'Grades', category: 'academics', description: 'Division scoring & GPA parameters' },

  // Admin
  { id: 'parents', name: 'Parents', category: 'admin', description: 'Guardian contacts & parent-teacher portals', badge: '980' },
  { id: 'staff', name: 'Staff', category: 'admin', description: 'Non-teaching staff & administration members' },
  { id: 'academic-years', name: 'Academic Years', category: 'admin', description: 'Term periods, admissions & semesters' },
  { id: 'library', name: 'Library', category: 'admin', description: 'Textbook catalog, loans & digital assets' },
  { id: 'hostel', name: 'Hostel', category: 'admin', description: 'Boarding dormitories & room allocations' },
  { id: 'transport', name: 'Transport', category: 'admin', description: 'School bus routes, drivers & pickup stops' },
  { id: 'alumni', name: 'Alumni', category: 'admin', description: 'Graduating classes & alumni network' },
  { id: 'clubs', name: 'Clubs & Sports', category: 'admin', description: 'Extracurricular clubs, athletics & houses' },

  // Finance
  { id: 'finance', name: 'Finance', category: 'finance', description: 'Budget overview, fee ledgers & reports' },
  { id: 'payments', name: 'Payments', category: 'finance', description: 'School fees, bank transfers & mobile money', badge: 'UGX' },
  { id: 'invoices', name: 'Invoices', category: 'finance', description: 'Term tuition invoices & receipts' },
  { id: 'income', name: 'Income', category: 'finance', description: 'School revenue, grants & donations' },
  { id: 'expenses', name: 'Expenses', category: 'finance', description: 'Operational spending, bills & requisitions' },

  // Communication
  { id: 'messages', name: 'Messages', category: 'communication', description: 'Real-time school parent-teacher messaging', badge: 'Live' },
  { id: 'notices', name: 'Notices', category: 'communication', description: 'Official circulars, broadcasts & alerts', badge: 'New' },
  { id: 'news', name: 'News & Events', category: 'communication', description: 'School newsletter, sports days & speech days' },
  { id: 'circulars', name: 'Circulars', category: 'communication', description: 'Parent circular letters & printable notices' },
  { id: 'enquiries', name: 'Help & Enquiries', category: 'communication', description: 'Admission enquiries & visitor desk' },

  // System
  { id: 'settings', name: 'Settings', category: 'system', description: 'System preferences, school branding & timezone' },
  { id: 'permissions', name: 'Permissions', category: 'system', description: 'RBAC: Admin, Teacher, Student & Parent roles' },
  { id: 'audit-logs', name: 'Audit Logs', category: 'system', description: 'Compliance tracking, login history & changes' },
  { id: 'languages', name: 'Languages', category: 'system', description: 'English, Swahili, Luganda localization' },
];

export const SchoolHubModal: React.FC<SchoolHubModalProps> = ({
  isOpen,
  onClose,
  onSelectModule,
}) => {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModules = SCHOOL_MODULES.filter((m) => {
    if (activeCategory !== 'all' && m.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleLaunch = (m: ModuleItem) => {
    showToast(`Opened ${m.name} module`, 'info');
    if (onSelectModule) {
      onSelectModule(m.id);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="School Management Hub"
      subtitle="Complete 3D Module Directory for Primary & Secondary School Administration"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students, marks, fees, attendance, timetable..."
              className="w-full rounded-xl border border-[#222d34] bg-[#111b21] pl-10 pr-4 py-2.5 text-xs text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none focus:ring-1 focus:ring-[#25d366] transition"
              autoFocus
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'academics', label: 'Academics' },
              { id: 'admin', label: 'Administration' },
              { id: 'finance', label: 'Finance' },
              { id: 'communication', label: 'Communication' },
              { id: 'system', label: 'Settings' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                  activeCategory === cat.id
                    ? 'bg-[#005c4b] text-[#25d366] ring-1 ring-[#25d366]/40'
                    : 'bg-[#111b21] text-[#8696a0] hover:text-white hover:bg-[#202c33]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modules Grid with Realistic 3D Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {filteredModules.map((m) => (
            <div
              key={m.id}
              onClick={() => handleLaunch(m)}
              className="group flex items-center gap-3.5 p-3 rounded-2xl border border-[#222d34] bg-[#111b21]/80 hover:bg-[#202c33] transition-all cursor-pointer shadow-sm hover:shadow-md hover:border-[#25d366]/30 select-none"
            >
              {/* Realistic 3D Icon */}
              <Realistic3DIcon
                name={m.id}
                size="md"
                showDots={true}
                badge={m.badge}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-[#e9edef] group-hover:text-[#25d366] transition-colors truncate">
                    {m.name}
                  </h4>
                  <ChevronRight className="h-3.5 w-3.5 text-[#8696a0] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-[#8696a0] line-clamp-1 mt-0.5">
                  {m.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
