'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { Rocket, Zap, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  const { count, increment, reset } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="container mx-auto px-4 py-24 flex flex-col items-center justify-center space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6 max-w-3xl"
      >
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4" />
          <span>The Ultimate Next.js Boilerplate</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
          Build Faster, <br /> Scale Smarter.
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          A high-performance, accessible, and type-safe starter kit equipped with the latest technologies to help you ship premium web applications in record time.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" className="h-12 px-8 text-lg font-semibold" asChild>
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              {isAuthenticated ? "Go to Dashboard" : "Get Started"}
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-lg font-semibold" asChild>
            <Link href="/demo">Technical Demo</Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {[
          { title: 'Server Components', desc: 'Optimized performance with React Server Components.', icon: Rocket },
          { title: 'State Management', desc: 'Type-safe global state with Zustand persistence.', icon: Zap },
          { title: 'Modern UI', desc: 'Accessible components built with Shadcn & Tailwind.', icon: Shield },
        ].map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Card className="p-6 h-full border-muted/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors group">
              <feature.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center space-y-4 pt-12 border-t border-muted/50 w-full"
      >
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Demo Counter (Zustand Persisted)</h4>
        <div className="flex items-center space-x-6">
          <Button variant="ghost" size="icon" onClick={() => increment()} className="h-12 w-12 text-2xl font-bold">+</Button>
          <span className="text-4xl font-mono tabular-nums">{count}</span>
          <Button variant="outline" onClick={() => reset()}>Reset</Button>
        </div>
      </motion.div>
    </section>
  );
}
