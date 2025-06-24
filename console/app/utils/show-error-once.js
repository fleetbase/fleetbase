const lastErrorMap = new WeakMap();
export default function showErrorOnce(context, notifications, message, duration = 4000) {
    const currentMessage = lastErrorMap.get(context);
    
    if (!currentMessage || currentMessage !== message) {
        notifications.error(message);
        lastErrorMap.set(context, message);
        
        setTimeout(() => {
            // Only clear if this specific message is still the current one
            if (lastErrorMap.get(context) === message) {
                lastErrorMap.delete(context); // Use delete instead of setting to null
            }
        }, duration);
    }
}