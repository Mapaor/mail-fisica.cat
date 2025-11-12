'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import EmailList from '@/components/EmailList';
import EmailDetail from '@/components/EmailDetail';
import { Email } from '@/lib/types';

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEmails = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await fetch('/api/emails?type=incoming');
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleEmailClick = async (email: Email) => {
    setSelectedEmail(email);

    // Mark as read if it's unread
    if (!email.is_read) {
      try {
        await fetch('/api/emails', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: email.id, is_read: true }),
        });

        // Update local state
        setEmails(emails.map(e => 
          e.id === email.id ? { ...e, is_read: true } : e
        ));
      } catch (error) {
        console.error('Error marking email as read:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Inbox" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading emails...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Inbox" 
        onRefresh={() => fetchEmails(true)} 
        isRefreshing={isRefreshing}
      />
      
      <div className="flex-1 overflow-hidden flex">
        {/* Email List */}
        <div className="w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <EmailList 
            emails={emails}
            onEmailClick={handleEmailClick}
            selectedEmailId={selectedEmail?.id}
          />
        </div>

        {/* Email Detail */}
        <div className="flex-1 overflow-hidden">
          {selectedEmail ? (
            <EmailDetail 
              email={selectedEmail}
              onClose={() => setSelectedEmail(null)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>Select an email to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
