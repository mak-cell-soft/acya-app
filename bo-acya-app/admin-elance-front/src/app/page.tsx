export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Platform metrics and system health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-primary/20 transition-colors"></div>
          <span className="text-sm font-medium text-muted-foreground font-mono">TOTAL TENANTS</span>
          <span className="text-4xl font-semibold font-mono tracking-tighter">42</span>
          <span className="text-xs text-primary mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            +3 this week
          </span>
        </div>

        <div className="glass-panel p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-colors"></div>
          <span className="text-sm font-medium text-muted-foreground font-mono">ACTIVE DATABASES</span>
          <span className="text-4xl font-semibold font-mono tracking-tighter">38</span>
          <span className="text-xs text-muted-foreground mt-2">
            4 pending provisioning
          </span>
        </div>

        <div className="glass-panel p-6 rounded-xl flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/20 transition-colors"></div>
          <span className="text-sm font-medium text-muted-foreground font-mono">API REQUESTS / MIN</span>
          <span className="text-4xl font-semibold font-mono tracking-tighter">1,248</span>
          <span className="text-xs text-muted-foreground mt-2">
            Normal traffic load
          </span>
        </div>
      </div>

      <div className="mt-8 glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div>
                  <p className="text-sm font-medium">Tenant "Wellness Medical" activated</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">Schema wellness_med created successfully.</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">2h ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
