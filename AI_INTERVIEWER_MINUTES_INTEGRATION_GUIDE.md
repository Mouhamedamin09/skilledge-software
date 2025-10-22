# AI Interviewer Minutes Counting Integration Guide

## 🎯 **Overview**

This guide explains how to integrate minutes counting functionality for an AI interviewer system. The system tracks user usage time during interview sessions and enforces subscription limits.

## 🏗️ **System Architecture**

### **Frontend (React/TypeScript)**

- **InterviewSession Component**: Main interview interface with time tracking
- **Dashboard Components**: Display usage statistics and limits
- **Real-time Updates**: Live minute tracking during sessions

### **Backend (Node.js/Express)**

- **User Model**: Stores subscription and usage data
- **Auth Routes**: Handles minute updates via API
- **Database**: MongoDB with Mongoose for data persistence

## 📊 **Data Model Structure**

### **User Subscription Schema**

```typescript
subscription: {
  plan: "free" | "pro" | "pro+" | "enterprise",
  status: "active" | "inactive" | "cancelled",
  minutesLeft: number, // -1 for unlimited (pro+)
  startDate: Date,
  endDate: Date,
  stripeCustomerId: string,
  stripeSubscriptionId: string
}
```

### **User Usage Schema**

```typescript
usage: {
  interviewsCompleted: number,
  totalMinutesUsed: number,
  lastInterviewDate: Date
}
```

## ⏱️ **Minutes Allocation by Plan**

| Plan           | Minutes Allocated | Minutes Left Default | Unlimited |
| -------------- | ----------------- | -------------------- | --------- |
| **Free**       | 5 minutes         | 5                    | ❌        |
| **Pro**        | 90 minutes        | 90                   | ❌        |
| **Pro+**       | Unlimited         | -1                   | ✅        |
| **Enterprise** | Custom            | Custom               | ✅        |

## 🔧 **Frontend Implementation**

### **1. State Management**

```typescript
// Time tracking state
const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
const [sessionMinutesUsed, setSessionMinutesUsed] = useState(0);
const [remainingMinutes, setRemainingMinutes] = useState(0);
const [canRecord, setCanRecord] = useState(true);
const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
  null
);
```

### **2. Initial Minutes Calculation**

```typescript
useEffect(() => {
  const rawMinutesLeft = Number(user?.subscription?.minutesLeft ?? 0);
  const isUnlimited =
    rawMinutesLeft === -1 || user?.subscription?.plan === "pro+";
  const minutesUsed = Math.max(0, Number(user?.usage?.totalMinutesUsed || 0));

  let derivedMinutesLeft;
  if (isUnlimited) {
    derivedMinutesLeft = -1;
  } else if (user?.subscription?.plan === "free") {
    // For free plan, remaining = 5 - used
    derivedMinutesLeft = Math.max(0, 5 - minutesUsed);
  } else {
    // For pro plan, remaining = rawMinutesLeft
    derivedMinutesLeft = Math.max(0, rawMinutesLeft);
  }

  setRemainingMinutes(derivedMinutesLeft);
  setCanRecord(isUnlimited || derivedMinutesLeft > 0);
}, [user]);
```

### **3. Real-time Time Tracking**

```typescript
// Time tracking effect - only track when recording
useEffect(() => {
  if (isRecording && sessionStartTime) {
    timeTrackerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - sessionStartTime) / (1000 * 60); // Convert to minutes
      setSessionMinutesUsed(elapsed);

      if (!isUnlimited) {
        const newRemaining = Math.max(0, remainingMinutes - elapsed);
        setRemainingMinutes(newRemaining);
        setCanRecord(newRemaining > 0);
      }
    }, 1000); // Update every second

    return () => {
      if (timeTrackerRef.current) {
        clearInterval(timeTrackerRef.current);
      }
    };
  }
}, [isRecording, sessionStartTime, remainingMinutes, isUnlimited]);
```

### **4. Recording Controls with Time Limits**

```typescript
const startRecording = async () => {
  // Check if user can record
  if (!canRecord && !isUnlimited) {
    setError("No minutes left. Please upgrade your plan.");
    return;
  }

  // Check minimum recording time
  if (recordingStartTime && Date.now() - recordingStartTime < 2000) {
    setError("Please record for at least 2 seconds.");
    return;
  }

  // Start recording logic...
  setRecordingStartTime(Date.now());
  // ... rest of recording implementation
};
```

### **5. Session End - Update Server**

```typescript
const stopScreenCapture = async () => {
  // Stop time tracking
  if (timeTrackerRef.current) {
    clearInterval(timeTrackerRef.current);
  }

  // Update server with minutes used
  if (sessionMinutesUsed > 0) {
    await updateUserMinutes(sessionMinutesUsed);
  }

  // Reset session state
  setSessionStartTime(null);
  setSessionMinutesUsed(0);
  setRecordingStartTime(null);
};
```

### **6. Server Update Function**

