"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Sparkles, Play, Shield, Film, Heart, X, 
  Volume2, VolumeX, ChevronDown, ChevronUp, Check, 
  Plus, Tv, Info, ArrowUpRight, Lock, 
  Laptop, Smartphone, Database, Users, HelpCircle, 
  ChevronRight, Calendar, Clock, AlertCircle, PlayCircle
} from "lucide-react";
import { useStore } from "@/store/useStore";
import axios from "axios";

// Realistic Netflix-style Mock Memory Shows for the Interactive Showcase
const MOCK_SHOWS = [
  {
    id: "summer-2025",
    title: "Summer Vacation 2025",
    tagline: "Sun, Sand & Highway Playlists",
    description: "Relive the ultimate 10-day family adventure along the Pacific Coast Highway. From hidden sandy coves and misty forests to cozy ocean-side campfires, watch our favorite road trip moments play out in high definition.",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
    year: "2025",
    rating: "All Ages",
    matchScore: "99% Match",
    seasonsCount: 1,
    genres: ["Adventure", "Family Roadtrip", "Nature"],
    episodes: [
      {
        id: "sv-e1",
        title: "S1:E1 — Packing Bags & Coastal Curves",
        duration: "8:42",
        summary: "The suitcases are loaded, the perfect playlist is queued, and we head down the coast. Witness our first stop along the stunning cliffs of Big Sur."
      },
      {
        id: "sv-e2",
        title: "S1:E2 — Campfire Acoustic Sessions",
        duration: "12:15",
        summary: "Roasting marshmallows under a canopy of ancient redwoods while Uncle Dave attempts to play the guitar. Sparklers, laughter, and starry skies."
      },
      {
        id: "sv-e3",
        title: "S1:E3 — Dolphin Pods & Morning Surf",
        duration: "9:04",
        summary: "A breathtaking early morning surf session where a friendly pod of dolphins swims just yards away from our boards. Pure coastal magic."
      }
    ]
  },
  {
    id: "wedding-day",
    title: "The Wedding Vows",
    tagline: "A Love Story in 4K",
    description: "Two families become one on a perfect spring afternoon. Experience the behind-the-scenes nervous laughter, the tearful promises under the giant oak, and the legendary dance floor battles that followed.",
    coverUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
    year: "2024",
    rating: "PG",
    matchScore: "98% Match",
    seasonsCount: 2,
    genres: ["Romance", "Celebration", "Emotional"],
    episodes: [
      {
        id: "wd-e1",
        title: "S1:E1 — Hairspray & Tight Bowties",
        duration: "6:10",
        summary: "Capturing the raw tension and sweet anticipation of the morning preparations. Ties get straightened, champagne is toasted, and hands shake."
      },
      {
        id: "wd-e2",
        title: "S1:E2 — Vows Under the Sacred Oak",
        duration: "14:30",
        summary: "The main ceremony. Highlighting the walk down the aisle, the heartfelt hand-written vows, and the grand kiss that seals the union."
      },
      {
        id: "wd-e3",
        title: "S2:E1 — The Grand Waltz & Cake Chaos",
        duration: "11:05",
        summary: "Stepping onto the dance floor as newlyweds. From a romantic first dance to the chaotic cake-cutting and high-energy group dances."
      }
    ]
  },
  {
    id: "baby-leo",
    title: "Leo's First Steps",
    tagline: "Discovering the World, Inch by Inch",
    description: "From soft newborn snoozes to messy spaghetti-eating battles and shaky first wobbles. Watch little Leo conquer gravity and discover his home in this deeply personal, ongoing docuseries.",
    coverUrl: "https://images.unsplash.com/photo-1519689680058-324335c77ebe?q=80&w=600&auto=format&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1519689680058-324335c77ebe?q=80&w=1200&auto=format&fit=crop",
    year: "2026",
    rating: "All Ages",
    matchScore: "95% Match",
    seasonsCount: 1,
    genres: ["Baby Milestones", "Contagious Laughter", "Messy Eats"],
    episodes: [
      {
        id: "bl-e1",
        title: "S1:E1 — Safe At Home & First Sniffs",
        duration: "5:20",
        summary: "Bringing Leo home from the clinic. Watch our golden retriever, Rusty, curiously sniffing the tiny new member of the pack."
      },
      {
        id: "bl-e2",
        title: "S1:E2 — The Contagious Belly Laugh",
        duration: "4:15",
        summary: "A simple red cup and a game of peek-a-boo trigger Leo's very first hysterical, high-pitched belly laugh. Unscripted joy."
      },
      {
        id: "bl-e3",
        title: "S1:E3 — Wobbling into the Unknown",
        duration: "7:50",
        summary: "Two shaky paces, a brief, triumphant stand, and a soft tumble directly into mom's arms. The official beginning of toddlerhood."
      }
    ]
  },
  {
    id: "winter-2026",
    title: "Winter Wonderland",
    tagline: "Aspen Slopes & Fireside Stories",
    description: "Fresh powder runs, snow fights, and steaming hot cocoa. Follow the annual winter chalet escape into the breathtaking heights of Aspen, where freezing fingers meet cozy warm fireplace hearths.",
    coverUrl: "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=600&auto=format&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?q=80&w=1200&auto=format&fit=crop",
    year: "2026",
    rating: "All Ages",
    matchScore: "97% Match",
    seasonsCount: 1,
    genres: ["Skiing", "Cozy Winter", "Snow fun"],
    episodes: [
      {
        id: "ww-e1",
        title: "S1:E1 — First Tracks in Deep Powder",
        duration: "9:35",
        summary: "Strapping on the skis at sunrise. Floating down steep fields of untouched, fluffy snow under a brilliant cloudless blue sky."
      },
      {
        id: "ww-e2",
        title: "S1:E2 — Boardgames & Crackling Logs",
        duration: "7:12",
        summary: "Defrosting frozen noses. An intense game of Monopoly by the massive stone hearth while snow falls heavy outside the window."
      },
      {
        id: "ww-e3",
        title: "S1:E3 — Midnight Sledding Championship",
        duration: "8:50",
        summary: "A chaotic, hilarious sled race down the resort's bunny hill under the moonlit glow, featuring spectacular pile-ups and snow angels."
      }
    ]
  }
];

