// Admin Dashboard Module
class AdminDashboard {
  constructor() {
    this.pendingUsers = [];
    this.allUsers = [];
  }

  // Initialize admin dashboard
  async init() {
    // Check if user is admin
    const isAdmin = await authManager.isAdmin();
    if (!isAdmin) {
      console.warn('User is not admin');
      return;
    }

    this.setupEventListeners();
    await this.loadPendingUsers();
  }

  // Setup event listeners
  setupEventListeners() {
    const approveButtons = document.querySelectorAll('.btn-approve-user');
    const suspendButtons = document.querySelectorAll('.btn-suspend-user');
    const rejectButtons = document.querySelectorAll('.btn-reject-user');

    approveButtons.forEach(btn => {
      btn.addEventListener('click', () => this.approveUser(btn.dataset.userId));
    });

    suspendButtons.forEach(btn => {
      btn.addEventListener('click', () => this.suspendUser(btn.dataset.userId));
    });

    rejectButtons.forEach(btn => {
      btn.addEventListener('click', () => this.rejectUser(btn.dataset.userId));
    });
  }

  // Load pending users
  async loadPendingUsers() {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading pending users:', error);
      return;
    }

    this.pendingUsers = data || [];
    this.renderPendingUsers();
  }

  // Load all users
  async loadAllUsers() {
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
      return;
    }

    this.allUsers = data || [];
    this.renderAllUsers();
  }

  // Approve user
  async approveUser(userId) {
    try {
      // Update user profile status
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({ status: 'approved', approved_at: new Date() })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Get user email
      const user = this.pendingUsers.find(u => u.user_id === userId);
      if (user) {
        // Send welcome email
        await this.sendApprovalEmail(user.email, user.user_id);
      }

      // Reload pending users
      await this.loadPendingUsers();
      this.showNotification('User approved and email sent', 'success');
    } catch (error) {
      console.error('Error approving user:', error);
      this.showNotification('Failed to approve user', 'error');
    }
  }

  // Reject user
  async rejectUser(userId) {
    try {
      // Delete user auth
      const { error: deleteError } = await supabaseClient
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      await this.loadPendingUsers();
      this.showNotification('User rejected', 'success');
    } catch (error) {
      console.error('Error rejecting user:', error);
      this.showNotification('Failed to reject user', 'error');
    }
  }

  // Suspend user
  async suspendUser(userId) {
    try {
      const { error } = await supabaseClient
        .from('user_profiles')
        .update({ status: 'suspended' })
        .eq('user_id', userId);

      if (error) throw error;

      await this.loadAllUsers();
      this.showNotification('User suspended', 'success');
    } catch (error) {
      console.error('Error suspending user:', error);
      this.showNotification('Failed to suspend user', 'error');
    }
  }

  // Resume user (unsuspend)
  async resumeUser(userId) {
    try {
      const { error } = await supabaseClient
        .from('user_profiles')
        .update({ status: 'approved' })
        .eq('user_id', userId);

      if (error) throw error;

      await this.loadAllUsers();
      this.showNotification('User account restored', 'success');
    } catch (error) {
      console.error('Error resuming user:', error);
      this.showNotification('Failed to restore user account', 'error');
    }
  }

  // Send approval email via Supabase
  async sendApprovalEmail(email, userId) {
    try {
      // Call Supabase function or send via email service
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-approval-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userId }),
      });

      if (!response.ok) {
        console.warn('Email service unavailable, but user was approved');
      }
    } catch (error) {
      console.warn('Could not send email:', error);
    }
  }

  // Render pending users table
  renderPendingUsers() {
    const container = document.getElementById('pending-users-list');
    if (!container) return;

    if (this.pendingUsers.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No pending approvals</div>';
      return;
    }

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Requested</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.pendingUsers.map(user => `
            <tr>
              <td>${user.email}</td>
              <td>${new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                <button class="btn btn-success btn-sm btn-approve-user" data-user-id="${user.user_id}">Approve</button>
                <button class="btn btn-danger btn-sm btn-reject-user" data-user-id="${user.user_id}">Reject</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
    this.setupEventListeners();
  }

  // Render all users table
  renderAllUsers() {
    const container = document.getElementById('all-users-list');
    if (!container) return;

    if (this.allUsers.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No users found</div>';
      return;
    }

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.allUsers.map(user => `
            <tr>
              <td>${user.email}</td>
              <td>
                <span class="status-badge status-${user.status}">${user.status}</span>
              </td>
              <td>${new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                ${user.status === 'suspended' 
                  ? `<button class="btn btn-success btn-sm" onclick="adminDashboard.resumeUser('${user.user_id}')">Resume</button>`
                  : `<button class="btn btn-warning btn-sm btn-suspend-user" data-user-id="${user.user_id}">Suspend</button>`
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
    this.setupEventListeners();
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      background: ${type === 'success' ? 'var(--accent-success)' : type === 'error' ? 'var(--accent-danger)' : 'var(--accent-info)'};
      color: ${type === 'success' ? '#1a1d2e' : 'white'};
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

// Initialize admin dashboard
const adminDashboard = new AdminDashboard();
