const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  Tray,
  Menu,
} = require("electron");
const path = require("path");
const SkillEdgeAPI = require("./api/skilledge-api");

let mainWindow;
let tray;
let isLoggedIn = false;
let isRecording = false;
let skillEdgeAPI;

// Use temp directory for cache to avoid permission issues
if (process.env.NODE_ENV !== "development") {
  app.setPath("userData", path.join(require("os").tmpdir(), "skilledge-app"));
}

// Keep a global reference of the window object
function createWindow() {
  // Create the browser window with modern settings
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 400,
    minHeight: 350,
    transparent: true, // Make window transparent
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    focusable: true,
    frame: false, // Custom title bar
    titleBarStyle: "hidden",
    resizable: false, // Disable resizing for better transparency
    maximizable: false,
    minimizable: true,
    alwaysOnTop: true, // Keep on top
    show: true, // Show immediately
    backgroundColor: "rgba(0, 0, 0, 0)", // Completely transparent background
    skipTaskbar: true, // Hide from taskbar for privacy
    icon: path.join(__dirname, "assets/icon.png"),
  });

  // Load HTML immediately - window is already visible with loading screen
  mainWindow.loadFile("index.html");

  // Prevent navigation
  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  // Enable content protection to hide from screen sharing
  mainWindow.setContentProtection(true);

  // Additional privacy measures
  mainWindow.setSkipTaskbar(true); // Ensure hidden from taskbar
  mainWindow.setAlwaysOnTop(true); // Keep on top but hidden from sharing

  // Open DevTools for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.openDevTools();
    });
  }

  // Handle window close (hide instead of quit)
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Ensure window can receive keyboard events when focused
  mainWindow.on("focus", () => {
    mainWindow.setAlwaysOnTop(true);
  });

  // Handle clicks to ensure focus
  mainWindow.webContents.on("before-input-event", (event, input) => {
    // Ensure the window stays focused for keyboard events
    if (input.type === "keyDown") {
      mainWindow.focus();
    }
  });

  // Initialize API
  skillEdgeAPI = new SkillEdgeAPI();

  // Setup IPC handlers
  setupIpcHandlers();

  // Setup global shortcuts
  setupGlobalShortcuts();

  // Create system tray
  createTray();
}