export default function RootLandingPage() {
  const router = useRouter();

  // State hooks for interactivity
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeShow, setActiveShow] = useState<typeof MOCK_SHOWS[0] | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<any | null>(null);
  
  // Simulated playback state
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [isPlaybackMuted, setIsPlaybackMuted] = useState(false);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  
  // Active workflow step
  const [activeStep, setActiveStep] = useState(0);
  
  // Selected subscription plan
  const [selectedPlan, setSelectedPlan] = useState("family");
  
  // FAQ accordion open index
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Video trailer element reference
  const trailerVideoRef = useRef<HTMLVideoElement>(null);

  const { dbUser, setDbUser, setShowCookieConsentModal } = useStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (planName: string) => {
    if (planName === "free") {
      alert("You are automatically enrolled in the Free Tier on registration.");
      return;
    }

    if (!dbUser) {
      router.push(`/login?redirect=checkout&plan=${planName}`);
      return;
    }

    setCheckoutLoading(true);
    setPaymentSuccess(false);

    try {
      const res = await axios.post("/api/checkout", {
        userId: dbUser.id,
        planName,
      });

      const order = res.data;

      if (order.isMock) {
        console.log("Simulating checkout success locally...");
        const webhookUrl = "/api/webhooks/razorpay";
        await axios.post(webhookUrl, {
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: `pay_${Math.random().toString(36).substring(2, 11)}`,
                order_id: order.id,
                status: "captured",
                notes: {
                  userId: dbUser.id,
                  planName,
                },
              },
            },
          },
        });

        const syncResponse = await axios.post("/api/auth/sync", {
          firebaseUid: dbUser.firebaseUid,
          email: dbUser.email,
          name: dbUser.name,
          photoUrl: dbUser.photoUrl,
        });
        setDbUser(syncResponse.data);
        setPaymentSuccess(true);
        setCheckoutLoading(false);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
        setCheckoutLoading(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummy",
        amount: order.amount,
        currency: order.currency,
        name: "MemoryFlix",
        description: `Upgrade to ${planName.toUpperCase()} Plan`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            setCheckoutLoading(true);
            const syncResponse = await axios.post("/api/auth/sync", {
              firebaseUid: dbUser.firebaseUid,
              email: dbUser.email,
              name: dbUser.name,
              photoUrl: dbUser.photoUrl,
            });
            setDbUser(syncResponse.data);
            setPaymentSuccess(true);
          } catch (err) {
            console.error("Auth sync failed post-payment:", err);
          } finally {
            setCheckoutLoading(false);
          }
        },
        prefill: {
          name: dbUser.name || "",
          email: dbUser.email || "",
        },
        theme: {
          color: "#E50914",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Checkout initiation error:", err);
      alert(err.response?.data?.error || err.message || "Failed to initiate payment");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle simulated playback countdown
  useEffect(() => {
    let interval: any;
    if (playingEpisode && !isPlaybackPaused && !playbackLoading) {
      interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1.5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [playingEpisode, isPlaybackPaused, playbackLoading]);

  // Handle play action for details popup
  const handlePlayEpisode = (episode: any) => {
    setPlaybackLoading(true);
    setPlaybackProgress(0);
    setPlayingEpisode(episode);
    
    // Simulate loading for 1.2s before beginning playback
    setTimeout(() => {
      setPlaybackLoading(false);
    }, 1200);
  };

  // Video Trailer player volume/play helper
  const toggleTrailerMute = () => {
    if (trailerVideoRef.current) {
      trailerVideoRef.current.muted = !trailerVideoRef.current.muted;
      // Trigger state re-render
      setShowTrailer(true);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#141414] text-white font-sans selection:bg-netflix-red selection:text-white overflow-x-hidden">
      
      {/* 1. CINEMATIC HERO & NAVBAR SECTION */}
      <section 
        className="relative min-h-screen w-full flex flex-col justify-between bg-cover bg-center bg-no-repeat z-20"
        style={{
          backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.65), rgba(20, 20, 20, 1)), url('https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1920&auto=format&fit=crop')"
        }}
      >
        {/* Navigation Navbar */}
        <header className="px-6 py-6 md:px-16 md:py-8 flex items-center justify-between z-30 w-full bg-gradient-to-b from-black/90 to-transparent">
          <div className="flex items-center gap-2">
            <img 
              src="/long_logo.png" 
              alt="MemoryFlix Logo"
              onClick={() => router.push("/")}
              className="h-10 sm:h-12 md:h-14 lg:h-16 cursor-pointer transition-transform active:scale-95 object-contain"
            />
          </div>
          
          <div className="flex items-center gap-4">
            {dbUser ? (
              <button
                onClick={() => router.push("/browse")}
                className="px-5 py-2.5 rounded bg-netflix-red hover:bg-netflix-red-hover text-white text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer shadow-[0_4px_15px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95"
              >
                Go to Browse
              </button>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2.5 rounded bg-netflix-red hover:bg-netflix-red-hover text-white text-sm font-bold tracking-wide transition-all duration-200 cursor-pointer shadow-[0_4px_15px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Hero Callout Container */}
        <div className="flex-grow flex items-center justify-center px-6 py-16 text-center z-10 max-w-5xl mx-auto">
          <div className="space-y-8 animate-fade-in">
            
            {/* Pulsing Badge */}
            <div className="inline-flex items-center justify-center gap-2.5 text-netflix-red text-xs sm:text-sm font-extrabold uppercase tracking-[0.25em] bg-black/75 border border-white/10 px-6 py-2.5 rounded-full shadow-2xl backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-netflix-red animate-pulse" />
              Your Private Family Streaming Network
            </div>

            {/* Main Header */}
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black leading-[1.05] tracking-wide netflix-text-shadow">
              Unlimited memories, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-netflix-red">streamed forever.</span>
            </h1>

            {/* Sub-description */}
            <p className="text-white/80 text-lg sm:text-2xl font-normal max-w-3xl mx-auto leading-relaxed netflix-text-shadow">
              Stop hiding your life's greatest moments in random cloud folders. Organize your photos and videos into a gorgeous, private streaming interface complete with <span className="text-white font-semibold underline decoration-netflix-red decoration-2">Shows, Seasons, and Episodes</span>.
            </p>

            {/* Visual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => router.push("/login")}
                className="w-full sm:w-auto px-8 py-4.5 bg-netflix-red hover:bg-netflix-red-hover hover:scale-105 active:scale-95 text-white font-extrabold rounded shadow-[0_6px_25px_rgba(229,9,20,0.5)] transition-all flex items-center justify-center gap-3.5 uppercase text-sm tracking-[0.12em] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Get Started (Always Free)
              </button>

              <button
                onClick={() => setShowTrailer(true)}
                className="w-full sm:w-auto px-8 py-4.5 bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95 text-white font-bold rounded transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-[0.08em] cursor-pointer backdrop-blur-sm"
              >
                <Film className="w-5 h-5 text-netflix-red" />
                Watch Cinematic Trailer
              </button>
            </div>

            {/* Prompt */}
            <p className="text-white/40 text-xs sm:text-sm font-medium tracking-wide">
              No credit card required. Encrypted storage vaults and family-scoped visibility.
            </p>
          </div>
        </div>

        {/* Subtle Bottom Fade Gradient */}
        <div className="h-24 w-full bg-gradient-to-t from-[#141414] to-transparent z-10 pointer-events-none"></div>
      </section>


      {/* 2. REAL TRAILER POPUP MODAL */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8 animate-fade-in backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-black border border-white/15 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.4)]">
            
            {/* Header controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button 
                onClick={toggleTrailerMute}
                className="p-3 bg-black/75 hover:bg-black text-white rounded-full border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Toggle Mute"
              >
                {trailerVideoRef.current?.muted ? <VolumeX className="w-5 h-5 text-netflix-red" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setShowTrailer(false)}
                className="p-3 bg-black/75 hover:bg-black text-white rounded-full border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Close Trailer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full bg-black relative">
              <video 
                ref={trailerVideoRef}
                src="/netflix _intro_1080p.mp4" 
                autoPlay 
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setShowTrailer(false)}
              />
              <div className="absolute bottom-6 left-6 pointer-events-none bg-black/60 border border-white/10 px-4 py-2 rounded-md">
                <p className="text-netflix-red font-black tracking-widest text-xs uppercase animate-pulse">MemoryFlix Cinematic Intro</p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 3. INTERACTIVE MOCKUP SHOWCASE (LIVE DEMO) */}
      <section className="py-20 px-6 md:px-16 bg-[#141414] relative z-25 border-t border-white/5">
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Experience the <span className="text-netflix-red">Interactive Sandbox</span>
            </h2>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto font-medium">
              Go ahead! Hover, click, browse, and play. Test out this fully interactive live simulation of the MemoryFlix interface right now.
            </p>
          </div>

          {/* Interactive Interface Frame */}
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-8 relative overflow-hidden">
            
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-[400px] h-[200px] bg-netflix-red/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            {/* Header bar of our Sandbox */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none">
              <div className="flex items-center gap-6">
                <span className="text-white font-extrabold text-lg tracking-widest font-logo flex items-center gap-1.5 text-netflix-red select-none">
                  <PlayCircle className="w-5 h-5" /> MEMORYFLIX DEMO
                </span>
                <span className="hidden sm:inline text-xs text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                  Status: Simulated Sandbox Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">Live Preview</span>
              </div>
            </div>

            {/* Showcase title banner */}
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2.5">
                <Tv className="w-5 h-5 text-netflix-red" />
                Featured Series Categories
              </h3>
              <p className="text-xs text-white/45">Click any card below to open its Netflix-style catalog details, inspect its episodes, and play.</p>
            </div>

            {/* Netflix sliding grid row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
              {MOCK_SHOWS.map((show) => (
                <div 
                  key={show.id}
                  onClick={() => {
                    setActiveShow(show);
                    setPlayingEpisode(null); // Clear active playing states
                  }}
                  className="group relative bg-[#202020] rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-netflix-red/40 transition-all duration-300 transform hover:-translate-y-2 shadow-lg hover:shadow-[0_12px_25px_rgba(0,0,0,0.7)]"
                >
                  {/* Poster Image */}
                  <div className="aspect-[16/9] w-full overflow-hidden bg-[#2a2a2a] relative">
                    <img 
                      src={show.coverUrl} 
                      alt={show.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
                    
                    {/* Hover Play Glow */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                      <div className="p-3 bg-netflix-red rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Poster Details */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {show.matchScore}
                      </span>
                      <span className="text-white/40 text-xs font-semibold">{show.year}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-netflix-red transition-colors truncate">
                      {show.title}
                    </h4>
                    
                    <p className="text-[11px] text-white/50 font-medium line-clamp-1">
                      {show.tagline}
                    </p>

                    <div className="flex gap-1.5 pt-1.5 flex-wrap">
                      {show.genres.slice(0, 2).map((g, idx) => (
                        <span key={idx} className="text-[9px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/60">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>


      {/* 4. MOCKUP DETAIL OVERLAY / POPUP PORTAL (Simulated Netflix Portal) */}
      {activeShow && (
        <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fade-in backdrop-blur-md">
          <div className="relative w-full max-w-3xl bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-h-[90vh] flex flex-col my-8 animate-zoom-in">
            
            {/* Top Close Button */}
            <button 
              onClick={() => {
                setActiveShow(null);
                setPlayingEpisode(null);
              }}
              className="absolute top-4 right-4 z-50 p-2.5 bg-black/80 hover:bg-black text-white rounded-full border border-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Detail Banner Backdrop */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden flex-shrink-0">
              <img 
                src={activeShow.backdropUrl} 
                alt={activeShow.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/35 to-transparent"></div>
              
              {/* Title Info overlay */}
              <div className="absolute bottom-6 left-6 sm:left-10 right-6 space-y-2">
                <span className="text-[10px] tracking-[0.2em] font-extrabold text-netflix-red uppercase bg-black/60 border border-white/10 px-3 py-1 rounded w-fit block">
                  Memory Stream
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight netflix-text-shadow">
                  {activeShow.title}
                </h2>
                <p className="text-white/80 text-xs sm:text-sm font-semibold italic max-w-md netflix-text-shadow">
                  "{activeShow.tagline}"
                </p>
              </div>
            </div>

            {/* Scrollable details and episode content */}
            <div className="p-6 sm:p-10 space-y-8 overflow-y-auto flex-grow">
              
              {/* Flex Grid details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left descriptions */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-3.5 flex-wrap text-xs sm:text-sm">
                    <span className="font-extrabold text-emerald-400">{activeShow.matchScore}</span>
                    <span className="text-white/60 font-semibold">{activeShow.year}</span>
                    <span className="px-2 py-0.5 border border-white/30 text-white/80 font-bold rounded text-[10px] select-none">
                      {activeShow.rating}
                    </span>
                    <span className="text-white/60 font-semibold">{activeShow.seasonsCount} Season(s)</span>
                    <span className="px-1.5 py-0.5 bg-netflix-red/10 border border-netflix-red/35 text-netflix-red font-bold text-[9px] rounded uppercase">
                      4K Ultra HD
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed font-medium">
                    {activeShow.description}
                  </p>
                </div>

                {/* Right detail specs */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-white/40 block font-semibold">Genres</span>
                    <p className="text-white/80 font-medium">{activeShow.genres.join(", ")}</p>
                  </div>
                  <div>
                    <span className="text-white/40 block font-semibold">Privacy Vault</span>
                    <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> High Encryption AES
                    </p>
                  </div>
                  <div>
                    <span className="text-white/40 block font-semibold">Collaborators</span>
                    <p className="text-white/80 font-medium">Family (Admin Approved)</p>
                  </div>
                </div>

              </div>

              {/* EPISODE ROWS CONTAINER */}
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <Film className="w-4 h-4 text-netflix-red" />
                  Episodes List (Season 1)
                </h3>
                
                <div className="space-y-3.5">
                  {activeShow.episodes.map((ep, idx) => (
                    <div 
                      key={ep.id}
                      onClick={() => handlePlayEpisode(ep)}
                      className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-black/35 hover:bg-black/75 border border-white/5 hover:border-netflix-red/30 rounded-xl cursor-pointer transition-all gap-4"
                    >
                      <div className="flex items-start gap-4">
                        {/* Simulated Thumbnail */}
                        <div className="relative aspect-[16/9] w-28 sm:w-32 bg-[#252525] border border-white/10 rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={activeShow.coverUrl} 
                            alt={ep.title}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-white opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-all fill-current" />
                          </div>
                        </div>

                        {/* Title & summary */}
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-white group-hover:text-netflix-red transition-colors flex items-center gap-2">
                            {ep.title}
                          </h4>
                          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                            {ep.summary}
                          </p>
                        </div>
                      </div>

                      {/* Runtime */}
                      <span className="text-xs text-white/40 font-bold bg-white/5 border border-white/5 px-2.5 py-1 rounded w-fit sm:self-center">
                        {ep.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer lock tag */}
            <div className="bg-[#101010] border-t border-white/5 p-4 text-center text-xs text-white/40 font-medium flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-netflix-red" />
              Sign up to upload your own video memory files to this personal viewer dashboard
            </div>

          </div>
        </div>
      )}


      {/* 5. SIMULATED VIDEO PLAYER OVERLAY (Sandbox Playback) */}
      {playingEpisode && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-8 animate-fade-in font-sans">
          
          {/* Header row */}
          <div className="flex items-center justify-between z-10 w-full bg-gradient-to-b from-black/80 to-transparent p-4">
            <button 
              onClick={() => setPlayingEpisode(null)}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors cursor-pointer text-sm font-bold bg-black/50 border border-white/10 px-4 py-2 rounded-full"
            >
              <X className="w-4 h-4" /> Exit Private Stream
            </button>
            <div className="text-center">
              <span className="text-netflix-red text-[10px] tracking-widest font-black uppercase block">Now Replaying Memory</span>
              <span className="font-extrabold text-white text-base truncate max-w-xs block">{playingEpisode.title}</span>
            </div>
            <div className="w-24 hidden sm:block"></div>
          </div>

          {/* Core Screen */}
          <div className="flex-grow flex items-center justify-center relative my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
            {playbackLoading ? (
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-netflix-red border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-white/45 text-xs font-bold tracking-widest uppercase animate-pulse">Establishing Secure Stream...</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                
                {/* Realistic memory screen placeholder */}
                <div className="absolute inset-0 bg-[#0d0d0d] flex items-center justify-center overflow-hidden">
                  {/* Rotating visual mesh to simulate active cinematic environment */}
                  <div className="absolute inset-0 bg-cover bg-center filter blur-lg opacity-25 scale-110"
                    style={{ backgroundImage: `url(${activeShow?.backdropUrl})` }}
                  ></div>
                  <div className="absolute inset-0 bg-radial-gradient(rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.9) 100%)"></div>
                  
                  {/* Dynamic moving soundwave visualizer */}
                  <div className="flex items-end gap-1.5 h-16 opacity-30 select-none pointer-events-none">
                    <span className="w-1.5 bg-netflix-red rounded animate-pulse" style={{ height: "40%", animationDuration: "1.1s" }}></span>
                    <span className="w-1.5 bg-netflix-red rounded animate-pulse" style={{ height: "80%", animationDuration: "0.8s" }}></span>
                    <span className="w-1.5 bg-netflix-red rounded animate-pulse" style={{ height: "60%", animationDuration: "1.5s" }}></span>
                    <span className="w-1.5 bg-netflix-red rounded animate-pulse" style={{ height: "95%", animationDuration: "0.5s" }}></span>
                    <span className="w-1.5 bg-netflix-red rounded animate-pulse" style={{ height: "35%", animationDuration: "1.2s" }}></span>
                  </div>
                </div>

                {/* Playing details card */}
                <div className="z-10 bg-black/85 border border-white/10 p-6 rounded-2xl max-w-sm text-center space-y-4 backdrop-blur-md shadow-2xl mx-4">
                  <div className="p-3 bg-netflix-red/10 border border-netflix-red/20 rounded-full w-fit mx-auto">
                    <Tv className="w-8 h-8 text-netflix-red animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-white text-base">Replay Simulation Active</h5>
                    <p className="text-white/60 text-xs leading-relaxed">
                      On the live app, this streams your high-fidelity mp4/mkv video files straight from your private AWS S3 bucket.
                    </p>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> High Secure Token Access Granted
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Footer controls HUD */}
          <div className="z-10 w-full bg-gradient-to-t from-black/90 to-transparent p-4 space-y-4">
            
            {/* Timeline Progress Slider */}
            <div className="space-y-1.5 select-none">
              <div className="flex justify-between text-xs text-white/50 font-bold">
                <span>{playbackLoading ? "0:00" : `0:${Math.floor(playbackProgress * 0.1).toString().padStart(2, "0")}`}</span>
                <span>{playingEpisode.duration}</span>
              </div>
              
              {/* Progress track */}
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative group">
                <div 
                  className="h-full bg-netflix-red transition-all duration-100 relative"
                  style={{ width: `${playbackProgress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            </div>

            {/* Play buttons controls row */}
            <div className="flex items-center justify-between text-white">
              
              {/* Left action panel */}
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsPlaybackPaused(!isPlaybackPaused)}
                  disabled={playbackLoading}
                  className="hover:text-netflix-red transition-colors p-1.5 cursor-pointer disabled:opacity-30"
                  title={isPlaybackPaused ? "Play" : "Pause"}
                >
                  {isPlaybackPaused ? (
                    <Play className="w-6 h-6 fill-current" />
                  ) : (
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-6 bg-white rounded-sm"></span>
                      <span className="w-1.5 h-6 bg-white rounded-sm"></span>
                    </div>
                  )}
                </button>

                <button 
                  onClick={() => setIsPlaybackMuted(!isPlaybackMuted)}
                  className="hover:text-netflix-red transition-colors p-1.5 cursor-pointer"
                  title={isPlaybackMuted ? "Unmute" : "Mute"}
                >
                  {isPlaybackMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>

              {/* Right stats panel */}
              <div className="text-right text-xs font-semibold text-white/40">
                <p>Private Decrypt Node: <span className="text-emerald-500 font-bold">AES-256</span></p>
              </div>

            </div>
          </div>
        </div>
      )}


      {/* 6. "BEHIND THE STREAMS" INTERACTIVE WORKFLOW TABS */}
      <section className="py-24 px-6 md:px-16 bg-[#181818] border-t border-white/5 relative z-20">
        <div className="max-w-5xl mx-auto space-y-16">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Behind the Streams: <span className="text-netflix-red">How it Works</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto font-medium">
              We make archiving your life's greatest chronicles as easy as watching your favorite blockbuster. Here is the magic:
            </p>
          </div>

          {/* Interactive Step Navigator Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "1. Create Show", desc: "Define Your Catalog" },
              { label: "2. Structure Seasons", desc: "Map Years or Trips" },
              { label: "3. Upload Media", desc: "Secure Direct S3" },
              { label: "4. Watch Anywhere", desc: "Enjoy Popcorn & Stream" }
            ].map((step, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-xl text-left border transition-all duration-300 cursor-pointer ${
                  activeStep === idx 
                    ? "bg-black/60 border-netflix-red shadow-[0_4px_20px_rgba(229,9,20,0.15)] text-white" 
                    : "bg-[#202020]/40 border-white/5 text-white/50 hover:bg-[#202020]/75 hover:text-white"
                }`}
              >
                <p className="text-xs font-bold text-netflix-red uppercase tracking-wider mb-1">Step {idx + 1}</p>
                <h5 className="font-extrabold text-sm sm:text-base leading-tight">{step.label}</h5>
                <p className="text-[10px] text-white/40 mt-1 line-clamp-1">{step.desc}</p>
              </button>
            ))}
          </div>

          {/* Workflow Interactive Content Card */}
          <div className="bg-black/65 border border-white/10 rounded-2xl p-6 sm:p-10 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center gap-10 animate-fade-in">
            
            {/* Left description text */}
            <div className="space-y-6 flex-1">
              <div className="inline-flex p-3 bg-netflix-red/10 border border-netflix-red/20 rounded-xl">
                {activeStep === 0 && <Film className="w-8 h-8 text-netflix-red" />}
                {activeStep === 1 && <Calendar className="w-8 h-8 text-netflix-red" />}
                {activeStep === 2 && <Database className="w-8 h-8 text-netflix-red" />}
                {activeStep === 3 && <Tv className="w-8 h-8 text-netflix-red" />}
              </div>

              <div className="space-y-2">
                <h4 className="text-2xl font-black">
                  {activeStep === 0 && "Define Your Showcase Title"}
                  {activeStep === 1 && "Segment Memories into Chronological Seasons"}
                  {activeStep === 2 && "Direct, Rapid AWS S3 Vault Uploads"}
                  {activeStep === 3 && "Unwind with Immersive Living Room Streaming"}
                </h4>
                <p className="text-sm text-white/70 leading-relaxed font-medium">
                  {activeStep === 0 && "Create high-level Category containers for major life areas. Whether it's a child's school journey, an annual winter getaway, or your wedding catalog, name your Show and assign a stunning poster banner image to fit your bookshelf catalog."}
                  {activeStep === 1 && "Break down long-standing events with structured Seasons. Define 'Season 2025' or 'The Honeymoon Trip' to divide your video streams into comfortable, bite-sized chronological containers that keep the vault clean and gorgeous."}
                  {activeStep === 2 && "Upload raw high-quality video formats straight from your browser. We generate direct secure tickets that stream data straight to private AWS S3 buckets, assuring lightning-fast parallel uploads and complete absolute privacy."}
                  {activeStep === 3 && "Access your memory vault on any web browser, tablet, or mobile phone. Set up specialized profile passwords for each family member, select standard episode cards, and hit play. Grab a bowl of popcorn and hit replay!"}
                </p>
              </div>

              {/* Bullet checklist */}
              <ul className="space-y-2.5 text-xs text-white/60 font-semibold">
                {activeStep === 0 && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Assign high-quality curated cover backdrop banners</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Write custom storylines and tags (Adventure, Holiday)</li>
                  </>
                )}
                {activeStep === 1 && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Segment chapters chronologically or by special sub-event</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Track runtime catalogs automatically across seasons</li>
                  </>
                )}
                {activeStep === 2 && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dynamic AWS presigned URL tickets for high-encryption</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Direct parallel file chunks uploading without proxy limits</li>
                  </>
                )}
                {activeStep === 3 && (
                  <>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Up to 6 custom watch profiles with separate passwords</li>
                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Responsive fluid layout optimized for tablets and mobile</li>
                  </>
                )}
              </ul>
            </div>

            {/* Right mock graphic container */}
            <div className="flex-1 w-full bg-[#1b1b1b] border border-white/10 p-6 rounded-2xl flex flex-col justify-between aspect-video relative overflow-hidden shadow-xl self-stretch min-h-[220px]">
              
              {/* Top status bar mock */}
              <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-widest select-none pb-2 border-b border-white/5">
                <span>MemoryFlix Simulator</span>
                <span className="text-netflix-red font-bold animate-pulse">Running</span>
              </div>

              {/* Central Graphic changing on active step */}
              <div className="flex-grow flex items-center justify-center p-4 relative select-none">
                
                {/* Step 0 Graphic: Show Creator Mockup */}
                {activeStep === 0 && (
                  <div className="space-y-3 w-full max-w-xs bg-black/45 border border-white/10 p-4 rounded-xl backdrop-blur">
                    <div className="h-6 w-24 bg-netflix-red/20 border border-netflix-red/30 rounded flex items-center justify-center">
                      <span className="text-[9px] text-netflix-red font-bold uppercase tracking-wider">Series Setup</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-white/40 font-bold uppercase">Show Title</p>
                      <div className="h-8 bg-[#252525] border border-white/15 rounded flex items-center px-2.5">
                        <span className="text-xs text-white/85 font-semibold">Summer Trip 2025</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1 Graphic: Season Structure Grid */}
                {activeStep === 1 && (
                  <div className="flex gap-3 justify-center select-none w-full">
                    <div className="bg-[#222] border border-netflix-red/30 p-3 rounded-lg text-center flex-1 max-w-[100px] shadow-lg transform -rotate-2">
                      <span className="text-netflix-red font-black text-xs block">SEASON 1</span>
                      <span className="text-[9px] text-white/40 font-semibold block mt-1">2025 Roadtrip</span>
                    </div>
                    <div className="bg-[#222] border border-white/10 p-3 rounded-lg text-center flex-1 max-w-[100px] shadow-lg transform rotate-2">
                      <span className="text-white/60 font-black text-xs block">SEASON 2</span>
                      <span className="text-[9px] text-white/40 font-semibold block mt-1">Winter Skiing</span>
                    </div>
                  </div>
                )}

                {/* Step 2 Graphic: S3 Upload Box */}
                {activeStep === 2 && (
                  <div className="border border-dashed border-netflix-red/45 bg-[#252525]/30 p-5 rounded-xl text-center space-y-3 w-full max-w-xs shadow-inner">
                    <div className="w-10 h-10 bg-netflix-red/10 border border-netflix-red/20 rounded-full flex items-center justify-center mx-auto">
                      <Database className="w-5 h-5 text-netflix-red animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Drag & Drop Memory.mp4</p>
                      <p className="text-[9px] text-white/40 font-medium">Secure ticket direct to private S3 Bucket</p>
                    </div>
                  </div>
                )}

                {/* Step 3 Graphic: Play Button Grid */}
                {activeStep === 3 && (
                  <div className="text-center space-y-3">
                    <div className="p-3 bg-netflix-red hover:bg-netflix-red-hover rounded-full w-fit mx-auto cursor-pointer animate-pulse shadow-lg">
                      <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                    </div>
                    <p className="text-xs font-black text-white/80 tracking-widest uppercase">TUDUM! Enjoy streaming</p>
                  </div>
                )}

              </div>

              {/* Graphic bottom tag */}
              <div className="bg-black/50 p-2.5 rounded text-center text-[9px] text-white/40 border border-white/5 font-semibold select-none">
                Interactive workflow simulator console — Step {activeStep + 1}
              </div>

            </div>

          </div>

        </div>
      </section>


      {/* 7. NETFLIX-STYLE PREMIUM PLAN PRICE GRID */}
      <section id="pricing" className="py-24 px-6 md:px-16 bg-[#141414] relative z-20 border-t border-white/5">
        <div className="max-w-5xl mx-auto space-y-16">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Simple plans for your <span className="text-netflix-red">private library</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg max-w-xl mx-auto font-medium">
              Flexible cloud vaults built to grow with your family's history. Start free, upgrade easily anytime.
            </p>
          </div>

          {/* Payment Success Alert Banner */}
          {paymentSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3 text-emerald-400 max-w-xl mx-auto animate-bounce">
              <Shield className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm font-semibold">
                Payment successful! Your Memory Vault has been upgraded. Relive your stories with expanded storage.
              </div>
            </div>
          )}

          {/* Interactive Pricing Toggle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Free plan */}
            <div 
              onClick={() => setSelectedPlan("free")}
              className={`p-6 rounded-2xl cursor-pointer border transition-all duration-300 relative flex flex-col justify-between gap-6 ${
                selectedPlan === "free" 
                  ? "bg-black/60 border-netflix-red shadow-[0_10px_35px_rgba(229,9,20,0.2)] scale-102" 
                  : "bg-[#181818] border-white/5 hover:border-white/20 text-white/70"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-white">Free Tier</h4>
                  <span className="text-[9px] font-black tracking-widest text-white/40 uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded">STARTER</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">₹0</span>
                  <span className="text-xs text-white/40 font-bold uppercase">Forever</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-semibold">Perfect for individuals curating their first family stories.</p>
              </div>

              <div className="space-y-5 border-t border-white/5 pt-4">
                <ul className="space-y-3 text-xs font-semibold text-white/80">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> 500 MB Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Up to 2 Profiles</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> HD Quality Streams</li>
                  <li className="flex items-center gap-2 text-white/35 line-through"><Check className="w-4 h-4 text-white/20" /> Collaborators</li>
                </ul>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCheckout("free"); }}
                  disabled={dbUser?.planName === "free"}
                  className={`w-full py-3 rounded font-extrabold text-xs uppercase tracking-widest transition-all ${
                    dbUser?.planName === "free"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                      : selectedPlan === "free" ? "bg-netflix-red text-white hover:bg-netflix-red-hover" : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {dbUser?.planName === "free" ? "Active Plan" : "Select Free"}
                </button>
              </div>
            </div>

            {/* Starter plan */}
            <div 
              onClick={() => setSelectedPlan("starter")}
              className={`p-6 rounded-2xl cursor-pointer border transition-all duration-300 relative flex flex-col justify-between gap-6 ${
                selectedPlan === "starter" 
                  ? "bg-black/60 border-netflix-red shadow-[0_10px_35px_rgba(229,9,20,0.2)] scale-102" 
                  : "bg-[#181818] border-white/5 hover:border-white/20 text-white/70"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-white">Starter Vault</h4>
                  <span className="text-[9px] font-black tracking-widest text-netflix-red uppercase bg-netflix-red/10 border border-netflix-red/20 px-2 py-0.5 rounded">POPULAR</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">₹150</span>
                  <span className="text-xs text-white/40 font-bold uppercase">/ Month</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-semibold">Perfect for individuals and small test suites looking to curate more shows.</p>
              </div>

              <div className="space-y-5 border-t border-white/5 pt-4">
                <ul className="space-y-3 text-xs font-semibold text-white/80">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> 3 GB Secure Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Up to 4 Profiles</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> 4K Cinematic Streams</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Collaborator Invites</li>
                </ul>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCheckout("starter"); }}
                  disabled={checkoutLoading || dbUser?.planName === "starter"}
                  className={`w-full py-3 rounded font-extrabold text-xs uppercase tracking-widest transition-all ${
                    dbUser?.planName === "starter"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                      : selectedPlan === "starter" ? "bg-netflix-red text-white hover:bg-netflix-red-hover cursor-pointer" : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 cursor-pointer"
                  }`}
                >
                  {checkoutLoading && selectedPlan === "starter" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : dbUser?.planName === "starter" ? (
                    "Active Plan"
                  ) : (
                    "Upgrade to Starter"
                  )}
                </button>
              </div>
            </div>

            {/* Standard Family plan (Recommended) */}
            <div 
              onClick={() => setSelectedPlan("family")}
              className={`p-6 rounded-2xl cursor-pointer border transition-all duration-300 relative flex flex-col justify-between gap-6 ${
                selectedPlan === "family" 
                  ? "bg-black border-netflix-red shadow-[0_12px_40px_rgba(229,9,20,0.3)] scale-105" 
                  : "bg-[#181818] border-white/5 hover:border-white/20 text-white/70"
              }`}
            >
              {/* Popular badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-netflix-red border border-white/15 text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg">
                ★ Best Choice
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-white">Family Circle</h4>
                  <span className="text-[9px] font-black tracking-widest text-netflix-red uppercase bg-netflix-red/10 border border-netflix-red/20 px-2 py-0.5 rounded">PREMIUM</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">₹250</span>
                  <span className="text-xs text-white/40 font-bold uppercase">/ Month</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-semibold">The complete family catalog. Perfect for sharing streams with relatives.</p>
              </div>

              <div className="space-y-5 border-t border-white/5 pt-4">
                <ul className="space-y-3 text-xs font-semibold text-white/80">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> 5 GB Secure Vault</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Up to 6 Profiles</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> 4K Ultra HD Streams</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Offline Vault Backup</li>
                </ul>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCheckout("family"); }}
                  disabled={checkoutLoading || dbUser?.planName === "family"}
                  className={`w-full py-3 rounded font-extrabold text-xs uppercase tracking-widest transition-all ${
                    dbUser?.planName === "family"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                      : selectedPlan === "family" ? "bg-netflix-red text-white hover:bg-netflix-red-hover cursor-pointer" : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 cursor-pointer"
                  }`}
                >
                  {checkoutLoading && selectedPlan === "family" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : dbUser?.planName === "family" ? (
                    "Active Plan"
                  ) : (
                    "Upgrade to Family"
                  )}
                </button>
              </div>
            </div>

            {/* Archivist elite plan */}
            <div 
              onClick={() => setSelectedPlan("elite")}
              className={`p-6 rounded-2xl cursor-pointer border transition-all duration-300 relative flex flex-col justify-between gap-6 ${
                selectedPlan === "elite" 
                  ? "bg-black/60 border-netflix-red shadow-[0_10px_35px_rgba(229,9,20,0.2)] scale-102" 
                  : "bg-[#181818] border-white/5 hover:border-white/20 text-white/70"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold text-white">Archivist Elite</h4>
                  <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">ELITE</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">₹350</span>
                  <span className="text-xs text-white/40 font-bold uppercase">/ Month</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-semibold">For serious documentarians looking to store larger cinematic home movies permanently.</p>
              </div>

              <div className="space-y-5 border-t border-white/5 pt-4">
                <ul className="space-y-3 text-xs font-semibold text-white/80">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> 7 GB Encrypted Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Unlimited Profiles</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Uncompressed Quality</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-netflix-red" /> Cold Storage Backup</li>
                </ul>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCheckout("elite"); }}
                  disabled={checkoutLoading || dbUser?.planName === "elite"}
                  className={`w-full py-3 rounded font-extrabold text-xs uppercase tracking-widest transition-all ${
                    dbUser?.planName === "elite"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                      : selectedPlan === "elite" ? "bg-netflix-red text-white hover:bg-netflix-red-hover cursor-pointer" : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 cursor-pointer"
                  }`}
                >
                  {checkoutLoading && selectedPlan === "elite" ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : dbUser?.planName === "elite" ? (
                    "Active Plan"
                  ) : (
                    "Upgrade to Elite"
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* 8. AUTHENTIC FAQ ACCORDION SECTION */}
      <section className="py-24 px-6 md:px-16 bg-[#181818] border-t border-white/5 relative z-20">
        <div className="max-w-4xl mx-auto space-y-16">
          
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Frequently Asked <span className="text-netflix-red">Questions</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg max-w-md mx-auto font-medium">
              Everything you need to know about setting up your private library.
            </p>
          </div>

          {/* Accordion stack */}
          <div className="space-y-3.5 select-none">
            {[
              {
                q: "What is MemoryFlix exactly?",
                a: "MemoryFlix is a premium, secure, private personal media storage application designed exactly like Netflix. Instead of dumping raw, uncategorized family videos and photos into messy, unindexed cloud files, MemoryFlix lets you structure your records into beautiful interactive Shows, complete with Seasons, customized story episode pages, runtimes, and a premium digital player."
              },
              {
                q: "Is my family's private media secure?",
                a: "Absolutely. Security is our primary foundation. We generate unique, short-lived presigned upload tickets directly from your browser straight to private, encrypted AWS S3 storage vaults. Nobody but authorized profiles with individual pin access codes can ever decrypt or view the media. Your memories are fully protected and exclusively yours."
              },
              {
                q: "How does the 'Show, Season, Episode' structure work?",
                a: "Just like on Netflix! You create a high-level container called a 'Show' (e.g. 'Annual Camping Trips'). Inside, you can divide chapters by 'Seasons' (e.g. 'Season 2024: Yosemite', 'Season 2025: Big Sur'). Lastly, you upload separate home clips as individual 'Episodes' complete with descriptions, video links, and visual chapter titles. Replay on demand!"
              },
              {
                q: "Can I share my account with family relatives?",
                a: "Yes, you can create up to 6 distinct watch profiles scoped under a single master family subscription. Each profile operates independently, allowing grandparents or kids to browse the episodes they love. You can even lock individual profiles with secure PIN codes to keep personal adult files private."
              },
              {
                q: "What file formats are supported?",
                a: "We support all major video and photo configurations including MP4, MKV, MOV, WebM, JPEG, PNG, HEIC, and WebP. When uploading, files are stored as-is in maximum high-definition resolution so you never lose quality or crisp memories."
              },
              {
                q: "How do I get started?",
                a: "Getting started is completely free! Simply click 'Get Started' or 'Sign In' at the top, register a secure email, set up your first master watch profile, create a Show category, and upload your first file memory. The cinematic stream starts immediately!"
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-[#2d2d2d] hover:bg-[#353535] border border-white/5 hover:border-white/15 rounded-lg overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-6 cursor-pointer text-left focus:outline-none"
                  >
                    <span className="font-extrabold text-base sm:text-lg text-white group-hover:text-netflix-red transition-colors">
                      {faq.q}
                    </span>
                    {isOpen ? <X className="w-5 h-5 text-netflix-red" /> : <Plus className="w-5 h-5" />}
                  </button>

                  {/* Sliding transition container */}
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden border-t border-black/10 ${
                      isOpen ? "max-h-[300px] p-6 bg-[#262626]/80 text-white/80" : "max-h-0 py-0"
                    }`}
                  >
                    <p className="text-sm leading-relaxed font-semibold">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>


      {/* 9. BOTTOM FINAL HERO CALL TO ACTION */}
      <section className="py-28 px-6 md:px-16 bg-[#141414] text-center relative overflow-hidden border-t border-white/5 z-20">
        
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-netflix-red/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black leading-tight tracking-wide">
            Ready to catalog <span className="text-netflix-red">your life's history?</span>
          </h2>
          <p className="text-white/60 text-base sm:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Join thousands of parents, documentarians, and memory creators streaming their greatest personal stories securely every single day.
          </p>

          <div className="pt-4">
            <button
              onClick={() => router.push("/login")}
              className="px-10 py-5 bg-netflix-red hover:bg-netflix-red-hover hover:scale-105 active:scale-95 text-white font-extrabold rounded shadow-[0_8px_30px_rgba(229,9,20,0.55)] transition-all flex items-center gap-3.5 mx-auto uppercase text-sm tracking-[0.15em] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
              Create Your Memory Vault Now
            </button>
          </div>
          
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">
            Free Starter Tier includes 10GB secure storage, 2 profiles, 720p streams.
          </p>
        </div>
      </section>


      {/* 10. MULTI-COLUMN CINEMATIC FOOTER */}
      <footer className="w-full bg-[#0a0a0a] border-t border-white/5 py-16 px-6 md:px-16 z-25 relative text-white/40 text-xs font-medium">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Top customer care */}
          <div className="pb-8 border-b border-white/5">
            <p className="text-sm font-extrabold text-white/60 flex items-center gap-2 hover:text-netflix-red cursor-pointer transition-colors w-fit">
              <HelpCircle className="w-4 h-4 text-netflix-red" /> Questions? Call our private documentation vault desk: +1-800-TUDUM-LIFE
            </p>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div className="space-y-3.5">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest select-none">Platform Vault</p>
              <ul className="space-y-2">
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Personal Cloud Vault</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">AWS Presigned Token Security</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Master PIN Protection</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Offline Vault Downloads</span></li>
              </ul>
            </div>

            <div className="space-y-3.5">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest select-none">Company</p>
              <ul className="space-y-2">
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">About MemoryFlix</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Media Kit Branding</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Help Desk Center</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Terms of Service</span></li>
              </ul>
            </div>

            <div className="space-y-3.5">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest select-none">Features</p>
              <ul className="space-y-2">
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Show Creator Taxonomy</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Season Divisions Map</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Custom Watch Profiles</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Fluid Digital Player</span></li>
              </ul>
            </div>

            <div className="space-y-3.5">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest select-none">Support Desk</p>
              <ul className="space-y-2">
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Report Security Incident</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Privacy Policy Audit</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">Collaborator Invite Help</span></li>
                <li><span className="hover:underline hover:text-white cursor-pointer transition-colors">AWS Custom Bucket Config</span></li>
                <li><span onClick={() => setShowCookieConsentModal(true)} className="hover:underline hover:text-white cursor-pointer transition-colors">Cookie Preferences</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom details row */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <div className="space-y-2">
              <p>&copy; {new Date().getFullYear()} MemoryFlix. Engineered for cinematic personal archiving. All rights reserved.</p>
              <p className="text-[10px] text-white/20 font-light leading-relaxed max-w-lg">
                MemoryFlix streams encrypted home videos and cataloged chapters for validated users only. Built with custom security layers, presigned URL transfers, and standard auth policies.
              </p>
            </div>
            
            {/* Language dropdown mock */}
            <div className="border border-white/10 px-4 py-2.5 rounded bg-black/60 text-white/70 font-extrabold text-xs uppercase select-none tracking-widest cursor-pointer hover:border-white/30 transition-colors flex items-center gap-1.5">
              🌐 English (Vault Standard)
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
