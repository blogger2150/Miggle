'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);

    // 1. Log the query into search_logs for admin analytics
    await supabase.from('search_logs').insert([{ search_query: query }]);

    // 2. Check for Keyword Triggers / Custom Ranking Overrides
    const { data: triggerData } = await supabase
      .from('keyword_triggers')
      .select('*')
      .eq('keyword', query.toLowerCase())
      .single();

    // 3. Search the main index using standard text matching
    const { data: searchData, error } = await supabase
      .from('search_index')
      .select('*')
      .textSearch('body_text', query, { config: 'english' });

    let finalResults = searchData || [];

    // Apply Admin Boost Scores manually to rank pages higher
    finalResults = finalResults.sort((a, b) => (b.boost_score || 1) - (a.boost_score || 1));

    // If a manual keyword pin exists, put it at the absolute top
    if (triggerData) {
      finalResults = [
        {
          id: 'pinned',
          url: triggerData.target_url,
          title: `📌 ${triggerData.pinned_title}`,
          body_text: 'Featured result managed by Miggle Engine.',
        },
        ...finalResults,
      ];
    }

    setResults(finalResults);
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between">
      {/* Dynamic Layout styling changes based on whether user has searched */}
      <div className={`flex flex-col items-center px-4 w-full ${!hasSearched ? 'my-auto' : 'pt-8'}`}>
        
        {/* Miggle Branding */}
        <h1 className={`font-bold tracking-tight text-blue-600 ${!hasSearched ? 'text-7xl mb-8' : 'text-3xl mb-4 self-start md:ml-24'}`}>
          Miggle
        </h1>

        {/* Search Bar Container */}
        <form onSubmit={handleSearch} className={`w-full max-w-2xl flex items-center border hover:shadow-md focus-within:shadow-md rounded-full px-5 py-3 transition-all ${hasSearched && 'md:ml-24 self-start mb-8'}`}>
          <input
            type="text"
            className="w-full outline-none text-md bg-transparent"
            placeholder="Search the open web..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="text-gray-500 hover:text-blue-600 font-medium ml-2">
            Search
          </button>
        </form>

        {/* Search Results Display Area */}
        {hasSearched && (
          <div className="w-full max-w-2xl md:ml-24 self-start flex flex-col gap-6">
            {results.length > 0 ? (
              results.map((item) => (
                <div key={item.id} className="group">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 block truncate mb-1">
                    {item.url}
                  </a>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xl text-blue-800 font-medium group-hover:underline block mb-1">
                    {item.title}
                  </a>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {item.body_text}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No fair-play results found for "{query}". Try submitting this site via the Miggle Console!</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-3 text-center text-xs text-gray-500 border-t w-full">
        Miggle Search Engine Engine Engine — Built for Fair Web Visibility.
      </footer>
    </main>
  );
}
