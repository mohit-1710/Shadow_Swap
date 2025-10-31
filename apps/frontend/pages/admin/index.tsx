import React from 'react';
import { UserAnalytics } from '../../components/UserAnalytics';
import { mockAdminAnalytics } from '../../lib/mocks';

export default function AdminDashboard() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Admin Dashboard <span style={{ fontSize: 12, color: '#6b7280' }}>(source: mock)</span></h2>
      <UserAnalytics users={mockAdminAnalytics} />
    </div>
  );
}