```typescript
const updateUserMinutes = async (minutesUsed: number) => {
  try {
    const response = await fetch(`${API_URL}/auth/update-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ minutesUsed }),
    });

    if (response.ok) {
      const updatedUser = await response.json();
      setUser(updatedUser);
    }
  } catch (error) {
    console.error("Failed to update user minutes:", error);
  }
};
```

## 🔧 **Backend Implementation**

### **1. Update Usage Endpoint**

```typescript
router.post(
  "/update-usage",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { minutesUsed } = req.body;

      if (!minutesUsed || minutesUsed < 0) {
        return res.status(400).json({ message: "Invalid minutes used" });
      }

      const user = await User.findById(req.user?.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update total minutes used
      user.usage.totalMinutesUsed =
        (user.usage.totalMinutesUsed || 0) + minutesUsed;

      // Update minutes left (subtract from remaining)
      if (user.subscription.minutesLeft > 0) {
        user.subscription.minutesLeft = Math.max(
          0,
          user.subscription.minutesLeft - minutesUsed
        );
      }

      await user.save();

      return res.json({
        message: "Usage updated successfully",
        user: {
          id: user._id,
          subscription: user.subscription,
          usage: user.usage,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Server error" });
    }
  }
);
```

## 🎨 **UI Components**

### **1. Time Display Component**

```typescript
const TimeDisplay = ({ remainingMinutes, isUnlimited, sessionMinutesUsed }) => {
  const displayMinutes = isUnlimited ? "∞" : Math.max(0, remainingMinutes);

  return (
    <div className="time-display">
      <div className="time-info">
        <span className="time-label">Minutes Left:</span>
        <span
          className={`time-value ${remainingMinutes <= 5 ? "warning" : ""}`}
        >
          {displayMinutes}
        </span>
      </div>
      {sessionMinutesUsed > 0 && (
        <div className="session-time">
          Session: {sessionMinutesUsed.toFixed(1)}m
        </div>
      )}
    </div>
  );
};
```

### **2. Usage Progress Bar**

```typescript
const UsageProgress = ({ minutesUsed, minutesLimit, isUnlimited }) => {
  const percentage = isUnlimited
    ? 0
    : Math.min(100, (minutesUsed / minutesLimit) * 100);

  return (
    <div className="usage-progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      <span className="usage-text">
        {minutesUsed}m / {isUnlimited ? "∞" : minutesLimit}m used
      </span>
    </div>
  );
};
```

## 🚨 **Error Handling**

### **1. Time-out Prevention**

```typescript
// Clear false time-out errors
useEffect(() => {
  setError("");
  const clearErrorInterval = setInterval(() => {
    setError("");
  }, 5000);
  return () => clearInterval(clearErrorInterval);
}, []);
```

### **2. Recording Validation**

```typescript
const validateRecording = () => {
  // Check if user has minutes left
  if (!canRecord && !isUnlimited) {
    return "No minutes left. Please upgrade your plan.";
  }

  // Check minimum recording duration
  if (recordingStartTime && Date.now() - recordingStartTime < 2000) {
    return "Please record for at least 2 seconds.";
  }

  return null; // No errors
};
```

## 📱 **Mobile Responsiveness**

### **CSS for Mobile Time Display**

```css
@media (max-width: 768px) {
  .time-display {
    font-size: 14px;
    padding: 8px 12px;
  }

  .time-value.warning {
    animation: pulse 1s infinite;
  }

  .usage-progress {
    margin: 8px 0;
  }
}
```

## 🔄 **Integration Steps**

### **1. Frontend Setup**

1. **Add time tracking state** to your interview component
2. **Implement real-time tracking** with setInterval
3. **Add recording controls** with time validation
4. **Create UI components** for time display
5. **Handle session end** with server updates

### **2. Backend Setup**

1. **Create update-usage endpoint** in auth routes
2. **Implement minute calculation** logic
3. **Add validation** for minute updates
4. **Test with different** subscription plans

### **3. Database Schema**

1. **Ensure User model** has subscription and usage fields
2. **Set default values** for each plan type
3. **Add indexes** for performance
4. **Test data integrity**

## 🧪 **Testing Scenarios**

### **1. Free Plan (5 minutes)**

- Start with 5 minutes
- Record for 2 minutes → 3 minutes left
- Record for 3 minutes → 0 minutes left
- Try to record → "No minutes left" error

### **2. Pro Plan (90 minutes)**

- Start with 90 minutes
- Record for 30 minutes → 60 minutes left
- Continue recording until 0 minutes
- Verify upgrade prompts

### **3. Pro+ Plan (Unlimited)**

- Start with unlimited minutes
- Record for any duration
- No time restrictions
- No upgrade prompts

## 🚀 **Deployment Considerations**

### **1. Environment Variables**

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
```

### **2. Performance Optimization**

- **Debounce** minute updates to avoid excessive API calls
- **Cache** user data locally
- **Optimize** database queries
- **Use** connection pooling

### **3. Monitoring**

- **Log** minute usage for analytics
- **Track** subscription conversions
- **Monitor** API performance
- **Alert** on errors

## 📋 **Checklist for Implementation**

- [ ] **Frontend time tracking** state management
- [ ] **Real-time minute** calculation
- [ ] **Recording controls** with validation
- [ ] **Server update** endpoint
- [ ] **UI components** for time display
- [ ] **Error handling** for time limits
- [ ] **Mobile responsiveness** styling
- [ ] **Testing** across all plans
- [ ] **Performance** optimization
- [ ] **Monitoring** and logging

## 🎯 **Key Success Metrics**

- **Accurate time tracking** across all devices
- **Smooth user experience** with real-time updates
- **Proper enforcement** of subscription limits
- **Fast API responses** for minute updates
- **Mobile-friendly** interface
- **Error-free** recording sessions

This system provides a complete minutes counting solution for AI interviewer applications with proper subscription management and user experience optimization.
