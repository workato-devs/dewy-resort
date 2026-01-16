/**
 * ContactSearchCard Component
 * Allows managers to search for guest contacts in Salesforce
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, Mail, Phone, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  contact_type?: string;
  loyalty_number?: string;
  account_name?: string;
}

export function ContactSearchCard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: 'Search query required',
        description: 'Please enter a name or email to search',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch('/api/manager/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to search contacts');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to search contacts');
      }
      
      setResults(data.contacts || []);
      setUsingFallback(data.usingFallback || false);
      
      // Show appropriate toast based on whether we're using fallback data
      if (data.usingFallback) {
        toast({
          title: 'Using mock data',
          description: `Found ${data.contacts?.length || 0} contact${data.contacts?.length === 1 ? '' : 's'} (Salesforce unavailable: ${data.fallbackReason || 'API error'})`,
          variant: 'default',
        });
      } else if (data.contacts?.length === 0) {
        toast({
          title: 'No results found',
          description: 'Try searching with a different name or email',
        });
      } else {
        toast({
          title: 'Search complete',
          description: `Found ${data.contacts.length} contact${data.contacts.length === 1 ? '' : 's'}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: 'Search failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Guest Contact Search
          {usingFallback && (
            <Badge variant="secondary" className="text-xs">
              Mock Data
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {searched && !loading && !error && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No contacts found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 mb-2">
                  Found {results.length} contact{results.length !== 1 ? 's' : ''}
                </div>
                {results.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {contact.first_name} {contact.last_name}
                          </span>
                          {contact.contact_type && (
                            <Badge variant="secondary" className="text-xs">
                              {contact.contact_type}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{contact.email}</span>
                          </div>
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.account_name && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Account: {contact.account_name}
                            </div>
                          )}
                          {contact.loyalty_number && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              Loyalty: {contact.loyalty_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Search for guest contacts</p>
            <p className="text-sm mt-1">Enter a name or email to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
