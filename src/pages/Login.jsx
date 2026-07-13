var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { CheckCircle2, Lock, Mail, ShieldCheck, RotateCcw } from "lucide-react";
import { Btn, ThemeToggle } from "../components/ui";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
const Login = /* @__PURE__ */ __name(() => {
  const { login, verifyLoginOtp, theme, toggleTheme, settings } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("credentials"); // "credentials" | "otp"
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleLogin = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.otpSent) {
        setOtpEmail(result.email);
        setStep("otp");
        setResendTimer(30);
        toast.success("OTP sent to your email!");
      }
    } catch (err) {
      toast.error(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }, "handleLogin");

  const handleVerifyOtp = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { toast.error("Please enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      await verifyLoginOtp(otpEmail, code);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err.message || "Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, "handleVerifyOtp");

  const handleResend = /* @__PURE__ */ __name(async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await login(email, password);
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      toast.success("New OTP sent!");
    } catch (err) {
      toast.error("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }, "handleResend");
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1E293B] items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-lg text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center font-black text-5xl text-white mb-8 shadow-2xl shadow-orange-500/20">N</div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-6 leading-tight">
              {settings?.companyFullName?.split(" ").slice(0, -1).join(" ") || "Neoteric"} <span className="text-orange-500">{settings?.companyFullName?.split(" ").slice(-1)[0] || "Properties"}</span>
            </h1>
            <p className="text-xl text-gray-400 font-medium mb-12 leading-relaxed">
              The next generation of property management. Streamlining inventory, procurement, and site operations for {settings?.appName || "Garden City"}.
            </p>
            <div className="space-y-4">
              {["Real-time Inventory Tracking", "Automated Purchase Orders", "Multi-level Approval Workflow", "Site-wise Material Planning"].map((f, i) => <motion.div key={f} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="font-medium">{f}</span>
                </motion.div>)}
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#0F172A] to-transparent opacity-50" />
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-gray-800/50">
        <div className="absolute top-6 right-6">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.div key="credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <div className="lg:hidden flex justify-center mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-500/20">N</div>
                </div>
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Welcome Back</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Please enter your details to sign in.</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Email address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      </div>
                      <input type="email" placeholder="superadmin@neotericgrp.in" value={email} onChange={(e) => setEmail(e.target.value)} required className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 dark:text-white" />
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
                      <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full pl-10 pr-3 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <Btn type="submit" className="w-full py-3.5 text-base font-bold rounded-xl shadow-lg shadow-orange-500/20 mt-2" loading={loading} label="Sign In" />
                </form>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <div className="lg:hidden flex justify-center mb-8">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-500/20">N</div>
                </div>
                <div className="mb-8 text-center lg:text-left">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl mb-4">
                    <ShieldCheck className="w-7 h-7 text-orange-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Verify your identity</h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    We sent a 6-digit OTP to <span className="text-gray-700 dark:text-gray-300 font-semibold">{otpEmail}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">OTP expires in 10 minutes</p>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 tracking-widest ml-1">Enter OTP</label>
                    <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => otpRefs.current[idx] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(idx, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(idx, e)}
                          className="w-12 h-14 text-center text-xl font-bold bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-gray-900 dark:text-white"
                        />
                      ))}
                    </div>
                  </div>
                  <Btn type="submit" className="w-full py-3.5 text-base font-bold rounded-xl shadow-lg shadow-orange-500/20" loading={loading} label="Verify OTP" />
                </form>
                <div className="mt-6 flex items-center justify-between">
                  <button type="button" onClick={() => { setStep("credentials"); setOtp(["","","","","",""]); }} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    ← Back to login
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    className="flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
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
              &copy; {new Date().getFullYear()} {settings?.companyFullName || settings?.appName || "Neoteric Properties"} &bull; {settings?.appName || "Garden City"} portal
            </p>
          </div>
        </div>
      </div>

    </div>;
}, "Login");
export {
  Login
};
