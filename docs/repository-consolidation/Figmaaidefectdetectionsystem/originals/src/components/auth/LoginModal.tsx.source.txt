import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { login, type AuthUser } from "../../api/admin";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: AuthUser) => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
      toast.success(`欢迎回来，${user.username}`);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px] bg-zinc-950/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-blue-400 font-semibold tracking-wide">
              <Lock className="w-5 h-5 text-blue-400" />
              系统登录
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              请输入您的凭据以访问钢板缺陷检测系统
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 py-4">
          {errorMessage && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {errorMessage}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="请输入用户名"
                className="pl-9"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}