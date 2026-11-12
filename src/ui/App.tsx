import { useState } from "react";
import {
  Home, Search, Library, ListMusic, Heart, Clock3, Plus,
  ChevronLeft, ChevronRight, MoreHorizontal, Play, Pause,
  SkipBack, SkipForward, Shuffle, Repeat2, Volume2, MonitorSpeaker,
  Download, Settings, Disc3, Radio, Headphones, LogIn
} from "lucide-react";

const tracks = [
  { title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming", time: "4:03", color: "violet" },
  { title: "After Dark", artist: "Mr.Kitty", album: "Time", time: "4:04", color: "blue" },
  { title: "The Perfect Girl", artist: "Mareux", album: "The Perfect Girl", time: "3:14", color: "pink" },
  { title: "Resonance", artist: "HOME", album: "Odyssey", time: "3:32", color: "amber" },
  { title: "A Real Hero", artist: "College & Electric Youth", album: "A Real Hero", time: "4:27", color: "green" }
];

export default function App() {
  const [active, setActive] = useState("Главная");
  const [playing] = useState(false);
  const [query, setQuery] = useState("");

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Disc3 size={22}/></div><span>orpheon<span className="brand-sub">WINDOWS</span></span></div>
      <div className="nav-group">
        <button className={active === "Главная" ? "nav active" : "nav"} onClick={() => setActive("Главная")}><Home/>Главная</button>
        <button className={active === "Поиск" ? "nav active" : "nav"} onClick={() => setActive("Поиск")}><Search/>Поиск</button>
        <button className={active === "Медиатека" ? "nav active" : "nav"} onClick={() => setActive("Медиатека")}><Library/>Медиатека</button>
      </div>
      <div className="library-head"><span>ТВОЯ КОЛЛЕКЦИЯ</span><button className="icon-btn"><Plus size={17}/></button></div>
      <button className="nav"><Heart/>Любимые треки</button>
      <button className="nav"><Clock3/>Недавно прослушано</button>
      <button className="nav"><ListMusic/>Плейлисты</button>
      <div className="sidebar-bottom">
        <div className="connection"><span className="status-dot"/>ДЕМО-ИНТЕРФЕЙС<span>v0.1</span></div>
        <button className="nav"><Download/>Загрузки</button>
        <button className="nav"><Settings/>Настройки</button>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar">
        <div className="history"><button className="icon-btn"><ChevronLeft/></button><button className="icon-btn"><ChevronRight/></button></div>
        <div className="search-wrap"><Search size={17}/><input value={query} onChange={e => {setQuery(e.target.value); setActive("Поиск");}} placeholder="Что хочешь послушать?"/></div>
        <button className="login-btn" onClick={() => { void (window.orpheonDesktop?.openSpotify() ?? Promise.resolve({ opened: false })); }}><LogIn size={16}/>Запустить Spotify</button>
      </header>
      <section className="content">
        <div className="greeting"><div><div className="eyebrow">ТВОЯ МУЗЫКА · ТВОЁ ПРОСТРАНСТВО</div><h1>{active === "Поиск" ? "Поиск музыки" : active === "Медиатека" ? "Твоя медиатека" : "С возвращением."}</h1><p>Тёмный режим. Чистый звук. Ничего лишнего.</p></div><div className="hero-orb"><Disc3 size={76} strokeWidth={1}/></div></div>
        <div className="section-title"><div><span className="eyebrow">ПОДБОРКА</span><h2>{query ? "Результаты поиска" : "Треки для настроения"}</h2></div><button className="text-btn">Показать всё <ChevronRight size={15}/></button></div>
        <div className="track-table">
          <div className="track-header"><span>#</span><span>НАЗВАНИЕ</span><span>АЛЬБОМ</span><span><Clock3 size={15}/></span></div>
          {tracks.filter(t => !query || (t.title + t.artist + t.album).toLowerCase().includes(query.toLowerCase())).map((track, i) => <div className="track-row" key={track.title}>
            <span className="track-number">{String(i + 1).padStart(2, "0")}</span>
            <div className="track-name"><div className={"cover " + track.color}><Disc3 size={20}/></div><div><strong>{track.title}</strong><small>{track.artist}</small></div></div>
            <span className="album-name">{track.album}</span><span className="track-time">{track.time}</span>
          </div>)}
        </div>
        <div className="notice"><Radio size={18}/><div><strong>Подключение Spotify</strong><span>Нажми «Запустить Spotify», чтобы открыть отдельное окно сервиса. Вход выполняй только на официальной странице Spotify. Список треков выше пока демонстрационный; управление воспроизведением и синхронизация библиотеки ещё разрабатываются.</span></div></div>
      </section>
    </main>
    <footer className="player">
      <div className="now-playing"><div className="cover violet"><Disc3 size={20}/></div><div><strong>Ничего не играет</strong><small>Подключение Spotify ещё не настроено</small></div><button className="icon-btn"><Heart size={17}/></button></div>
      <div className="transport"><div className="controls"><button className="icon-btn"><Shuffle size={17}/></button><button className="icon-btn"><SkipBack size={19}/></button><button className="play-btn" title="Управление воспроизведением появится после интеграции плеера" disabled><Play size={19} fill="currentColor"/></button><button className="icon-btn"><SkipForward size={19}/></button><button className="icon-btn"><Repeat2 size={17}/></button></div><div className="progress"><span>0:00</span><div className="progress-line"><i/></div><span>0:00</span></div></div>
      <div className="player-extra"><button className="icon-btn"><MonitorSpeaker size={17}/></button><button className="icon-btn"><Volume2 size={18}/></button><div className="volume-line"><i/></div><button className="icon-btn"><MoreHorizontal size={19}/></button></div>
    </footer>
  </div>;
}