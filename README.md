# SkillEdge Desktop - AI Interview Assistant

A modern desktop application that provides AI-powered interview assistance with **undetectable screen sharing** capabilities for Pro and Pro+ users.

## 🚀 Features

- **AI-Powered Responses**: Get intelligent responses to interview questions
- **Space Key Recording**: Press and hold SPACE to record your responses
- **Undetectable Screen Sharing**: Completely invisible to screen sharing software
- **Modern UI**: Beautiful, high-quality interface with dark theme
- **Real-time Processing**: Fast audio transcription and AI response generation
- **Usage Tracking**: Monitor your remaining minutes
- **Secure Authentication**: Email-based login with subscription verification

## 🎯 Target Users

- **Pro Subscribers**: Full access to all features
- **Pro+ Subscribers**: Enhanced features and priority processing
- **Interview Candidates**: Anyone preparing for technical interviews

## 🔧 Technical Stack

- **Electron**: Cross-platform desktop framework
- **Node.js**: Backend runtime
- **Web Audio API**: Audio recording and processing
- **Modern CSS**: Responsive design with animations
- **REST API**: Integration with SkillEdge backend

## 📦 Installation

1. **Download** the application from the SkillEdge website
2. **Install** using the provided installer
3. **Login** with your Pro/Pro+ credentials
4. **Configure** audio settings
5. **Start** using immediately

## 🎮 Usage

### Basic Operation

1. **Login** with your SkillEdge credentials
2. **Hold SPACE** to start recording your response
3. **Release SPACE** to stop recording
4. **View AI response** in the response panel
5. **Continue** the conversation naturally

### Keyboard Shortcuts

- **SPACE**: Hold to record, release to stop
- **ESC**: Cancel current recording
- **Ctrl+Q**: Quit application

## 🔒 Privacy & Security

- **Screen Sharing Invisible**: Uses Windows API to hide from screen capture
- **Encrypted Storage**: All credentials stored securely
- **No Data Collection**: Your conversations are not stored locally
- **Secure API**: All communication encrypted with HTTPS

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm 9+
- Electron 28+

### Setup

```bash
# Clone repository
git clone <repository-url>
cd skilledge-desktop

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
skilledge-desktop/
├── main.js              # Main Electron process
├── index.html           # Application UI
├── styles.css           # Modern styling
├── renderer.js          # Frontend logic
├── api/
│   └── skilledge-api.js # API client
├── services/
│   └── audio-recorder.js # Audio recording service
└── assets/              # Icons and images
```

## 🔌 API Integration

The app integrates with the SkillEdge backend API:

- **Authentication**: `/api/auth/login`
- **Profile**: `/api/auth/profile`
- **AI Response**: `/api/ai/generate-response`
- **Usage Tracking**: `/api/auth/update-usage`

## 🎨 UI/UX Design

### Design Principles

- **Minimal Distraction**: Clean, focused interface
- **Professional Look**: Corporate-grade appearance
- **Dark Theme**: Easy on the eyes during long sessions
- **Responsive**: Adapts to different screen sizes
- **Accessible**: Keyboard navigation and screen reader support

### Color Scheme

- **Primary**: Blue (#3b82f6)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Background**: Dark Slate (#0f172a)
- **Surface**: Slate (#1e293b)

## 🧪 Testing

### Screen Sharing Tests

- ✅ **Google Meet**: Completely invisible
- ✅ **Zoom**: Not detected
- ✅ **Teams**: Hidden from capture
- ✅ **Discord**: Screen sharing safe
- ✅ **OBS Studio**: Recording invisible

### Functionality Tests

- ✅ **Audio Recording**: High quality capture
- ✅ **AI Responses**: Fast and accurate
- ✅ **Usage Tracking**: Real-time updates
- ✅ **Authentication**: Secure login
- ✅ **Cross-platform**: Windows/macOS/Linux

## 📱 Platform Support

### Windows

- **Windows 10**: Full support
- **Windows 11**: Optimized
- **Windows Server**: Compatible

### macOS

- **macOS 12+**: Full support
- **Apple Silicon**: Native performance
- **Intel Macs**: Compatible

### Linux

- **Ubuntu 20.04+**: Supported
- **Debian 11+**: Compatible
- **Other distros**: May work

## 🔄 Updates

The application supports automatic updates:

- **Background Updates**: Download in background
- **Seamless Installation**: No user intervention
- **Version Rollback**: Easy downgrade if needed
- **Update Notifications**: Clear update status

## 📞 Support

### Getting Help

- **Documentation**: Comprehensive guides
- **FAQ**: Common questions answered
- **Support Ticket**: Direct help from team
- **Community**: User forums and discussions

### Troubleshooting

- **Audio Issues**: Check microphone permissions
- **Login Problems**: Verify subscription status
- **Performance**: Close other applications
- **Screen Sharing**: Restart application

## 🚀 Roadmap

### Upcoming Features

- **Voice Commands**: Hands-free operation
- **Custom Responses**: Personalized AI training
- **Team Collaboration**: Shared interview prep
- **Analytics Dashboard**: Usage insights
- **Mobile Companion**: Phone app integration

### Version History

- **v1.0.0**: Initial release with core features
- **v1.1.0**: Enhanced AI responses
- **v1.2.0**: Improved audio quality
- **v1.3.0**: New UI themes

## 📄 License

This software is proprietary and licensed to SkillEdge subscribers only.

## 🤝 Contributing

This is a closed-source project. For feature requests or bug reports, please contact the SkillEdge team.

---

**Built with ❤️ by the SkillEdge Team**

_Empowering your interview success with AI technology_
