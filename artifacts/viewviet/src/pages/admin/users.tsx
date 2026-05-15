import { useState } from "react";
import { Link } from "wouter";
import { useGetAdminUsers, useCreateAdminUser, useDeleteAdminUser, useUpdateAdminUserPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, KeyRound, Shield, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsers() {
  const { toast } = useToast();
  const { data: users, isLoading, refetch } = useGetAdminUsers();

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", email: "", password: "", displayName: "" });

  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const createUser = useCreateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const updatePwd = useUpdateAdminUserPassword();

  const handleAdd = async () => {
    if (!addForm.username || !addForm.email || !addForm.password) {
      toast({ title: "请填写必填字段", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({ data: addForm as any });
      toast({ title: "管理员已创建" });
      setShowAdd(false);
      setAddForm({ username: "", email: "", password: "", displayName: "" });
      refetch();
    } catch (err: any) {
      toast({ title: "创建失败", description: err?.response?.data?.error ?? String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`确认删除管理员 "${username}"？此操作不可撤销。`)) return;
    try {
      await deleteUser.mutateAsync({ id } as any);
      toast({ title: "已删除管理员" });
      refetch();
    } catch (err: any) {
      toast({ title: "删除失败", description: err?.response?.data?.error ?? String(err), variant: "destructive" });
    }
  };

  const handlePwdChange = async () => {
    if (!pwdUserId || !newPassword || newPassword.length < 6) {
      toast({ title: "密码至少6位", variant: "destructive" });
      return;
    }
    try {
      await updatePwd.mutateAsync({ id: pwdUserId, data: { newPassword } } as any);
      toast({ title: "密码已修改" });
      setPwdUserId(null);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "修改失败", description: err?.response?.data?.error ?? String(err), variant: "destructive" });
    }
  };

  const userList = users as any[] ?? [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />控制台</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">管理员账户</h1>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />新增管理员
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">所有账户</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : userList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无账户</p>
          ) : (
            <div className="divide-y">
              {userList.map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{u.displayName || u.username}</span>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">{u.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    <p className="text-xs text-muted-foreground">@{u.username} · 创建于 {new Date(u.createdAt).toLocaleDateString("zh-CN")}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setPwdUserId(u.id); setNewPassword(""); }}
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1" />改密码
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 w-8 h-8"
                      onClick={() => handleDelete(u.id, u.username)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add admin dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增管理员</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>用户名 *</Label>
              <Input value={addForm.username} onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))} placeholder="admin2" />
            </div>
            <div className="space-y-1">
              <Label>邮箱 *</Label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="admin2@example.com" />
            </div>
            <div className="space-y-1">
              <Label>显示名称</Label>
              <Input value={addForm.displayName} onChange={e => setAddForm(p => ({ ...p, displayName: e.target.value }))} placeholder="管理员2" />
            </div>
            <div className="space-y-1">
              <Label>初始密码 *（至少6位）</Label>
              <Input type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={createUser.isPending}>
              {createUser.isPending ? "创建中..." : "创建管理员"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={pwdUserId !== null} onOpenChange={open => { if (!open) { setPwdUserId(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1">
            <Label>新密码（至少6位）</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwdUserId(null); setNewPassword(""); }}>取消</Button>
            <Button onClick={handlePwdChange} disabled={updatePwd.isPending}>
              {updatePwd.isPending ? "保存中..." : "保存密码"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
