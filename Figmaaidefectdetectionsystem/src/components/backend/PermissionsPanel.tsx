import { useEffect, useState } from "react";
import { Shield, RefreshCcw, User, Lock, Plus, Save, Trash2, ChevronDown, X } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";
import { toast } from "sonner@2.0.3";
import {
  getUsers,
  getRoles,
  getPolicies,
  createUser,
  updateUser,
  deleteUser,
  createRole,
  updateRole,
  deleteRole,
  createPolicy,
  updatePolicy,
  deletePolicy,
  type AdminUser,
} from "../../api/admin";

export const PermissionsPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [policies, setPolicies] = useState<AdminPolicy[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "policies">(
    "users",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 用于内联新增的临时状态
  const [showAddRow, setShowAddRow] = useState(false);

  const [userPasswords, setUserPasswords] = useState<Record<number, string>>({});
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    roles: [] as string[],
    is_active: true,
    is_superuser: false,
  });
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [newPolicy, setNewPolicy] = useState({
    ptype: "p",
    v0: "",
    v1: "",
    v2: "",
    v3: "",
    v4: "",
    v5: "",
  });

  const loadAll = async () => {
    setIsRefreshing(true);
    try {
      const [usersData, rolesData, policiesData] = await Promise.all([
        getUsers(),
        getRoles(),
        getPolicies(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPolicies(policiesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "加载权限数据失败";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const roleOptions = roles.map((role) => role.name);
  const formatRoles = (items: string[]) =>
    items.length > 0 ? items.join(", ") : "请选择角色";

  const RoleDropdown: React.FC<{
    value: string[];
    onChange: (next: string[]) => void;
  }> = ({ value, onChange }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="truncate">{formatRoles(value)}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {roleOptions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            暂无角色
          </div>
        ) : (
          roleOptions.map((role) => (
            <DropdownMenuCheckboxItem
              key={role}
              checked={value.includes(role)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...value, role]);
                } else {
                  onChange(value.filter((item) => item !== role));
                }
              }}
            >
              {role}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleUserChange = (id: number, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  };

  const handleSaveUser = async (user: AdminUser) => {
    try {
      const password = userPasswords[user.id]?.trim() || undefined;
      const updated = await updateUser(user.id, {
        username: user.username,
        roles: user.roles,
        is_active: user.is_active,
        is_superuser: user.is_superuser,
        password,
      });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
      setUserPasswords((prev) => ({ ...prev, [user.id]: "" }));
      toast.success("用户已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新用户失败";
      toast.error(message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      toast.error("用户名和密码不能为空");
      return;
    }
    try {
      const item = await createUser({
        username: newUser.username.trim(),
        password: newUser.password,
        roles: newUser.roles,
        is_active: newUser.is_active,
        is_superuser: newUser.is_superuser,
      });
      setUsers((prev) => [item, ...prev]);
      setNewUser({
        username: "",
        password: "",
        roles: [],
        is_active: true,
        is_superuser: false,
      });
      setShowAddRow(false);
      toast.success("用户已创建");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建用户失败";
      toast.error(message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("确定要删除该用户吗？")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((user) => user.id !== id));
      toast.success("用户已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除用户失败";
      toast.error(message);
    }
  };

  const handleSaveRole = async (role: AdminRole) => {
    try {
      const updated = await updateRole(role.id, {
        name: role.name,
        description: role.description ?? "",
      });
      setRoles((prev) => prev.map((item) => (item.id === role.id ? updated : item)));
      toast.success("角色已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新角色失败";
      toast.error(message);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      toast.error("角色名称不能为空");
      return;
    }
    try {
      const item = await createRole({
        name: newRole.name.trim(),
        description: newRole.description || "",
      });
      setRoles((prev) => [item, ...prev]);
      setNewRole({ name: "", description: "" });
      setShowAddRow(false);
      toast.success("角色已创建");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建角色失败";
      toast.error(message);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("确定要删除该角色吗？")) return;
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter((role) => role.id !== id));
      toast.success("角色已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除角色失败";
      toast.error(message);
    }
  };

  const handleSavePolicy = async (policy: AdminPolicy) => {
    try {
      const updated = await updatePolicy(policy.id, {
        ptype: policy.ptype,
        v0: policy.v0,
        v1: policy.v1,
        v2: policy.v2,
        v3: policy.v3,
        v4: policy.v4,
        v5: policy.v5,
      });
      setPolicies((prev) => prev.map((item) => (item.id === policy.id ? updated : item)));
      toast.success("策略已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新策略失败";
      toast.error(message);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.ptype.trim()) {
      toast.error("策略类型不能为空");
      return;
    }
    try {
      const item = await createPolicy({
        ptype: newPolicy.ptype.trim(),
        v0: newPolicy.v0 || null,
        v1: newPolicy.v1 || null,
        v2: newPolicy.v2 || null,
        v3: newPolicy.v3 || null,
        v4: newPolicy.v4 || null,
        v5: newPolicy.v5 || null,
      });
      setPolicies((prev) => [item, ...prev]);
      setNewPolicy({
        ptype: "p",
        v0: "",
        v1: "",
        v2: "",
        v3: "",
        v4: "",
        v5: "",
      });
      setShowAddRow(false);
      toast.success("策略已创建");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建策略失败";
      toast.error(message);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    if (!confirm("确定要删除该策略吗？")) return;
    try {
      await deletePolicy(id);
      setPolicies((prev) => prev.filter((policy) => policy.id !== id));
      toast.success("策略已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除策略失败";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载权限数据...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tighter">TASK & PERMISSIONS</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              RBAC Configuration / Casbin Policies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted/30 p-1 border border-border">
          {[
            { key: "users", label: "用户账户" },
            { key: "roles", label: "角色定义" },
            { key: "policies", label: "权限策略" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as typeof activeTab);
                setShowAddRow(false);
              }}
              className={`px-4 py-1.5 text-[11px] font-bold uppercase transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAll}
            disabled={isRefreshing}
            className="h-7 w-7 p-0"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border bg-card/50">
        {activeTab === "users" && (
          <div className="min-w-[800px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase py-2">用户名</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2">所属角色</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2">重置密码</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2 text-center w-16">启用</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2 text-center w-16">超管</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2 text-right w-24">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                      onClick={() => setShowAddRow(!showAddRow)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      NEW
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showAddRow && (
                  <TableRow className="bg-primary/5 border-b border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
                    <TableCell className="py-1">
                      <Input
                        placeholder="USERNAME"
                        className="h-7 text-[11px] bg-background border-primary/30"
                        value={newUser.username}
                        onChange={(e) =>
                          setNewUser((prev) => ({ ...prev, username: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <RoleDropdown
                        value={newUser.roles}
                        onChange={(next) =>
                          setNewUser((prev) => ({ ...prev, roles: next }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        placeholder="PASSWORD"
                        type="password"
                        className="h-7 text-[11px] bg-background border-primary/30"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser((prev) => ({ ...prev, password: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Switch
                        checked={newUser.is_active}
                        onCheckedChange={(checked) =>
                          setNewUser((prev) => ({ ...prev, is_active: checked }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Switch
                        checked={newUser.is_superuser}
                        onCheckedChange={(checked) =>
                          setNewUser((prev) => ({ ...prev, is_superuser: checked }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1 text-right gap-1 flex justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAddRow(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="h-7 px-3 text-[10px] font-bold" onClick={handleCreateUser}>
                        ADD
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {users.map((user) => (
                  <TableRow key={user.id} className="border-b border-border/50 hover:bg-muted/30 group">
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-mono px-1 py-0.5 rounded-sm"
                        value={user.username}
                        onChange={(e) =>
                          handleUserChange(user.id, { username: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <RoleDropdown
                        value={user.roles}
                        onChange={(next) =>
                          handleUserChange(user.id, { roles: next })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Input
                        type="password"
                        placeholder="******"
                        className="h-7 text-[11px] bg-transparent border-border/50 focus:border-primary"
                        value={userPasswords[user.id] || ""}
                        onChange={(e) =>
                          setUserPasswords((prev) => ({
                            ...prev,
                            [user.id]: e.target.value,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) =>
                          handleUserChange(user.id, { is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <Switch
                        checked={user.is_superuser}
                        onCheckedChange={(checked) =>
                          handleUserChange(user.id, { is_superuser: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-right flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleSaveUser(user)}
                        title="保存更改"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        title="删除用户"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="min-w-[600px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase py-2">角色名称</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2">职责描述</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2 text-right w-24">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                      onClick={() => setShowAddRow(!showAddRow)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      NEW
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showAddRow && (
                  <TableRow className="bg-primary/5 border-b border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
                    <TableCell className="py-1">
                      <Input
                        placeholder="ROLE_NAME"
                        className="h-7 text-[11px] bg-background border-primary/30 font-mono"
                        value={newRole.name}
                        onChange={(e) =>
                          setNewRole((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        placeholder="DESCRIPTION"
                        className="h-7 text-[11px] bg-background border-primary/30"
                        value={newRole.description}
                        onChange={(e) =>
                          setNewRole((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1 text-right gap-1 flex justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAddRow(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="h-7 px-3 text-[10px] font-bold" onClick={handleCreateRole}>
                        ADD
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {roles.map((role) => (
                  <TableRow key={role.id} className="border-b border-border/50 hover:bg-muted/30 group">
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] font-mono font-bold px-1 py-0.5 rounded-sm"
                        value={role.name}
                        onChange={(e) =>
                          setRoles((prev) =>
                            prev.map((item) =>
                              item.id === role.id
                                ? { ...item, name: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <input
                        className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full text-[12px] px-1 py-0.5 rounded-sm text-muted-foreground"
                        value={role.description || ""}
                        onChange={(e) =>
                          setRoles((prev) =>
                            prev.map((item) =>
                              item.id === role.id
                                ? { ...item, description: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-right flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleSaveRole(role)}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === "policies" && (
          <div className="min-w-[1000px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="border-b border-border hover:bg-transparent font-mono text-[9px]">
                  <TableHead className="py-2 w-16">TYPE</TableHead>
                  <TableHead className="py-2">V0 (SUB/OBJ)</TableHead>
                  <TableHead className="py-2">V1 (OBJ/DOM)</TableHead>
                  <TableHead className="py-2">V2 (ACT)</TableHead>
                  <TableHead className="py-2">V3</TableHead>
                  <TableHead className="py-2">V4</TableHead>
                  <TableHead className="py-2">V5</TableHead>
                  <TableHead className="py-2 text-right w-24">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                      onClick={() => setShowAddRow(!showAddRow)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      NEW
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showAddRow && (
                  <TableRow className="bg-primary/5 border-b border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.ptype} onChange={(e) => setNewPolicy(p => ({...p, ptype: e.target.value}))} /></TableCell>
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.v0} onChange={(e) => setNewPolicy(p => ({...p, v0: e.target.value}))} /></TableCell>
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.v1} onChange={(e) => setNewPolicy(p => ({...p, v1: e.target.value}))} /></TableCell>
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.v2} onChange={(e) => setNewPolicy(p => ({...p, v2: e.target.value}))} /></TableCell>
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.v3} onChange={(e) => setNewPolicy(p => ({...p, v3: e.target.value}))} /></TableCell>
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.v4} onChange={(e) => setNewPolicy(p => ({...p, v4: e.target.value}))} /></TableCell>
                    <TableCell className="py-1"><Input className="h-7 text-[10px] bg-background font-mono" value={newPolicy.v5} onChange={(e) => setNewPolicy(p => ({...p, v5: e.target.value}))} /></TableCell>
                    <TableCell className="py-1 text-right gap-1 flex justify-end">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAddRow(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="h-7 px-3 text-[10px] font-bold" onClick={handleCreatePolicy}>
                        ADD
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
                {policies.map((policy) => (
                  <TableRow key={policy.id} className="border-b border-border/50 hover:bg-muted/30 group font-mono text-[11px]">
                    <TableCell className="py-1.5">
                      <input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1" value={policy.ptype} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, ptype: e.target.value} : i))} />
                    </TableCell>
                    <TableCell className="py-1.5"><input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1" value={policy.v0 || ""} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, v0: e.target.value} : i))} /></TableCell>
                    <TableCell className="py-1.5"><input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1 font-bold text-primary" value={policy.v1 || ""} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, v1: e.target.value} : i))} /></TableCell>
                    <TableCell className="py-1.5"><input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1 text-accent" value={policy.v2 || ""} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, v2: e.target.value} : i))} /></TableCell>
                    <TableCell className="py-1.5"><input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1" value={policy.v3 || ""} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, v3: e.target.value} : i))} /></TableCell>
                    <TableCell className="py-1.5"><input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1" value={policy.v4 || ""} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, v4: e.target.value} : i))} /></TableCell>
                    <TableCell className="py-1.5"><input className="bg-transparent border-none focus:ring-1 focus:ring-primary w-full px-1" value={policy.v5 || ""} onChange={(e) => setPolicies(p => p.map(i => i.id === policy.id ? {...i, v5: e.target.value} : i))} /></TableCell>
                    <TableCell className="py-1.5 text-right flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary" onClick={() => handleSavePolicy(policy)}><Save className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive" onClick={() => handleDeletePolicy(policy.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};