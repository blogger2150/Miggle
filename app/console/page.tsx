'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Console() {
  const [urlInput, setUrlInput] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // Fetch all pending indexing requests from the database
  const fetchRequests = async () => {
    const { data } = await supabase
      .from('index_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Simulating a User submitting a link
  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    await supabase.from('index_requests').insert([
      { requested_url: urlInput, status: 'Pending' }
    ]);

    setUrlInput('');
    alert('URL submitted to the Miggle approval queue!');
    fetchRequests();
  };

  // Admin Action: Approve a site (Simulating crawler ingestion)
  const handleApprove = async (id: string, url: string) => {
    await supabase.from('index_requests').update({ status: 'Approved' }).eq('id', id);
    
    await supabase.from('search_index').insert([
      { 
        url: url, 
        title: `Indexed Site: ${url.replace('https://', '')}`, 
        body_text: `This website was reviewed and approved on Miggle. Content from ${url} is now live in search results.`,
        boost_score: 1.0
      }
    ]);

    alert('Site Approved & Added to Miggle Public Index!');
    fetchRequests();
  };

  // Admin Action: Reject a site with a clear reason
  const handleReject = async (id: string) => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    await supabase.from('index_requests').update({ 
      status: 'Rejected', 
      rejection_reason: reason 
    }).eq('id', id);

    alert('Site Rejected with reason sent.');
    setReason('');
    setSelectedReqId(null);
    fetchRequests();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-2">Miggle Search Console</h1>
        <p className="text-gray-600 mb-8 text-sm">Submit websites for crawling or manage approvals as an Admin.</p>

        {/* User Submission Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-lg font-semibold mb-4">Submit a New Website</h2>
          <form onSubmit={handleSubmitUrl} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              placeholder="https://example.com"
              className="border rounded-lg px-4 py-2 w-full outline-none focus:border-blue-500"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-700 transition">
              Request Indexing
            </button>
          </form>
        </div>

        {/* Master Request List (Your Admin Dashboard View) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Live Review Queue (Admin Management)</h2>
          <div className="flex flex-col gap-4">
            {requests.length === 0 ? (
              <p className="text-gray-500 text-sm">No URLs submitted yet.</p>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col justify-between gap-4">
                  <div>
                    <p className="font-medium text-blue-800 break-all text-sm md:text-base">{req.requested_url}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        req.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{req.status}</span>
                      <span className="text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    {req.rejection_reason && (
                      <p className="mt-2 text-xs bg-red-50 text-red-700 p-2 rounded border border-red-100">
                        <strong>Reason for Rejection:</strong> {req.rejection_reason}
                      </p>
                    )}
                  </div>

                  {req.status === 'Pending' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(req.id, req.requested_url)}
                          className="bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-green-700"
                        >
                          Approve Site
                        </button>
                        <button 
                          onClick={() => setSelectedReqId(req.id)}
                          className="bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-red-700"
                        >
                          Reject...
                        </button>
                      </div>

                      {selectedReqId === req.id && (
                        <div className="mt-2 flex flex-col gap-2">
                          <input 
                            type="text" 
                            placeholder="Type reason (e.g., Low quality, broken layout)" 
                            className="border p-2 text-xs rounded outline-none w-full"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <button 
                            onClick={() => handleReject(req.id)}
                            className="bg-gray-800 text-white text-xs font-medium py-1 rounded"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
