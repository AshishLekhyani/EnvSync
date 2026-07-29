"use client";

import { FormEvent, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export function ProfileTab() {
  const { user, refreshMe } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  if (!user) return null;

  const onSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    try {
      await api.updateProfile({ name });
      await refreshMe();
      setNameSaved(true);
      window.setTimeout(() => setNameSaved(false), 3000);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSavingName(false);
    }
  };

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSaved(false);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSaved(true);
      window.setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
        <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
          <Icon name="person" className="text-primary" />
          <h2 className="font-h3 text-h3 text-on-surface">Profile</h2>
        </div>
        <div className="flex flex-col gap-md p-md">
          <div className="flex items-center gap-md">
            <Avatar name={user.name} seed={user.email} className="h-16 w-16 text-lg" />
            <div>
              <p className="font-body-md text-body-md font-bold text-on-surface">{user.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
            </div>
          </div>

          <form onSubmit={onSaveName} className="flex max-w-md flex-col gap-md">
            <label className="block">
              <span className="mb-xs block font-label-md text-label-md text-on-surface">
                Display name
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
              />
            </label>
            {nameError && (
              <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
                {nameError}
              </p>
            )}
            <div className="flex items-center gap-md">
              <button
                type="submit"
                disabled={savingName || name === user.name}
                className="self-start rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
              {nameSaved && (
                <span className="font-body-sm text-body-sm text-primary">Saved.</span>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
        <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
          <Icon name="password" className="text-primary" />
          <h2 className="font-h3 text-h3 text-on-surface">Password</h2>
        </div>
        <div className="p-md">
          {user.authProvider !== "PASSWORD" ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              You signed in via {user.authProvider === "GITHUB" ? "GitHub" : "Google"} —
              there&apos;s no password to manage.
            </p>
          ) : (
            <form onSubmit={onChangePassword} className="flex max-w-md flex-col gap-md">
              <label className="block">
                <span className="mb-xs block font-label-md text-label-md text-on-surface">
                  Current password
                </span>
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                />
              </label>
              <label className="block">
                <span className="mb-xs block font-label-md text-label-md text-on-surface">
                  New password
                </span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                />
              </label>
              {passwordError && (
                <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
                  {passwordError}
                </p>
              )}
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Changing your password signs out every other active session.
              </p>
              <div className="flex items-center gap-md">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="self-start rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                >
                  {changingPassword ? "Updating..." : "Change Password"}
                </button>
                {passwordSaved && (
                  <span className="font-body-sm text-body-sm text-primary">Password updated.</span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
