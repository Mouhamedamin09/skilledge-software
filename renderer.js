const { ipcRenderer } = require("electron");
const AudioRecorder = require("./services/audio-recorder");

class SkillEdgeApp {
  constructor() {
    this.audioRecorder = new AudioRecorder();
    this.isRecording = false;
    this.isLoggedIn = false;
    this.conversationHistory = [];
    this.currentUser = null;

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
    this.initializeAudio();
    this.checkLoginStatus();
    this.loadSavedSession();
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
    this.responseContent = document.getElementById("responseContent");
    this.clearBtn = document.getElementById("clearBtn");

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

    // Space key event listener for recording
    document.addEventListener("keydown", (e) => {
      // Only handle space key when not in input fields
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      // Check for spacebar
      if (e.code === "Space" || e.key === " " || e.keyCode === 32) {
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
    });

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
    try {
      const success = await this.audioRecorder.initialize();
      if (success) {
        console.log("Audio recorder initialized successfully");

        // Setup audio recorder callbacks
        this.audioRecorder.onStop = (audioBlob) => {
          this.handleAudioRecorded(audioBlob);
        };
      } else {
        console.error("Failed to initialize audio recorder");
        this.showError(
          "Failed to initialize audio recording. Please check microphone permissions."
        );
      }
    } catch (error) {
      console.error("Audio initialization error:", error);
      this.showError(
        "Audio initialization failed. Please check microphone permissions."
      );
    }
  }

  async checkLoginStatus() {
    try {
      // First test API connection
      console.log("Testing API connection...");
      const connectionTest = await ipcRenderer.invoke("test-api-connection");
      console.log("API connection test result:", connectionTest);

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
          this.showLoginScreen();
        }
      } else {
        this.showLoginScreen();
      }
    } catch (error) {
      console.error("Login status check failed:", error);
      this.showLoginScreen();
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

      // Clear saved session
      this.clearSession();

      this.showLoginScreen();
      this.clearResponses();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  showLoginScreen() {
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

    // Resize window for login screen (with small delay to prevent glitch)
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "login" });
    }, 50);
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

    // Resize window for main screen (with small delay to prevent glitch)
    setTimeout(() => {
      ipcRenderer.invoke("resize-for-screen", { screen: "main" });
    }, 50);
  }

  updateUserInfo() {
    // User info display removed - no status bar
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
    const responseContainer = this.responseContent;

    // Remove placeholder if exists
    const placeholder = responseContainer.querySelector(".placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    // Create instant loading conversation wrapper
    const conversationWrapper = document.createElement("div");
    conversationWrapper.className = "conversation-exchange";

    // Create loading message for interviewer (placeholder)
    const interviewerMessage = document.createElement("div");
    interviewerMessage.className = "response-item interviewer";
    interviewerMessage.innerHTML = `
      <div class="response-avatar">
        <i class="fas fa-user-tie"></i>
      </div>
      <div class="response-content-wrapper">
        <div class="response-meta">
          <span class="response-sender">Interviewer</span>
          <span class="response-time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="response-loading">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Processing audio...</p>
          </div>
        </div>
      </div>
    `;

    // Create AI response placeholder with loading
    const aiMessage = document.createElement("div");
    aiMessage.className = "response-item ai";
    aiMessage.innerHTML = `
      <div class="response-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="response-content-wrapper">
        <div class="response-meta">
          <span class="response-sender">AI Assistant</span>
          <span class="response-time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="response-loading">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Generating response...</p>
          </div>
        </div>
      </div>
    `;

    // Add messages to wrapper
    conversationWrapper.appendChild(interviewerMessage);
    conversationWrapper.appendChild(aiMessage);

    // Insert at the top (latest first)
    responseContainer.insertBefore(
      conversationWrapper,
      responseContainer.firstChild
    );

    // Scroll to top to show latest message
    responseContainer.scrollTop = 0;

    // Store references for later update
    this.currentInterviewerElement =
      interviewerMessage.querySelector(".response-loading");
    this.currentAIResponseElement =
      aiMessage.querySelector(".response-loading");
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
      // Convert audio to base64 for API transmission
      const audioBase64 = await this.audioRecorder.audioBlobToBase64(audioBlob);
      const duration = await this.audioRecorder.getAudioDuration(audioBlob);

      // Get real transcription
      const transcript = await this.transcribeAudio(audioBlob);

      if (transcript && transcript.trim().length > 0) {
        // Show question immediately
        this.displayQuestionInstantly(transcript);

        // Generate AI response with animation
        await this.generateAIResponseWithAnimation(transcript);

        // Update usage
        const minutesUsed = duration / 60;
        await this.updateUsage(minutesUsed);
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
    if (!this.currentAIResponseElement) return;

    // Remove loading indicator and add response text
    this.currentAIResponseElement.innerHTML = "";
    this.currentAIResponseElement.classList.remove("response-loading");
    this.currentAIResponseElement.classList.add("response-text");

    // Typewriter effect
    let index = 0;
    const speed = 20; // milliseconds per character

    const typeWriter = () => {
      if (index < response.length) {
        this.currentAIResponseElement.textContent += response.charAt(index);
        index++;
        setTimeout(typeWriter, speed);
      }
    };

    typeWriter();
  }

  async updateUsage(minutesUsed) {
    try {
      const result = await ipcRenderer.invoke("update-usage", { minutesUsed });
      if (result.success) {
        this.updateUserInfo();
      }
    } catch (error) {
      console.error("Usage update error:", error);
    }
  }

  displayQuestionInstantly(userTranscript) {
    // Update the interviewer element with the actual transcript
    if (this.currentInterviewerElement) {
      this.currentInterviewerElement.innerHTML = userTranscript;
      this.currentInterviewerElement.classList.remove("response-loading");
      this.currentInterviewerElement.classList.add("response-text");
    }
  }

  displayResponse(userTranscript, aiResponse) {
    const responseContainer = this.responseContent;

    // Remove placeholder if exists
    const placeholder = responseContainer.querySelector(".placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    // Create conversation wrapper for this exchange
    const conversationWrapper = document.createElement("div");
    conversationWrapper.className = "conversation-exchange";

    // Create interviewer message
    const interviewerMessage = document.createElement("div");
    interviewerMessage.className = "response-item interviewer";
    interviewerMessage.innerHTML = `
      <div class="response-avatar">
        <i class="fas fa-user-tie"></i>
      </div>
      <div class="response-content-wrapper">
        <div class="response-meta">
          <span class="response-sender">Interviewer</span>
          <span class="response-time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="response-text">${userTranscript}</div>
      </div>
    `;

    // Create AI response
    const aiMessage = document.createElement("div");
    aiMessage.className = "response-item ai";
    aiMessage.innerHTML = `
      <div class="response-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="response-content-wrapper">
        <div class="response-meta">
          <span class="response-sender">AI Assistant</span>
          <span class="response-time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="response-text">${aiResponse}</div>
      </div>
    `;

    // Add messages to wrapper (interviewer first, then AI for horizontal layout)
    conversationWrapper.appendChild(interviewerMessage);
    conversationWrapper.appendChild(aiMessage);

    // Insert at the top (latest first)
    responseContainer.insertBefore(
      conversationWrapper,
      responseContainer.firstChild
    );

    // Scroll to top to show latest message
    responseContainer.scrollTop = 0;
  }

  clearResponses() {
    this.responseContent.innerHTML = `
      <div class="placeholder">
        <i class="fas fa-comments"></i>
        <p>Press SPACE to start recording, SPACE again to stop</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 8px">
          <i class="fas fa-keyboard"></i> Your AI interview responses will appear here
        </p>
      </div>
    `;
    this.conversationHistory = [];
  }

  updateRecordingUI() {
    if (this.isRecording) {
      this.recordingDot.classList.add("recording");
    } else {
      this.recordingDot.classList.remove("recording");
    }
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
      interviewType: this.userPreferences.interviewType,
    };
    this.preferencesSaved = true;

    // Save session with updated preferences
    this.saveSession();

    // Hide error and move to interview type selection
    this.hideError();
    this.showInterviewTypeScreen();
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
