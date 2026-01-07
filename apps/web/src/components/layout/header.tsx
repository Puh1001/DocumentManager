"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, User, Search, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./language-switcher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const tLogout = useTranslations("auth.logout");
  const tCommon = useTranslations("common");
  const tPassword = useTranslations("auth.password");
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: tPassword("mismatch"),
      });
      return;
    }

    if (!newPassword || !currentPassword) {
      toast({
        variant: "destructive",
        title: tCommon("validation.required"),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      toast({
        variant: "success",
        title: tPassword("success"),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setIsDialogOpen(false);
    } catch (error: any) {
      const errorCode = error?.errorCode;
      if (errorCode === "auth.change_password.invalid_current") {
        toast({
          variant: "destructive",
          title: tPassword("errors.invalidCurrent"),
        });
      } else {
        toast({
          variant: "destructive",
          title: tPassword("errors.generic"),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={tCommon("searchPlaceholder")}
            className="pl-10 w-full"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* User menu */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {user?.department || tCommon("admin")}
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title={tPassword("manage")}
              aria-label={tPassword("manage")}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tPassword("changeTitle")}</DialogTitle>
              <DialogDescription>
                {tCommon("passwordChangeDescription") ||
                  "Update your account password."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tPassword("current")}
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tPassword("new")}
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tPassword("confirm")}
                </label>
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleChangePassword}
                disabled={isSubmitting}
              >
                {isSubmitting ? tPassword("submitting") : tPassword("submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title={tLogout("title")}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
