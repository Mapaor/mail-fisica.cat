'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Users, Trash2, Shield, User as UserIcon, Mail, Calendar, AlertTriangle } from 'lucide-react';

interface UserProfile {
  id: string;
  alias: string;
  email: string;
  forward_to: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchUsers = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error connecting to API');
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove user from local state
        setUsers(users.filter(u => u.id !== userId));
        setShowDeleteConfirm(null);
        
        // Show warning if DNS deletion failed
        if (!data.dnsDeleted && data.dnsError) {
          setError(`User deleted, but DNS cleanup failed: ${data.dnsError}. You may need to manually remove the DNS record.`);
        }
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Error deleting user');
      console.error('Error deleting user:', err);
    } finally {
      setDeletingUserId(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="User Management" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </div>
    );
  }

  const regularUsers = users.filter(u => u.role === 'user');
  const adminUsers = users.filter(u => u.role === 'admin');

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="User Management" 
        onRefresh={() => fetchUsers(true)} 
        isRefreshing={isRefreshing}
      />
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">User Management</h3>
                <p className="text-sm text-blue-800">
                  Manage users in your system. Deleting a user will remove their account, emails, and Cloudflare DNS records.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{adminUsers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Regular Users</p>
                  <p className="text-2xl font-bold text-gray-900">{regularUsers.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Forward To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.role === 'admin' ? (
                              <Shield className="w-4 h-4 text-purple-600" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {user.alias}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.forward_to || (
                            <span className="text-gray-400 italic">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {user.role === 'user' && (
                            <>
                              {showDeleteConfirm === user.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-xs text-gray-600 mr-2">Delete {user.alias}?</span>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={deletingUserId === user.id}
                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {deletingUserId === user.id ? 'Deleting...' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    disabled={deletingUserId === user.id}
                                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  disabled={deletingUserId !== null}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-xs text-gray-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warning Note */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Important Notes</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Deleting a user will permanently remove their account and all associated emails</li>
                  <li>The corresponding Cloudflare DNS record will also be deleted</li>
                  <li>Admin accounts cannot be deleted from this interface</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
