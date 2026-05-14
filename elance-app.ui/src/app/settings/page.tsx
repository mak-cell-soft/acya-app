'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { motion } from 'framer-motion';
import { Bell, Lock, User, Globe, Shield, Save } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-[1200px] mx-auto">
        <header>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Customize your account preferences and global configuration.
            </p>
          </motion.div>
        </header>

        <div className="grid gap-8">
          <section className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-4 h-4" /> Profile Information
              </h3>
              <p className="text-sm text-muted-foreground">Update your personal details and public presence.</p>
            </div>
            <Card className="md:col-span-2">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user?.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" defaultValue={user?.email} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input id="bio" placeholder="Tell us a bit about yourself..." />
                </div>
                <div className="flex justify-end">
                  <Button className="gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="h-px bg-border" />

          <section className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4" /> Security
              </h3>
              <p className="text-sm text-muted-foreground">Protect your account with two-factor authentication.</p>
            </div>
            <Card className="md:col-span-2">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Two-factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
                <div className="flex items-center justify-between border-t pt-6">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Active Sessions</Label>
                    <p className="text-sm text-muted-foreground">Currently logged in from 2 devices.</p>
                  </div>
                  <Button variant="ghost">View Sessions</Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="h-px bg-border" />

          <section className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notifications
              </h3>
              <p className="text-sm text-muted-foreground">Control how you receive alerts and updates.</p>
            </div>
            <Card className="md:col-span-2">
              <CardContent className="pt-6 space-y-4">
                {[
                  { title: 'Email Notifications', description: 'Receive weekly performance reports.' },
                  { title: 'Push Notifications', description: 'Alerts for new sales and team invites.' },
                  { title: 'Marketing Emails', description: 'Information about new features and product updates.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="w-10 h-6 bg-primary/20 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-primary rounded-full transition-all" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
