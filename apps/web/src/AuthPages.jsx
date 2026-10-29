import { useEffect, useRef, useState } from 'react';
import { authRedirect } from './auth-client.js';
import { accountDestination, recoverAuthNavigation } from './auth-navigation.js';
import { confirmedLocation } from './navigation.js';
import { authFeedback, signupOutcome, requireSignedIn, rememberAuthEmail, readAuthEmail, clearAuthEmail } from './auth-feedback.js';
import { authCooldowns } from './auth-cooldowns.js';
import { Button } from './components/ui/Button/index.js';
import { Input } from './components/ui/Form/index.js';
import { Card, CardHeader, CardContent } from './components/ui/Layout/index.js';
import './accounts.css';

const content = {
  signup: {
    eyebrow: 'Your next chapter',
    title: 'Build it.\nKeep it.',
    description: 'Turn your solved problems into a clearer picture of what you know—and what to practice next.',
    form: 'Create your account.',
    intro: 'A little setup. A clearer direction.'
  },
  login: {
    eyebrow: 'Welcome back',
    title: 'Pick up\nwhere you left off.',
    description: 'Your patterns, your progress, your next step. Bring your practice back into focus.',
    form: 'Good to see you.',
    intro: 'Sign in to your Recall workspace.'
  },
  'forgot-password': {
    eyebrow: 'Back on track',
    title: 'A fresh start.\nSame progress.',
    description: 'Reset your password and return to the patterns you have been building.',
    form: 'Forgot your password?',
    intro: 'We\'ll send you a link to choose a new one.'
  },
  'reset-password': {
    eyebrow: 'One last step',
    title: 'Make room\nfor what\'s next.',
    description: 'Choose a new password, then get back to your learning space.',
    form: 'Choose a new password.',
    intro: 'Use a password you don\'t use elsewhere.'
  }
};

export default function AuthPages({ page, auth }) {
  const [email, setEmail] = useState(readAuthEmail);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errorContext, setErrorContext] = useState({});
  const [verification, setVerification] = useState(false);
  const [existing, setExisting] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [cooldowns, setCooldowns] = useState(() => authCooldowns.read(page));

  const pending = useRef(false);
  const resultHeading = useRef(null);
  const emailField = useRef(null);
  const feedbackWasVisible = useRef(false);

  const copy = content[page];
  const signup = page === 'signup';
  const forgot = page === 'forgot-password';
  const reset = page === 'reset-password';
  const enabled = Boolean(auth.client) && (!reset || Boolean(auth.sessionUser));

  useEffect(() => { clearAuthEmail(); }, []);
  useEffect(() => {
    const visible = verification || existing;
    if (visible) resultHeading.current?.focus();
    else if (feedbackWasVisible.current) emailField.current?.focus();
    feedbackWasVisible.current = visible;
  }, [verification, existing]);
  useEffect(() => {
    if (!cooldowns.submit && !cooldowns.resend) return;
    const sync = () => setCooldowns(authCooldowns.read(page));
    const timer = setTimeout(sync, 1000);
    const resume = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
  }, [cooldowns, page]);

  function clearFeedback() { setError(''); setErrorContext({}); setMessage(''); setUnconfirmed(false); }
  function changeEmail() { if (pending.current) return; setVerification(false); setExisting(false); setPassword(''); clearFeedback(); }
  function rememberEmail() { rememberAuthEmail(email); }
  function leaveRecovery(event, destination = '/forgot-password') { rememberEmail(); recoverAuthNavigation(event, destination, auth.retry); }
  function block(kind, seconds, email = false) { authCooldowns.block(kind === 'submit' ? page : 'resend', seconds, { email }); setCooldowns(authCooldowns.read(page)); }

  async function run(action, kind = 'submit') {
    if (!enabled || pending.current) return;
    if (authCooldowns.remaining(kind === 'submit' ? page : 'resend') > 0) { setCooldowns(authCooldowns.read(page)); return; }
    pending.current = true; setBusy(true); setError(''); setErrorContext({}); setMessage('');
    try { await action(); }
    catch (e) { const feedback = authFeedback(e); setError(feedback.message); setErrorContext(feedback); if (feedback.unconfirmed) setUnconfirmed(true); if (feedback.cooldown) block(kind, feedback.cooldown, e?.code === 'over_email_send_rate_limit'); }
    finally { pending.current = false; setBusy(false); }
  }

  async function resend() {
    await run(async () => {
      const { error } = await auth.client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: authRedirect() } });
      if (error) throw error;
      block('resend', 60);
      setMessage('If this email still needs confirmation, a new link is on its way. Check your inbox and spam folder.');
    }, 'resend');
  }

  async function submit(event) {
    event.preventDefault();
    if (!enabled || busy) return;
    await run(async () => {
      let result;
      if (forgot) { result = await auth.client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect('recovery') }); if (result.error) throw result.error; block('submit', 60); setMessage('If an account exists for this email, a reset link is on its way. Open it in this browser.'); return; }
      if (reset) { result = await auth.client.auth.updateUser({ password }); if (result.error) throw result.error; setPassword(''); setMessage('Password updated.'); const account = await auth.refresh(); window.location.hash = accountDestination(account.setup); return; }
      if (signup) {
        result = await auth.client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirect() } });
        const outcome = signupOutcome(result); setPassword('');
        if (outcome === 'existing') { setExisting(true); setMessage('An account with this email already exists. Log in to continue, or reset your password.'); return; }
        if (outcome !== 'signed-in') { setVerification(true); block('resend', 60); setMessage(outcome === 'confirmation' ? 'Check your inbox and spam folder to confirm your email. Open the link in this browser to finish setting up your workspace.' : 'If this email needs confirmation, check your inbox and spam folder. Already confirmed your account? Log in instead.'); return; }
      } else { result = await auth.client.auth.signInWithPassword({ email: email.trim(), password }); requireSignedIn(result); setPassword(''); setUnconfirmed(false); }
      await auth.refresh();
    });
  }

  const emailError = error && (errorContext.field === 'email' || errorContext.credentials);
  const passwordError = error && (errorContext.field === 'password' || errorContext.credentials);

  return (
    <div className="account-split">
      <section className="account-story" aria-label="Your learning with Recall">
        <p className="eyebrow public-eyebrow"><span />{copy.eyebrow}</p>
        <h1>{copy.title.split('\n').map((line, index) => <span key={line} className={index === 1 ? 'account-title-accent' : ''}>{line}</span>)}</h1>
        <p>{copy.description}</p>
        <div className="account-illustration" aria-hidden="true">
          <div className="account-pattern"><span>01</span><strong>Your next pattern</strong><span>↗</span></div>
          <div className="account-example-bar"><i /><i /></div>
          <div className="account-example-tags"><span>Experience</span><span>Recent practice</span></div>
          <p>Small sessions. Lasting foundations.</p>
        </div>
      </section>

      <section className="account-form-panel" aria-labelledby="account-form-title">
        <Card className="auth-card" padded bordered>
          <CardHeader>
            <a className="account-back" href={reset ? confirmedLocation(window.location, '/home') : '#/home'} onClick={reset ? event => leaveRecovery(event, '/home') : undefined}>← Back to Recall</a>
            <h2 id="account-form-title" ref={resultHeading} tabIndex={-1}>
              {existing ? 'You already have an account.' : verification ? 'Confirm your email.' : copy.form}
            </h2>
            <p className="account-intro">{existing ? 'Your workspace is waiting for you.' : verification ? 'Confirm your email to open your workspace.' : copy.intro}</p>
          </CardHeader>

          <CardContent>
            {!auth.loading && auth.config?.mode === 'local' && (
              <p className="account-notice">This installation uses a local workspace. <a className="inline-link" href="#/dashboard">Open your workspace</a>.</p>
            )}
            {!auth.loading && !auth.error && auth.config?.mode === 'supabase' && !auth.config.configured && (
              <p className="account-notice">Sign-in is temporarily unavailable. Please try again shortly.</p>
            )}
            {auth.error && (
              <div className="account-notice" role="alert">{auth.error} <Button variant="text" onClick={auth.retry} size="sm">Retry connection</Button></div>
            )}
            {reset && !auth.loading && !auth.sessionUser && (
              <p className="account-notice" id="account-reset-help">This reset link could not be verified. Open it in the browser where you requested it, or <a className="inline-link" href={confirmedLocation(window.location, '/forgot-password')} onClick={leaveRecovery}>request a new reset link</a>.</p>
            )}

            {!verification && !existing && (
              <form className="account-form" onSubmit={submit} aria-describedby={error ? 'account-form-error' : undefined} aria-busy={busy}>
                {!reset && (
                  <Input
                    ref={emailField}
                    id="account-email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearFeedback(); }}
                    disabled={busy}
                    error={emailError}
                    helperText={emailError ? error : undefined}
                    autoFocus={!existing && !verification}
                  />
                )}

                {!forgot && (
                  <div className="account-password-field">
                    <label htmlFor="account-password" className="form-field__label">
                      {reset ? 'New password' : 'Password'}
                    </label>
                    <div className="password-input">
                      <Input
                        id="account-password"
                        type={show ? 'text' : 'password'}
                        autoComplete={signup || reset ? 'new-password' : 'current-password'}
                        minLength={signup || reset ? 8 : undefined}
                        required
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearFeedback(); }}
                        disabled={busy || !enabled}
                        error={passwordError}
                        helperText={passwordError ? error : (signup || reset) && 'At least 8 characters.'}
                      />
                      <Button
                        type="button"
                        variant="text"
                        size="sm"
                        disabled={busy || !enabled}
                        aria-label={show ? 'Hide password' : 'Show password'}
                        aria-pressed={show}
                        onClick={() => setShow(v => !v)}
                        className="password-toggle"
                      >
                        {show ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </div>
                )}

                {!signup && !forgot && !reset && (
                  <a className="account-forgot" href="#/forgot-password" onClick={rememberEmail}>Forgot password?</a>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={!enabled || busy || cooldowns.submit > 0}
                >
                  {busy ? 'Please wait…' : cooldowns.submit > 0 ? `Try again in ${cooldowns.submit}s` : signup ? 'Create account' : forgot ? 'Send reset link' : reset ? 'Save new password' : 'Log in'}
                </Button>
              </form>
            )}

            {existing && (
              <>
                <p className="account-email-sent">{email.trim()}</p>
                <div className="row-actions">
                  <Button variant="primary" as="a" href="#/login" onClick={rememberEmail}>Log in →</Button>
                  <Button variant="text" as="a" href="#/forgot-password" onClick={rememberEmail}>Reset password</Button>
                </div>
              </>
            )}

            {(verification || unconfirmed) && (
              <>
                {verification && <p className="account-email-sent">{email.trim()}</p>}
                <Button
                  variant="secondary"
                  disabled={!enabled || busy || cooldowns.resend > 0}
                  onClick={resend}
                >
                  {busy ? 'Please wait…' : cooldowns.resend > 0 ? `Resend available in ${cooldowns.resend}s` : 'Resend confirmation'}
                </Button>
              </>
            )}

            {(verification || existing) && (
              <Button variant="text" className="account-change-email" disabled={busy} onClick={changeEmail}>
                Use a different email
              </Button>
            )}

            <p className="account-status" role="status">{message}</p>
            <p className="account-error" id="account-form-error" role="alert">{error}</p>

            {reset && auth.sessionUser && (
              <p className="account-switch"><a href={confirmedLocation(window.location, '/forgot-password')} onClick={leaveRecovery}>Request a new reset link</a></p>
            )}

            <p className="account-switch">
              {forgot || reset ? (
                <a href={reset ? confirmedLocation(window.location, '/login') : '#/login'} onClick={reset ? event => leaveRecovery(event, '/login') : rememberEmail}>Back to log in</a>
              ) : signup ? (
                <>Already have an account? <a href="#/login" onClick={rememberEmail}>Log in</a></>
              ) : (
                <>New to Recall? <a href="#/signup" onClick={rememberEmail}>Create an account</a></>
              )}
            </p>
            <p className="account-footnote">Your Recall account is separate from LeetCode. <a className="inline-link" href={reset ? confirmedLocation(window.location, '/privacy') : '#/privacy'} onClick={reset ? event => leaveRecovery(event, '/privacy') : undefined}>Privacy & data</a></p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}