export default function EnterprisesPage() {
  const dummyEnterprises = [
    { id: 1, name: "Socobois", slug: "socobois", status: "Active", db: "socobois_schema", created: "2026-06-12" },
    { id: 2, name: "Tucobois", slug: "tucobois", status: "Active", db: "tucobois_schema", created: "2026-06-13" },
    { id: 3, name: "Wellness Medical", slug: "wellness-medical", status: "Pending", db: "wellness_med", created: "2026-06-14" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Enterprises Registry</h1>
          <p className="text-muted-foreground mt-1">Manage tenant instances and provisioning status.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          Provision New Tenant
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/30">
              <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Enterprise Name</th>
              <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">URL Slug</th>
              <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">DB Schema</th>
              <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-mono text-muted-foreground font-medium uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {dummyEnterprises.map((ent) => (
              <tr key={ent.id} className="hover:bg-secondary/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-sm">{ent.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">ID: {ent.id.toString().padStart(4, '0')}</div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                  {ent.slug}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                  {ent.db}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    ent.status === 'Active' 
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${ent.status === 'Active' ? 'bg-primary' : 'bg-yellow-500'}`}></span>
                    {ent.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
