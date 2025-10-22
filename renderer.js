const { ipcRenderer } = require("electron");
const AudioRecorder = require("./services/audio-recorder");

class SkillEdgeApp {
  constructor() {
    this.audioRecorder = new AudioRecorder();
    this.isRecording = false;
    this.isLoggedIn = false;
    this.conversationHistory = [];
    this.currentUser = null;
    this.audioInitialized = false; // Track if audio is initialized

    // User preferences
    this.userPreferences = {
      userName: "",
      meetingPurpose: "",
      generalInfo: "",
      selectedLanguage: "en",
      interviewType: "",
    };
    this.preferencesSaved = false;

    this.initializeElements();
    this.setupEventListeners();

    // Startup loading screen is already active from HTML
    // Start initialization after a brief moment to ensure UI is rendered
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.initializeApp();
      }, 100);
    });
  }

  async initializeApp() {
    try {
      // Always show login screen first - let user decide
      // Session will be checked when they try to login
      this.hideStartupLoading();
    } catch (error) {
      console.error("App initialization error:", error);
      this.hideStartupLoading();
    }
  }

  hideStartupLoading() {
    this.startupLoadingScreen.classList.remove("active");
    // Always show login screen on startup
    this.showLoginScreen();
  }

  // Session persistence methods
  saveSession() {
    if (this.isLoggedIn && this.currentUser) {
      const sessionData = {
        isLoggedIn: this.isLoggedIn,
        currentUser: this.currentUser,
        userPreferences: this.userPreferences,
        preferencesSaved: this.preferencesSaved,
        timestamp: Date.now(),
      };
      localStorage.setItem("skilledge_session", JSON.stringify(sessionData));
      console.log("Session saved");
    }
  }

  loadSavedSession() {
    try {
      const savedSession = localStorage.getItem("skilledge_session");
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);

        // Check if session is not too old (24 hours)
        const sessionAge = Date.now() - sessionData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (
          sessionAge < maxAge &&
          sessionData.isLoggedIn &&
          sessionData.currentUser
        ) {
          this.isLoggedIn = sessionData.isLoggedIn;
          this.currentUser = sessionData.currentUser;
          this.userPreferences = sessionData.userPreferences || {};
          this.preferencesSaved = sessionData.preferencesSaved || false;

          console.log("Session restored:", this.currentUser.email);

          // If preferences are saved, go directly to main screen
          if (this.preferencesSaved) {
            this.showMainScreen();
          } else {
            this.showPreferencesScreen();
          }

          this.updateUserInfo();
          return true;
        } else {
          // Session expired, clear it
          this.clearSession();
        }
      }
    } catch (error) {
      console.error("Error loading saved session:", error);
      this.clearSession();
    }
    return false;
  }

  clearSession() {
    localStorage.removeItem("skilledge_session");
    this.isLoggedIn = false;
    this.currentUser = null;
    this.userPreferences = {};
    this.preferencesSaved = false;
    console.log("Session cleared");
  }

  openPricingPage() {
    // Open SkillEdge pricing page in default browser
    ipcRenderer.invoke("open-external-url", "https://skilledge.space/pricing");
  }

  // Resize window based on conversation length
  async resizeWindowForConversation() {
    try {
      const conversationCount = this.conversationHistory.length;
      await ipcRenderer.invoke("resize-for-conversation", {
        conversationCount: Math.floor(conversationCount / 2), // Count conversation pairs
      });
    } catch (error) {
      console.error("Error resizing window:", error);
    }
  }

  initializeElements() {
    // Screens
    this.startupLoadingScreen = document.getElementById("startupLoadingScreen");
    this.loginScreen = document.getElementById("loginScreen");
    this.registerScreen = document.getElementById("registerScreen");
    this.verificationScreen = document.getElementById("verificationScreen");
    this.upgradeRequiredScreen = document.getElementById(
      "upgradeRequiredScreen"
    );
    this.preferencesScreen = document.getElementById("preferencesScreen");
    this.interviewTypeScreen = document.getElementById("interviewTypeScreen");
    this.mainScreen = document.getElementById("mainScreen");

    // Login elements
    this.loginForm = document.getElementById("loginForm");
    this.emailInput = document.getElementById("emailInput");
    this.passwordInput = document.getElementById("passwordInput");
    this.loginBtn = document.getElementById("loginBtn");
    this.loginError = document.getElementById("loginError");

    // Registration elements
    this.registerForm = document.getElementById("registerForm");
    this.firstNameInput = document.getElementById("firstNameInput");
    this.lastNameInput = document.getElementById("lastNameInput");
    this.registerEmailInput = document.getElementById("registerEmailInput");
    this.registerPasswordInput = document.getElementById(
      "registerPasswordInput"
    );
    this.registerBtn = document.getElementById("registerBtn");
    this.registerError = document.getElementById("registerError");

    // Verification elements
    this.verificationForm = document.getElementById("verificationForm");
    this.verifyEmailInput = document.getElementById("verifyEmailInput");
    this.verificationCodeInput = document.getElementById(
      "verificationCodeInput"
    );
    this.verifyBtn = document.getElementById("verifyBtn");
    this.verificationError = document.getElementById("verificationError");

    // Auth switch links
    this.showRegisterLink = document.getElementById("showRegisterLink");
    this.showLoginLink = document.getElementById("showLoginLink");
    this.resendVerificationLink = document.getElementById(
      "resendVerificationLink"
    );

    // Main interface elements
    this.recordingDot = document.getElementById("recordingDot");
    this.minutesDisplay = document.getElementById("minutesDisplay");
    this.responseContent = document.getElementById("responseContent");
    this.clearBtn = document.getElementById("clearBtn");

    // New interview layout elements
    this.audioContent = document.getElementById("audioContent");
    this.aiAnswerPopup = document.getElementById("aiAnswerPopup");
    this.closePopup = document.getElementById("closePopup");
    this.answerText = document.getElementById("answerText");
    this.tabBtns = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");
    this.recordedAudioSection = document.querySelector(
      ".recorded-audio-section"
    );

    // New settings elements
    this.settingsContainer = document.getElementById("settingsContainer");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.settingsDropdown = document.getElementById("settingsDropdown");
    this.settingsEmail = document.getElementById("settingsEmail");
    this.settingsPlan = document.getElementById("settingsPlan");
    this.settingsLogout = document.getElementById("settingsLogout");

    // Title bar elements
    this.minimizeBtn = document.getElementById("minimizeBtn");
    this.closeBtn = document.getElementById("closeBtn");

    // Preferences elements
    this.userNameInput = document.getElementById("userNameInput");
    this.meetingPurposeInput = document.getElementById("meetingPurposeInput");
    this.selectedLanguageInput = document.getElementById(
      "selectedLanguageInput"
    );
    this.generalInfoInput = document.getElementById("generalInfoInput");
    this.savePreferencesBtn = document.getElementById("savePreferencesBtn");
    this.preferencesError = document.getElementById("preferencesError");

    // Interview type elements
    this.interviewTypeCards = document.querySelectorAll(".interview-type-card");

    // Upgrade required elements
    this.goToPricingBtn = document.getElementById("goToPricingBtn");
    this.loginAfterUpgradeBtn = document.getElementById("loginAfterUpgradeBtn");

    // Loading overlay
    this.loadingOverlay = document.getElementById("loadingOverlay");
  }

  setupEventListeners() {
    // Title bar buttons
    this.minimizeBtn.addEventListener("click", () => {
      ipcRenderer.invoke("minimize-window");
    });

    this.closeBtn.addEventListener("click", () => {
      ipcRenderer.invoke("close-window");
    });

    // Login form
    this.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Registration form
    this.registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Verification form
    this.verificationForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleVerification();
    });

    // Auth switch links
    this.showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      this.showRegisterScreen();
    });

    this.showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      this.showLoginScreen();
    });

    this.resendVerificationLink.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleResendVerification();
    });

    // Main interface buttons
    this.clearBtn.addEventListener("click", () => {
      this.clearResponses();
    });

    // Tab switching for AI answer popup
    this.tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        this.switchTab(tabName);
      });
    });

    // Close popup button
    this.closePopup.addEventListener("click", () => {
      this.closeAIAnswerPopup();
    });

    // New settings dropdown functionality
    this.settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSettingsDropdown();
    });

    this.settingsLogout.addEventListener("click", () => {
      this.handleLogout();
      this.hideSettingsDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.settingsContainer.contains(e.target)) {
        this.hideSettingsDropdown();
      }
    });

    // Preferences form
    this.savePreferencesBtn.addEventListener("click", () => {
      this.handleSavePreferences();
    });

    // Interview type selection
    this.interviewTypeCards.forEach((card) => {
      card.addEventListener("click", () => {
        const type = card.getAttribute("data-type");
        this.handleInterviewTypeSelection(type);
      });
    });

    // Upgrade required buttons
    this.goToPricingBtn.addEventListener("click", () => {
      this.openPricingPage();
    });

    this.loginAfterUpgradeBtn.addEventListener("click", () => {
      this.showLoginScreen();
    });

    // Space key event listener for recording - multiple listeners for reliability
    const handleSpaceKey = (e) => {
      // Only handle space key when not in input fields
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // Only on main screen
      if (!this.mainScreen.classList.contains("active")) {
        return;
      }

      // Check for spacebar - multiple checks for compatibility
      const isSpace =
        e.code === "Space" ||
        e.key === " " ||
        e.key === "Spacebar" ||
        e.keyCode === 32 ||
        e.which === 32;

      if (isSpace) {
        e.preventDefault();
        e.stopPropagation();

        console.log(
          "Spacebar pressed - isLoggedIn:",
          this.isLoggedIn,
          "isRecording:",
          this.isRecording
        );
        this.handleSpacebarPress();
      }
    };

    // Add listener to both document and window for maximum compatibility
    document.addEventListener("keydown", handleSpaceKey);
    window.addEventListener("keydown", handleSpaceKey);
    document.body.addEventListener("keydown", handleSpaceKey);

    // Window focus events
    window.addEventListener("focus", () => {
      console.log("Window focused - ready for spacebar");
      this.onWindowFocus();
    });

    window.addEventListener("blur", () => {
      this.onWindowBlur();
    });

    // Ensure window can receive keyboard events
    window.focus();
    document.body.focus();
    document.body.tabIndex = -1; // Make body focusable
  }

  async initializeAudio() {
    if (this.audioInitialized) {
      return true; // Already initialized
    }

    try {
      const success = await this.audioRecorder.initialize();
      if (success) {
        console.log("Audio recorder initialized successfully");
        this.audioInitialized = true;

        // Setup audio recorder callbacks
        this.audioRecorder.onStop = (audioBlob) => {
          this.handleAudioRecorded(audioBlob);
        };
        return true;
      } else {
        console.error("Failed to initialize audio recorder");
        this.showError(
          "Failed to initialize audio recording. Please check microphone permissions."
        );
        return false;
      }
    } catch (error) {
      console.error("Audio initialization error:", error);
      this.showError(
        "Audio initialization failed. Please check microphone permissions."
      );
      return false;
    }
  }

  async checkLoginStatusAsync() {
    try {
      // First try to load saved session (fast, no network)
      const sessionLoaded = this.loadSavedSession();
      if (sessionLoaded) {
        console.log("Session loaded from cache, skipping API check");
        return;
      }

      // Only if no saved session, check with API (slow)
      console.log("No saved session, checking with API...");
      const result = await ipcRenderer.invoke("get-profile");
      console.log("Profile check result:", result);

      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn =
          result.user.subscription &&
          ["pro", "pro+"].includes(result.user.subscription.plan.toLowerCase());

        if (this.isLoggedIn) {
          this.showMainScreen();
          this.updateUserInfo();
        } else {
          // Already showing login screen from constructor
        }
      } else {
        // Already showing login screen from constructor
      }
    } catch (error) {
      console.error("Login status check failed:", error);
      // Already showing login screen from constructor
    }
  }

  async handleLogin() {
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!email || !password) {
      this.showError("Please enter both email and password");
      return;
    }

    this.showLoading(true);
    this.loginBtn.disabled = true;

    try {
      console.log("Attempting login with:", { email, password: "***" });
      const result = await ipcRenderer.invoke("user-login", {
        email,
        password,
      });
      console.log("Login result:", result);

      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn =
          result.user.subscription &&
          ["pro", "pro+"].includes(result.user.subscription.plan.toLowerCase());

        console.log("User subscription:", result.user.subscription);
        console.log("Is logged in:", this.isLoggedIn);

        if (this.isLoggedIn) {
          // Make window transparent after login
          ipcRenderer.invoke("make-window-transparent");
          this.showPreferencesScreen();
          this.updateUserInfo();
          this.hideError();

          // Save session for persistence
          this.saveSession();
        } else {
          this.showError(
            "This app is only available for Pro and Pro+ subscribers"
          );
        }
      } else {
        console.error("Login failed:", result.error);
        this.showError(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      this.showError("Login failed. Please try again.");
    } finally {
      this.showLoading(false);
      this.loginBtn.disabled = false;
    }
  }

  async handleRegister() {
    const firstName = this.firstNameInput.value.trim();
    const lastName = this.lastNameInput.value.trim();
    const email = this.registerEmailInput.value.trim();
    const password = this.registerPasswordInput.value;

    if (!firstName || !lastName || !email || !password) {
      this.showError("Please fill in all fields", "register");
      return;
    }

    if (password.length < 6) {
      this.showError("Password must be at least 6 characters", "register");
      return;
    }

    this.showLoading(true, "Creating account...");
    this.registerBtn.disabled = true;

    try {
      console.log("Attempting registration with:", {
        firstName,
        lastName,
        email,
        password: "***",
      });
      const result = await ipcRenderer.invoke("user-register", {
        firstName,
        lastName,
        email,
        password,
      });
      console.log("Registration result:", result);

      if (result.success) {
        this.hideError();
        if (result.verificationCode) {
          // Show verification code in console for development
          console.log(
            `Verification code for ${email}: ${result.verificationCode}`
          );
          alert(
            `Verification code: ${result.verificationCode}\n\nCheck console for development mode.`
          );
        }
        this.showVerificationScreen(email);
      } else {
        this.showError(result.error || "Registration failed", "register");
      }
    } catch (error) {
      console.error("Registration error:", error);
      this.showError("Registration failed. Please try again.", "register");
    } finally {
      this.showLoading(false);
      this.registerBtn.disabled = false;
    }
  }

  async handleVerification() {
    const email = this.verifyEmailInput.value.trim();
    const code = this.verificationCodeInput.value.trim();

    if (!email || !code) {
      this.showError("Please enter verification code", "verification");
      return;
    }

    this.showLoading(true, "Verifying email...");
    this.verifyBtn.disabled = true;

    try {
      console.log("Attempting email verification with:", { email, code });
      const result = await ipcRenderer.invoke("verify-email", { email, code });
      console.log("Verification result:", result);

      if (result.success) {
        this.currentUser = result.user;
        this.isLoggedIn =
          result.user.subscription &&
          ["pro", "pro+"].includes(result.user.subscription.plan.toLowerCase());

        console.log("User subscription:", result.user.subscription);
        console.log("Is logged in:", this.isLoggedIn);

        if (this.isLoggedIn) {
          // Make window transparent after login
          ipcRenderer.invoke("make-window-transparent");
          this.showPreferencesScreen();
          this.updateUserInfo();
          this.hideError();
        } else {
          // Show upgrade required screen instead of error
          this.showUpgradeRequiredScreen();
        }
      } else {
        this.showError(result.error || "Verification failed", "verification");
      }
    } catch (error) {
      console.error("Verification error:", error);
      this.showError("Verification failed. Please try again.", "verification");
    } finally {
      this.showLoading(false);
      this.verifyBtn.disabled = false;
    }
  }

  async handleResendVerification() {
    const email = this.verifyEmailInput.value.trim();
    if (!email) {
      this.showError("Email is required", "verification");
      return;
    }

    this.showLoading(true, "Resending verification...");

    try {
      // For now, just show a message - you can implement resend functionality later
      alert("Verification code resend functionality will be implemented soon.");
    } catch (error) {
      console.error("Resend verification error:", error);
      this.showError("Failed to resend verification code", "verification");
    } finally {
      this.showLoading(false);
    }
  }

  async handleLogout() {
    try {
      await ipcRenderer.invoke("user-logout");
      this.isLoggedIn = false;
      this.currentUser = null;
      this.conversationHistory = [];
      this.settingsContainer.style.display = "none";
      this.hideSettingsDropdown();

      // Stop usage update timer
      this.stopUsageUpdateTimer();

      // Clear saved session
      this.clearSession();

      this.showLoginScreen();
      this.clearResponses();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  showLoginScreen() {
    this.startupLoadingScreen.classList.remove("active");
    this.loginScreen.classList.add("active");
    this.registerScreen.classList.remove("active");
    this.verificationScreen.classList.remove("active");
    this.upgradeRequiredScreen.classList.remove("active");
    this.preferencesScreen.classList.remove("active");
    this.interviewTypeScreen.classList.remove("active");
    this.mainScreen.classList.remove("active");
    this.emailInput.value = "";
    this.passwordInput.value = "";
    this.hideError();

    // Resize window for login screen (no delay on initial startup)
    ipcRenderer.invoke("resize-for-screen", { screen: "login" });
  }

  showRegisterScreen() {
    this.loginScreen.classList.remove("active");
    this.registerScreen.classList.add("active");
    this.verificationScreen.classList.remove("active");
    this.upgradeRequiredScreen.classList.remove("active");
    this.preferencesScreen.classList.remove("active");
    this.interviewTypeScreen.classList.remove("active");
    this.mainScreen.classList.remove("active");
    this.firstNameInput.value = "";
    this.lastNameInput.value = "";
    this.registerEmailInput.value = "";
    this.registerPasswordInput.value = "";
    this.hideError();

    // Resize window for register screen (with small delay to prevent glitch)
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "register" });
    }, 50);
  }

  showVerificationScreen(email) {
    this.loginScreen.classList.remove("active");
    this.registerScreen.classList.remove("active");
    this.verificationScreen.classList.add("active");
    this.upgradeRequiredScreen.classList.remove("active");
    this.preferencesScreen.classList.remove("active");
    this.interviewTypeScreen.classList.remove("active");
    this.mainScreen.classList.remove("active");
    this.verifyEmailInput.value = email;
    this.verificationCodeInput.value = "";
    this.hideError();

    // Resize window for verification screen (with small delay to prevent glitch)
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "verification" });
    }, 50);
  }

  showPreferencesScreen() {
    this.startupLoadingScreen.classList.remove("active");
    this.loginScreen.classList.remove("active");
    this.registerScreen.classList.remove("active");
    this.verificationScreen.classList.remove("active");
    this.upgradeRequiredScreen.classList.remove("active");
    this.preferencesScreen.classList.add("active");
    this.interviewTypeScreen.classList.remove("active");
    this.mainScreen.classList.remove("active");

    // Resize window for preferences screen
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "preferences" });
    }, 50);
  }

  showUpgradeRequiredScreen() {
    this.loginScreen.classList.remove("active");
    this.registerScreen.classList.remove("active");
    this.verificationScreen.classList.remove("active");
    this.upgradeRequiredScreen.classList.add("active");
    this.preferencesScreen.classList.remove("active");
    this.interviewTypeScreen.classList.remove("active");
    this.mainScreen.classList.remove("active");

    // Resize window for upgrade screen
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "upgrade" });
    }, 50);
  }

  showInterviewTypeScreen() {
    this.loginScreen.classList.remove("active");
    this.registerScreen.classList.remove("active");
    this.verificationScreen.classList.remove("active");
    this.upgradeRequiredScreen.classList.remove("active");
    this.preferencesScreen.classList.remove("active");
    this.interviewTypeScreen.classList.add("active");
    this.mainScreen.classList.remove("active");

    // Resize window for interview type screen
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "interviewType" });
    }, 50);
  }

  showMainScreen() {
    this.startupLoadingScreen.classList.remove("active");
    this.loginScreen.classList.remove("active");
    this.registerScreen.classList.remove("active");
    this.verificationScreen.classList.remove("active");
    this.upgradeRequiredScreen.classList.remove("active");
    this.preferencesScreen.classList.remove("active");
    this.interviewTypeScreen.classList.remove("active");
    this.mainScreen.classList.add("active");

    // Show settings icon after login
    this.settingsContainer.style.display = "block";
    this.updateSettingsInfo();

    // Start usage display updates
    this.startUsageUpdateTimer();

    // Clear audio content and hide popup on startup
    this.audioContent.innerHTML = `
      <div class="audio-placeholder">
        <p>Press SPACE to start recording</p>
      </div>
    `;
    this.aiAnswerPopup.classList.remove("active");

    // Ensure window is focused and ready to receive keyboard events
    setTimeout(() => {
      window.focus();
      document.body.focus();
      document.body.click(); // Trigger focus
    }, 50);

    // Resize window to fit ONLY the audio section (no extra space)
    setTimeout(() => {
      const audioHeight = this.recordedAudioSection.offsetHeight || 180;
      const totalHeight = audioHeight + 60; // +60 for title bar and padding

      ipcRenderer.invoke("resize-with-height", {
        width: 700,
        height: Math.max(totalHeight, 200), // Min 200px
      });
    }, 100);
  }

  updateUserInfo() {
    // User info display removed - no status bar
  }

  async updateUsageDisplay() {
    try {
      const result = await ipcRenderer.invoke("get-usage");

      if (result.success) {
        if (result.isUnlimited) {
          this.minutesDisplay.textContent = "∞ min";
          this.minutesDisplay.classList.add("unlimited");
          this.minutesDisplay.style.color = "";
        } else {
          const minutes = result.minutesLeft || 0;
          this.minutesDisplay.textContent = `${minutes} min`;
          this.minutesDisplay.classList.remove("unlimited");

          // Show warning colors
          if (minutes <= 5 && minutes > 0) {
            this.minutesDisplay.style.color = "#f59e0b"; // Orange warning
          } else if (minutes === 0) {
            this.minutesDisplay.style.color = "#ef4444"; // Red when depleted
          } else {
            this.minutesDisplay.style.color = "";
          }
        }
      } else {
        console.error("Failed to get usage:", result.error);
        this.minutesDisplay.textContent = "-- min";
      }
    } catch (error) {
      console.error("Error updating usage display:", error);
      this.minutesDisplay.textContent = "-- min";
    }
  }

  async consumeOneMinuteAndUpdate() {
    try {
      // Consume 60 seconds from database
      const result = await ipcRenderer.invoke("update-usage", { seconds: 60 });

      if (result.success) {
        // Update current user data from response
        if (result.user) {
          this.currentUser = result.user;
          this.updateSettingsInfo();
        }
      }

      // Fetch updated value from database and display
      await this.updateUsageDisplay();
    } catch (error) {
      console.error("Error consuming minute:", error);
    }
  }

  startUsageUpdateTimer() {
    // Clear any existing timer
    if (this.usageUpdateTimer) {
      clearInterval(this.usageUpdateTimer);
    }

    // Get initial value from database and display immediately
    this.updateUsageDisplay();

    // Every 1 minute: consume 60 seconds from DB, then fetch and display updated value
    this.usageUpdateTimer = setInterval(() => {
      this.consumeOneMinuteAndUpdate();
    }, 60000); // Every 1 minute (60000ms)
  }

  stopUsageUpdateTimer() {
    if (this.usageUpdateTimer) {
      clearInterval(this.usageUpdateTimer);
      this.usageUpdateTimer = null;
    }
    // Reset color
    this.minutesDisplay.style.color = "";
  }

  updateSettingsInfo() {
    if (this.currentUser) {
      this.settingsEmail.textContent = this.currentUser.email;
      this.settingsPlan.textContent =
        this.currentUser.subscription?.plan || "Free";
    }
  }

  toggleSettingsDropdown() {
    this.settingsDropdown.classList.toggle("show");
  }

  hideSettingsDropdown() {
    this.settingsDropdown.classList.remove("show");
  }

  showInstantLoading() {
    // Show loading indicator in audio content
    this.audioContent.innerHTML = `
      <div style="text-align: center; padding: 12px; color: #94a3b8; font-size: 12px;">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Processing audio...</p>
      </div>
    `;
  }

  handleSpacebarPress() {
    console.log(
      "Spacebar pressed - isLoggedIn:",
      this.isLoggedIn,
      "isRecording:",
      this.isRecording
    );

    if (this.isLoggedIn) {
      this.toggleRecording();
    } else {
      console.log("Not logged in - spacebar ignored");
    }
  }

  toggleRecording() {
    if (!this.isLoggedIn) return;

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    console.log(
      "startRecording called - isLoggedIn:",
      this.isLoggedIn,
      "isRecording:",
      this.isRecording
    );
    if (!this.isLoggedIn || this.isRecording) return;

    // Check if user has minutes left (except unlimited)
    const minutesLeft = Number(
      this.currentUser?.subscription?.minutesLeft ?? 0
    );
    const isUnlimited =
      minutesLeft === -1 || this.currentUser?.subscription?.plan === "pro+";

    if (!isUnlimited && minutesLeft <= 0) {
      this.audioContent.innerHTML = `
        <div class="audio-placeholder" style="color: #ef4444;">
          <p><i class="fas fa-exclamation-triangle"></i> No minutes left</p>
          <p style="font-size: 11px; opacity: 0.8;">Please top up or upgrade your plan</p>
        </div>
      `;
      return;
    }

    // Lazy initialize audio on first use
    if (!this.audioInitialized) {
      console.log("Audio not initialized yet, initializing now...");
      const initialized = await this.initializeAudio();
      if (!initialized) {
        console.error("Failed to initialize audio");
        return;
      }
    }

    try {
      const success = this.audioRecorder.startRecording();
      console.log("Audio recorder start result:", success);
      if (success) {
        this.isRecording = true;
        this.updateRecordingUI();
        console.log("Recording started successfully");
      } else {
        this.showError("Failed to start recording");
      }
    } catch (error) {
      console.error("Recording start error:", error);
      this.showError("Failed to start recording");
    }
  }

  async stopRecording() {
    console.log("stopRecording called - isRecording:", this.isRecording);
    if (!this.isRecording) return;

    try {
      const success = this.audioRecorder.stopRecording();
      console.log("Audio recorder stop result:", success);
      if (success) {
        this.isRecording = false;
        this.updateRecordingUI();
        console.log("Recording stopped successfully");

        // Show loading indicator instantly when recording stops
        this.showInstantLoading();
      } else {
        this.showError("Failed to stop recording");
      }
    } catch (error) {
      console.error("Recording stop error:", error);
      this.showError("Failed to stop recording");
    }
  }

  async handleAudioRecorded(audioBlob) {
    if (!this.isLoggedIn) return;

    try {
      // Estimate seconds from audio blob size (similar to web client)
      let approxSeconds = Math.max(1, Math.round(audioBlob.size / 4096));
      const duration = await this.audioRecorder.getAudioDuration(audioBlob);

      // Use actual duration if available, otherwise use estimate
      const actualSeconds = duration || approxSeconds;

      // Get real transcription
      const transcript = await this.transcribeAudio(audioBlob);

      if (transcript && transcript.trim().length > 0) {
        // Show question immediately
        this.displayQuestionInstantly(transcript);

        // Generate AI response with animation
        await this.generateAIResponseWithAnimation(transcript);

        // Update usage with seconds (not minutes)
        await this.updateUsage(actualSeconds);
      } else {
        // No valid transcript received - just don't do anything
        console.log("No valid transcript received, skipping processing");
      }
    } catch (error) {
      console.error("Audio processing error:", error);
      this.showError("Failed to process audio. Please try again.");
    }
  }

  async transcribeAudio(audioBlob) {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      const audioFile = new File([audioBlob], "audio.webm", {
        type: "audio/webm",
      });
      formData.append("file", audioFile);
      formData.append("model", "whisper-1");

      // Add language support if available
      if (this.userPreferences?.selectedLanguage) {
        formData.append("language", this.userPreferences.selectedLanguage);
      }

      // Send to SkillEdge backend transcription endpoint with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for longer recordings

      const response = await fetch(
        "https://monkfish-app-nnhdy.ondigitalocean.app/api/ai/transcribe",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.text && result.text.trim().length > 0) {
          console.log("Transcription successful:", result.text);
          return result.text.trim();
        } else {
          console.warn("Empty transcription result");
          return null;
        }
      } else {
        console.error(`Transcription API error: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error("Transcription error:", error);
      return null;
    }
  }

  async generateAIResponseWithAnimation(transcript) {
    try {
      const result = await ipcRenderer.invoke("generate-ai-response", {
        transcript,
        userName:
          this.userPreferences?.userName ||
          this.currentUser.email.split("@")[0],
        meetingPurpose: this.userPreferences?.meetingPurpose || "",
        generalInfo: this.userPreferences?.generalInfo || "",
        selectedLanguage: this.userPreferences?.selectedLanguage || "en",
        interviewType: this.userPreferences?.interviewType || "general",
        conversationHistory: this.conversationHistory,
      });

      if (result.success) {
        // Add to conversation history
        this.conversationHistory.push({
          role: "user",
          content: transcript,
        });

        this.conversationHistory.push({
          role: "assistant",
          content: result.response,
        });

        // Resize window based on conversation length
        this.resizeWindowForConversation();

        // Animate the AI response
        this.animateAIResponse(result.response);
      } else {
        this.showError(result.error || "Failed to generate AI response");
      }
    } catch (error) {
      console.error("AI response error:", error);
      this.showError("Failed to generate AI response");
    }
  }

  async generateAIResponse(transcript) {
    try {
      const result = await ipcRenderer.invoke("generate-ai-response", {
        transcript,
        userName:
          this.userPreferences?.userName ||
          this.currentUser.email.split("@")[0],
        meetingPurpose: this.userPreferences?.meetingPurpose || "",
        generalInfo: this.userPreferences?.generalInfo || "",
        selectedLanguage: this.userPreferences?.selectedLanguage || "en",
        interviewType: this.userPreferences?.interviewType || "general",
        conversationHistory: this.conversationHistory,
      });

      if (result.success) {
        // Add to conversation history
        this.conversationHistory.push({
          role: "user",
          content: transcript,
        });

        this.conversationHistory.push({
          role: "assistant",
          content: result.response,
        });

        // Resize window based on conversation length
        this.resizeWindowForConversation();

        // Display the response
        this.displayResponse(transcript, result.response);
      } else {
        this.showError(result.error || "Failed to generate AI response");
      }
    } catch (error) {
      console.error("AI response error:", error);
      this.showError("Failed to generate AI response");
    }
  }

  animateAIResponse(response) {
    // Show the AI answer popup with the response
    // Extract a summary as the "question" from conversation history
    let summary = "Your Question";
    if (this.conversationHistory.length >= 2) {
      const lastUserMessage =
        this.conversationHistory[this.conversationHistory.length - 2].content;
      summary = lastUserMessage.substring(0, 100); // First 100 chars as summary
      if (lastUserMessage.length > 100) summary += "...";
    }

    this.showAIAnswerPopup(summary, response);
  }

  async updateUsage(secondsUsed) {
    try {
      const result = await ipcRenderer.invoke("update-usage", {
        seconds: secondsUsed,
      });
      if (result.success) {
        // Update current user data from response
        if (result.user) {
          this.currentUser = result.user;
          this.updateSettingsInfo();
        }
        // Update the minutes display immediately after usage is consumed
        this.updateUsageDisplay();
      } else {
        console.error("Usage update failed:", result.error);
      }
    } catch (error) {
      console.error("Usage update error:", error);
    }
  }

  displayQuestionInstantly(userTranscript) {
    // Display the user's transcript in the audio content section
    this.displayUserTranscript(userTranscript);
  }

  displayResponse(userTranscript, aiResponse) {
    // Display user transcript
    this.displayUserTranscript(userTranscript);
  }

  clearResponses() {
    // Clear audio content
    this.audioContent.innerHTML = `
      <div class="audio-placeholder">
        <p>Press SPACE to start recording</p>
      </div>
    `;
    // Hide popup
    this.aiAnswerPopup.classList.remove("active");
    this.conversationHistory = [];
  }

  updateRecordingUI() {
    if (this.isRecording) {
      this.recordingDot.classList.add("recording");
    } else {
      this.recordingDot.classList.remove("recording");
    }
  }

  switchTab(tabName) {
    // Update button active state
    this.tabBtns.forEach((btn) => {
      btn.classList.remove("active");
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active");
      }
    });

    // Update content visibility
    this.tabContents.forEach((content) => {
      content.classList.remove("active");
    });
    document.getElementById(tabName + "Tab").classList.add("active");
  }

  showAIAnswerPopup(question, answer) {
    // Only show popup if we have valid answer data
    if (!answer || answer.trim() === "") {
      console.warn("Popup not shown - missing answer data");
      return;
    }

    // Clear previous content
    this.answerText.textContent = "";

    // Show popup immediately
    this.aiAnswerPopup.classList.add("active");

    // Start fast typing animation (5ms per character for speed)
    let index = 0;
    const speed = 5; // Very fast - 5ms per character

    const resizeWindow = () => {
      // Calculate actual content height
      const audioHeight = this.recordedAudioSection.offsetHeight || 180;
      const popupHeight = this.aiAnswerPopup.offsetHeight || 100;
      const totalHeight = audioHeight + popupHeight + 60; // +60 for title bar and padding

      ipcRenderer.invoke("resize-with-height", {
        width: 700,
        height: Math.min(totalHeight, 900), // Max 900px for very long answers
      });
    };

    const typeWriter = () => {
      if (index < answer.length) {
        this.answerText.textContent += answer.charAt(index);
        index++;

        // Resize window every 50 characters to grow smoothly
        if (index % 50 === 0) {
          resizeWindow();
        }

        setTimeout(typeWriter, speed);
      } else {
        // Final resize when complete
        setTimeout(resizeWindow, 50);
      }
    };

    // Initial resize then start typing
    setTimeout(() => {
      resizeWindow();
      typeWriter();
    }, 50);
  }

  closeAIAnswerPopup() {
    this.aiAnswerPopup.classList.remove("active");

    // Resize window back to normal (just audio section)
    setTimeout(() => {
      const audioHeight = this.recordedAudioSection.offsetHeight || 350;
      const totalHeight = audioHeight + 60; // +60 for title bar and padding

      ipcRenderer.invoke("resize-with-height", {
        width: 700,
        height: Math.min(totalHeight, 800),
      });
    }, 100);
  }

  displayUserTranscript(transcript) {
    // Add user transcript to audio content
    const p = document.createElement("p");
    p.textContent = `Speaker 1: ${transcript}`;
    this.audioContent.innerHTML = "";
    this.audioContent.appendChild(p);
  }

  showSettings() {
    // Placeholder for settings functionality
    alert("Settings panel coming soon!");
  }

  showError(message, screen = "login") {
    let errorElement;
    switch (screen) {
      case "register":
        errorElement = this.registerError;
        break;
      case "verification":
        errorElement = this.verificationError;
        break;
      default:
        errorElement = this.loginError;
    }

    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  hideError() {
    this.loginError.style.display = "none";
    this.registerError.style.display = "none";
    this.verificationError.style.display = "none";
  }

  showLoading(show, message = "Processing...") {
    if (show) {
      this.loadingOverlay.querySelector("p").textContent = message;
      this.loadingOverlay.classList.add("active");
    } else {
      this.loadingOverlay.classList.remove("active");
    }
  }

  onWindowFocus() {
    // Window gained focus - ensure it can receive keyboard events
    window.focus();
    document.body.focus();
  }

  onWindowBlur() {
    // Window lost focus
  }

  handleSavePreferences() {
    const userName = this.userNameInput.value.trim();
    const meetingPurpose = this.meetingPurposeInput.value.trim();
    const generalInfo = this.generalInfoInput.value.trim();
    const selectedLanguage = this.selectedLanguageInput.value;

    if (!userName || !meetingPurpose || !generalInfo) {
      this.showError(
        "Please fill in all fields before continuing.",
        "preferences"
      );
      return;
    }

    // Save preferences
    this.userPreferences = {
      userName,
      meetingPurpose,
      generalInfo,
      selectedLanguage,
      interviewType: "general", // Default to general interview type
    };
    this.preferencesSaved = true;

    // Save session with updated preferences
    this.saveSession();

    // Hide error and move to main screen
    this.hideError();
    this.showMainScreen();
  }

  handleInterviewTypeSelection(type) {
    // Update selected type
    this.userPreferences.interviewType = type;

    // Update visual selection
    this.interviewTypeCards.forEach((card) => {
      card.classList.remove("selected");
      if (card.getAttribute("data-type") === type) {
        card.classList.add("selected");
      }
    });

    // Save session with final preferences
    this.saveSession();

    // Move to main screen after a short delay
    setTimeout(() => {
      this.showMainScreen();
    }, 500);
  }

  showError(message, screen = "login") {
    let errorElement;
    switch (screen) {
      case "register":
        errorElement = this.registerError;
        break;
      case "verification":
        errorElement = this.verificationError;
        break;
      case "preferences":
        errorElement = this.preferencesError;
        break;
      default:
        errorElement = this.loginError;
    }

    errorElement.textContent = message;
    errorElement.style.display = "block";
  }

  hideError() {
    this.loginError.style.display = "none";
    this.registerError.style.display = "none";
    this.verificationError.style.display = "none";
    this.preferencesError.style.display = "none";
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new SkillEdgeApp();
});
