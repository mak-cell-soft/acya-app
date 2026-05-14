'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Shield, MoreVertical, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const teamMembers = [
  { name: 'Sarah Chen', role: 'Product Designer', email: 'sarah@example.com', status: 'Active', avatar: 'SC' },
  { name: 'Marcus Rodriguez', role: 'Lead Developer', email: 'marcus@example.com', status: 'Active', avatar: 'MR' },
  { name: 'Aisha Gupta', role: 'Product Manager', email: 'aisha@example.com', status: 'Away', avatar: 'AG' },
  { name: 'Jack Wilson', role: 'Security Engineer', email: 'jack@example.com', status: 'Active', avatar: 'JW' },
  { name: 'Elena Petrova', role: 'QA Lead', email: 'elena@example.com', status: 'On Leave', avatar: 'EP' },
];

export default function TeamPage() {
  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members, roles and permissions.
            </p>
          </motion.div>
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        </header>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Team Members</CardTitle>
                <CardDescription>A list of all users in your organization.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search members..." className="pl-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {teamMembers.map((member, i) => (
                <motion.div
                  key={member.email}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-muted/50 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {member.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-12">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {member.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        member.status === 'Active' ? "bg-emerald-500" : 
                        member.status === 'Away' ? "bg-amber-500" : "bg-muted"
                      )} />
                      <span className="text-sm font-medium">{member.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Shield className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
