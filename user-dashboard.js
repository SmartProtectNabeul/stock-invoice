// User Dashboard Module
class UserDashboard {
  constructor() {
    this.userStocks = [];
    this.userInvoices = [];
  }

  // Initialize user dashboard
  async init() {
    if (!authManager.getCurrentUser()) return;
    
    await this.loadUserStocks();
    await this.loadUserInvoices();
    this.setupEventListeners();
  }

  // Load user stocks
  async loadUserStocks() {
    const userId = authManager.getCurrentUser()?.id;
    if (!userId) return;

    const { data, error } = await supabaseClient
      .from('user_stocks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading stocks:', error);
      return;
    }

    this.userStocks = data || [];
    this.renderStocksTable();
  }

  // Load user invoices
  async loadUserInvoices() {
    const userId = authManager.getCurrentUser()?.id;
    if (!userId) return;

    const { data, error } = await supabaseClient
      .from('user_invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invoices:', error);
      return;
    }

    this.userInvoices = data || [];
    this.renderInvoicesTable();
  }

  // Add stock
  async addStock(stockData) {
    const userId = authManager.getCurrentUser()?.id;
    if (!userId) return;

    try {
      const { error } = await supabaseClient
        .from('user_stocks')
        .insert({
          user_id: userId,
          ...stockData,
          created_at: new Date(),
        });

      if (error) throw error;

      await this.loadUserStocks();
      this.showNotification('Stock added successfully', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error adding stock:', error);
      this.showNotification('Failed to add stock', 'error');
      return { error: error.message };
    }
  }

  // Update stock
  async updateStock(stockId, stockData) {
    try {
      const { error } = await supabaseClient
        .from('user_stocks')
        .update(stockData)
        .eq('id', stockId);

      if (error) throw error;

      await this.loadUserStocks();
      this.showNotification('Stock updated successfully', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error updating stock:', error);
      this.showNotification('Failed to update stock', 'error');
      return { error: error.message };
    }
  }

  // Delete stock
  async deleteStock(stockId) {
    try {
      const { error } = await supabaseClient
        .from('user_stocks')
        .delete()
        .eq('id', stockId);

      if (error) throw error;

      await this.loadUserStocks();
      this.showNotification('Stock deleted successfully', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error deleting stock:', error);
      this.showNotification('Failed to delete stock', 'error');
      return { error: error.message };
    }
  }

  // Create invoice
  async createInvoice(invoiceData) {
    const userId = authManager.getCurrentUser()?.id;
    if (!userId) return;

    try {
      const { error } = await supabaseClient
        .from('user_invoices')
        .insert({
          user_id: userId,
          ...invoiceData,
          created_at: new Date(),
        });

      if (error) throw error;

      await this.loadUserInvoices();
      this.showNotification('Invoice created successfully', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error creating invoice:', error);
      this.showNotification('Failed to create invoice', 'error');
      return { error: error.message };
    }
  }

  // Render stocks table
  renderStocksTable() {
    const container = document.getElementById('user-stocks-list');
    if (!container) return;

    if (this.userStocks.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No stocks yet. <a href="#" onclick="app.showAddStockForm()">Add Stock</a></div>';
      return;
    }

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.userStocks.map(stock => `
            <tr class="${stock.stock <= 10 ? 'stock-low' : stock.stock === 0 ? 'stock-out' : 'stock-ok'}">
              <td>${stock.name}</td>
              <td>${stock.category}</td>
              <td>${stock.price}</td>
              <td>${stock.stock}</td>
              <td>
                <button class="btn btn-info btn-sm" onclick="app.editStock('${stock.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="userDashboard.deleteStock('${stock.id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  // Render invoices table
  renderInvoicesTable() {
    const container = document.getElementById('user-invoices-list');
    if (!container) return;

    if (this.userInvoices.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No invoices yet. <a href="#" onclick="app.showCreateInvoiceForm()">Create Invoice</a></div>';
      return;
    }

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.userInvoices.map(invoice => `
            <tr>
              <td>${invoice.invoice_number}</td>
              <td>${invoice.client_name}</td>
              <td>${invoice.total_amount}</td>
              <td>${new Date(invoice.created_at).toLocaleDateString()}</td>
              <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
              <td>
                <button class="btn btn-info btn-sm" onclick="app.viewInvoice('${invoice.id}')">View</button>
                <button class="btn btn-warning btn-sm" onclick="app.printInvoice('${invoice.id}')">Print</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
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

  // Setup event listeners
  setupEventListeners() {
    // Add listeners for any stock/invoice interactions
  }
}

// Initialize user dashboard
const userDashboard = new UserDashboard();
