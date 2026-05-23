"use client";

import { useState } from "react";
import { signInWithGoogle, supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const { setShowCookieConsentModal } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get("redirect");
      const planParam = searchParams.get("plan");
      
      let redirectTo = `${window.location.origin}/browse`;
      if (redirectParam === "checkout" && planParam) {
        redirectTo = `${window.location.origin}/?redirect=checkout&plan=${planParam}`;
      }
      await signInWithGoogle(redirectTo);
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      setError(err.message || "Google Sign-In failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !fullName.trim())) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign Up with Email/Password
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName.trim(),
            }
          }
        });

        if (signUpError) throw signUpError;

        setMessage("Account created successfully! Logging in...");

        // Auto-login to establish session immediately and bypass confirmation checks on UI
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) throw signInError;
        }
      } else {
        // Sign In with Email/Password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        
        setMessage("Success! Logging in...");
        // AuthProvider handles the redirect to /profiles or /browse
      }
    } catch (err: any) {
      console.error("Email Authentication Error:", err);
      setError(err.message || "Authentication failed. Please verify your credentials.");
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex flex-col justify-between bg-cover bg-center bg-no-repeat font-sans select-none overflow-x-hidden"
      style={{
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.95)), url('https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1920&auto=format&fit=crop')"
      }}
    >
      {/* Top Navbar Header */}
      <header className="px-6 py-6 md:px-16 md:py-8 flex items-center justify-between z-10 w-full bg-gradient-to-b from-black/80 to-transparent">
        <img 
          src="/long_logo.png" 
          alt="MemoryFlix Logo"
          onClick={() => router.push("/")}
          className="h-12 sm:h-16 md:h-20 lg:h-24 cursor-pointer transition-transform active:scale-95 object-contain"
        />
      </header>

      {/* Main Login Content Card */}
      <main className="flex-grow flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-[460px] bg-black/85 backdrop-blur-md rounded-xl px-8 py-12 sm:px-12 md:py-16 flex flex-col border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-fade-in">
          <h1 className="text-white text-3xl font-extrabold mb-8 tracking-wide">
            {isSignUp ? "Create Account" : "Sign In"}
          </h1>
          
          {error && (
            <div className="bg-[#e87c03] text-white text-xs md:text-sm rounded-md px-4 py-3 mb-6 font-semibold shadow border border-white/5 animate-pulse">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-600 text-white text-xs md:text-sm rounded-md px-4 py-3 mb-6 font-semibold shadow border border-white/5 animate-pulse">
              {message}
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 flex flex-col">
            {isSignUp && (
              <div className="relative w-full group">
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=" "
                  required
                  disabled={loading}
                  className="w-full h-[56px] px-5 pt-5 pb-1 rounded-md bg-[#181818]/90 text-white border border-white/10 focus:border-white focus:bg-black/40 text-base focus:outline-none transition-all duration-300 peer placeholder-shown:pt-4 placeholder-shown:pb-4 group-hover:border-white/30"
                />
                <label 
                  htmlFor="fullName"
                  className="absolute left-5 top-2.5 text-white/50 text-xs font-semibold tracking-wide transition-all duration-200 pointer-events-none origin-[0] scale-100 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-75 peer-focus:-translate-y-2 peer-focus:text-xs peer-focus:text-white/60"
                >
                  Full Name
                </label>
              </div>
            )}

            <div className="relative w-full group">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                required
                disabled={loading}
                className="w-full h-[56px] px-5 pt-5 pb-1 rounded-md bg-[#181818]/90 text-white border border-white/10 focus:border-white focus:bg-black/40 text-base focus:outline-none transition-all duration-300 peer placeholder-shown:pt-4 placeholder-shown:pb-4 group-hover:border-white/30"
              />
              <label 
                htmlFor="email"
                className="absolute left-5 top-2.5 text-white/50 text-xs font-semibold tracking-wide transition-all duration-200 pointer-events-none origin-[0] scale-100 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-75 peer-focus:-translate-y-2 peer-focus:text-xs peer-focus:text-white/60"
              >
                Email Address
              </label>
            </div>

            <div className="relative w-full group">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                required
                minLength={6}
                disabled={loading}
                className="w-full h-[56px] px-5 pt-5 pb-1 rounded-md bg-[#181818]/90 text-white border border-white/10 focus:border-white focus:bg-black/40 text-base focus:outline-none transition-all duration-300 peer placeholder-shown:pt-4 placeholder-shown:pb-4 group-hover:border-white/30"
              />
              <label 
                htmlFor="password"
                className="absolute left-5 top-2.5 text-white/50 text-xs font-semibold tracking-wide transition-all duration-200 pointer-events-none origin-[0] scale-100 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-75 peer-focus:-translate-y-2 peer-focus:text-xs peer-focus:text-white/60"
              >
                Password
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-md font-bold bg-netflix-red text-white hover:bg-netflix-red-hover focus:outline-none transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer shadow-[0_5px_15px_rgba(229,9,20,0.3)] hover:shadow-[0_5px_20px_rgba(229,9,20,0.45)] disabled:opacity-50 mt-4 text-base active:scale-98"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isSignUp ? "Register Account" : "Sign In"
              )}
            </button>
          </form>

          {/* OR Divider */}
          <div className="flex items-center my-6 select-none">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="px-3 text-white/30 text-xs font-bold tracking-widest">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-md font-bold border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40 focus:outline-none transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 hover:scale-102 active:scale-98"
          >
            <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.423-2.423C17.395 1.7 14.945 1 12.24 1 6.72 1 2.24 5.48 2.24 11s4.48 10 10 10c5.76 0 10-4.04 10-10 0-.68-.08-1.33-.24-1.715H12.24z"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-8 text-white/50 text-xs md:text-sm flex flex-col gap-4 border-t border-white/10 pt-6">
            <div>
              <span className="mr-1.5 text-white/40">
                {isSignUp ? "Already have an account?" : "New to MemoryFlix?"}
              </span>
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                  setFullName("");
                }}
                className="text-white hover:underline font-bold cursor-pointer transition-colors"
              >
                {isSignUp ? "Sign in now." : "Sign up now."}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-white/30 font-medium">
              This page is secured with high-grade security vaults and custom Auth policies to protect your private memories completely.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Details */}
      <footer className="w-full bg-black/90 border-t border-white/5 py-8 px-6 md:px-16 z-10 text-white/40 text-xs font-light">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} MemoryFlix. Built for family memory streams.</p>
          <div className="flex gap-6">
            <span className="hover:underline cursor-pointer transition-colors hover:text-white">Privacy Policy</span>
            <span className="hover:underline cursor-pointer transition-colors hover:text-white">Terms of Use</span>
            <span className="hover:underline cursor-pointer transition-colors hover:text-white">Help Center</span>
            <span onClick={() => setShowCookieConsentModal(true)} className="hover:underline cursor-pointer transition-colors hover:text-white">Cookie Preferences</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
