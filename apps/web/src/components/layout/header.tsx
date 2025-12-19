'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Tìm kiếm tài liệu..."
            className="pl-10 w-full"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{user?.department || 'Admin'}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} title="Đăng xuất">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

