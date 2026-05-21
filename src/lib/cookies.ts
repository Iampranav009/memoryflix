/**
 * Client-side Cookie Utilities for MemoryFlix
 */

/**
 * Set a cookie in the browser.
 * @param name The name of the cookie
 * @param value The string value of the cookie
 * @param days Optional expiry in days. If not provided, it acts as a session cookie.
 */
export const setCookie = (name: string, value: string, days?: number) => {
  if (typeof document === "undefined") return;
  
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  
  // Set secure cookie with SameSite protection
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax; Secure`;
};

/**
 * Get a cookie by name.
 * @param name The name of the cookie to retrieve
 */
export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

/**
 * Delete a cookie by setting its expiration to the past.
 * @param name The name of the cookie to delete
 */
export const deleteCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure`;
};

/**
 * Check if a cookie exists.
 * @param name The name of the cookie
 */
export const hasCookie = (name: string): boolean => {
  return getCookie(name) !== null;
};
