"use client";
/* eslint-disable @next/next/no-img-element -- object URLs and user-owned Blob media need native image elements */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import type { SuiteUser } from "@/lib/auth";
import type { PublicComment, PublicPerson, PublicPost } from "@/lib/social";

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
  { label: "Sport", href: "https://sport.tecnosocialismo.com", mark: "F" },
  { label: "Market", href: "https://market.tecnosocialismo.com", mark: "K" },
  { label: "Lavoro", href: "https://lavoro.tecnosocialismo.com", mark: "L" },
  { label: "Messaggi", href: "https://messaggi.tecnosocialismo.com", mark: "G" },
  { label: "Militant", href: "https://militant.tecnosocialismo.com", mark: "P" },
  { label: "Account", href: "https://login.tecnosocialismo.com", mark: "A" },
];

type FeedMode = "signal" | "latest" | "following" | "video" | "saved";
const feedModes: Array<{ id: FeedMode; label: string; icon: string; auth?: boolean }> = [
  { id: "signal", label: "Segnale", icon: "sparkles" },
  { id: "latest", label: "Recenti", icon: "clock" },
  { id: "following", label: "La mia rete", icon: "people", auth: true },
  { id: "video", label: "Media", icon: "play" },
  { id: "saved", label: "Salvati", icon: "bookmark", auth: true },
];

