# SkillEdge Desktop Application - Developer Guide

## 🎯 Project Overview

You are building a **desktop application** that provides the same AI interview functionality as the web app, but with **undetectable screen sharing** capabilities. This app will only be available for **Pro** and **Pro+** users and must be completely invisible to screen sharing software.

## 🔧 Technical Requirements

### Core Functionality

- **Space Key Recording**: Press and hold SPACE to record audio
- **AI Transcription**: Convert audio to text using Whisper API
- **AI Response Generation**: Generate human-like responses using GPT-3.5-turbo
- **Undetectable UI**: Completely invisible to screen sharing software
- **User Authentication**: Email-based login with Pro/Pro+ verification
- **Real-time Communication**: WebSocket or HTTP polling for live updates

### Platform Support

- **Windows** (Primary)
- **macOS** (Secondary)
- **Linux** (Optional)

## 🏗️ Architecture Overview

```
Desktop App (Electron/Flutter/Desktop Framework)
    ↓
Backend API (Node.js/Express)
    ↓
External APIs (OpenAI Whisper + GPT-3.5-turbo)
```

## 🔌 Backend API Integration

### Base URL

```
Production: https://monkfish-app-nnhdy.ondigitalocean.app/api
Development: http://localhost:5000/api
```

### Authentication Endpoints

