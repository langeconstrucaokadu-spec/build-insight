import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Category = Database["public"]["Tables"]["project_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["project_subcategories"]["Row"];
type Item = Database["public"]["Tables"]["project_items"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  isAdmin: boolean;
  categories: Category[];
  subcategories: Subcategory[];
  items: Item[];
  onChanged: () => void;
};

const CategoryManagerDialog = ({ open, onOpenChange, projectId, isAdmin, categories, subcategories, items, onChanged }: Props) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newSubFor, setNewSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");

  useEffect(() => { if (!open) { setEditingCat(null); setEditingSub(null); setNewCatName(""); setNewSubFor(null); setNewSubName(""); } }, [open]);

  const dupCat = (n: string, ignoreId?: string) => categories.some((c) => c.id !== ignoreId && c.name.trim().toLowerCase() === n.toLowerCase());
  const dupSub = (catId: string, n: string, ignoreId?: string) => subcategories.some((s) => s.id !== ignoreId && s.category_id === catId && s.name.trim().toLowerCase() === n.toLowerCase());

  const createCat = async () => {
    const n = newCatName.trim();
    if (!n) return toast.error("Informe o nome.");
    if (dupCat(n)) return toast.error("Já existe uma categoria com esse nome.");
    const { error } = await supabase.from("project_categories").insert({ project_id: projectId, name: n });
    if (error) return toast.error(error.message);
    toast.success("Categoria criada.");
    setNewCatName(""); onChanged();
  };

  const saveCat = async (id: string) => {
    const n = editName.trim();
    if (!n) return toast.error("Nome obrigatório.");
    if (dupCat(n, id)) return toast.error("Nome já em uso.");
    const { error } = await supabase.from("project_categories").update({ name: n }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingCat(null); onChanged();
  };

  const deleteCat = async (id: string) => {
    const hasSubs = subcategories.some((s) => s.category_id === id);
    const hasItems = items.some((i) => i.category_id === id);
    if (hasSubs || hasItems) return toast.error("Remova subcategorias e itens vinculados antes de excluir.");
    if (!confirm("Excluir categoria?")) return;
    const { error } = await supabase.from("project_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída."); onChanged();
  };

  const createSub = async (catId: string) => {
    const n = newSubName.trim();
    if (!n) return toast.error("Informe o nome.");
    if (dupSub(catId, n)) return toast.error("Já existe subcategoria com esse nome.");
    const { error } = await supabase.from("project_subcategories").insert({ project_id: projectId, category_id: catId, name: n });
    if (error) return toast.error(error.message);
    toast.success("Subcategoria criada.");
    setNewSubFor(null); setNewSubName(""); onChanged();
  };

  const saveSub = async (id: string, catId: string) => {
    const n = editName.trim();
    if (!n) return toast.error("Nome obrigatório.");
    if (dupSub(catId, n, id)) return toast.error("Nome já em uso.");
    const { error } = await supabase.from("project_subcategories").update({ name: n }).eq("id", id);
    if (error) return toast.error(error.message);
    setEditingSub(null); onChanged();
  };

  const deleteSub = async (id: string) => {
    const hasItems = items.some((i) => i.subcategory_id === id);
    if (hasItems) return toast.error("Remova os itens vinculados antes de excluir.");
    if (!confirm("Excluir subcategoria?")) return;
    const { error } = await supabase.from("project_subcategories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subcategoria excluída."); onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Gerenciar categorias</DialogTitle></DialogHeader>

        {isAdmin && (
          <div className="flex gap-2">
            <input className="auth-field flex-1" placeholder="Nova categoria" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
            <Button variant="construction" size="sm" onClick={createCat}><Plus className="size-4" /> Criar</Button>
          </div>
        )}

        <div className="mt-2 grid gap-2 max-h-[60vh] overflow-y-auto">
          {categories.map((c) => {
            const subs = subcategories.filter((s) => s.category_id === c.id);
            const isOpen = expanded[c.id];
            return (
              <div key={c.id} className="rounded-md border border-border">
                <div className="flex items-center gap-2 p-2">
                  <button onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))} className="text-muted-foreground">
                    {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                  {editingCat === c.id ? (
                    <>
                      <input className="auth-field flex-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <Button size="icon" variant="outline" onClick={() => saveCat(c.id)}><Check className="size-3" /></Button>
                      <Button size="icon" variant="outline" onClick={() => setEditingCat(null)}><X className="size-3" /></Button>
                    </>
                  ) : (
                    <>
                      <strong className="flex-1">{c.name}</strong>
                      <span className="text-xs text-muted-foreground">{subs.length} sub · {items.filter((i) => i.category_id === c.id).length} itens</span>
                      {isAdmin && <>
                        <Button size="icon" variant="outline" onClick={() => { setEditingCat(c.id); setEditName(c.name); }}><Pencil className="size-3" /></Button>
                        <Button size="icon" variant="outline" onClick={() => deleteCat(c.id)}><Trash2 className="size-3" /></Button>
                      </>}
                    </>
                  )}
                </div>
                {isOpen && (
                  <div className="border-t border-border p-2 grid gap-2 bg-secondary/20">
                    {subs.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-2">
                        {editingSub === s.id ? (
                          <>
                            <input className="auth-field flex-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            <Button size="icon" variant="outline" onClick={() => saveSub(s.id, c.id)}><Check className="size-3" /></Button>
                            <Button size="icon" variant="outline" onClick={() => setEditingSub(null)}><X className="size-3" /></Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">↳ {s.name}</span>
                            <span className="text-xs text-muted-foreground">{items.filter((i) => i.subcategory_id === s.id).length} itens</span>
                            {isAdmin && <>
                              <Button size="icon" variant="outline" onClick={() => { setEditingSub(s.id); setEditName(s.name); }}><Pencil className="size-3" /></Button>
                              <Button size="icon" variant="outline" onClick={() => deleteSub(s.id)}><Trash2 className="size-3" /></Button>
                            </>}
                          </>
                        )}
                      </div>
                    ))}
                    {isAdmin && (
                      newSubFor === c.id ? (
                        <div className="flex gap-2 px-2">
                          <input className="auth-field flex-1" placeholder="Nome da subcategoria" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} />
                          <Button size="sm" variant="construction" onClick={() => createSub(c.id)}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => { setNewSubFor(null); setNewSubName(""); }}>Cancelar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="w-fit ml-2" onClick={() => { setNewSubFor(c.id); setNewSubName(""); }}>
                          <Plus className="size-3" /> Nova subcategoria
                        </Button>
                      )
                    )}
                    {!subs.length && newSubFor !== c.id && <p className="px-2 text-xs text-muted-foreground">Nenhuma subcategoria.</p>}
                  </div>
                )}
              </div>
            );
          })}
          {!categories.length && <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManagerDialog;