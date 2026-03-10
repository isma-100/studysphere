// src/pages/LandingPage.jsx
// StudySphere — Landing Page Component

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf8f4] font-sans">

      {/* ── NAVBAR ── */}
      <nav className="bg-white border-b border-[#ede9e3] sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#e07a3a] to-[#c45e20] flex items-center justify-center text-sm shadow-md">
              🌐
            </div>
            <span className="font-serif text-xl font-semibold text-[#1e1b18]">
              Study<span className="text-[#e07a3a]">Sphere</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#9e9890]">
            <a href="#features" className="hover:text-[#e07a3a] transition-colors">Features</a>
            <a href="#how" className="hover:text-[#e07a3a] transition-colors">How it works</a>
            <a href="#subjects" className="hover:text-[#e07a3a] transition-colors">Subjects</a>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <button className="text-sm font-bold text-[#4a4540] hover:text-[#e07a3a] transition-colors hidden md:block">
              Log in
            </button>
            <button className="bg-gradient-to-br from-[#e07a3a] to-[#c45e20] text-white text-sm font-bold px-5 py-2 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-white overflow-hidden border-b border-[#ede9e3]">

        {/* Background blobs */}
        <div className="absolute w-96 h-96 rounded-full bg-[#fdf0e6] blur-[72px] opacity-60 -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-72 h-72 rounded-full bg-[#e6f3f3] blur-[72px] opacity-50 -bottom-16 -right-16 pointer-events-none" />
        <div className="absolute w-52 h-52 rounded-full bg-[#ede6f5] blur-[72px] opacity-50 top-12 right-1/4 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#fdf0e6] border border-[#f2c4a0] text-[#c45e20] text-xs font-bold px-4 py-1.5 rounded-full mb-8">
            🌐 Open to students &amp; self-learners everywhere
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl md:text-6xl font-semibold text-[#1e1b18] leading-tight tracking-tight mb-6">
            Your world of<br />
            <em className="not-italic text-[#e07a3a]">learning together</em>
          </h1>

          {/* Subheadline */}
          <p className="text-lg text-[#4a4540] max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Find study groups that match your subjects, pace, and schedule.
            Real people, real conversations, real progress.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <button className="bg-gradient-to-br from-[#e07a3a] to-[#c45e20] text-white font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Find a Study Group →
            </button>
            <button className="bg-white text-[#4a4540] font-bold px-8 py-3.5 rounded-full border-2 border-[#ede9e3] hover:border-[#e07a3a] hover:text-[#e07a3a] transition-all">
              Create a Group
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-[#faf8f4] border-t border-[#ede9e3]">
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-[#ede9e3]">
            {[
              { num: "2,400+", label: "Active learners" },
              { num: "340",    label: "Study groups" },
              { num: "80+",    label: "Subjects" },
              { num: "4.9 ★",  label: "Average rating" },
            ].map((s) => (
              <div key={s.label} className="py-5 text-center">
                <div className="font-serif text-2xl font-semibold text-[#e07a3a]">{s.num}</div>
                <div className="text-xs font-bold text-[#9e9890] mt-0.5 tracking-wide uppercase">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs font-black uppercase tracking-widest text-[#e07a3a] mb-2">Why StudySphere</div>
        <h2 className="font-serif text-3xl font-semibold text-[#1e1b18] mb-12 leading-snug">
          Everything you need to<br />study smarter, together
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🔍", bg: "bg-[#fdf0e6]", title: "Smart Group Matching", desc: "Filter by subject, level, and availability. Find your perfect study squad in seconds." },
            { icon: "💬", bg: "bg-[#ddeef5]", title: "Real-time Chat",       desc: "Every group has its own chat room. Share notes, ask questions, stay connected." },
            { icon: "📅", bg: "bg-[#e6f3f3]", title: "Session Scheduling",   desc: "Plan sessions, set reminders, and sync directly with your Google Calendar." },
            { icon: "👤", bg: "bg-[#ede6f5]", title: "Rich Profiles",        desc: "Show what you're studying, your availability, and your learning goals." },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white border border-[#ede9e3] rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all cursor-default"
            >
              <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center text-xl mb-4`}>
                {f.icon}
              </div>
              <div className="font-black text-sm text-[#1e1b18] mb-1.5">{f.title}</div>
              <div className="text-sm text-[#9e9890] leading-relaxed font-medium">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="bg-white border-y border-[#ede9e3]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="text-xs font-black uppercase tracking-widest text-[#e07a3a] mb-2">Simple process</div>
          <h2 className="font-serif text-3xl font-semibold text-[#1e1b18] mb-14">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: "👤", title: "Create your profile",   desc: "Add your subjects, availability, and learning goals in under 2 minutes." },
              { step: "02", icon: "🔍", title: "Find your group",        desc: "Browse or search groups by subject and level. Join with one click." },
              { step: "03", icon: "🚀", title: "Start learning together", desc: "Chat, schedule sessions, and track your progress — all in one place." },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-[#ede9e3] z-0" />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-[#fdf0e6] border-2 border-[#f2c4a0] rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
                    {s.icon}
                  </div>
                  <div className="text-xs font-black text-[#e07a3a] tracking-widest mb-1">{s.step}</div>
                  <div className="font-black text-[#1e1b18] mb-2">{s.title}</div>
                  <div className="text-sm text-[#9e9890] leading-relaxed font-medium max-w-[200px]">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS ── */}
      <section id="subjects" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-xs font-black uppercase tracking-widest text-[#e07a3a] mb-2">80+ Subjects</div>
        <h2 className="font-serif text-3xl font-semibold text-[#1e1b18] mb-10">Whatever you're studying,<br />we've got a group for it</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "🐍 Python",        bg: "bg-[#ddeef5]", c: "text-[#3a7fa0]" },
            { label: "📐 Mathematics",   bg: "bg-[#e6f3f3]", c: "text-[#3a8c8a]" },
            { label: "🇪🇸 Spanish",      bg: "bg-[#fdf0e6]", c: "text-[#c45e20]" },
            { label: "🎨 UI/UX Design",  bg: "bg-[#ede6f5]", c: "text-[#7a5a9e]" },
            { label: "🧬 Biology",        bg: "bg-[#e2f0ec]", c: "text-[#3a8a6a]" },
            { label: "💼 Business",       bg: "bg-[#e6f3f3]", c: "text-[#3a8c8a]" },
            { label: "⚛️ Physics",        bg: "bg-[#ddeef5]", c: "text-[#3a7fa0]" },
            { label: "🇫🇷 French",        bg: "bg-[#fdf0e6]", c: "text-[#c45e20]" },
            { label: "📊 Data Science",  bg: "bg-[#ede6f5]", c: "text-[#7a5a9e]" },
            { label: "✍️ Creative Writing",bg:"bg-[#fdf0e6]", c: "text-[#c45e20]" },
            { label: "🎵 Music Theory",  bg: "bg-[#e2f0ec]", c: "text-[#3a8a6a]" },
            { label: "📜 History",        bg: "bg-[#ddeef5]", c: "text-[#3a7fa0]" },
          ].map((s) => (
            <span
              key={s.label}
              className={`${s.bg} ${s.c} text-sm font-bold px-4 py-2 rounded-full border border-transparent hover:scale-105 transition-transform cursor-default`}
            >
              {s.label}
            </span>
          ))}
          <span className="bg-[#faf8f4] text-[#9e9890] text-sm font-bold px-4 py-2 rounded-full border border-[#ede9e3]">
            + many more
          </span>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-br from-[#e07a3a] to-[#c45e20] py-20 text-center relative overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-white opacity-5 -top-16 -left-16 pointer-events-none" />
        <div className="absolute w-56 h-56 rounded-full bg-white opacity-5 -bottom-10 -right-10 pointer-events-none" />
        <div className="relative max-w-xl mx-auto px-6">
          <h2 className="font-serif text-4xl font-semibold text-white mb-4 leading-tight">
            Ready to learn better, together?
          </h2>
          <p className="text-white/75 text-lg mb-8 font-medium">
            Join 2,400+ learners already finding their study community on StudySphere.
          </p>
          <button className="bg-white text-[#c45e20] font-black px-10 py-4 rounded-full text-lg hover:shadow-2xl hover:-translate-y-1 transition-all">
            Join StudySphere — it's free 🚀
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1e1b18] text-white/40 text-sm text-center py-6 font-medium">
        © 2026 StudySphere · Built with ❤️ for learners everywhere
      </footer>

    </div>
  )
}