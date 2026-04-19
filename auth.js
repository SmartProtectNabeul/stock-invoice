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
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    // Check if account is approved
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profile?.status !== 'approved') {
      await supabaseClient.auth.signOut();
      return { error: 'Your account is awaiting admin approval or has been suspended' };
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
  updateUI() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userEmailSpan = document.getElementById('user-email');

    if (this.currentUser) {
      if (loginContainer) loginContainer.style.display = 'none';
      if (appContainer) appContainer.style.display = 'block';
      if (userEmailSpan) userEmailSpan.textContent = this.currentUser.email;
      if (userMenuBtn) userMenuBtn.style.display = 'flex';
    } else {
      if (loginContainer) loginContainer.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
      if (userMenuBtn) userMenuBtn.style.display = 'none';
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
