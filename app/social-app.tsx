"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { SuiteUser } from "@/lib/auth";
import type { PublicComment, PublicPost } from "@/lib/social";

const VIDEO_ORIGIN = "https://video.tecnosocialismo.com";
const SOCIAL_ORIGIN = "https://social.tecnosocialismo.com";
const suiteLinks = [
  { label: "Home", href: "https://tecnosocialismo.com", mark: "T" },
  { label: "Iskra", href: "https://iskra.tecnosocialismo.com", mark: "I" },
  { label: "Rizoma", href: "https://rizoma.tecnosocialismo.com", mark: "R" },
  { label: "Cloud", href: "https://cloud.tecnosocialismo.com", mark: "C" },
  { label: "Mail", href: "https://mail.tecnosocialismo.com", mark: "M" },
  { label: "Video", href: VIDEO_ORIGIN, mark: "V" },
  { label: "Social", href: SOCIAL_ORIGIN, mark: "S", current: true },
  { label: "Account", href: "https://login.tecnosocialismo.com", mark: "A" },
];

export function SocialApp({ user }: { user: SuiteUser | null }) {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [query, setQuery] = useState("");
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const loginUrl = `https://login.tecnosocialismo.com?returnTo=${encodeURIComponent(SOCIAL_ORIGIN)}`;

  useEffect(() => {
    let active = true;
    fetch("/api/posts", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { posts: PublicPost[]; configured: boolean } : null)
      .catch(() => null)
      .then((payload) => {
        if (!active) return;
        if (payload) { setPosts(payload.posts); setConfigured(payload.configured); }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("it");
    return posts.filter((post) => {
      if (activeAuthor && post.authorId !== activeAuthor) return false;
      if (!clean) return true;
      return [post.body, post.authorName, post.video?.title ?? ""].some((part) => part.toLocaleLowerCase("it").includes(clean));
    });
  }, [posts, query, activeAuthor]);

  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function replacePost(id: string, mutate: (post: PublicPost) => PublicPost) {
    setPosts((current) => current.map((post) => post.id === id ? mutate(post) : post));
  }

  return (
    <div className="social-shell">
      <header className="site-header">
        <a className="brand" href="https://tecnosocialismo.com"><span className="spark" /><span>TECNO<br />SOCIALISMO</span></a>
        <Link className="service-name" href="/">SOCIAL <i>ALFA</i></Link>
        <label className="global-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca persone e conversazioni" />{query && <button onClick={() => setQuery("")} aria-label="Pulisci"><Icon name="close" /></button>}</label>
        <button className="publish-top" onClick={() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}><Icon name="plus" /><span>Pubblica</span></button>
        {user ? <a className="account" href="https://login.tecnosocialismo.com" title={user.email}><span>{initials(user.name)}</span><strong>{user.name}</strong></a> : <a className="login-link" href={loginUrl}>Accedi</a>}
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><Icon name="menu" /></button>
      </header>

      <aside className={`side-panel ${menuOpen ? "is-open" : ""}`}>
        <p>NAVIGAZIONE</p>
        <nav>
          <button className={!activeAuthor ? "active" : ""} onClick={() => { setActiveAuthor(null); setMenuOpen(false); }}><Icon name="home" />Spazio comune</button>
          <button onClick={() => toast("I territori arrivano nella prossima fase.")}><Icon name="people" />Territori</button>
          <button onClick={() => toast("Le raccolte tematiche arrivano nella prossima fase.")}><Icon name="hash" />Temi</button>
          {user && <button className={activeAuthor === user.id ? "active" : ""} onClick={() => { setActiveAuthor(user.id); setMenuOpen(false); }}><Icon name="user" />Il mio profilo</button>}
        </nav>
        <div className="principles"><p>COME FUNZIONA</p><div><b>01</b> Ordine cronologico</div><div><b>02</b> Nessuna pubblicità</div><div><b>03</b> Regole leggibili</div></div>
        <div className="suite"><p>ECOSISTEMA</p>{suiteLinks.map((link) => <a className={link.current ? "current" : ""} aria-current={link.current ? "page" : undefined} href={link.href} key={link.label}><i>{link.mark}</i>{link.label}</a>)}</div>
      </aside>
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Chiudi menu" />}

      <main className="feed-column">
        <section className="feed-intro">
          <p>SPAZIO COMUNE · ORDINE CRONOLOGICO</p>
          <h1>{activeAuthor ? "Una voce,\nnel suo contesto." : "Quello che conta\nlo scegliamo insieme."}</h1>
          <div><span>Qui non c’è un algoritmo che decide chi merita attenzione.</span><a href="#principi">Scopri i principi <Icon name="arrow" /></a></div>
        </section>

        <Composer user={user} loginUrl={loginUrl} reference={composerRef} onCreated={(post) => { setPosts((current) => [post, ...current]); setActiveAuthor(null); toast("Pubblicato nello spazio comune."); }} toast={toast} />

        <header className="feed-heading">
          <div><p>{activeAuthor ? "PROFILO" : "CONVERSAZIONI"}</p><h2>{activeAuthor ? visible[0]?.authorName ?? "Profilo" : "Adesso"}</h2></div>
          {activeAuthor && <button onClick={() => setActiveAuthor(null)}>Torna a tutti</button>}
          <span>{visible.length} {visible.length === 1 ? "contenuto" : "contenuti"}</span>
        </header>

        <section className="post-list" aria-live="polite">
          {loading ? <LoadingFeed /> : !configured ? <Empty title="Archivio da collegare" body="L’interfaccia è pronta: manca il collegamento allo spazio dati." /> : visible.length === 0 ? <Empty title={posts.length ? "Nessun risultato" : "Lo spazio è pronto"} body={posts.length ? "Prova una ricerca diversa o torna al feed completo." : "Pubblica il primo pensiero, una domanda o un video della comunità."} /> : visible.map((post) => <PostCard key={post.id} post={post} user={user} loginUrl={loginUrl} onAuthor={() => setActiveAuthor(post.authorId)} replace={replacePost} remove={(id) => setPosts((current) => current.filter((item) => item.id !== id))} toast={toast} />)}
        </section>
      </main>

      <aside className="context-column">
        <section className="signal-card"><div className="signal"><i /><b /></div><p>UNA RETE<br />CHE APPARTIENE<br />A CHI LA USA.</p></section>
        <section id="principi" className="context-block"><p>IL PATTO INIZIALE</p><h2>Attenzione, non dipendenza.</h2><p>Il feed segue il tempo. Niente pubblicità, profili commerciali nascosti o meccanismi progettati per trattenerti.</p><a href="https://tecnosocialismo.com/manifesto">Leggi il manifesto <Icon name="arrow" /></a></section>
        <section className="video-engine"><p>MOTORE VIDEO</p><h3>Un solo contenuto,<br />in tutta la rete.</h3><span>I video restano nella piattaforma comune e qui vengono richiamati con il loro ID.</span><a href={VIDEO_ORIGIN}>Apri Video <Icon name="play" /></a></section>
        <small className="alpha-note">ALFA 0.1 · IL NOME DEFINITIVO SARÀ SCELTO PRIMA DEL LANCIO</small>
      </aside>

      {notice && <div className="toast"><span className="spark" />{notice}</div>}
    </div>
  );
}

function Composer({ user, loginUrl, reference, onCreated, toast }: { user: SuiteUser | null; loginUrl: string; reference: React.RefObject<HTMLDivElement | null>; onCreated: (post: PublicPost) => void; toast: (value: string) => void }) {
  const [body, setBody] = useState("");
  const [video, setVideo] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) { window.location.href = loginUrl; return; }
    if (!body.trim() && !video.trim()) return;
    setSubmitting(true);
    const response = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, video }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { post?: PublicPost; error?: string } : { error: "Connessione non disponibile." };
    setSubmitting(false);
    if (!response?.ok || !payload.post) { toast(payload.error || "Non è stato possibile pubblicare."); return; }
    onCreated(payload.post); setBody(""); setVideo(""); setShowVideo(false);
  }

  return <div className="composer" ref={reference}>
    <div className="composer-avatar">{user ? initials(user.name) : "?"}</div>
    <form onSubmit={submit}>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={user ? "Condividi un’idea, una domanda, qualcosa da costruire…" : "Accedi per prendere parte alla conversazione"} onFocus={() => { if (!user) window.location.href = loginUrl; }} maxLength={3000} />
      {showVideo && <label className="video-field"><Icon name="play" /><input value={video} onChange={(event) => setVideo(event.target.value)} placeholder="Incolla il link di un video della piattaforma" autoFocus /><button type="button" onClick={() => { setShowVideo(false); setVideo(""); }} aria-label="Rimuovi"><Icon name="close" /></button></label>}
      <footer><div><button type="button" className={showVideo ? "active" : ""} onClick={() => setShowVideo(!showVideo)}><Icon name="play" />Video</button><span>Il video resta nel motore comune</span></div><small>{body.length}/3000</small><button className="submit-post" disabled={submitting || (!body.trim() && !video.trim())}>{submitting ? "Pubblicazione…" : "Pubblica"}<Icon name="arrow" /></button></footer>
    </form>
  </div>;
}

