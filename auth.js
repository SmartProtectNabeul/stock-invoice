// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_v4jfvxw';
const EMAILJS_TEMPLATE_ID = 'template_ci6bo58';       // Admin notification template
const EMAILJS_USER_TEMPLATE_ID = 'template_l205taj';  // Send key to user template
const EMAILJS_PUBLIC_KEY = 'cQJtlQe-nDvVjCF20';
const ADMIN_EMAIL = 'ahmedmmidonajjar@gmail.com';

// Initialize EmailJS (v4 API)
if (typeof emailjs !== 'undefined') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

// Authentication Module
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
  }

  // Initialize auth state
  async init() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      console.log('Current session on init:', session ? 'exists' : 'none');
      
      if (session) {
        this.currentUser = session.user;
        await this.loadUserProfile();
      } else {
        this.currentUser = null;
        this.userProfile = null;
      }
    } catch (err) {
      console.error('Error getting session:', err);
      this.currentUser = null;
      this.userProfile = null;
    }
    
    this.setupAuthListener();
  }

  // Set up real-time auth listener
  setupAuthListener() {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, session ? 'has session' : 'no session');
      
      // Only update UI on auth change, don't auto-login
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          this.currentUser = session.user;
          await this.loadUserProfile();
        }
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.userProfile = null;
      }
      
      // Always update UI when auth state changes
      await this.updateUI();
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
      
      // Check if user is suspended - kick them out
      if (data && data.status === 'suspended') {
        console.warn('User is suspended, signing out:', data.email);
        await supabaseClient.auth.signOut();
        this.currentUser = null;
        this.userProfile = null;
        await this.updateUI();
        alert('Your account has been suspended. Please contact admin.');
      }
    }
  }

  // Send signup notification email to admin
  async sendSignupNotification(email) {
    try {
      if (typeof emailjs === 'undefined') {
        console.warn('EmailJS not loaded, skipping email notification');
        return;
      }
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        user_email: email,
        signup_date: new Date().toLocaleDateString('fr-FR', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        event_type: 'Inscription (Sign Up)',
        to_email: ADMIN_EMAIL
      });
      console.log('✅ Signup notification sent to admin');
    } catch (error) {
      console.error('⚠️ Failed to send signup notification:', error);
    }
  }

  // Send login notification email to admin
  async sendLoginNotification(email) {
    try {
      if (typeof emailjs === 'undefined') return;
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        user_email: email,
        signup_date: new Date().toLocaleDateString('fr-FR', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
        event_type: 'Connexion (Sign In)',
        to_email: ADMIN_EMAIL
      });
      console.log('✅ Login notification sent to admin');
    } catch (error) {
      console.error('⚠️ Failed to send login notification:', error);
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

      // Send signup notification to admin (async, don't wait)
      this.sendSignupNotification(email);

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

    console.log('Auth signin successful for user:', data.user.id, 'email:', data.user.email);

    // Check if account is approved
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('id, status, role, user_id, email')
      .eq('user_id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile query error details:', profileError.code, profileError.message, profileError.details);
      // Even if query fails, let them in but log the issue
      console.warn('Allowing login despite profile query error - user:', data.user.id);
      return { success: true, user: data.user };
    }

    if (!profile) {
      console.warn('User profile not found for user:', data.user.id, 'email:', email);
      await supabaseClient.auth.signOut();
      return { error: 'User profile not found. Please contact admin.' };
    }

    console.log('Profile found:', profile);

    if (profile.status !== 'approved') {
      console.warn('Account status not approved. Status:', profile.status);
      await supabaseClient.auth.signOut();
      return { error: `Your account is ${profile.status}. Please contact admin.` };
    }

    console.log('User approved! Status:', profile.status, 'Role:', profile.role);
    this.currentUser = data.user;
    await this.loadUserProfile();

    // Notify admin of login (fire-and-forget)
    this.sendLoginNotification(email);

    return { success: true, user: data.user };
  }

  // Sign out
  async signout() {
    try {
      // Sign out from Supabase first (it clears its own tokens)
      const { error } = await supabaseClient.auth.signOut();
      if (error) console.error('Signout error:', error);

      // Clear app data from localStorage (NOT all localStorage — that breaks Supabase cleanup)
      ['stockinvoice_products', 'stockinvoice_invoices', 'stockinvoice_company'].forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();

      this.currentUser = null;
      this.userProfile = null;

      return { success: true };
    } catch (err) {
      console.error('Signout error:', err);
      this.currentUser = null;
      this.userProfile = null;
      return { success: true };
    }
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

  // Submit an access request (anonymous user asking for a key)
  async submitKeyRequest(name, email) {
    try {
      // Block duplicate pending requests
      const { data: existing } = await supabaseClient
        .from('key_requests')
        .select('id, status')
        .eq('email', email)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (existing) {
        if (existing.status === 'approved') return { error: 'Une clé a déjà été envoyée à cet email.' };
        return { error: 'Une demande est déjà en attente pour cet email.' };
      }

      // Insert the request
      const { error } = await supabaseClient
        .from('key_requests')
        .insert({ name, email, status: 'pending' });

      if (error) throw error;

      // Notify admin by email
      if (typeof emailjs !== 'undefined') {
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          user_email: email,
          user_name: name,
          signup_date: new Date().toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          event_type: `Demande de clé d'accès de ${name}`,
          to_email: ADMIN_EMAIL
        }).catch(e => console.warn('Email admin failed:', e));
      }

      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  // Send the generated activation key to the user by email
  async sendKeyToUser(name, email, key) {
    console.log('🔵 sendKeyToUser called');
    console.log('   TO EMAIL (IMPORTANT):', email);
    console.log('   Key:', key);
    console.log('   Name:', name);
    
    if (typeof emailjs === 'undefined') {
      console.error('❌ EmailJS library not loaded. Check if script tag is in HTML.');
      throw new Error('EmailJS library not available - check browser console');
    }
    
    try {
      console.log('📧 Sending email via EmailJS...');
      console.log('   Service ID:', EMAILJS_SERVICE_ID);
      console.log('   Template ID:', EMAILJS_USER_TEMPLATE_ID);
      console.log('   ⚠️ VERIFY THIS EMAIL ADDRESS IS CORRECT IN CONSOLE:', email);
      
      const emailParams = {
        user_name: name,
        activation_key: key,
        to_email: email
      };
      
      console.log('   Full params object:', emailParams);
      
      const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_USER_TEMPLATE_ID, emailParams);
      
      console.log('✅ Email sent! Response:', result);
      console.log('✅ CHECK YOUR EMAIL:', email);
      return result;
    } catch (err) {
      console.error('❌ FAILED TO SEND EMAIL');
      console.error('Error message:', err.message);
      console.error('Error status:', err.status);
      console.error('Error response:', err.response);
      console.error('Full error:', err);
      throw err;
    }
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
