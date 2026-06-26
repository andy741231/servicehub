import { useState } from 'react';
import { Search, Filter, Mail, Phone, Building, MapPin, Calendar, User } from 'lucide-react';

const MOCK_DIRECTORY = [
  {
    id: 1,
    name: 'Sarah Johnson',
    title: 'Engineering Manager',
    department: 'Engineering',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    avatar: 'SJ',
    startDate: '2020-03-15',
  },
  {
    id: 2,
    name: 'Michael Chen',
    title: 'Senior Developer',
    department: 'Engineering',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 234-5678',
    location: 'New York, NY',
    avatar: 'MC',
    startDate: '2021-07-20',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    title: 'Product Designer',
    department: 'Design',
    email: 'emily.rodriguez@company.com',
    phone: '+1 (555) 345-6789',
    location: 'Austin, TX',
    avatar: 'ER',
    startDate: '2022-01-10',
  },
  {
    id: 4,
    name: 'David Kim',
    title: 'Data Analyst',
    department: 'Analytics',
    email: 'david.kim@company.com',
    phone: '+1 (555) 456-7890',
    location: 'Seattle, WA',
    avatar: 'DK',
    startDate: '2021-11-05',
  },
  {
    id: 5,
    name: 'Jessica Williams',
    title: 'Marketing Director',
    department: 'Marketing',
    email: 'jessica.williams@company.com',
    phone: '+1 (555) 567-8901',
    location: 'Chicago, IL',
    avatar: 'JW',
    startDate: '2019-06-01',
  },
  {
    id: 6,
    name: 'Alex Thompson',
    title: 'DevOps Engineer',
    department: 'Engineering',
    email: 'alex.thompson@company.com',
    phone: '+1 (555) 678-9012',
    location: 'Denver, CO',
    avatar: 'AT',
    startDate: '2022-04-18',
  },
  {
    id: 7,
    name: 'Rachel Green',
    title: 'HR Manager',
    department: 'Human Resources',
    email: 'rachel.green@company.com',
    phone: '+1 (555) 789-0123',
    location: 'Boston, MA',
    avatar: 'RG',
    startDate: '2018-09-12',
  },
  {
    id: 8,
    name: 'James Wilson',
    title: 'Sales Representative',
    department: 'Sales',
    email: 'james.wilson@company.com',
    phone: '+1 (555) 890-1234',
    location: 'Los Angeles, CA',
    avatar: 'JW',
    startDate: '2023-02-28',
  },
];

const DEPARTMENTS = ['All', 'Engineering', 'Design', 'Analytics', 'Marketing', 'Human Resources', 'Sales'];

export default function Directory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const filteredDirectory = MOCK_DIRECTORY.filter((person) => {
    const matchesSearch =
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'All' || person.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-base mb-2">Company Directory</h1>
          <p className="text-body text-muted">Find and connect with team members</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-subtle" />
              <input
                type="text"
                placeholder="Search by name, title, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-base min-h-[44px] transition-colors duration-150 ${
                showFilters
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border bg-surface hover:border-border-dark'
              }`}
            >
              <Filter className="h-5 w-5" />
              <span className="text-body">Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="p-4 bg-surface-raised border border-border rounded-base">
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-4 py-2 rounded-base text-body transition-colors duration-150 ${
                      selectedDepartment === dept
                        ? 'bg-primary text-white'
                        : 'bg-background border border-border hover:border-primary'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-small text-muted">
          Showing {filteredDirectory.length} of {MOCK_DIRECTORY.length} team members
        </div>

        {/* Directory Grid */}
        {filteredDirectory.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-subtle mx-auto mb-3" />
            <p className="text-body text-muted">No team members found</p>
            <p className="text-small text-muted mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDirectory.map((person) => (
              <div
                key={person.id}
                className="bg-surface-raised border border-border rounded-lg p-6 hover:border-primary transition-colors duration-150"
              >
                {/* Avatar and Name */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-body font-bold flex-shrink-0">
                    {person.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-bold text-base truncate">{person.name}</h3>
                    <p className="text-small text-muted truncate">{person.title}</p>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center gap-2 text-small text-muted mb-3">
                  <Building className="h-4 w-4" />
                  <span>{person.department}</span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <a
                    href={`mailto:${person.email}`}
                    className="flex items-center gap-2 text-small text-muted hover:text-primary transition-colors duration-150"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{person.email}</span>
                  </a>
                  <div className="flex items-center gap-2 text-small text-muted">
                    <Phone className="h-4 w-4" />
                    <span>{person.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-small text-muted">
                    <MapPin className="h-4 w-4" />
                    <span>{person.location}</span>
                  </div>
                </div>

                {/* Start Date */}
                <div className="flex items-center gap-2 text-small text-muted pt-3 border-t border-border">
                  <Calendar className="h-4 w-4" />
                  <span>Started {new Date(person.startDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
