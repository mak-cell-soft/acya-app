import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-xl font-bold font-mono tracking-tight text-gradient">ACYA // OMEGA</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs uppercase text-muted-foreground font-mono tracking-wider mb-4 mt-4">Command Core</div>
        <Link 
          href="/" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-secondary transition-colors group"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
          Overview
        </Link>
        
        <Link 
          href="/enterprises" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-secondary transition-colors group"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
          Enterprises Registry
        </Link>
        
        <div className="text-xs uppercase text-muted-foreground font-mono tracking-wider mb-4 mt-8">System</div>
        <Link 
          href="/settings" 
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium hover:bg-secondary transition-colors group text-muted-foreground hover:text-foreground"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 group-hover:bg-muted-foreground transition-colors"></div>
          Settings
        </Link>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-mono text-xs">SA</div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Super Admin</span>
            <span className="text-xs text-muted-foreground mt-1 font-mono">SYS_ROOT</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
