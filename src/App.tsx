import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Maximize,
  Minimize,
  Mountain,
  Search,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { beasts } from "./data/beasts";
import type { Beast } from "./data/beasts";
import { Soundscape } from "./lib/audio";
import assetStatus from "./generated/asset-status.json";

const assetReviews: Record<string, { anatomy: string; review: string }> = assetStatus;

const BeastViewer = lazy(() => import("./components/BeastViewer"));
const categories = ["全部", "神祇", "龙蛇", "翼兽", "灵兽", "水族"] as const;
type Page = "exhibit" | "catalog" | "favorites";

function readFavorites(): string[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("shj-favorites") ?? "[]",
    );
    return Array.isArray(saved)
      ? saved.filter(
          (id): id is string =>
            typeof id === "string" && beasts.some((beast) => beast.id === id),
        )
      : [];
  } catch {
    return [];
  }
}

function initialBeast() {
  const id = new URLSearchParams(window.location.search).get("beast");
  return beasts.find((beast) => beast.id === id) ?? beasts[0];
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s/g, "")
    .toLocaleLowerCase();
}

function BeastImage({
  beast,
  className = "",
}: {
  beast: Beast;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className={`image-fallback ${className}`} aria-hidden="true">
      {beast.name[0]}
    </span>
  ) : (
    <img
      className={className}
      src={beast.preview}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function App() {
  const [beast, setBeast] = useState(initialBeast);
  const [page, setPage] = useState<Page>("exhibit");
  const [favorites, setFavorites] = useState(readFavorites);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("全部");
  const [soundOn, setSoundOn] = useState(false);
  const [soundBusy, setSoundBusy] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [fullScreen, setFullScreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [toast, setToast] = useState("");
  const audio = useRef<Soundscape | null>(null);
  const dossier = useRef<HTMLDialogElement>(null);
  const infoTrigger = useRef<HTMLButtonElement>(null);
  const selectedThumb = useRef<HTMLButtonElement>(null);
  const currentIndex = beasts.findIndex((item) => item.id === beast.id);
  const saved = favorites.includes(beast.id);
  const assetReview = assetReviews[beast.id];

  useEffect(() => {
    const engine = new Soundscape();
    audio.current = engine;
    return () => {
      engine.dispose();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    audio.current?.setBeast(beast.id, beast.category);
    const url = new URL(window.location.href);
    url.searchParams.set("beast", beast.id);
    window.history.replaceState(null, "", url);
    document.title = `${beast.name} · 山海经异兽图鉴`;
    selectedThumb.current?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [beast, reducedMotion]);

  useEffect(() => {
    audio.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const listener = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        page !== "exhibit" ||
        dossier.current?.open ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        /INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName)
      )
        return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setBeast(
        beasts[
          (currentIndex +
            (event.key === "ArrowRight" ? 1 : -1) +
            beasts.length) %
            beasts.length
        ],
      );
      audio.current?.cue("select");
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [currentIndex, page]);

  function selectBeast(next: Beast) {
    setBeast(next);
    setPage("exhibit");
    audio.current?.cue("select");
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem("shj-favorites", JSON.stringify(next));
    } catch {
      setToast("已在本次浏览中收藏；浏览器未允许保存到本机。");
    }
  }

  async function toggleSound() {
    if (soundBusy) return;
    if (soundOn) {
      audio.current?.disable();
      setSoundOn(false);
      return;
    }
    setSoundBusy(true);
    try {
      await audio.current?.enable();
      setSoundOn(true);
    } catch {
      setToast("声音暂时无法开启，请再次点击重试。");
    } finally {
      setSoundBusy(false);
    }
  }

  async function listen() {
    if (soundBusy) return;
    setSoundBusy(true);
    try {
      if (!soundOn) {
        await audio.current?.enable();
        setSoundOn(true);
      }
      audio.current?.cue("roar");
      setToast(`正在聆听 · ${beast.name}`);
    } catch {
      setToast("声音暂时无法播放，请检查浏览器声音权限后重试。");
    } finally {
      setSoundBusy(false);
    }
  }

  async function toggleFullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setToast("当前浏览器不支持全屏，可继续在窗口内观兽。");
    }
  }

  const filtered = beasts.filter((item) => {
    const term = normalizeSearch(query);
    return (
      (page !== "favorites" || favorites.includes(item.id)) &&
      (category === "全部" || item.category === category) &&
      (!term ||
        normalizeSearch(
          `${item.name} ${item.alias} ${item.pinyin} ${item.traits.join(" ")}`,
        ).includes(term))
    );
  });

  return (
    <div
      className={`app ${page === "exhibit" ? "exhibition-app" : "library-app"}`}
      data-reduced-motion={reducedMotion}
    >
      <a className="skip-link" href="#main">
        跳至主要内容
      </a>
      <header className="masthead">
        <button
          className="brand"
          aria-label="山海经，返回观兽"
          onClick={() => setPage("exhibit")}
        >
          <img src="/seal.svg" alt="" />
          <span className="brand-title">
            山海经
            <span className="brand-en">THE CLASSIC OF MOUNTAINS & SEAS</span>
          </span>
        </button>
        <nav className="main-nav" aria-label="主导航">
          <button
            className={page === "exhibit" ? "active" : ""}
            aria-current={page === "exhibit" ? "page" : undefined}
            onClick={() => setPage("exhibit")}
          >
            观兽<span>EXPLORE</span>
          </button>
          <button
            className={page === "catalog" ? "active" : ""}
            aria-current={page === "catalog" ? "page" : undefined}
            onClick={() => {
              setPage("catalog");
              setQuery("");
              setCategory("全部");
            }}
          >
            异兽图鉴<span>BESTIARY</span>
          </button>
          <button
            className={page === "favorites" ? "active" : ""}
            aria-current={page === "favorites" ? "page" : undefined}
            onClick={() => {
              setPage("favorites");
              setQuery("");
              setCategory("全部");
            }}
          >
            我的收藏<span>COLLECTION</span>
          </button>
        </nav>
        <div className="header-tools">
          <button
            className={`icon-button sound-toggle ${soundOn ? "is-active" : ""}`}
            aria-label={soundOn ? "关闭声景" : "开启声景"}
            aria-pressed={soundOn}
            aria-busy={soundBusy}
            disabled={soundBusy}
            title={soundOn ? "关闭声景" : "开启声景"}
            onClick={() => {
              void toggleSound();
            }}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundOn ? "声景已开启" : "开启声景"}</span>
          </button>
          <details className="settings">
            <summary aria-label="体验设置" title="体验设置">
              <SlidersHorizontal size={17} />
            </summary>
            <div className="settings-panel">
              <label htmlFor="volume">
                声景音量 <span>{Math.round(volume * 100)}%</span>
              </label>
              <input
                id="volume"
                aria-label="声景音量"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setVolume(value);
                  audio.current?.setVolume(value);
                }}
              />
              <label className="motion-setting">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(event) => setReducedMotion(event.target.checked)}
                />
                减少动态效果
              </label>
              <p>声音默认关闭。收藏仅保存在当前浏览器。</p>
            </div>
          </details>
          <button
            className="icon-button fullscreen-button"
            aria-label={fullScreen ? "退出全屏" : "全屏观兽"}
            title={fullScreen ? "退出全屏" : "全屏观兽"}
            onClick={() => {
              void toggleFullScreen();
            }}
          >
            {fullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {page === "exhibit" ? (
        <main id="main" className="exhibit">
          <div className="landscape" aria-hidden="true">
            <div className="ground-mist" />
          </div>
          <section
            className="beast-intro"
            key={beast.id}
            aria-label={`${beast.name}简介`}
          >
            <h1>{beast.name}</h1>
            <p className="beast-pinyin">{beast.pinyin.toUpperCase()}</p>
            <div className="beast-classification">
              <span>{beast.category}</span>
              <i />
              {beast.title}
            </div>
            <p className="beast-description">{beast.description}</p>
            <div className="trait-list">
              {beast.traits.slice(0, 3).map((trait) => (
                <span key={trait}>{trait}</span>
              ))}
            </div>
            <div className="intro-actions">
              <button
                className="primary-button"
                ref={infoTrigger}
                onClick={() => dossier.current?.showModal()}
              >
                <BookOpen size={17} />
                展开异兽志
                <ArrowRight size={17} />
              </button>
              <button
                className={`save-button ${saved ? "saved" : ""}`}
                aria-label={
                  saved ? `取消收藏${beast.name}` : `收藏${beast.name}`
                }
                aria-pressed={saved}
                title={saved ? "取消收藏" : "收藏此兽"}
                onClick={() => toggleFavorite(beast.id)}
              >
                <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
            <button
              className="listen-button"
              aria-busy={soundBusy}
              disabled={soundBusy}
              onClick={() => {
                void listen();
              }}
            >
              <Headphones size={15} />
              <span>聆听兽鸣</span>
              <span className="audio-wave" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </button>
          </section>
          <div className="specimen-stage">
            <Suspense
              fallback={
                <div className="viewer-state" role="status">
                  展厅正在开启…
                </div>
              }
            >
              <BeastViewer
                key={`${beast.id}-${reducedMotion}`}
                beast={beast}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </div>
          <aside className="vertical-poem" aria-hidden="true">
            <span>山海有灵</span>
            <span>万物有形</span>
            <span className="poem-seal">观</span>
          </aside>
          <div className="habitat-note">
            <Mountain size={16} />
            <span>{beast.habitat}</span>
            <span className="habitat-caption">想象栖境</span>
          </div>
          <div className="beast-pagination">
            <button
              className="icon-button"
              aria-label="上一只异兽"
              onClick={() =>
                selectBeast(
                  beasts[(currentIndex - 1 + beasts.length) % beasts.length],
                )
              }
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              <b>{beast.number}</b> / 20
            </span>
            <button
              className="icon-button"
              aria-label="下一只异兽"
              onClick={() =>
                selectBeast(beasts[(currentIndex + 1) % beasts.length])
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </main>
      ) : (
        <main id="main" className="catalog-page">
          <div className="catalog-heading">
            <div>
              <button
                className="back-button"
                onClick={() => setPage("exhibit")}
              >
                <ArrowLeft size={16} />
                回到山海
              </button>
              <h1>
                {page === "favorites"
                  ? "藏于心，见于形。"
                  : "山海万象，异兽有灵。"}
              </h1>
              <p>
                {page === "favorites"
                  ? "收藏每一次与上古生灵的相遇。"
                  : "循形而识，闻声而知。二十种异兽，二十种远古想象。"}
              </p>
            </div>
            <span className="catalog-count">
              {String(
                page === "favorites" ? favorites.length : beasts.length,
              ).padStart(2, "0")}
              <small>已{page === "favorites" ? "收藏" : "收录"}</small>
            </span>
          </div>
          <div className="catalog-controls">
            <div className="category-tabs" role="group" aria-label="按种属筛选">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "selected" : ""}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="搜索异兽"
                placeholder="寻兽名、别名、形态…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button aria-label="清空搜索" onClick={() => setQuery("")}>
                  <X size={15} />
                </button>
              )}
            </label>
          </div>
          <p className="results-count" role="status">
            {filtered.length} 种异兽
          </p>
          <div className="beast-grid">
            {filtered.map((item) => (
              <article className="beast-card" key={item.id}>
                <button
                  className="card-main"
                  onClick={() => selectBeast(item)}
                  aria-label={`观察${item.name}`}
                >
                  <div className="card-art">
                    <BeastImage beast={item} />
                    <span className="card-number">{item.number}</span>
                    <span className="card-explore">
                      入境观兽
                      <ArrowRight size={15} />
                    </span>
                  </div>
                  <div className="card-caption">
                    <div>
                      <h2>{item.name}</h2>
                      <p>{item.pinyin}</p>
                    </div>
                    <span>{item.category}</span>
                  </div>
                </button>
                <button
                  className={`card-save ${favorites.includes(item.id) ? "saved" : ""}`}
                  aria-label={
                    favorites.includes(item.id)
                      ? `取消收藏${item.name}`
                      : `收藏${item.name}`
                  }
                  aria-pressed={favorites.includes(item.id)}
                  onClick={() => toggleFavorite(item.id)}
                >
                  <Bookmark
                    size={17}
                    fill={favorites.includes(item.id) ? "currentColor" : "none"}
                  />
                </button>
              </article>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              <BookOpen size={32} strokeWidth={1} />
              <h2>
                {page === "favorites" && favorites.length === 0
                  ? "此卷尚待相遇"
                  : "山海之中，暂未寻见"}
              </h2>
              <p>
                {page === "favorites" && favorites.length === 0
                  ? "观兽时轻点收藏，将心仪的异兽留在这里。"
                  : "试试另一种名字，或放宽种属筛选。"}
              </p>
              <button
                className="primary-button"
                onClick={() => {
                  setQuery("");
                  setCategory("全部");
                  if (page === "favorites") setPage("catalog");
                }}
              >
                {page === "favorites" ? "前往异兽图鉴" : "查看全部异兽"}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          <footer className="catalog-footer">
            <span>形取山海，意生万象。</span>
            <span>依据《山海经异兽建模蓝图》创作演绎</span>
          </footer>
        </main>
      )}

      {page === "exhibit" && (
        <section className="specimen-rail" aria-label="切换异兽">
          <div className="rail-heading">
            <span>山海拾遗</span>
            <button
              onClick={() => {
                setPage("catalog");
                setCategory("全部");
                setQuery("");
              }}
            >
              全览二十兽
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="rail-track">
            {beasts.map((item) => (
              <button
                key={item.id}
                ref={item.id === beast.id ? selectedThumb : undefined}
                className={`rail-item ${item.id === beast.id ? "selected" : ""}`}
                aria-label={`观察${item.name}`}
                aria-current={item.id === beast.id ? "true" : undefined}
                onClick={() => selectBeast(item)}
              >
                <span className="rail-art">
                  <BeastImage beast={item} />
                </span>
                <span className="rail-item-copy">
                  <span>{item.name}</span>
                  <small>{item.category}</small>
                </span>
                <span className="rail-number">{item.number}</span>
              </button>
            ))}
          </div>
          <span className="rail-scroll-hint">
            <ArrowDown size={12} />
            横向探索更多异兽
          </span>
        </section>
      )}

      <dialog
        className="dossier"
        ref={dossier}
        aria-labelledby="dossier-title"
        onClose={() => infoTrigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) dossier.current?.close();
        }}
      >
        <div className="dossier-content">
          <button
            autoFocus
            className="dossier-close icon-button"
            aria-label="关闭异兽志"
            onClick={() => dossier.current?.close()}
          >
            <X size={22} />
          </button>
          <h2 id="dossier-title">{beast.name}</h2>
          <p className="dossier-alias">{beast.alias || beast.title}</p>
          <div className="dossier-rule" />
          <blockquote>{beast.description}</blockquote>
          <section>
            <h3>观其形</h3>
            <p>{beast.appearance}</p>
          </section>
          <section>
            <h3>察其行</h3>
            <p>{beast.behavior}</p>
          </section>
          <section>
            <h3>闻其声</h3>
            <p>{beast.sound}</p>
            <button
              className="text-button"
              onClick={() => {
                void listen();
              }}
            >
              <Headphones size={16} />
              聆听声音演绎
            </button>
          </section>
          <div className="dossier-meta">
            <span>档案编号<strong>{beast.number} / 20</strong></span>
            <span>
              种属<strong>{beast.category}</strong>
            </span>
            <span>
              创作栖境<strong>{beast.habitat}</strong>
            </span>
          </div>
          <p className="source-note">
            本图鉴依据项目《山海经异兽建模蓝图》进行视觉与声音创作，形态、栖境及行为为艺术演绎，非古籍原文或考据结论。
          </p>
          {assetReview?.anatomy === "needs-revision" && (
            <p className="anatomy-note"><strong>造型校对说明</strong>{assetReview.review}</p>
          )}
          <button
            className={`primary-button dossier-save ${saved ? "saved" : ""}`}
            onClick={() => toggleFavorite(beast.id)}
          >
            {saved ? <Check size={17} /> : <Bookmark size={17} />}
            {saved ? "已收入我的收藏" : "收藏此兽"}
          </button>
        </div>
      </dialog>
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
