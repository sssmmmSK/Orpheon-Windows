import { useEffect, useState } from "react";
import { Disc3, Search, Library, Heart, Clock3, Plus, Home, Settings, Download, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat2, Volume2, MonitorSpeaker, LogIn, Radio, ExternalLink } from "lucide-react";

type Track = { name?: string; artists?: { name: string }[]; album?: { name: string } | null; image?: string | null; durationMs?: number | null; uri?: string; kind?: string };
type PlayerState = { track?: Track | null; isPaused?: boolean; isBuffering?: boolean; positionMs?: number; durationMs?: number; shuffle?: boolean; repeat?: number };
declare global { interface Window { orpheonDesktop?: { platform: string; version: string; launchSpotify: () => Promise<{opened:boolean}>; command: (method:string,args?:Record<string,unknown>)=>Promise<any>; onStatus:(cb:(v:any)=>void)=>()=>void; onState:(cb:(v:PlayerState)=>void)=>()=>void; }; } }

const fmt=(ms?:number|null)=>{if(!ms||!Number.isFinite(ms))return "0:00";const s=Math.floor(ms/1000);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};

export default function App() {
  const [status,setStatus]=useState("Spotify не подключён");
  const [connected,setConnected]=useState(false);
  const [ready,setReady]=useState(false);
  const [player,setPlayer]=useState<PlayerState>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");

  useEffect(()=>{
    const offStatus=window.orpheonDesktop?.onStatus(v=>{setConnected(!!v.connected);setReady(!!v.ready);setStatus(v.message||"");});
    const offState=window.orpheonDesktop?.onState(v=>setPlayer(v));
    return ()=>{offStatus?.();offState?.();};
  },[]);

  const command=async(method:string,args?:Record<string,unknown>)=>{
    try{setError("");await window.orpheonDesktop?.command(method,args);}
    catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  const connect=async()=>{
    setBusy(true);setError("");
    try{await window.orpheonDesktop?.launchSpotify();setStatus("Открылся браузер. Войди в Spotify — можно использовать бесплатный аккаунт.");}
    catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const track=player.track;
  const artist=track?.artists?.map(a=>a.name).join(", ")||"";
  const pct=player.durationMs?Math.min(100,Math.max(0,(player.positionMs||0)/player.durationMs*100)):0;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Disc3 size={22}/></div><span>orpheon<span className="brand-sub">WINDOWS</span></span></div>
      <div className="nav-group"><button className="nav active"><Home/>Главная</button><button className="nav" onClick={()=>document.querySelector<HTMLInputElement>(".search-wrap input")?.focus()}><Search/>Поиск</button><button className="nav"><Library/>Медиатека</button></div>
      <div className="library-head"><span>ТВОЯ КОЛЛЕКЦИЯ</span><button className="icon-btn" title="Добавить"><Plus size={17}/></button></div>
      <button className="nav"><Heart/>Любимые треки</button><button className="nav"><Clock3/>Недавно прослушано</button>
      <div className="sidebar-bottom"><div className="connection"><span className="status-dot" style={{background:ready?"#d6ff6b":connected?"#e6b85c":"#686a72"}}/>{ready?"ПЛЕЕР ГОТОВ":connected?"БРАУЗЕР ПОДКЛЮЧЁН":"НЕТ ПОДКЛЮЧЕНИЯ"}<span>v0.2</span></div><button className="nav"><Download/>Загрузки</button><button className="nav"><Settings/>Настройки</button></div>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div className="search-wrap"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск пока доступен в Spotify"/></div><button className="login-btn" onClick={connect} disabled={busy}><LogIn size={16}/>{busy?"Подключение…":"Подключить Spotify"}<ExternalLink size={13}/></button></header>
      <section className="content">
        <div className="greeting"><div><div className="eyebrow">ТВОЯ МУЗЫКА · ТВОЁ ПРОСТРАНСТВО</div><h1>{track?.name||"С возвращением."}</h1><p>{track?artist:"Подключи Spotify, чтобы начать слушать."}</p></div><div className="hero-orb"><Disc3 size={76} strokeWidth={1}/></div></div>
        <div className="section-title"><div><span className="eyebrow">СОСТОЯНИЕ ПОДКЛЮЧЕНИЯ</span><h2>{status}</h2></div></div>
        <div className="notice"><Radio size={18}/><div><strong>{ready?"Управление плеером активно":"Официальный Spotify Web Player"}</strong><span>{ready?"Управляй воспроизведением здесь. Сам Spotify работает в отдельном окне Edge или Chrome.":"Нажми «Подключить Spotify». Откроется Edge или Chrome с отдельным профилем Orpheon. Войди на официальном сайте Spotify. Поддерживается бесплатный аккаунт; реклама Spotify остаётся."}</span></div></div>
        {error&&<div className="error-notice">{error}</div>}
        {query&&<div className="hint">Поиск по каталогу будет добавлен после проверки управления плеером. Сейчас используй поиск в окне Spotify.</div>}
      </section>
    </main>
    <footer className="player">
      <div className="now-playing">{track?.image?<img className="cover-img" src={track.image}/>:<div className="cover violet"><Disc3 size={20}/></div>}<div className="track-meta"><strong>{track?.name||"Ничего не играет"}</strong><small>{artist||"Подключи Spotify"}</small></div><button className="icon-btn" title="Добавить в медиатеку" disabled={!ready||!track?.uri} onClick={()=>track?.uri&&command("library.add",{uris:[track.uri]})}><Heart size={17}/></button></div>
      <div className="transport"><div className="controls"><button className="icon-btn" title="Перемешать" disabled={!ready} onClick={()=>command("player.setShuffle",{on:!player.shuffle})}><Shuffle size={17}/></button><button className="icon-btn" title="Предыдущий трек" disabled={!ready} onClick={()=>command("player.previous")}><SkipBack size={19}/></button><button className="play-btn" title="Воспроизвести / пауза" disabled={!ready} onClick={()=>command(player.isPaused?"player.resume":"player.pause")} >{player.isPaused?<Play size={19} fill="currentColor"/>:<Pause size={19} fill="currentColor"/>}</button><button className="icon-btn" title="Следующий трек" disabled={!ready} onClick={()=>command("player.next")}><SkipForward size={19}/></button><button className="icon-btn" title="Повтор" disabled={!ready} onClick={()=>command("player.setRepeat",{mode:((player.repeat||0)+1)%3})}><Repeat2 size={17}/></button></div><div className="progress"><span>{fmt(player.positionMs)}</span><div className="progress-line" onClick={e=>{if(!ready||!player.durationMs)return;const r=e.currentTarget.getBoundingClientRect();void command("player.seek",{positionMs:Math.round((e.clientX-r.left)/r.width*player.durationMs)});}}><i style={{width:pct+"%"}}/></div><span>{fmt(player.durationMs)}</span></div></div>
      <div className="player-extra"><button className="icon-btn" title="Устройство вывода"><MonitorSpeaker size={17}/></button><button className="icon-btn" title="Громкость"><Volume2 size={18}/></button><div className="volume-line"><i style={{width:"70%"}}/></div></div>
    </footer>
  </div>;
}
