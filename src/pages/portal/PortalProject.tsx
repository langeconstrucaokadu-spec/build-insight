import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalApi, portalAuth } from "@/lib/clientPortal";
import { toast } from "sonner";

type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };
type Item = { id: string; name: string; category_id: string; subcategory_id: string | null; status: string; order_index: number; observation: string | null };
type Report = { id: string; title: string; description: string; report_date: string; item_id: string | null; category_id: string | null; subcategory_id: string | null };
type Media = { id: string; file_url: string; description: string | null; item_id: string | null; report_id: string | null; category_id: string | null; subcategory_id: string | null };
type Project = { id: string; name: string; location: string; description: string; progress: number };

const statusLabel: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", finalizada: "Finalizada" };

const PortalProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [media, setMedia] = useState<Media[]>([]);

  useEffect(() => {
    if (!portalAuth.token) {
      const back = window.location.pathname + window.location.hash;
      navigate(`/portal/login?redirect=${encodeURIComponent(back)}`);
      return;
    }
    if (!id) return;
    portalApi.project(id)
      .then((d) => {
        setProject(d.project as Project);
        setCategories(d.categories as Category[]);
        setSubcategories(d.subcategories as Subcategory[]);
        setItems(d.items as Item[]);
        setReports(d.reports as Report[]);
        setMedia(d.media as Media[]);
      })
      .catch((e) => { toast.error((e as Error).message); navigate("/portal"); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Após carregar dados, rola até a âncora (#cat-..., #sub-..., #item-...) se presente
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-primary");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
    }
  }, [loading]);

  const tree = useMemo(() => categories.map((c) => ({
    ...c,
    subs: subcategories.filter((s) => s.category_id === c.id).map((s) => ({
      ...s,
      items: items.filter((i) => i.subcategory_id === s.id).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    })),
    looseItems: items.filter((i) => i.category_id === c.id && !i.subcategory_id),
  })), [categories, subcategories, items]);

  if (loading || !project) return <main className="grid min-h-screen place-items-center bg-dashboard">Carregando…</main>;

  return (
    <main className="min-h-screen bg-dashboard">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <Button asChild variant="ghost" size="sm"><Link to="/portal"><ArrowLeft className="size-4" /> Minhas obras</Link></Button>
            <h1 className="mt-2 font-display text-2xl font-bold">{project.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> {project.location}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <strong className="font-display text-2xl">{project.progress}%</strong>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {project.description && <p className="dashboard-panel text-sm text-muted-foreground">{project.description}</p>}

        {tree.map((c) => (
          <article key={c.id} id={`cat-${c.id}`} className="dashboard-panel scroll-mt-24">
            <h2 className="font-display text-xl font-bold">{c.name}</h2>
            {c.looseItems.map((it) => <ItemBlock key={it.id} item={it} reports={reports} media={media} />)}
            {c.subs.map((s) => (
              <div key={s.id} id={`sub-${s.id}`} className="mt-4 scroll-mt-24">
                <h3 className="font-display text-base font-semibold text-muted-foreground">{s.name}</h3>
                {s.items.length === 0 && <p className="text-xs text-muted-foreground">Sem itens.</p>}
                {s.items.map((it) => <ItemBlock key={it.id} item={it} reports={reports} media={media} />)}
              </div>
            ))}
          </article>
        ))}
        {tree.length === 0 && <div className="dashboard-panel text-center text-muted-foreground">Nenhuma categoria cadastrada ainda.</div>}
      </section>
    </main>
  );
};

const ItemBlock = ({ item, reports, media }: { item: Item; reports: Report[]; media: Media[] }) => {
  const itemReports = reports.filter((r) => r.item_id === item.id);
  const itemMedia = media.filter((m) => m.item_id === item.id);
  return (
    <div id={`item-${item.id}`} className="mt-3 rounded-md border border-border p-4 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{item.name}</strong>
        <span className="status-pill">{statusLabel[item.status] ?? item.status}</span>
      </div>
      {item.observation && <p className="mt-2 text-sm text-muted-foreground">{item.observation}</p>}
      {itemReports.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Relatórios</p>
          {itemReports.map((r) => (
            <div key={r.id} className="rounded border border-border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <strong>{r.title}</strong>
                <span className="text-xs text-muted-foreground">{r.report_date}</span>
              </div>
              {r.description && <p className="mt-1 text-muted-foreground">{r.description}</p>}
            </div>
          ))}
        </div>
      )}
      {itemMedia.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground"><ImageIcon className="inline size-3" /> Fotos</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {itemMedia.map((m) => (
              <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded border border-border">
                <img src={m.file_url} alt={m.description ?? ""} className="size-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalProject;