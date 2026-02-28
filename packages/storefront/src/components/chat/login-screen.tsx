'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================
// Phone OTP Login
//
// Step 1: Enter phone number → sends OTP via Supabase
// Step 2: Enter 6-digit OTP → verifies and logs in
//
// Dark theme matching the chat interface aesthetic.
// ============================================================

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  // Format for display: +91 98765 43210
  const formattedPhone = phone
    ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`
    : '';

  const handleSendOtp = async () => {
    setError('');
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('10-digit phone number daalo');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: `+91${cleaned}`,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('6-digit OTP daalo');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.verifyOtp({
        phone: `+91${phone.replace(/\D/g, '')}`,
        token: code,
        type: 'sms',
      });

      if (authError) {
        setError('Galat OTP. Dobara try karo.');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        return;
      }

      onLogin();
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every((d) => d !== '')) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]!;
    }
    setOtp(newOtp);

    // Focus the next empty slot or last
    const nextEmpty = newOtp.findIndex((d) => d === '');
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();

    if (pasted.length === 6) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">त</div>
          <h1 className="login-title">Tatparya</h1>
          <p className="login-subtitle">Socho, Bolo, Becho</p>
        </div>

        {step === 'phone' ? (
          <div className="login-form">
            <label className="login-label">Phone number</label>
            <div className="login-phone-row">
              <span className="login-prefix">+91</span>
              <input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                className="login-input"
                autoComplete="tel-national"
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading || phone.replace(/\D/g, '').length !== 10}
              className="login-button"
            >
              {loading ? 'Sending OTP...' : 'Send OTP →'}
            </button>
          </div>
        ) : (
          <div className="login-form">
            <label className="login-label">
              OTP sent to {formattedPhone}
            </label>
            <div className="login-otp-row" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="login-otp-digit"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                />
              ))}
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.some((d) => d === '')}
              className="login-button"
            >
              {loading ? 'Verifying...' : 'Verify & Enter →'}
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
              className="login-back"
            >
              ← Change number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
