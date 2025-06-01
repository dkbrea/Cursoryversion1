"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { Icons } from "@/components/icons";

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name?: string) => {
    if (!name) return "PL";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length -1][0].toUpperCase();
  }

  return (
    <div className="flex items-center gap-3">
      {/* User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100.png?text=${getInitials(user.name)}`} alt={user.name || "User"} data-ai-hint="user avatar" />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Icons.Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* User name and email */}
      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-sm font-medium leading-none truncate">{user.name || "User"}</p>
        <p className="text-xs leading-none text-muted-foreground truncate">
          {user.email}
        </p>
      </div>
      
      {/* Sign out icon button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={logout}
        className="h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Sign out"
      >
        <Icons.Logout className="h-4 w-4" />
      </Button>
    </div>
  );
}
