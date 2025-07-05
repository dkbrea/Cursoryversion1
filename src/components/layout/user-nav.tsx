"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useState } from "react";
import { Check, X, Edit3, Loader2 } from "lucide-react";
import { UserSettingsModal } from "@/components/settings/user-settings-modal";

export function UserNav() {
  const { user, logout, updateProfile } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return null;
  }

  const getInitials = (name?: string) => {
    if (!name) return "PL";
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length -1][0].toUpperCase();
  };

  const handleEditStart = () => {
    setEditedName(user.name || "");
    setIsEditingName(true);
  };

  const handleEditCancel = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleEditSave = async () => {
    if (!editedName.trim()) return;
    
    setIsUpdating(true);
    const result = await updateProfile({ firstName: editedName.trim() });
    
    if (result.success) {
      setIsEditingName(false);
      setEditedName("");
    } else {
      console.error("Failed to update name:", result.error);
      // You could add a toast notification here for error feedback
    }
    setIsUpdating(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Sign out button clicked');
      setIsSigningOut(true);
      const result = await logout();
      console.log('Logout result:', result);
      
      if (!result.success && result.error) {
        console.error('Logout failed:', result.error);
        setIsSigningOut(false);
        // You could add a toast notification here
      }
      // Don't reset loading state on success since we'll be redirecting
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <>
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
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                <Icons.Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
                <Icons.Logout className="mr-2 h-4 w-4" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User name and email with editable name */}
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          {!isEditingName ? (
            <div className="flex items-center gap-1 group">
              <p className="text-sm font-medium leading-none truncate">{user.name || "User"}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditStart}
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit name"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="h-6 text-sm font-medium px-1 py-0 text-foreground bg-background border-input"
                placeholder="Enter your name"
                autoFocus
                disabled={isUpdating}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditSave}
                className="h-4 w-4 p-0 text-green-600 hover:text-green-700"
                title="Save"
                disabled={isUpdating}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
                className="h-4 w-4 p-0 text-red-600 hover:text-red-700"
                title="Cancel"
                disabled={isUpdating}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <p className="text-xs leading-none text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
        
        {/* Sign out icon button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title="Sign out"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.Logout className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Settings Modal */}
      <UserSettingsModal 
        isOpen={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </>
  );
}
