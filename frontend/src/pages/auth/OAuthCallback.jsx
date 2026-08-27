import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { handleOAuthSuccess } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying authentication...');

  useEffect(() => {
    const processOAuth = async () => {
      const token = searchParams.get('token');
      const authError = searchParams.get('error');

      if (authError) {
        error(authError === 'google_auth_failed'
          ? 'Google authentication was cancelled or failed.'
          : 'Authentication error occurred. Please try again.');
        navigate('/login', { replace: true });
        return;
      }

      if (!token) {
        error('No authentication token received.');
        navigate('/login', { replace: true });
        return;
      }

      try {
        setStatus('Setting up your session...');
        const user = await handleOAuthSuccess(token);
        success(`Welcome back${user?.fullName ? `, ${user.fullName}` : ''}!`);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        error('Failed to complete sign-in with Google.');
        navigate('/login', { replace: true });
      }
    };

    processOAuth();
  }, [searchParams, handleOAuthSuccess, navigate, success, error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          background: 'var(--bg-card)',
          padding: '40px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary-600), #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
          }}
        >
          <Sparkles size={28} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-white)', marginBottom: '6px' }}>
            Authenticating
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {status}
          </p>
        </div>

        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--primary-500)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </motion.div>
    </div>
  );
};

export default OAuthCallback;
