import { useEffect, useState } from "react";
import { FileText, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CodeHighlight } from "../ui/code-highlight";
import { getNginxConfig, type NginxConfigPayload } from "../../api/admin";
import { Network, Terminal } from "lucide-react";

export const ProxySettings: React.FC = () => {
  const [config, setConfig] = useState<NginxConfigPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const payload = await getNginxConfig();
      setConfig(payload);
    } catch (err) {
      setConfig(null);
      setError(err instanceof Error ? err.message : "Failed to load nginx config");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tighter uppercase">Proxy Settings</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              Nginx Configuration & Reverse Proxy Rules
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={isRefreshing}
            className="h-8 text-[11px] font-bold"
          >
            <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            REFRESH
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border bg-card/50 p-4">
        <div className="space-y-4 max-w-5xl mx-auto">
          <Card className="border-border/50">
            <CardHeader className="py-3 border-b border-border/50 bg-muted/30">
              <CardTitle className="text-[12px] font-bold uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Nginx Configuration File
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono animate-pulse">
                  READING CONFIGURATION FROM SERVER...
                </div>
              )}
              {!isLoading && error && (
                <div className="p-8 text-center text-xs text-destructive font-mono bg-destructive/5 uppercase border-b border-destructive/20">
                  [LOAD_ERROR]: {error}
                </div>
              )}
              {!isLoading && !error && config && (
                <div className="flex flex-col">
                  <div className="px-4 py-2 bg-muted/20 border-b border-border text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                    <span>PATH: {config.path}</span>
                    <span className="opacity-50 tracking-tighter uppercase">Read-Only View</span>
                  </div>
                  <div className="max-h-[600px] overflow-auto">
                    <CodeHighlight code={config.content} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-sm flex items-start gap-3">
            <Terminal className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider">Deployment Note</div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                The configuration shown above is synced from the production environment's edge gateway. Any changes to the underlying infrastructure should be reflected here after a service reload.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};