function PostCard({ post, user, loginUrl, onAuthor, replace, remove, toast }: { post: PublicPost; user: SuiteUser | null; loginUrl: string; onAuthor: () => void; replace: (id: string, mutate: (post: PublicPost) => PublicPost) => void; remove: (id: string) => void; toast: (value: string) => void }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function like() {
    if (!user) { window.location.href = loginUrl; return; }
    const response = await fetch(`/api/posts/${post.id}/like`, { method: "POST" }).catch(() => null);
    if (!response?.ok) { toast("Non è stato possibile aggiornare l’apprezzamento."); return; }
    const payload = await response.json() as { liked: boolean; likeCount: number };
    replace(post.id, (current) => ({ ...current, likedByViewer: payload.liked, likeCount: payload.likeCount }));
  }

  async function toggleComments() {
    setCommentsOpen(!commentsOpen);
    if (comments === null) {
      const response = await fetch(`/api/posts/${post.id}/comments`, { cache: "no-store" }).catch(() => null);
      if (response?.ok) setComments(((await response.json()) as { comments: PublicComment[] }).comments);
      else setComments([]);
    }
  }

  async function comment(event: FormEvent) {
    event.preventDefault();
    if (!user) { window.location.href = loginUrl; return; }
    if (!commentBody.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/posts/${post.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: commentBody }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { comment?: PublicComment; commentCount?: number; error?: string } : { error: "Connessione non disponibile." };
    setBusy(false);
    if (!response?.ok || !payload.comment) { toast(payload.error || "Commento non pubblicato."); return; }
    setComments((current) => [...(current ?? []), payload.comment!]); setCommentBody("");
    replace(post.id, (current) => ({ ...current, commentCount: payload.commentCount ?? current.commentCount + 1 }));
  }

  async function share() {
    const url = `${SOCIAL_ORIGIN}/?post=${post.id}`;
    try { await navigator.clipboard.writeText(url); toast("Collegamento copiato."); } catch { toast("Copia il collegamento dalla barra del browser."); }
  }

  async function deletePost() {
    if (!window.confirm("Eliminare definitivamente questo contenuto?")) return;
    const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) { toast("Non è stato possibile eliminare il contenuto."); return; }
    remove(post.id); toast("Contenuto eliminato.");
  }

  return <article className="post-card" id={`post-${post.id}`}>
    <button className="post-avatar" onClick={onAuthor}>{initials(post.authorName)}</button>
    <div className="post-content">
      <header><button onClick={onAuthor}>{post.authorName}</button><span>·</span><time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time><i>CRONO</i></header>
      {post.body && <p className="post-body">{post.body}</p>}
      {post.videoId && (post.video ? <div className="embedded-video"><video controls preload="metadata" poster={post.video.hasPoster ? `${VIDEO_ORIGIN}/api/videos/${post.video.id}/poster` : undefined} src={`${VIDEO_ORIGIN}/api/videos/${post.video.id}/stream`} /><a href={`${VIDEO_ORIGIN}/watch/${post.video.id}`}><span><b>{post.video.title}</b><small>{post.video.ownerName} · {formatDuration(post.video.durationSeconds)}</small></span><Icon name="arrow" /></a></div> : <a className="missing-video" href={`${VIDEO_ORIGIN}/watch/${post.videoId}`}>Questo video non è più nel catalogo pubblico <Icon name="arrow" /></a>)}
      <footer className="post-actions"><button className={post.likedByViewer ? "liked" : ""} onClick={like}><Icon name="heart" /><span>{post.likeCount || "Apprezza"}</span></button><button onClick={toggleComments}><Icon name="comment" /><span>{post.commentCount || "Rispondi"}</span></button><button onClick={share}><Icon name="share" /><span>Condividi</span></button>{user?.id === post.authorId && <button className="delete-action" onClick={deletePost}><Icon name="trash" /><span>Elimina</span></button>}</footer>
      {commentsOpen && <section className="comments"><div className="comment-list">{comments === null ? <span>Caricamento…</span> : comments.length === 0 ? <span>Apri tu la conversazione.</span> : comments.map((item) => <div className="comment" key={item.id}><i>{initials(item.authorName)}</i><p><strong>{item.authorName}</strong><time>{relativeTime(item.createdAt)}</time><span>{item.body}</span></p></div>)}</div><form onSubmit={comment}><span>{user ? initials(user.name) : "?"}</span><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={user ? "Scrivi una risposta…" : "Accedi per rispondere"} maxLength={1200} /><button disabled={busy || !commentBody.trim()}><Icon name="arrow" /></button></form></section>}
    </div>
  </article>;
}

function LoadingFeed() { return <div className="loading-feed">{[1, 2, 3].map((item) => <i key={item} />)}</div>; }
function Empty({ title, body }: { title: string; body: string }) { return <div className="empty-feed"><span>◎</span><div><h3>{title}</h3><p>{body}</p></div></div>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60); return `${minutes}:${String(seconds % 60).padStart(2, "0")}`; }
function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "ora"; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} h`; const days = Math.floor(hours / 24); if (days < 7) return `${days} g`; return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(new Date(value)); }

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, close: <><path d="m6 6 12 12M18 6 6 18"/></>, plus: <><path d="M12 5v14M5 12h14"/></>, menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>, home: <><path d="m3 11 9-7 9 7v9H6v-9"/><path d="M10 20v-6h4v6"/></>, people: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 1 4 3 4 6"/></>, hash: <><path d="M10 3 8 21M16 3l-2 18M4 9h17M3 15h17"/></>, user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>, arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>, play: <><path d="m8 5 11 7-11 7Z"/></>, heart: <><path d="M20 8c0 6-8 11-8 11S4 14 4 8c0-4 5-5 8-1 3-4 8-3 8 1Z"/></>, comment: <><path d="M4 5h16v11H9l-5 4Z"/></>, share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>, trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