export function SocialApp({ user }: { user: SuiteUser | null }) {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [people, setPeople] = useState<PublicPerson[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [query, setQuery] = useState("");
  const [feedMode, setFeedMode] = useState<FeedMode>("signal");
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const loginUrl = `https://login.tecnosocialismo.com?returnTo=${encodeURIComponent(SOCIAL_ORIGIN)}`;

  useEffect(() => {
    let active = true;
    fetch("/api/posts", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { posts: PublicPost[]; people?: PublicPerson[]; viewerId?: string | null; configured: boolean } : null)
      .catch(() => null)
      .then((payload) => {
        if (!active) return;
        if (payload) {
          setPosts(payload.posts);
          setPeople(payload.people ?? []);
          setViewerId(payload.viewerId ?? user?.id ?? null);
          setConfigured(payload.configured);
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;
    const id = new URLSearchParams(window.location.search).get("post");
    if (id) window.requestAnimationFrame(() => document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [loading]);

  const topics = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const post of posts) {
      for (const match of post.body.match(/#[\p{L}\p{N}_-]+/gu) ?? []) {
        const key = match.slice(1).toLocaleLowerCase("it");
        counts.set(key, { label: match.slice(1), count: (counts.get(key)?.count ?? 0) + 1 });
      }
    }
    return [...counts.entries()].map(([id, item]) => ({ id, ...item })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [posts]);

  const visible = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("it");
    const filtered = posts.filter((post) => {
      if (activeAuthor && post.authorId !== activeAuthor) return false;
      if (activeTopic && !post.body.toLocaleLowerCase("it").includes(`#${activeTopic}`)) return false;
      if (feedMode === "following" && post.authorId !== viewerId && !post.followingAuthor) return false;
      if (feedMode === "video" && !post.video && !post.imageUrl) return false;
      if (feedMode === "saved" && !post.savedByViewer) return false;
      if (!clean) return true;
      return [post.body, post.authorName, post.video?.title ?? "", post.video?.category ?? ""].some((part) => part.toLocaleLowerCase("it").includes(clean));
    });
    if (feedMode === "signal") return filtered.sort((a, b) => signalScore(b) - signalScore(a));
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, query, activeAuthor, activeTopic, feedMode, viewerId]);

  const currentProfile = activeAuthor ? people.find((person) => person.id === activeAuthor) ?? null : null;
  const suggestions = people.filter((person) => person.id !== viewerId && !person.following).slice(0, 4);

  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function selectMode(mode: FeedMode) {
    if ((mode === "following" || mode === "saved") && !user) { window.location.assign(loginUrl); return; }
    setFeedMode(mode); setActiveAuthor(null); setActiveTopic(null); setMenuOpen(false);
  }

  function openComposer() {
    if (!user) { window.location.assign(loginUrl); return; }
    setComposerExpanded(true);
    window.requestAnimationFrame(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function replacePost(id: string, mutate: (post: PublicPost) => PublicPost) {
    setPosts((current) => current.map((post) => post.id === id ? mutate(post) : post));
  }

  async function toggleFollow(authorId: string) {
    if (!user) { window.location.assign(loginUrl); return; }
    const response = await fetch(`/api/people/${encodeURIComponent(authorId)}/follow`, { method: "POST" }).catch(() => null);
    if (!response?.ok) { toast("Non è stato possibile aggiornare la rete."); return; }
    const payload = await response.json() as { following: boolean };
    setPeople((current) => current.map((person) => person.id === authorId ? { ...person, following: payload.following, followerCount: Math.max(0, person.followerCount + (payload.following ? 1 : -1)) } : person));
    setPosts((current) => current.map((post) => post.authorId === authorId ? { ...post, followingAuthor: payload.following } : post));
    toast(payload.following ? "Persona aggiunta alla tua rete." : "Persona rimossa dalla tua rete.");
  }

  const sectionTitle = currentProfile ? currentProfile.name : activeTopic ? `#${activeTopic}` : feedModes.find((item) => item.id === feedMode)?.label ?? "Segnale";

  return (
    <div className="social-shell">
      <header className="topbar">
        <a className="brand" href="https://tecnosocialismo.com" aria-label="Tecnosocialismo"><span className="brand-orbit"><i /></span><span>TECNO<br />SOCIALISMO</span></a>
        <Link className="service-name" href="/"><b>SOCIAL</b><i>RETE APERTA</i></Link>
        <label className="global-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nella rete" aria-label="Cerca nella rete" />{query && <button onClick={() => setQuery("")} aria-label="Pulisci la ricerca"><Icon name="close" /></button>}<kbd>⌘ K</kbd></label>
        <button className="primary-action" onClick={openComposer}><Icon name="plus" /><span>Pubblica</span></button>
        <SuiteMenu />
        {user ? <a className="account" href="https://login.tecnosocialismo.com" title={user.email}><span>{initials(user.name)}</span><strong>{user.name}</strong></a> : <a className="login-link" href={loginUrl}>Accedi</a>}
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Apri menu"><Icon name="menu" /></button>
      </header>

      <aside className={`left-rail ${menuOpen ? "is-open" : ""}`}>
        {user && <button className="mini-profile" onClick={() => { setActiveAuthor(user.id); setMenuOpen(false); }}><Avatar name={user.name} tone="orange" /><span><strong>{user.name}</strong><small>Il tuo profilo</small></span><Icon name="chevron" /></button>}
        <nav className="feed-nav" aria-label="Feed">
          <p>ESPLORA</p>
          {feedModes.map((item) => <button key={item.id} className={feedMode === item.id && !activeAuthor && !activeTopic ? "active" : ""} onClick={() => selectMode(item.id)}><Icon name={item.icon} /><span>{item.label}</span>{item.id === "signal" && <em>AI</em>}</button>)}
        </nav>
        <div className="rail-divider" />
        <nav className="utility-nav" aria-label="Collegamenti"><a href="https://video.tecnosocialismo.com"><Icon name="video" /><span>Video</span><small>↗</small></a><a href="https://messaggi.tecnosocialismo.com"><Icon name="message" /><span>Messaggi</span><small>↗</small></a><a href="https://cloud.tecnosocialismo.com"><Icon name="cloud" /><span>Cloud</span><small>↗</small></a></nav>
        <div className="suite-grid"><p>ECOSISTEMA</p>{suiteLinks.map((link) => <a href={link.href} key={link.label} className={link.current ? "current" : ""} title={link.label}><i>{link.mark}</i></a>)}</div>
        <footer><span><i /> SISTEMI OPERATIVI</span><small>Social · preview pubblica</small></footer>
      </aside>
      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Chiudi menu" />}

      <main className="feed-column">
        <section className="feed-hero">
          <div className="hero-copy"><p>RETE COMUNE <span>•</span> NESSUNA PUBBLICITÀ</p><h1>Persone, idee,<br /><em>possibilità.</em></h1><span>Un social che ottimizza le connessioni, non la dipendenza.</span></div>
          <NeuralPulse />
          <div className="network-status"><i /><span><b>{posts.length}</b> segnali nella rete</span><small>LIVE</small></div>
        </section>

        <Composer user={user} loginUrl={loginUrl} reference={composerRef} expanded={composerExpanded} setExpanded={setComposerExpanded} onCreated={(post) => { setPosts((current) => [post, ...current]); setPeople((current) => upsertPerson(current, post, viewerId)); setActiveAuthor(null); setActiveTopic(null); setFeedMode("latest"); toast("Pubblicato nella rete comune."); }} toast={toast} />

        <header className="feed-toolbar">
          <div><span>FEED / {feedMode.toUpperCase()}</span><h2>{sectionTitle}</h2></div>
          <div className="feed-pills">
            {(["signal", "latest", "following"] as FeedMode[]).map((mode) => <button key={mode} className={feedMode === mode ? "active" : ""} onClick={() => selectMode(mode)}>{feedModes.find((item) => item.id === mode)?.label}</button>)}
          </div>
          {(activeAuthor || activeTopic) && <button className="clear-context" onClick={() => { setActiveAuthor(null); setActiveTopic(null); }}><Icon name="close" /> Tutta la rete</button>}
          <small>{visible.length} {visible.length === 1 ? "segnale" : "segnali"}</small>
        </header>

        {feedMode === "signal" && !activeAuthor && !activeTopic && <div className="algorithm-note"><Icon name="sparkles" /><span><b>Segnale è un feed spiegabile.</b> Ordina per freschezza e conversazioni reali. Puoi tornare sempre a “Recenti”.</span><button onClick={() => toast("Pesi attuali: freschezza 55%, conversazioni 30%, tua rete 15%.")}>Come decide</button></div>}

        <section className="post-list" aria-live="polite">
          {loading ? <LoadingFeed /> : !configured ? <Empty icon="cloud" title="Archivio da collegare" body="L’interfaccia è pronta: manca il collegamento allo spazio dati." /> : visible.length === 0 ? <Empty icon={feedMode === "saved" ? "bookmark" : "sparkles"} title={emptyTitle(feedMode, posts.length)} body={emptyBody(feedMode, posts.length)} action={feedMode !== "saved" ? { label: "Crea il primo segnale", run: openComposer } : undefined} /> : visible.map((post) => <PostCard key={post.id} post={post} user={user} loginUrl={loginUrl} viewerId={viewerId} onAuthor={() => { setActiveAuthor(post.authorId); setActiveTopic(null); }} onTopic={(topic) => { setActiveTopic(topic); setActiveAuthor(null); }} onFollow={() => toggleFollow(post.authorId)} replace={replacePost} remove={(id) => setPosts((current) => current.filter((item) => item.id !== id))} toast={toast} />)}
        </section>
      </main>

      <aside className="right-rail">
        <section className="right-block network-card"><header><span>RADAR DELLA RETE</span><i>LIVE</i></header><div className="radar"><i /><i /><i /><b /></div><footer><div><b>{people.length}</b><span>voci attive</span></div><div><b>{posts.reduce((sum, post) => sum + post.commentCount, 0)}</b><span>risposte</span></div><div><b>{topics.length}</b><span>temi</span></div></footer></section>
        <section className="right-block topic-block"><header><span>TEMI EMERGENTI</span><button onClick={() => { setActiveTopic(null); setQuery(""); }}>Azzera</button></header>{topics.length ? <div className="topic-list">{topics.map((topic, index) => <button key={topic.id} className={activeTopic === topic.id ? "active" : ""} onClick={() => { setActiveTopic(topic.id); setActiveAuthor(null); }}><small>0{index + 1}</small><span>#{topic.label}</span><em>{topic.count}</em></button>)}</div> : <p className="quiet-state">I temi appariranno quando la rete inizierà a usare gli hashtag.</p>}</section>
        <section className="right-block people-block"><header><span>NUOVE CONNESSIONI</span></header>{suggestions.length ? suggestions.map((person) => <div className="person-row" key={person.id}><button onClick={() => setActiveAuthor(person.id)}><Avatar name={person.name} /><span><b>{person.name}</b><small>{person.postCount} {person.postCount === 1 ? "segnale" : "segnali"}</small></span></button><button onClick={() => toggleFollow(person.id)} aria-label={`Segui ${person.name}`}><Icon name="plus" /></button></div>) : <p className="quiet-state">Le nuove voci della rete compariranno qui.</p>}</section>
        <section className="right-block manifesto-card"><span>IL PATTO</span><h3>Attenzione,<br />non dipendenza.</h3><p>Niente pubblicità. Nessuna vendita dei dati. Feed controllabili e regole leggibili.</p><a href="https://tecnosocialismo.com/manifesto">Leggi il manifesto <Icon name="arrow" /></a></section>
      </aside>

      <nav className="mobile-nav" aria-label="Navigazione mobile"><button className={feedMode === "signal" ? "active" : ""} onClick={() => selectMode("signal")}><Icon name="sparkles" /><span>Segnale</span></button><button className={feedMode === "latest" ? "active" : ""} onClick={() => selectMode("latest")}><Icon name="clock" /><span>Recenti</span></button><button className="mobile-create" onClick={openComposer}><Icon name="plus" /></button><button className={feedMode === "following" ? "active" : ""} onClick={() => selectMode("following")}><Icon name="people" /><span>Rete</span></button><button className={feedMode === "saved" ? "active" : ""} onClick={() => selectMode("saved")}><Icon name="bookmark" /><span>Salvati</span></button></nav>
      {notice && <div className="toast" role="status"><span className="toast-orbit"><i /></span>{notice}</div>}
    </div>
  );
}

function Composer({ user, loginUrl, reference, expanded, setExpanded, onCreated, toast }: { user: SuiteUser | null; loginUrl: string; reference: React.RefObject<HTMLDivElement | null>; expanded: boolean; setExpanded: (value: boolean) => void; onCreated: (post: PublicPost) => void; toast: (value: string) => void }) {
  const [body, setBody] = useState("");
  const [video, setVideo] = useState("");
  const [showVideo, setShowVideo] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftReady = useRef(false);

  useEffect(() => { const timer = window.setTimeout(() => { const draft = window.localStorage.getItem("ts-social-draft"); if (draft) setBody(draft); draftReady.current = true; }, 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => { if (!draftReady.current) return; if (body) window.localStorage.setItem("ts-social-draft", body); else window.localStorage.removeItem("ts-social-draft"); }, [body]);
  const imagePreview = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  useEffect(() => { if (expanded) window.requestAnimationFrame(() => textareaRef.current?.focus()); }, [expanded]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Scegli un file immagine."); return; }
    if (file.size > 8 * 1024 * 1024) { toast("L’immagine supera gli 8 MB."); return; }
    setImage(file); setExpanded(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) { window.location.assign(loginUrl); return; }
    if (!body.trim() && !video.trim() && !image) return;
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (image) {
      const form = new FormData(); form.set("file", image);
      const upload = await fetch("/api/media", { method: "POST", body: form }).catch(() => null);
      const uploaded = upload ? await upload.json().catch(() => ({})) as { url?: string; error?: string } : { error: "Connessione non disponibile." };
      if (!upload?.ok || !uploaded.url) { setSubmitting(false); toast(uploaded.error || "Immagine non caricata."); return; }
      imageUrl = uploaded.url;
    }
    const response = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, video, imageUrl }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { post?: PublicPost; error?: string } : { error: "Connessione non disponibile." };
    setSubmitting(false);
    if (!response?.ok || !payload.post) { toast(payload.error || "Non è stato possibile pubblicare."); return; }
    onCreated(payload.post); setBody(""); setVideo(""); setShowVideo(false); setImage(null); setExpanded(false);
  }

  function keyboardSubmit(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit();
  }

  return <div className={`composer ${expanded ? "expanded" : ""}`} ref={reference}>
    <Avatar name={user?.name ?? "Ospite"} tone="orange" />
    <form onSubmit={submit}>
      {!expanded ? <button type="button" className="composer-prompt" onClick={() => { if (!user) window.location.assign(loginUrl); else setExpanded(true); }}>{user ? "Condividi un’idea con la rete…" : "Accedi per partecipare alla conversazione"}</button> : <textarea ref={textareaRef} value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={keyboardSubmit} placeholder="Condividi un’idea, una domanda, qualcosa da costruire…" maxLength={3000} rows={4} />}
      {expanded && imagePreview && <div className="image-preview"><img src={imagePreview} alt="Anteprima del caricamento" /><button type="button" onClick={() => setImage(null)} aria-label="Rimuovi immagine"><Icon name="close" /></button></div>}
      {expanded && showVideo && <label className="video-field"><Icon name="play" /><input value={video} onChange={(event) => setVideo(event.target.value)} placeholder="Incolla il link di un video della piattaforma" /><button type="button" onClick={() => { setShowVideo(false); setVideo(""); }} aria-label="Rimuovi video"><Icon name="close" /></button></label>}
      <footer><div className="composer-tools"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} hidden /><button type="button" onClick={() => { if (!user) window.location.assign(loginUrl); else fileRef.current?.click(); }}><Icon name="image" /><span>Immagine</span></button><button type="button" className={showVideo ? "active" : ""} onClick={() => { if (!user) window.location.assign(loginUrl); else { setExpanded(true); setShowVideo(!showVideo); } }}><Icon name="play" /><span>Video</span></button><button type="button" onClick={() => { if (!user) window.location.assign(loginUrl); else { setExpanded(true); setBody((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}#`); } }}><Icon name="hash" /><span>Tema</span></button></div>{expanded && <><small>{body.length}/3000</small><button className="publish-button" disabled={submitting || (!body.trim() && !video.trim() && !image)}>{submitting ? "Pubblico…" : "Pubblica"}<Icon name="arrow" /></button></>}</footer>
    </form>
  </div>;
}

function PostCard({ post, user, loginUrl, viewerId, onAuthor, onTopic, onFollow, replace, remove, toast }: { post: PublicPost; user: SuiteUser | null; loginUrl: string; viewerId: string | null; onAuthor: () => void; onTopic: (topic: string) => void; onFollow: () => void; replace: (id: string, mutate: (post: PublicPost) => PublicPost) => void; remove: (id: string) => void; toast: (value: string) => void }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle(kind: "like" | "save" | "repost") {
    if (!user) { window.location.assign(loginUrl); return; }
    const response = await fetch(`/api/posts/${post.id}/${kind}`, { method: "POST" }).catch(() => null);
    if (!response?.ok) { toast("Non è stato possibile aggiornare il segnale."); return; }
    const payload = await response.json() as { liked?: boolean; likeCount?: number; saved?: boolean; reposted?: boolean; repostCount?: number };
    replace(post.id, (current) => ({ ...current, likedByViewer: payload.liked ?? current.likedByViewer, likeCount: payload.likeCount ?? current.likeCount, savedByViewer: payload.saved ?? current.savedByViewer, repostedByViewer: payload.reposted ?? current.repostedByViewer, repostCount: payload.repostCount ?? current.repostCount }));
    if (kind === "save") toast(payload.saved ? "Salvato nella tua raccolta." : "Rimosso dai salvati.");
    if (kind === "repost") toast(payload.reposted ? "Segnale rilanciato alla tua rete." : "Rilancio rimosso.");
  }

  async function toggleComments() {
    setCommentsOpen(!commentsOpen);
    if (comments === null) {
      const response = await fetch(`/api/posts/${post.id}/comments`, { cache: "no-store" }).catch(() => null);
      setComments(response?.ok ? ((await response.json()) as { comments: PublicComment[] }).comments : []);
    }
  }

  async function comment(event: FormEvent) {
    event.preventDefault();
    if (!user) { window.location.assign(loginUrl); return; }
    if (!commentBody.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/posts/${post.id}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: commentBody }) }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { comment?: PublicComment; commentCount?: number; error?: string } : { error: "Connessione non disponibile." };
    setBusy(false);
    if (!response?.ok || !payload.comment) { toast(payload.error || "Risposta non pubblicata."); return; }
    setComments((current) => [...(current ?? []), payload.comment!]); setCommentBody("");
    replace(post.id, (current) => ({ ...current, commentCount: payload.commentCount ?? current.commentCount + 1 }));
  }

  async function share() {
    const url = `${SOCIAL_ORIGIN}/?post=${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `Segnale di ${post.authorName}`, text: post.body.slice(0, 180), url });
      else { await navigator.clipboard.writeText(url); toast("Collegamento copiato."); }
    } catch { /* condivisione annullata */ }
  }

  async function deletePost() {
    if (!window.confirm("Eliminare definitivamente questo contenuto?")) return;
    const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) { toast("Non è stato possibile eliminare il contenuto."); return; }
    remove(post.id); toast("Contenuto eliminato.");
  }

  return <article className="post-card" id={`post-${post.id}`}>
    <div className="post-line"><Avatar name={post.authorName} onClick={onAuthor} /></div>
    <div className="post-content">
      <header className="post-header"><button className="author-name" onClick={onAuthor}>{post.authorName}</button>{post.followingAuthor && <span className="network-badge"><i /> NELLA TUA RETE</span>}<time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>{viewerId !== post.authorId && <button className={`follow-inline ${post.followingAuthor ? "following" : ""}`} onClick={onFollow}>{post.followingAuthor ? "Segui già" : "Segui"}</button>}{viewerId === post.authorId && <button className="delete-action" onClick={deletePost} aria-label="Elimina"><Icon name="trash" /></button>}</header>
      {post.body && <p className="post-body">{richText(post.body, onTopic)}</p>}
      {post.imageUrl && <figure className="post-image"><img src={post.imageUrl} alt={`Immagine pubblicata da ${post.authorName}`} loading="lazy" /></figure>}
      {post.videoId && (post.video ? <div className="embedded-video"><video controls preload="metadata" poster={post.video.hasPoster ? `${VIDEO_ORIGIN}/api/videos/${post.video.id}/poster` : undefined} src={`${VIDEO_ORIGIN}/api/videos/${post.video.id}/stream`} /><a href={`${VIDEO_ORIGIN}/watch/${post.video.id}`}><span><b>{post.video.title}</b><small>{post.video.ownerName} · {post.video.category} · {formatDuration(post.video.durationSeconds)}</small></span><Icon name="arrow" /></a></div> : <a className="missing-video" href={`${VIDEO_ORIGIN}/watch/${post.videoId}`}>Questo video non è più nel catalogo pubblico <Icon name="arrow" /></a>)}
      <footer className="post-actions"><button className={post.likedByViewer ? "active like" : ""} onClick={() => toggle("like")} aria-label="Apprezza"><Icon name="heart" /><span>{post.likeCount ? formatMetric(post.likeCount) : "Apprezza"}</span></button><button className={commentsOpen ? "active" : ""} onClick={toggleComments} aria-label="Rispondi"><Icon name="comment" /><span>{post.commentCount ? formatMetric(post.commentCount) : "Rispondi"}</span></button><button className={post.repostedByViewer ? "active repost" : ""} onClick={() => toggle("repost")} aria-label="Rilancia"><Icon name="repost" /><span>{post.repostCount ? formatMetric(post.repostCount) : "Rilancia"}</span></button><button onClick={share} aria-label="Condividi"><Icon name="share" /><span>Condividi</span></button><button className={post.savedByViewer ? "active save" : "save"} onClick={() => toggle("save")} aria-label="Salva"><Icon name="bookmark" /></button></footer>
      {commentsOpen && <section className="comments"><div className="comment-list">{comments === null ? <span>Carico la conversazione…</span> : comments.length === 0 ? <span>Apri tu la conversazione.</span> : comments.map((item) => <div className="comment" key={item.id}><Avatar name={item.authorName} /><p><strong>{item.authorName}</strong><time>{relativeTime(item.createdAt)}</time><span>{item.body}</span></p></div>)}</div><form onSubmit={comment}><Avatar name={user?.name ?? "Ospite"} /><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={user ? "Scrivi una risposta…" : "Accedi per rispondere"} onFocus={() => { if (!user) window.location.assign(loginUrl); }} maxLength={1200} /><button disabled={busy || !commentBody.trim()} aria-label="Pubblica risposta"><Icon name="arrow" /></button></form></section>}
    </div>
  </article>;
}

function NeuralPulse() { return <div className="neural-pulse" aria-hidden="true"><i className="node-core" /><i className="node n1" /><i className="node n2" /><i className="node n3" /><i className="node n4" /><span className="orbit o1" /><span className="orbit o2" /><span className="orbit o3" /></div>; }
function SuiteMenu() { return <details className="suite-menu"><summary aria-label="Apri tutti i servizi"><span className="suite-dots" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span><span className="suite-label">Servizi</span></summary><div><p>UN ECOSISTEMA · UN ACCOUNT</p>{suiteLinks.map((link) => <a className={link.current ? "current" : ""} aria-current={link.current ? "page" : undefined} href={link.href} key={link.label}><i>{link.mark}</i><span>{link.label}</span><b>↗</b></a>)}</div></details>; }
function Avatar({ name, tone, onClick }: { name: string; tone?: "orange"; onClick?: () => void }) { const content = <>{initials(name)}<i /></>; return onClick ? <button className={`avatar ${tone ?? ""}`} onClick={onClick} aria-label={`Apri il profilo di ${name}`}>{content}</button> : <span className={`avatar ${tone ?? ""}`}>{content}</span>; }
function LoadingFeed() { return <div className="loading-feed">{[1, 2, 3].map((item) => <i key={item} />)}</div>; }
function Empty({ icon, title, body, action }: { icon: string; title: string; body: string; action?: { label: string; run: () => void } }) { return <div className="empty-feed"><span><Icon name={icon} /></span><div><h3>{title}</h3><p>{body}</p>{action && <button onClick={action.run}>{action.label}<Icon name="arrow" /></button>}</div></div>; }
function emptyTitle(mode: FeedMode, count: number) { if (!count) return "La rete aspetta il primo segnale"; if (mode === "following") return "Costruisci la tua rete"; if (mode === "saved") return "La tua raccolta è vuota"; if (mode === "video") return "Nessun media qui"; return "Nessun risultato"; }
function emptyBody(mode: FeedMode, count: number) { if (!count) return "Condividi un pensiero, una domanda, un’immagine o un video."; if (mode === "following") return "Segui nuove persone dal radar per comporre questo feed."; if (mode === "saved") return "Usa il segnalibro sotto un contenuto per ritrovarlo qui."; if (mode === "video") return "Le immagini e i video pubblicati nella rete appariranno qui."; return "Prova una ricerca diversa o torna al feed completo."; }
function upsertPerson(people: PublicPerson[], post: PublicPost, viewerId: string | null) { const existing = people.find((person) => person.id === post.authorId); if (!existing) return [{ id: post.authorId, name: post.authorName, postCount: 1, followerCount: 0, following: false, lastActive: post.createdAt }, ...people]; return people.map((person) => person.id === post.authorId ? { ...person, postCount: person.postCount + 1, lastActive: post.createdAt, following: person.id === viewerId ? false : person.following } : person); }
function signalScore(post: PublicPost) { const hours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / 3_600_000); const freshness = Math.max(0, 72 - hours); return freshness * 2 + post.commentCount * 8 + post.repostCount * 6 + post.likeCount * 3 + (post.followingAuthor ? 24 : 0); }
function richText(body: string, onTopic: (topic: string) => void) { return body.split(/(https?:\/\/\S+|#[\p{L}\p{N}_-]+)/gu).map((part, index) => { if (/^https?:\/\//i.test(part)) return <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a>; if (part.startsWith("#")) return <button key={index} onClick={() => onTopic(part.slice(1).toLocaleLowerCase("it"))}>{part}</button>; return part; }); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function formatDuration(seconds: number) { const minutes = Math.floor(seconds / 60); return `${minutes}:${String(seconds % 60).padStart(2, "0")}`; }
function formatMetric(value: number) { return new Intl.NumberFormat("it-IT", { notation: value > 999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value); }
function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "ora"; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} h`; const days = Math.floor(hours / 24); if (days < 7) return `${days} g`; return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(new Date(value)); }

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></>, close: <path d="m6 6 12 12M18 6 6 18"/>, plus: <path d="M12 5v14M5 12h14"/>, menu: <path d="M4 7h16M4 12h16M4 17h16"/>, sparkles: <><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>, clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>, people: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5c3 0 4 2 4 4s-1 3-3 3M17 14c3 1 4 3 4 6"/></>, bookmark: <path d="M6 4h12v17l-6-4-6 4Z"/>, play: <path d="m8 5 11 7-11 7Z"/>, video: <><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2"/></>, message: <path d="M4 5h16v11H9l-5 4Z"/>, cloud: <path d="M7 18h11a4 4 0 0 0 .4-8A7 7 0 0 0 5 9a4.5 4.5 0 0 0 2 9Z"/>, chevron: <path d="m9 6 6 6-6 6"/>, image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m4 17 5-5 4 4 2-2 5 4"/></>, hash: <path d="M10 3 8 21M16 3l-2 18M4 9h17M3 15h17"/>, arrow: <path d="M5 12h14M14 7l5 5-5 5"/>, heart: <path d="M20 8c0 6-8 11-8 11S4 14 4 8c0-4 5-5 8-1 3-4 8-3 8 1Z"/>, comment: <path d="M4 5h16v11H9l-5 4Z"/>, repost: <><path d="m17 3 4 4-4 4"/><path d="M3 11V9a2 2 0 0 1 2-2h16M7 21l-4-4 4-4"/><path d="M21 13v2a2 2 0 0 1-2 2H3"/></>, share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>, trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
