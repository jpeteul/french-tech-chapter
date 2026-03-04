import { useState, useMemo } from 'react';

interface Member {
  id: string;
  name: string;
  company?: string;
  role?: string;
  linkedin?: string;
  email?: string;
  industry?: string;
  bio?: string;
}

interface ConnectionRequest {
  id: string;
  receiver_id?: string;
  requester_id?: string;
  status: 'pending' | 'accepted' | 'declined';
  response_message?: string;
  receiver?: { id: string };
  requester?: { id: string };
}

interface Props {
  members: Member[];
  currentMemberId: string;
  sentRequests: ConnectionRequest[];
  receivedRequests: ConnectionRequest[];
}

export default function MemberDirectory({ members, currentMemberId, sentRequests, receivedRequests }: Props) {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const industries = useMemo(() => {
    const set = new Set(members.map(m => m.industry).filter(Boolean));
    return Array.from(set).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Don't show current user in directory
      if (member.id === currentMemberId) return false;

      const matchesSearch = !search ||
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.company?.toLowerCase().includes(search.toLowerCase()) ||
        member.role?.toLowerCase().includes(search.toLowerCase());

      const matchesIndustry = !industry || member.industry === industry;

      return matchesSearch && matchesIndustry;
    });
  }, [members, currentMemberId, search, industry]);

  // Get connection status for a member
  const getConnectionStatus = (memberId: string) => {
    // Check sent requests
    const sent = sentRequests.find(r =>
      (r.receiver?.id === memberId) || (r.receiver_id === memberId)
    );
    if (sent) {
      return { type: 'sent', status: sent.status, request: sent };
    }

    // Check received requests
    const received = receivedRequests.find(r =>
      (r.requester?.id === memberId) || (r.requester_id === memberId)
    );
    if (received) {
      return { type: 'received', status: received.status, request: received };
    }

    return null;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const openRequestModal = (member: Member) => {
    setSelectedMember(member);
    setRequestMessage('');
    setShowRequestModal(true);
    setErrorMessage('');
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedMember(null);
    setRequestMessage('');
  };

  const sendConnectionRequest = async () => {
    if (!selectedMember) return;

    setRequestingId(selectedMember.id);
    setErrorMessage('');

    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: selectedMember.id,
          message: requestMessage || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Request sent to ${selectedMember.name}!`);
        closeRequestModal();
        // Refresh the page to update connection status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setErrorMessage(data.error || 'Failed to send request');
      }
    } catch (err) {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div>
      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, company, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-white/90 backdrop-blur-xl border border-white/50 rounded-xl focus:ring-2 focus:ring-[#E1000F] focus:border-[#E1000F] shadow-lg shadow-black/10"
          />
        </div>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="px-4 py-3 bg-white/90 backdrop-blur-xl border border-white/50 rounded-xl focus:ring-2 focus:ring-[#E1000F] focus:border-[#E1000F] shadow-lg shadow-black/10"
        >
          <option value="">All Industries</option>
          {industries.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-white/70 mb-4">
        Showing {filteredMembers.length} of {members.length - 1} members
      </p>

      {/* Members grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map(member => {
          const connection = getConnectionStatus(member.id);
          const isConnected = connection?.status === 'accepted';

          return (
            <div
              key={member.id}
              className="backdrop-blur-xl bg-white/90 rounded-2xl p-6 border border-white/50 shadow-xl shadow-black/20 hover:bg-white hover:shadow-2xl hover:shadow-black/25 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-slate-600 font-semibold shadow-inner">
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#000000] truncate">{member.name}</h3>
                  {member.role && (
                    <p className="text-sm text-gray-600 truncate">{member.role}</p>
                  )}
                  {member.company && (
                    <p className="text-sm text-gray-500 truncate">{member.company}</p>
                  )}
                </div>
              </div>

              {member.bio && (
                <p className="mt-3 text-sm text-gray-600 line-clamp-2">{member.bio}</p>
              )}

              {member.industry && (
                <span className="inline-block mt-3 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {member.industry}
                </span>
              )}

              {/* Connection status / action */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                {isConnected ? (
                  // Show contact info if connected
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Connected
                    </span>
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="block text-sm text-[#E1000F] hover:underline truncate"
                      >
                        {member.email}
                      </a>
                    )}
                    {member.linkedin && (
                      <a
                        href={`https://linkedin.com/in/${member.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#E1000F] hover:underline"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                  </div>
                ) : connection?.status === 'pending' ? (
                  // Show pending status
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {connection.type === 'sent' ? 'Request Pending' : 'Wants to Connect'}
                  </span>
                ) : connection?.status === 'declined' ? (
                  <span className="text-xs text-gray-400">Request not accepted</span>
                ) : (
                  // Show request button
                  <button
                    onClick={() => openRequestModal(member)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#E1000F] text-white text-sm font-medium rounded-lg hover:bg-[#9D000A] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Request Introduction
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 text-white/60">
          No members found matching your criteria.
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedMember && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-2xl bg-white/90 rounded-2xl shadow-2xl shadow-black/20 border border-white/50 max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#000000]">Request Introduction</h2>
              <button onClick={closeRequestModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-[#E5E5E5] rounded-full flex items-center justify-center text-gray-600 font-semibold text-sm">
                {getInitials(selectedMember.name)}
              </div>
              <div>
                <p className="font-medium text-[#000000]">{selectedMember.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedMember.role}{selectedMember.company ? ` at ${selectedMember.company}` : ''}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#000000] mb-1">
                Message (optional)
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Introduce yourself or explain why you'd like to connect..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E1000F] focus:border-[#E1000F] resize-none text-sm"
              />
            </div>

            {errorMessage && (
              <p className="mb-4 text-sm text-red-600">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeRequestModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendConnectionRequest}
                disabled={requestingId === selectedMember.id}
                className="px-4 py-2 bg-[#E1000F] text-white text-sm font-medium rounded-lg hover:bg-[#9D000A] transition-colors disabled:opacity-50"
              >
                {requestingId === selectedMember.id ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