function setupIpcHandlers() {
  // Handle minimize button
  ipcMain.handle("minimize-window", () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  // Handle close button
  ipcMain.handle("close-window", () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // Handle login
  ipcMain.handle("user-login", async (event, { email, password }) => {
    try {
      const result = await skillEdgeAPI.login(email, password);
      if (result.success) {
        isLoggedIn = skillEdgeAPI.hasValidSubscription();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle logout
  ipcMain.handle("user-logout", () => {
    skillEdgeAPI.logout();
    isLoggedIn = false;
    return { success: true };
  });

  // Handle profile fetch
  ipcMain.handle("get-profile", async () => {
    try {
      const result = await skillEdgeAPI.getProfile();
      if (result.success) {
        isLoggedIn = skillEdgeAPI.hasValidSubscription();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle AI response generation
  ipcMain.handle(
    "generate-ai-response",
    async (
      event,
      {
        transcript,
        userName,
        meetingPurpose,
        generalInfo,
        selectedLanguage,
        interviewType,
        conversationHistory,
      }
    ) => {
      try {
        const result = await skillEdgeAPI.generateResponse(
          transcript,
          userName,
          meetingPurpose,
          generalInfo,
          selectedLanguage,
          interviewType,
          conversationHistory
        );
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Handle usage update
  ipcMain.handle("update-usage", async (event, { seconds }) => {
    try {
      const result = await skillEdgeAPI.updateUsage(seconds);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-usage", async (event) => {
    try {
      const result = await skillEdgeAPI.getUsage();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle dynamic window resizing based on conversation length
  ipcMain.handle("resize-for-conversation", (event, { conversationCount }) => {
    if (mainWindow) {
      const currentBounds = mainWindow.getBounds();
      let newWidth = 700; // Base width - wider for better readability
      let newHeight = 400; // Base height

      // Increase size based on conversation length
      if (conversationCount > 0) {
        newHeight = Math.min(400 + conversationCount * 50, 700); // Max 700px height
        newWidth = Math.min(700 + conversationCount * 20, 1000); // Max 1000px width
      }

      mainWindow.setBounds({
        x: currentBounds.x,
        y: currentBounds.y,
        width: newWidth,
        height: newHeight,
      });

      // Opacity handled by CSS for better text clarity

      return { success: true, newWidth, newHeight };
    }
    return { success: false };
  });

  // Handle screen sharing hiding status check
  ipcMain.handle("hide-from-screen-capture", () => {
    // Content protection is already enabled via setContentProtection(true)
    return true;
  });

  // Handle hiding from taskbar
  ipcMain.handle("hide-from-taskbar", () => {
    if (mainWindow) {
      mainWindow.setSkipTaskbar(true);
      return { success: true };
    }
    return { success: false };
  });

  // Handle showing in taskbar (if needed)
  ipcMain.handle("show-in-taskbar", () => {
    if (mainWindow) {
      mainWindow.setSkipTaskbar(false);
      return { success: true };
    }
    return { success: false };
  });

  // Handle opening external URLs
  ipcMain.handle("open-external-url", async (event, url) => {
    try {
      const { shell } = require("electron");
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error("Error opening external URL:", error);
      return { success: false, error: error.message };
    }
  });

  // Handle making window transparent after login
  ipcMain.handle("make-window-transparent", () => {
    if (mainWindow) {
      mainWindow.setBackgroundColor("rgba(0, 0, 0, 0)");
      return true;
    }
    return false;
  });

  // Handle API connection test
  ipcMain.handle("test-api-connection", async () => {
    try {
      const result = await skillEdgeAPI.testConnection();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle user registration
  ipcMain.handle(
    "user-register",
    async (event, { firstName, lastName, email, password }) => {
      try {
        const result = await skillEdgeAPI.register(
          firstName,
          lastName,
          email,
          password
        );
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  );

  // Handle email verification
  ipcMain.handle("verify-email", async (event, { email, code }) => {
    try {
      const result = await skillEdgeAPI.verifyEmail(email, code);
      if (result.success) {
        isLoggedIn = skillEdgeAPI.hasValidSubscription();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle recording state
  ipcMain.handle("toggle-recording", () => {
    isRecording = !isRecording;
    return { isRecording };
  });

  // Handle get recording state
  ipcMain.handle("get-recording-state", () => {
    return { isRecording };
  });

  // Handle window resize for different screens
  ipcMain.handle("resize-for-screen", (event, { screen }) => {
    if (mainWindow) {
      const currentBounds = mainWindow.getBounds();
      let newWidth, newHeight;

      switch (screen) {
        case "login":
        case "register":
        case "verification":
          // Narrower, more vertical for auth screens
          newWidth = 400;
          newHeight = 600;
          // Set opacity to 100% for auth screens
          mainWindow.setOpacity(1.0);
          break;
        case "preferences":
        case "interviewType":
          // Medium width for form screens
          newWidth = 600;
          newHeight = 650;
          // Set opacity to 100% for form screens
          mainWindow.setOpacity(1.0);
          break;
        case "upgrade":
          // Medium width for upgrade screen
          newWidth = 500;
          newHeight = 600;
          // Set opacity to 100% for upgrade screen
          mainWindow.setOpacity(1.0);
          break;
        case "main":
        default:
          // Check if popup is visible by looking at the DOM from renderer
          // Default: just audio section (around 350-400px)
          // With popup: add 280px for the popup
          newWidth = 700;
          newHeight = 420; // Audio section only

          // Opacity handled by CSS for better text clarity
          break;
      }

      mainWindow.setBounds({
        x: currentBounds.x,
        y: currentBounds.y,
        width: newWidth,
        height: newHeight,
      });
    }
    return { success: true };
  });

  // Handle window resize based on content
  ipcMain.handle("get-content-height", (event) => {
    if (mainWindow) {
      // This will be called from renderer to get actual content height
      // Return the calculated height
      return { success: true };
    }
    return { success: false };
  });

  // Handle dynamic window resizing with specific height
  ipcMain.handle("resize-with-height", (event, { width, height }) => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: width,
        height: height,
      });
      return { success: true };
    }
    return { success: false };
  });
}

function setupGlobalShortcuts() {
  // Disabled global shortcut - it was blocking spacebar in renderer
}

function createTray() {
  // Create tray icon
  tray = new Tray(path.join(__dirname, "assets/tray-icon.png"));

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show SkillEdge",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Hide SkillEdge",
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  // Set tooltip
  tray.setToolTip("SkillEdge Desktop");

  // Set context menu
  tray.setContextMenu(contextMenu);

  // Handle tray click (show/hide window)
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Don't quit when all windows are closed (keep running in tray)
app.on("window-all-closed", () => {
  // App stays running in system tray
  // User can quit via tray menu
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on("before-quit", () => {
  app.isQuiting = true;
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault();
  });
});

// Clean up on app quit
app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
  }
});
