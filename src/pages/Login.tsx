import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store";
import { ArrowLeft, CheckCircle2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Btn, ThemeToggle } from "../components/ui";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";

type Step = "credentials" | "otp";

const OTP_RESEND_DELAY = 60; // seconds before "Resend OTP" is enabled

export const Login = () => {
  const { login, verifyOtp, theme, toggleTheme } = useAppStore();

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const [step, setStep]         = useState<Step>("credentials");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const [otpEmail, setOtpEmail]   = useState("");
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const otpRefs                   = useRef<Array<HTMLInputElement | null>>([]);
  const [countdown, setCountdown] = useState(OTP_RESEND_DELAY);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setCountdown(OTP_RESEND_DELAY);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Step 1 handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result && typeof result === "object" && result.otpRequired) {
        setOtpEmail(result.email);
        setOtp(["", "", "", "", "", ""]);
        setStep("otp");
        startCountdown();
        toast.success(`Verification code sent to ${result.email}`);
      } else {
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input helpers ───────────────────────────────────────────────────────
  const handleOtpChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next  = [...otp];
    next[idx]   = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const padded = [...digits, ...Array(6).fill("")].slice(0, 6);
    setOtp(padded);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  // ── Step 2 handler ──────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (otp.join("").length < 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      await verifyOtp(otpEmail, otp.join(""));
      toast.success("Welcome back!");
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    setLoading(true);
    try {
      await login(email, password);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      startCountdown();
      toast.success("A new code has been sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep("credentials");
    setOtp(["", "", "", "", "", ""]);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] flex overflow-hidden">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1E293B] items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center font-black text-5xl text-white mb-8 shadow-2xl shadow-orange-500/20">
              N
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-6 leading-tight">
              Neoteric <span className="text-orange-500">Properties</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium mb-12 leading-relaxed">
              The next generation of property management. Streamlining inventory, procurement, and site operations for Garden City.
            </p>
            <div className="space-y-4">
              {["Real-time Inventory Tracking", "Automated Purchase Orders", "Multi-level Approval Workflow", "Site-wise Material Planning"].map((f, i) => (
                <motion.div key={f} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="font-medium">{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#0F172A] to-transparent opacity-50" />
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">

            {step === "credentials" ? (
              /* ── Credentials ──────────────────────────────────────────── */
              <motion.div key="creds" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}>
                <div className="lg:hidden flex justify-center mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-500/20">N</div>
                </div>

                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-black text-[#1A1A2E] dark:text-white tracking-tight mb-2">Welcome Back</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Please enter your details to sign in.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Email address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      </div>
                      <input type="email" placeholder="superadmin@neotericgrp.in" value={email} onChange={e => setEmail(e.target.value)} required
                        className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-[#1A1A2E] dark:text-white" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest">Password</label>
                      <button type="button" className="text-[11px] font-bold text-orange-500 hover:text-orange-600 tracking-widest transition-colors">Forgot password?</button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      </div>
                      <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                        className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-[#1A1A2E] dark:text-white" />
                    </div>
                  </div>

                  <Btn type="submit" className="w-full py-3.5 text-base font-bold rounded-xl shadow-lg shadow-orange-500/20 mt-2" loading={loading} label="Continue" />
                </form>
              </motion.div>

            ) : (
              /* ── OTP ──────────────────────────────────────────────────── */
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.28 }}>
                <div className="lg:hidden flex justify-center mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-500/20">N</div>
                </div>

                <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors mb-8">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="mb-10 text-center lg:text-left">
                  <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mb-5">
                    <ShieldCheck className="w-7 h-7 text-orange-500" />
                  </div>
                  <h2 className="text-3xl font-black text-[#1A1A2E] dark:text-white tracking-tight mb-2">Check your email</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    We sent a 6-digit code to{" "}
                    <span className="font-bold text-[#1A1A2E] dark:text-white">{otpEmail}</span>.
                    {" "}Enter it below to sign in.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* 6 OTP digit boxes */}
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                        className="w-12 h-14 text-center text-xl font-black bg-gray-50 dark:bg-[#1E293B] border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-[#1A1A2E] dark:text-white"
                      />
                    ))}
                  </div>

                  <Btn type="submit" className="w-full py-3.5 text-base font-bold rounded-xl shadow-lg shadow-orange-500/20" loading={loading} label="Verify & Sign In" />

                  {/* Resend countdown */}
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Didn&apos;t receive a code?{" "}
                    {countdown > 0 ? (
                      <span className="font-semibold text-gray-400 dark:text-gray-500">
                        Resend in {countdown}s
                      </span>
                    ) : (
                      <button type="button" onClick={handleResend} disabled={loading}
                        className="font-bold text-orange-500 hover:text-orange-600 transition-colors disabled:opacity-50">
                        Resend OTP
                      </button>
                    )}
                  </p>
                </form>
              </motion.div>
            )}

          </AnimatePresence>

          <div className="mt-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <a href="#public-portal" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold tracking-widest hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all">
                Access public forms portal
              </a>
            </div>
            <p className="text-[11px] text-gray-400 font-medium tracking-widest">
              &copy; 2026 Neoteric properties &bull; Garden city portal
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
