import {
  ShieldCheck,
  UserCheck,
  Smartphone,
  Clock,
  Wallet,
  RotateCcw,
  Sparkles,
  KeyRound,
  Crown
} from 'lucide-react';

export default function PrivacyPolicy() {
  const sections = [
    {
      id: 'eligibility',
      icon: <UserCheck className="text-[#A78BFA]" size={22} />,
      title: '1. Age & Eligibility Requirement',
      badge: 'Strict 18+ Policy',
      badgeColor: 'bg-[#6419D6]/20 text-[#A78BFA] border-[#6419D6]/40',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            Participation on Potly is strictly restricted to individuals who are at least <strong>18 years of age</strong> (or the legal age of majority in your jurisdiction).
          </p>
          <p>
            By creating an account, depositing funds, entering Potly game rooms, or redeeming cashout vouchers, you confirm and warrant that you meet all legal age and eligibility criteria. Any accounts discovered to be operated by minors will be immediately terminated and any associated balances forfeited in accordance with platform regulations.
          </p>
        </div>
      )
    },
    {
      id: 'single-session',
      icon: <Smartphone className="text-[#FFB51B]" size={22} />,
      title: '2. Single-Device / Single-Session Security',
      badge: 'Zero-Overlap Enforcement',
      badgeColor: 'bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            To safeguard player balances, prevent concurrent betting attacks, and eliminate account sharing, Potly enforces an <strong>exclusive Single Active Session policy</strong>.
          </p>
          <p>
            Only <strong>one active session</strong> is permitted per player account at any given time. If you or anyone else logs into your account from another browser, mobile device, or incognito window:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#C4BBD5]">
            <li>The previous session is immediately terminated in real time via live websocket events.</li>
            <li>All cached tokens on the superseded browser are invalidated.</li>
            <li>The prior session is automatically routed back to the sign-in screen with an explicit security alert.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'session-timeout',
      icon: <Clock className="text-[#A78BFA]" size={22} />,
      title: '3. 1-Day Session Timeout',
      badge: '24h Expiry Window',
      badgeColor: 'bg-[#6419D6]/20 text-[#A78BFA] border-[#6419D6]/40',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            Session authentication tokens remain valid for a maximum duration of <strong>24 hours (1 day)</strong> from the moment of authentication.
          </p>
          <p>
            After 24 hours of session age or upon manual logout, your authentication session automatically expires, requiring re-authentication to continue playing or managing wallet funds. This limits exposure in case a personal device is lost or left unattended.
          </p>
        </div>
      )
    },
    {
      id: 'wallet-cashout',
      icon: <Wallet className="text-[#FFB51B]" size={22} />,
      title: '4. Gaming Wallet, Balances & Instant Cashout Holds',
      badge: 'Protected Escrow',
      badgeColor: 'bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            Player balances represent available in-game credits usable for Potly room entries. All transactions are tracked in an immutable audit ledger.
          </p>
          <p>
            When submitting a cashout withdrawal request:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#C4BBD5]">
            <li>The requested withdrawal amount is immediately placed on hold (escrowed) to prevent concurrent double-spending.</li>
            <li>Players retain full control to <strong>self-cancel pending cashouts anytime</strong> before admin processing, resulting in an instantaneous 100% refund back to their active wallet balance.</li>
            <li>If an admin rejects a cashout, funds are automatically returned to the player’s wallet with an explanatory note.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'refund-policy',
      icon: <RotateCcw className="text-[#A78BFA]" size={22} />,
      title: '5. Minimum Players Threshold & 100% Automated Refund Policy',
      badge: 'Automated Protection',
      badgeColor: 'bg-[#6419D6]/20 text-[#A78BFA] border-[#6419D6]/40',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            Every Potly game room defines a minimum player threshold required to conduct a legitimate round.
          </p>
          <p>
            If a scheduled room fails to achieve its designated minimum player count before the countdown timer hits <strong>00:00</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#C4BBD5]">
            <li>The room status changes to <em>cancelled</em> automatically.</li>
            <li><strong>100% of the entry fee</strong> is instantaneously credited back to each participant's wallet balance.</li>
            <li>A detailed refund transaction is recorded in your ledger history, ensuring zero capital risk on unfulfilled matches.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'provably-fair',
      icon: <Sparkles className="text-[#FFB51B]" size={22} />,
      title: '6. Fair RNG Drawing Mechanism',
      badge: 'Unbiased RNG',
      badgeColor: 'bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            Room outcomes and winner determinations are governed by a cryptographically strong <strong>Random Number Generation (RNG)</strong> algorithm.
          </p>
          <p>
            No player, administrator, or automated process can predict, influence, or manipulate winner selection. Results are computed server-side in real time once countdown concludes, guaranteeing unbiased fairness across all game tiers.
          </p>
        </div>
      )
    },
    {
      id: 'data-protection',
      icon: <KeyRound className="text-[#FF762B]" size={22} />,
      title: '7. Data Protection & Security Questions',
      badge: 'Bcrypt Hashed & Salted',
      badgeColor: 'bg-[#FF762B]/15 text-[#FF762B] border-[#FF762B]/35',
      content: (
        <div className="space-y-2 text-[#C4BBD5] text-xs sm:text-sm leading-relaxed">
          <p>
            Security of your personal information and credentials is our top operational priority:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#C4BBD5]">
            <li>User passwords and security question answers are never stored in plaintext. All sensitive credentials are encrypted using industry-standard <strong>bcrypt salt hashing</strong>.</li>
            <li>Our forms conform strictly to standard web credential specifications (<code className="text-[#A78BFA] bg-[#17102D] px-1 py-0.5 rounded text-xs">autoComplete="username"</code>, <code className="text-[#A78BFA] bg-[#17102D] px-1 py-0.5 rounded text-xs">autoComplete="new-password"</code>, <code className="text-[#A78BFA] bg-[#17102D] px-1 py-0.5 rounded text-xs">autoComplete="current-password"</code>), enabling native integration with <strong>Google Password Manager</strong>, Apple Keychain, Bitwarden, and 1Password.</li>
            <li>We do not sell, rent, or lease your account details to third-party advertisers.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="px-3 sm:px-6 py-6 sm:py-10 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#21183A] via-[#17102D] to-[#2B1254] border border-[#3B3152] p-5 sm:p-8 shadow-elevated">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#6419D6]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-[#FFB51B]/15 border border-[#FFB51B]/35 text-[#FFB51B] text-[11px] sm:text-xs font-bold uppercase tracking-wider font-mono">
              <Crown size={14} /> One Room. One Winner.
            </div>
            <h1 className="text-2xl sm:text-4xl font-heading font-black text-white tracking-tight leading-tight">
              Potly Privacy Policy &amp; Terms of Service
            </h1>
            <p className="text-xs sm:text-sm text-[#C4BBD5]">
              Last updated: November 2026 • Please read these terms carefully before engaging in Potly rooms.
            </p>
          </div>
          <img
            src="/potly-logo.png"
            alt="Potly"
            className="h-16 sm:h-20 w-auto object-contain self-start md:self-auto drop-shadow-md"
          />
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4 sm:space-y-5">
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="card p-4 sm:p-6 border border-[#3B3152] bg-[#21183A] rounded-[18px] space-y-3 hover:border-brand-purple/40 transition-all shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#17102D] border border-[#3B3152] shrink-0">
                  {section.icon}
                </div>
                <h2 className="text-base sm:text-lg font-heading font-bold text-white tracking-tight">
                  {section.title}
                </h2>
              </div>
              <span className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-pill border font-semibold ${section.badgeColor}`}>
                {section.badge}
              </span>
            </div>
            <div className="pt-2.5 border-t border-[#3B3152]">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
