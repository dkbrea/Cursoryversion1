/**
 * Get a time-based greeting based on the current time and timezone
 */
export function getTimeBasedGreeting(timezone?: string): string {
  const now = new Date();
  
  // If timezone is provided, get the time in that timezone
  let currentTime = now;
  if (timezone) {
    try {
      // Get the time in the user's timezone
      const timeInTimezone = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      currentTime = timeInTimezone;
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}. Using local time.`);
      // Fall back to local time if timezone is invalid
    }
  }
  
  const hour = currentTime.getHours();
  
  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  } else {
    // Evening covers 5pm to 5am (17:00 to 05:00)
    return "Good Evening";
  }
}

/**
 * Get a greeting with the user's first name
 */
export function getPersonalizedGreeting(userName?: string, timezone?: string): string {
  const greeting = getTimeBasedGreeting(timezone);
  const firstName = userName?.split(' ')[0] || 'there';
  return `${greeting}, ${firstName}`;
} 