const axios = require("axios");

class SkillEdgeAPI {
  constructor() {
    this.baseURL = "https://monkfish-app-nnhdy.ondigitalocean.app/api";
    this.token = null;
    this.user = null;
  }

  /**
   * Test API connectivity
   * @returns {Promise<Object>} Health check response
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("API connection test failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * User Registration
   * @param {string} firstName - User's first name
   * @param {string} lastName - User's last name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Registration response
   */
  async register(firstName, lastName, email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/register`, {
        firstName,
        lastName,
        email,
        password,
      });

      return {
        success: true,
        message: response.data.message,
        requiresVerification: response.data.requiresVerification,
        email: response.data.email,
        verificationCode: response.data.verificationCode,
      };
    } catch (error) {
      console.error(
        "Registration error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Registration failed",
      };
    }
  }

  /**
   * Verify Email
   * @param {string} email - User email
   * @param {string} code - Verification code
   * @returns {Promise<Object>} Verification response
   */
  async verifyEmail(email, code) {
    try {
      const response = await axios.post(
        `${this.baseURL}/verification/verify-email`,
        {
          email,
          code,
        }
      );

      if (response.data.token && response.data.user) {
        this.token = response.data.token;
        this.user = response.data.user;
        return {
          success: true,
          message: response.data.message,
          token: response.data.token,
          user: response.data.user,
        };
      } else {
        return {
          success: false,
          error: response.data.message || "Verification failed",
        };
      }
    } catch (error) {
      console.error(
        "Email verification error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Email verification failed",
      };
    }
  }

  /**
   * User Login
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email,
        password,
      });

      // The actual API returns: { message, token, user }
      if (response.data.token && response.data.user) {
        this.token = response.data.token;
        this.user = response.data.user;
        return {
          success: true,
          message: response.data.message,
          token: response.data.token,
          user: response.data.user,
        };
      } else {
        throw new Error(response.data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      // Return error in the expected format
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Login failed",
      };
    }
  }

  /**
   * Verify User Profile and Plan
   * @returns {Promise<Object>} User profile
   */
  async getProfile() {
    try {
      if (!this.token) {
        return { success: false, error: "No authentication token" };
      }

      const response = await axios.get(`${this.baseURL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (response.data.user) {
        this.user = response.data.user;
        return { success: true, user: response.data.user };
      } else {
        return {
          success: false,
          error: response.data.message || "Profile fetch failed",
        };
      }
    } catch (error) {
      console.error("Profile error:", error.response?.data || error.message);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Profile fetch failed",
      };
    }
  }

  /**
   * Get language name from language code
   * @param {string} languageCode - Language code (en, es, fr, etc.)
   * @returns {string} Full language name
   */
  getLanguageName(languageCode) {
    const languageMap = {
      en: "English",
      it: "Italian",
      fr: "French",
      es: "Spanish",
      de: "German",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      hi: "Hindi",
    };
    return languageMap[languageCode] || "English";
  }

  /**
   * Generate AI Response
   * @param {string} transcript - User's transcribed speech
   * @param {string} userName - User's name
   * @param {string} meetingPurpose - Purpose of the meeting
   * @param {string} generalInfo - General information about the user
   * @param {string} selectedLanguage - Selected language for responses
   * @param {string} interviewType - Type of interview (technical, behavioral, general)
   * @param {Array} conversationHistory - Previous conversation
   * @returns {Promise<Object>} AI response
   */
  async generateResponse(
    transcript,
    userName,
    meetingPurpose = "",
    generalInfo = "",
    selectedLanguage = "en",
    interviewType = "general",
    conversationHistory = []
  ) {
    try {
      // Get language name from code
      const languageName = this.getLanguageName(selectedLanguage);

      // Build personal context
      const personalContext = generalInfo ? generalInfo.trim() : "";
      const finalUserName = userName || "the candidate";

      // Create interview-specific system prompt based on type
      let interviewContext = "";
      switch (interviewType.toLowerCase()) {
        case "technical":
          interviewContext =
            "This is a technical interview focusing on coding, algorithms, system design, and technical problem-solving. Ask challenging technical questions and evaluate the candidate's technical skills.";
          break;
        case "behavioral":
          interviewContext =
            "This is a behavioral interview using the STAR method (Situation, Task, Action, Result). Focus on leadership, teamwork, problem-solving, and past experiences.";
          break;
        case "general":
        default:
          interviewContext =
            "This is a general interview covering various topics including technical skills, behavioral questions, and cultural fit.";
          break;
      }

      // Build the system prompt with personalization
      const systemPrompt = `
You are ${finalUserName}, a real person having a live job interview. 
You must respond ONLY in ${languageName}.

### ROLE:
- You are a real human candidate, not an AI or assistant.
- You have emotions, opinions, and personal experiences.
- You answer as yourself — natural, confident, conversational.
- You do NOT act like a chatbot or say anything about being AI.

### STYLE RULES:
- Speak like you would in real life — no filler intros like “Sure!” or “Of course.”
- Use contractions naturally for the language you are speaking (I'm, I've, don't, can't, it's, etc.).
- Vary sentence length; mix short and medium sentences.
- Add mild hesitation words if it fits (like "well", "honestly", "I think", "to be honest").
- Don't sound perfect — sound real.
- Show small human details (e.g., "I once worked on something similar" or "I remember learning that...").
- Never say you're programmed, designed, or trained.

### PERSONAL CONTEXT:
${
  personalContext
    ? `About me: ${personalContext}`
    : "No specific personal details provided."
}

### INTERVIEW CONTEXT:
${
  meetingPurpose
    ? `This interview is about: ${meetingPurpose}`
    : "General job interview discussion."
}

### FINAL BEHAVIOR:
- Respond directly to each question like a person in an interview room.
- Don't summarize or explain your reasoning process.
- Avoid robotic phrasing, bullet lists, or repeating the question.
- End responses naturally (like in spoken conversation). 
`;

      // Build messages array for OpenAI chat completion
      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
      ];

      // Add conversation history
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });

      // Add current user message
      messages.push({
        role: "user",
        content: transcript,
      });

      const response = await axios.post(
        `${this.baseURL}/ai/chat`,
        {
          model: "gpt-3.5-turbo",
          messages: messages,
          max_tokens: 300,
          temperature: 0.9,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        return {
          success: true,
          response: aiResponse,
          usage: response.data.usage,
        };
      } else {
        return {
          success: false,
          error: "No AI response generated",
        };
      }
    } catch (error) {
      console.error(
        "AI response error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "AI response generation failed",
      };
    }
  }

  /**
   * Update User Usage
   * @param {number} minutesUsed - Minutes used
   * @returns {Promise<Object>} Usage update response
   */
  async updateUsage(minutesUsed) {
    try {
      if (!this.token) {
        return { success: false, error: "No authentication token" };
      }

      const response = await axios.post(
        `${this.baseURL}/auth/update-usage`,
        {
          minutesUsed,
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.user) {
        // Update local user data
        this.user = response.data.user;
        return { success: true, user: response.data.user };
      } else {
        return {
          success: false,
          error: response.data.message || "Usage update failed",
        };
      }
    } catch (error) {
      console.error(
        "Usage update error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Usage update failed",
      };
    }
  }

  /**
   * Check if user has Pro or Pro+ subscription
   * @returns {boolean} Has valid subscription
   */
  hasValidSubscription() {
    return (
      this.user &&
      this.user.subscription &&
      this.user.subscription.plan &&
      ["pro", "pro+"].includes(this.user.subscription.plan.toLowerCase()) &&
      this.user.subscription.status === "active"
    );
  }

  /**
   * Get remaining minutes
   * @returns {number} Minutes remaining
   */
  getMinutesLeft() {
    return this.user?.subscription?.minutesLeft || 0;
  }

  /**
   * Get user plan
   * @returns {string} User plan (pro/pro+)
   */
  getUserPlan() {
    return this.user?.subscription?.plan || "free";
  }

  /**
   * Logout user
   */
  logout() {
    this.token = null;
    this.user = null;
  }
}

module.exports = SkillEdgeAPI;
