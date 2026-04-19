// Authentication Module
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
  }

  // Initialize auth state
  async init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      await this.loadUserProfile();
    }
    this.setupAuthListener();
  }

  // Set up real-time auth listener
  setupAuthListener() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        this.currentUser = session.user;
        await this.loadUserProfile();
        this.updateUI();
      } else {
        this.currentUser = null;
        this.userProfile = null;
        this.updateUI();
      }
    });
  }

  // Load user profile from database
  async loadUserProfile() {
    if (!this.currentUser) return;
    
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading profile:', error);
    } else {
      this.userProfile = data;
    }
  }

  // Sign up with activation key
  async signup(email, password, activationKey) {
    try {
      // Verify activation key
      const { data: keyData, error: keyError } = await supabaseClient
        .from('activation_keys')
        .select('*')
        .eq('key', activationKey)
        .eq('is_used', false)
        .single();

      if (keyError || !keyData) {
        return { error: 'Invalid or already used activation key' };
      }

      // Create auth user
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (error) return { error: error.message };

      // Create user profile with pending status
      await supabaseClient
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email,
          status: 'pending',
          activation_key_used: activationKey,
          created_at: new Date(),
        });

      // Mark activation key as used
      await supabaseClient
        .from('activation_keys')
        .update({ is_used: true, used_by: data.user.id })
        .eq('id', keyData.id);

      return { success: true, user: data.user };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Sign in
  async signin(email, password) {
    // Ensure clean session state before signin
    this.currentUser = null;
    this.userProfile = null;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    // Check if account is approved
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile query error:', profileError);
      await supabaseClient.auth.signOut();
      return { error: 'Failed to load user profile. Please try again.' };
    }

    if (!profile) {
      console.warn('User profile not found for user:', data.user.id);
      await supabaseClient.auth.signOut();
      return { error: 'User profile not found. Please contact admin.' };
    }

    if (profile.status !== 'approved') {
      await supabaseClient.auth.signOut();
      return { error: `Your account is ${profile.status}. Please contact admin.` };
    }

    return { success: true, user: data.user };
  }

  // Sign out
  async signout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) return { error: error.message };
    this.currentUser = null;
    this.userProfile = null;
    return { success: true };
  }

  // Update UI based on auth state
  async updateUI() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-btn');
    const userEmailSpan = document.getElementById('user-email');

    if (this.currentUser) {
      if (loginContainer) loginContainer.style.display = 'none';
      if (appContainer) appContainer.style.display = 'block';
      if (userEmailSpan) userEmailSpan.textContent = this.currentUser.email;
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      
      // Check if admin and show admin button
      const isAdmin = await this.isAdmin();
      if (adminBtn) {
        adminBtn.style.display = isAdmin ? 'inline-flex' : 'none';
      }
    } else {
      if (loginContainer) loginContainer.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (adminBtn) adminBtn.style.display = 'none';
    }
  }

  // Check if current user is admin
  async isAdmin() {
    if (!this.currentUser) return false;
    const { data } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', this.currentUser.id)
      .single();
    return data?.role === 'admin';
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get current user profile
  getUserProfile() {
    return this.userProfile;
  }
}

// Initialize auth manager
const authManager = new AuthManager();
