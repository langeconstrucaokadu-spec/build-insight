import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, ArrowRight, CheckCircle2, Clock3, HardHat, Mail, MapPin, Menu, Phone, ShieldCheck, Smartphone, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import heroImage from "@/assets/construction-hero.jpg";
import langeLogo from "@/assets/lange-logo.jpeg";
import jefersonImage from "@/assets/jeferson-lange.jpeg";
import { demoProjects, statusLabels } from "@/data/demo";
import { WhatsAppButton } from "./WhatsAppButton";

type Project = Database["public"]["Tables"]["construction_projects"]["Row"];

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Sobre", href: "#sobre" },
  { label: "Fundador", href: "#fundador" },
  { label: "Obras", href: "#obras" },
  { label: "Portfólio", href: "#portfolio" },
  { label: "Contato", href: "#contato" },
];

const differentiators = [
  { icon: ShieldCheck, title: "Governança técnica", text: "Processos documentados, rastreabilidade e acompanhamento executivo de cada etapa." },
  { icon: Clock3, title: "Cronograma visível", text: "Planejamento de obra com status, progresso e previsão de entrega sempre atualizados." },
  { icon: Smartphone, title: "Cliente conectado", text: "Relatórios, fotos, vídeos e histórico da obra disponíveis em uma área privada." },
];

const values = ["Segurança operacional", "Transparência com clientes", "Precisão no planejamento", "Qualidade construtiva"];

const projectImage = (project: Project | (typeof demoProjects)[number]) => ("cover_image_url" in project ? project.cover_image_url : project.image) || "/placeholder.svg";

const PublicSite = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase
      .from("construction_projects")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjects(data ?? []));
  }, []);

  const ongoing = useMemo(() => projects.filter((project) => project.status !== "completed").slice(0, 3), [projects]);
  const portfolio = useMemo(() => projects.filter((project) => project.is_portfolio || project.status === "completed").slice(0, 6), [projects]);
  const showDemo = !projects.length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="Lange Construções — voltar ao início">
            <img src={langeLogo} alt="Logo Lange Construções" className="size-12 rounded-lg object-contain bg-white p-1 shadow-soft md:size-14" />
            <span className="font-display text-lg font-bold tracking-normal md:text-xl">Lange Construções</span>
          </a>
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => <a key={item.href} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground" href={item.href}>{item.label}</a>)}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Button asChild variant="outline"><Link to="/login">Área do cliente</Link></Button>
            <Button asChild variant="construction"><a href="#contato">Solicitar contato</a></Button>
          </div>
          <button className="inline-flex size-11 items-center justify-center rounded-lg border border-border lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir menu">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-background px-5 py-4 lg:hidden">
            <nav className="grid gap-3">
              {navItems.map((item) => <a key={item.href} className="rounded-lg px-3 py-2 font-semibold hover:bg-muted" href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
              <Button asChild variant="construction"><Link to="/login">Área do cliente</Link></Button>
            </nav>
          </div>
        )}
      </header>

      <section id="home" className="relative min-h-[92vh] overflow-hidden pt-20">
        <img src={heroImage} alt="Obra moderna em construção com guindastes ao pôr do sol" width={1600} height={960} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto flex min-h-[calc(92vh-5rem)] max-w-7xl items-end px-5 pb-14 pt-28 lg:px-8">
          <div className="max-w-3xl animate-enter-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-hero-foreground/25 bg-hero-foreground/10 px-4 py-2 text-sm font-semibold text-hero-foreground backdrop-blur-md"><HardHat className="size-4" /> Gestão transparente de obras</span>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] text-hero-foreground md:text-7xl">Lange Construções</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-hero-foreground/85 md:text-xl">25 anos construindo obras residenciais e comerciais com qualidade, prazo e total transparência. Acompanhe cada etapa em uma área exclusiva para clientes.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl" variant="hero"><a href="#obras">Ver obras em andamento <ArrowRight className="size-5" /></a></Button>
              <Button asChild size="xl" variant="heroOutline"><Link to="/login">Entrar no sistema</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section id="sobre" className="border-b border-border bg-surface py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div><p className="section-kicker">Sobre a empresa</p><h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Execução civil com método, presença e prestação de contas.</h2></div>
          <div className="space-y-7 text-lg leading-8 text-muted-foreground">
            <p>A Lange Construções une 25 anos de experiência em engenharia civil a uma experiência de acompanhamento simples e transparente para clientes. Cada obra é conduzida com rotina técnica, documentação por etapa e comunicação objetiva.</p>
            <div className="grid gap-3 sm:grid-cols-2">{values.map((value) => <div key={value} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-soft"><CheckCircle2 className="size-5 text-accent" /><span className="font-semibold text-card-foreground">{value}</span></div>)}</div>
          </div>
        </div>
      </section>

      <section id="fundador" className="border-b border-border bg-background py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-accent/30 to-primary/20 blur-2xl" aria-hidden="true" />
            <img
              src={jefersonImage}
              alt="Jeferson Lange, fundador da Lange Construções"
              loading="lazy"
              className="relative aspect-[4/5] w-full rounded-2xl object-cover shadow-elevated"
            />
            <div className="relative mt-4 rounded-lg border border-border bg-card p-4 text-center shadow-soft">
              <p className="font-display text-xl font-bold">Jeferson Lange</p>
              <p className="text-sm font-semibold text-muted-foreground">Fundador & Diretor Técnico</p>
            </div>
          </div>
          <div className="space-y-6">
            <p className="section-kicker">Quem está à frente</p>
            <h2 className="font-display text-4xl font-bold md:text-5xl">25 anos transformando projetos em obras concretas.</h2>
            <div className="space-y-5 text-lg leading-8 text-muted-foreground">
              <p>À frente da Lange Construções, <strong className="text-foreground">Jeferson Lange</strong> acumula mais de duas décadas e meia de atuação na construção civil, conduzindo pessoalmente obras residenciais e comerciais de pequeno, médio e grande porte.</p>
              <p>Sua trajetória é marcada pela presença em obra, pela proximidade com cada cliente e por uma gestão técnica rigorosa — entregando projetos no prazo, dentro do orçamento e com o acabamento que se espera de uma construção feita para durar.</p>
              <p>É essa visão de longo prazo que sustenta o crescimento da empresa: equipes próprias bem treinadas, fornecedores de confiança e um padrão de qualidade que faz a Lange Construções ser indicada de cliente para cliente.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5 text-center shadow-soft">
                <Award className="mx-auto size-7 text-accent" />
                <p className="mt-3 font-display text-3xl font-bold">25+</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">anos de mercado</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 text-center shadow-soft">
                <Users className="mx-auto size-7 text-accent" />
                <p className="mt-3 font-display text-3xl font-bold">100%</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">acompanhamento direto</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 text-center shadow-soft">
                <ShieldCheck className="mx-auto size-7 text-accent" />
                <p className="mt-3 font-display text-3xl font-bold">Res. & Com.</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">obras especializadas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl"><p className="section-kicker">Diferenciais</p><h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Gestão que reduz ruído e aumenta previsibilidade.</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{differentiators.map((item) => <article key={item.title} className="group rounded-lg border border-border bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"><span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105"><item.icon className="size-6" /></span><h3 className="mt-6 font-display text-2xl font-bold">{item.title}</h3><p className="mt-3 leading-7 text-muted-foreground">{item.text}</p></article>)}</div>
        </div>
      </section>

      <section id="obras" className="bg-muted py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div className="max-w-2xl"><p className="section-kicker">Obras em andamento</p><h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Acompanhe os projetos atuais.</h2></div><Button asChild variant="outline"><Link to="/login">Acessar área do cliente</Link></Button></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{(showDemo ? demoProjects.filter((p) => p.status !== "completed") : ongoing).map((project) => <article key={project.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"><div className="aspect-[16/10] overflow-hidden bg-secondary"><img src={projectImage(project)} alt={`Foto de capa da obra ${project.name}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" /></div><div className="p-6"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl font-bold">{project.name}</h3><span className="status-pill">{statusLabels[project.status]}</span></div><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><MapPin className="size-4" /> {project.location}</p><p className="mt-4 leading-7 text-muted-foreground">{project.description}</p><div className="mt-5 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-progress" style={{ width: `${project.progress}%` }} /></div></div></article>)}</div>
        </div>
      </section>

      <section id="portfolio" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="section-kicker">Portfólio</p><h2 className="mt-3 max-w-3xl font-display text-4xl font-bold md:text-5xl">Obras finalizadas com documentação, acabamento e pós-obra.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(portfolio.length ? portfolio : demoProjects.filter((p) => p.status === "completed")).map((project) => <article key={project.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary shadow-soft"><img src={projectImage(project)} alt={`Galeria da obra ${project.name}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gallery-overlay" /><div className="absolute inset-x-0 bottom-0 p-5 text-hero-foreground"><h3 className="font-display text-2xl font-bold">{project.name}</h3><p className="mt-1 text-sm font-semibold text-hero-foreground/80">{project.location}</p></div></article>)}</div>
        </div>
      </section>

      <section id="contato" className="bg-foreground py-20 text-background lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="font-bold uppercase tracking-[0.2em] text-accent">Contato</p>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Vamos planejar sua próxima obra?</h2>
            <div className="mt-8 grid gap-4 text-background/80">
              <p className="flex items-center gap-3"><Phone className="size-5 text-accent" /> (47) 3333-2026</p>
              <p className="flex items-center gap-3"><Mail className="size-5 text-accent" /> contato@langeconstrucoes.com.br</p>
              <p className="flex items-center gap-3"><MapPin className="size-5 text-accent" /> Av. das Obras, 1200 — Joinville, SC</p>
            </div>
            <div className="mt-10 flex items-center gap-3 border-t border-background/20 pt-6">
              <img src={langeLogo} alt="Logo Lange Construções" className="size-12 rounded-lg bg-white object-contain p-1" />
              <div>
                <p className="font-display text-lg font-bold">Lange Construções</p>
                <p className="text-sm text-background/60">© {new Date().getFullYear()} — Todos os direitos reservados</p>
              </div>
            </div>
          </div>
          <form className="grid gap-4 rounded-lg border border-background/20 bg-background/8 p-6 backdrop-blur-md" onSubmit={(event) => event.preventDefault()}><input className="form-field" placeholder="Nome" aria-label="Nome" /><input className="form-field" placeholder="Email" aria-label="Email" type="email" /><input className="form-field" placeholder="Telefone" aria-label="Telefone" /><textarea className="form-field min-h-32" placeholder="Conte brevemente sobre o projeto" aria-label="Mensagem" /><Button type="submit" variant="hero" size="lg">Enviar mensagem</Button><div className="min-h-40 rounded-lg border border-background/20 bg-map-pattern p-5 text-sm font-semibold text-background/70">Mapa de localização</div></form>
        </div>
      </section>

      <WhatsAppButton />
    </main>
  );
};

export default PublicSite;
