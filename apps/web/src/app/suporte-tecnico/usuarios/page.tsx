"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supportFetch } from "@/lib/api-browser";

type SupportUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  online: boolean;
  activeSessionCount: number;
};

type SupportUserPatch = Partial<SupportUser> & {
  password?: string;
};

function onlineTone(user: SupportUser): "success" | "neutral" {
  return user.online ? "success" : "neutral";
}

export default function SupportUsersPage() {
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SupportUserPatch>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await supportFetch<SupportUser[]>("/api/v1/support/users");
      setLoading(false);
      if (!res.ok || !res.data) {
        setMessage(res.error ?? "Não foi possível carregar os usuários.");
        return;
      }
      setUsers(res.data);
      if (res.data[0]) {
        setSelectedId(res.data[0].id);
      }
    }
    void load();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [selectedId, users],
  );

  useEffect(() => {
    if (!selectedUser) return;
    setForm({
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      phone: selectedUser.phone,
      role: selectedUser.role,
      isActive: selectedUser.isActive,
      emailVerified: selectedUser.emailVerified,
      password: "",
    });
  }, [selectedUser]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setMessage(null);
    const res = await supportFetch<SupportUser>(`/api/v1/support/users/${selectedUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        isActive: form.isActive,
        emailVerified: form.emailVerified,
        ...(form.password ? { password: form.password } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok || !res.data) {
      setMessage(res.error ?? "Não foi possível atualizar o usuário.");
      return;
    }
    const updated = res.data;
    setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
    setForm((prev) => ({ ...prev, password: "" }));
    setMessage("Usuário atualizado com sucesso.");
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-marinha-500">
          Usuários
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-marinha-900">Usuários do sistema</h1>
      </div>

      {message ? (
        <Card>
          <p className="text-sm text-marinha-700">{message}</p>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-marinha-600">Carregando usuários…</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[380px,1fr]">
          <Card className="rounded-[24px] border border-marinha-900/8 bg-white/92 p-4">
            <div className="space-y-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedId(user.id)}
                  className={`w-full rounded-[20px] border px-4 py-4 text-left transition ${
                    selectedId === user.id
                      ? "border-municipal-600/35 bg-municipal-600/8"
                      : "border-marinha-900/8 bg-surface hover:border-marinha-900/14"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-marinha-900">{user.fullName}</p>
                      <p className="mt-1 text-xs text-marinha-500">{user.email}</p>
                    </div>
                    <Badge tone={onlineTone(user)}>{user.online ? "online" : "offline"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-marinha-500">
                    <span>{user.role}</span>
                    <span>·</span>
                    <span>{user.activeSessionCount} sessão(ões)</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-[24px] border border-marinha-900/8 bg-white/92 p-6">
            {!selectedUser ? (
              <p className="text-sm text-marinha-600">Selecione um usuário para editar.</p>
            ) : (
              <form className="space-y-5" onSubmit={handleSave}>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-marinha-900">{selectedUser.fullName}</h2>
                  <Badge tone={selectedUser.online ? "success" : "neutral"}>
                    {selectedUser.online ? "online" : "offline"}
                  </Badge>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-marinha-800">Nome completo</label>
                    <Input
                      value={String(form.fullName ?? "")}
                      onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-marinha-800">E-mail</label>
                    <Input
                      value={String(form.email ?? "")}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-marinha-800">Telefone</label>
                    <Input
                      value={String(form.phone ?? "")}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-marinha-800">Papel</label>
                    <select
                      value={String(form.role ?? "citizen")}
                      onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                      className="w-full min-h-[44px] rounded-btn border-2 border-marinha-900/12 bg-white px-3 py-2 text-marinha-900 focus:border-municipal-600 focus:outline-none focus:ring-2 focus:ring-municipal-600/25"
                    >
                      {["citizen", "mei", "company", "manager", "admin", "super_admin"].map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-marinha-800">Nova senha</label>
                    <Input
                      type="password"
                      value={String(form.password ?? "")}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Preencha só se quiser trocar"
                    />
                  </div>
                  <div className="rounded-[20px] border border-marinha-900/8 bg-surface px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marinha-500">
                      Último login
                    </p>
                    <p className="mt-2 text-sm text-marinha-700">
                      {selectedUser.lastLogin
                        ? new Date(selectedUser.lastLogin).toLocaleString("pt-BR")
                        : "Nunca acessou"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-5">
                  <label className="inline-flex items-center gap-2 text-sm text-marinha-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form.isActive)}
                      onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    Usuário ativo
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-marinha-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form.emailVerified)}
                      onChange={(event) => setForm((prev) => ({ ...prev, emailVerified: event.target.checked }))}
                    />
                    E-mail verificado
                  </label>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