#### 1. User Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "subscription": {
      "plan": "pro" | "pro+",
      "status": "active",
      "minutesLeft": 90
    }
  }
}
```

#### 2. Verify User Plan

```http
GET /auth/profile
Authorization: Bearer jwt_token_here
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "subscription": {
      "plan": "pro" | "pro+",
      "status": "active",
      "minutesLeft": 90
    }
  }
}
```

### AI Processing Endpoints

#### 3. Generate AI Response

```http
POST /ai/generate-response
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "transcript": "User's transcribed speech",
  "userName": "User's name",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant",
      "content": "Previous AI response"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "response": "AI generated response text",
  "usage": {
    "minutesUsed": 2.5
  }
}
```

#### 4. Update User Usage

```http
POST /auth/update-usage
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "minutesUsed": 2.5
}
```

**Response:**

```json
{
  "success": true,
  "message": "Usage updated successfully",
  "user": {
    "subscription": {
      "minutesLeft": 87.5
    }
  }
}
```

## 🎨 UI/UX Requirements

### Undetectable Design

- **No visible windows** during screen sharing
- **Transparent overlay** that doesn't interfere with other applications
- **Minimal system tray icon** for access
- **Hotkey-based activation** (e.g., Ctrl+Shift+S)
- **No taskbar presence** when active

### User Interface Elements

1. **Login Screen**: Email/password input
2. **Main Interface**:
   - Current question display
   - Recording status indicator
   - Minutes remaining counter
   - AI response area
3. **Settings Panel**:
   - Audio device selection
   - Hotkey configuration
   - Account information

### Visual Design

- **Dark theme** for minimal distraction
- **Semi-transparent backgrounds**
- **Subtle animations** for status changes
- **Professional typography**
- **Consistent with web app branding**

## 🔧 Technical Implementation

### Recommended Tech Stack

- **Electron** (Cross-platform desktop apps)
- **React** (UI framework)
- **TypeScript** (Type safety)
- **Web Audio API** (Audio recording)
- **WebSocket** (Real-time communication)

### Key Dependencies

```json
{
  "electron": "^27.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "axios": "^1.6.0",
  "ws": "^8.14.0",
  "electron-store": "^8.1.0"
}
```

### Audio Recording Implementation

```typescript
// Example audio recording setup
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  const mediaRecorder = new MediaRecorder(stream);
  // Implementation details...
};
```

### API Integration Example

```typescript
// Example API client
class SkillEdgeAPI {
  private baseURL = "https://monkfish-app-nnhdy.ondigitalocean.app/api";
  private token: string;

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }

  async generateResponse(transcript: string, userName: string) {
    const response = await fetch(`${this.baseURL}/ai/generate-response`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ transcript, userName }),
    });
    return response.json();
  }
}
```

## 🚀 Development Phases

### Phase 1: Core Setup (Week 1)

- [ ] Set up Electron project structure
- [ ] Implement basic authentication
- [ ] Create undetectable window system
- [ ] Set up API client

### Phase 2: Audio & AI (Week 2)

- [ ] Implement audio recording with space key
- [ ] Integrate Whisper API for transcription
- [ ] Connect to GPT-3.5-turbo for responses
- [ ] Add usage tracking

### Phase 3: UI & Polish (Week 3)

- [ ] Design undetectable interface
- [ ] Implement settings panel
- [ ] Add system tray integration
- [ ] Test screen sharing invisibility

### Phase 4: Testing & Deployment (Week 4)

- [ ] Cross-platform testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Distribution setup

## 🔒 Security Considerations

### Data Protection

- **Encrypt stored credentials** locally
- **Secure API communication** (HTTPS only)
- **No sensitive data** in logs
- **Automatic token refresh**

### Screen Sharing Invisibility

- **Use system-level transparency** APIs
- **Avoid standard window managers**
- **Implement custom rendering** if needed
- **Test with multiple screen sharing tools**

## 📱 Platform-Specific Implementation

### Windows

- Use **Windows API** for transparency
- Implement **global hotkeys** with RegisterHotKey
- Use **SetWindowPos** for positioning

### macOS

- Use **NSWindow** with **NSWindowStyleMaskBorderless**
- Implement **NSEvent** for global key monitoring
- Use **NSView** for custom rendering

### Linux

- Use **X11** or **Wayland** APIs
- Implement **global key grabbing**
- Use **compositor transparency** features

## 🧪 Testing Requirements

### Screen Sharing Tests

- [ ] **Zoom** screen sharing
- [ ] **Teams** screen sharing
- [ ] **Google Meet** screen sharing
- [ ] **Discord** screen sharing
- [ ] **OBS Studio** recording

### Functionality Tests

- [ ] Audio recording quality
- [ ] Transcription accuracy
- [ ] AI response generation
- [ ] Usage tracking accuracy
- [ ] Cross-platform compatibility

## 📦 Distribution Strategy

### Installation Methods

1. **Direct Download** from website
2. **Auto-updater** for seamless updates
3. **Code signing** for security
4. **Installer packages** for each platform

### User Onboarding

1. **Download** from Pro/Pro+ dashboard
2. **Install** with one-click setup
3. **Login** with existing credentials
4. **Configure** audio settings
5. **Start** using immediately

## 🔄 Integration Points

### Web App Integration

- **Shared authentication** system
- **Synchronized usage** tracking
- **Consistent user experience**
- **Cross-platform data** sync

### Backend Integration

- **Same API endpoints** as web app
- **Shared user database**
- **Consistent subscription** logic
- **Unified usage tracking**

## 📋 Deliverables

### Code Deliverables

- [ ] **Source code** with documentation
- [ ] **Build scripts** for all platforms
- [ ] **Installation packages**
- [ ] **User documentation**

### Testing Deliverables

- [ ] **Test reports** for all platforms
- [ ] **Screen sharing** invisibility proof
- [ ] **Performance benchmarks**
- [ ] **Security audit** results

## 🎯 Success Criteria

### Technical Success

- **100% invisible** to screen sharing software
- **< 100ms latency** for audio processing
- **99.9% uptime** for API connectivity
- **Cross-platform** compatibility

### User Experience Success

- **< 30 seconds** setup time
- **Intuitive** hotkey operation
- **Seamless** integration with existing workflow
- **Professional** appearance and feel

## 📞 Support & Maintenance

### Ongoing Support

- **Bug fixes** and updates
- **Feature enhancements**
- **Platform compatibility** maintenance
- **User support** documentation

### Monitoring

- **Usage analytics** tracking
- **Error reporting** system
- **Performance monitoring**
- **User feedback** collection

---

## 🚀 Getting Started

1. **Clone** this repository
2. **Read** the technical requirements
3. **Set up** development environment
4. **Implement** core functionality
5. **Test** thoroughly
6. **Deploy** to production

**Questions?** Contact the development team for clarification on any requirements.

**Good luck building the future of interview preparation! 🎯**
