"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !isLoginPage) {
      router.push("/login");
    }
    setAuthChecked(true);
  }, [pathname, isLoginPage, router]);

  if (!authChecked) {
    return <div className="w-screen h-screen bg-background" />;
  }

  if (isLoginPage) {
    return <div className="w-screen h-screen flex items-center justify-center bg-background">{children}</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.push("/login");
  };

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <header className="h-16 flex items-center justify-between px-8 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]">
          <div className="font-mono text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            System Status: <span className="text-primary font-semibold">Online</span>
          </div>
          <div className="flex items-center gap-4">
             <button 
               type="button"
               onClick={handleLogout}
               className="px-4 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 active:scale-[0.96] transition-[transform,background-color] cursor-pointer select-none"
             >
               Logout
             </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 z-10">
          <div className="max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </div>
      </main>
    </>
  );
}
