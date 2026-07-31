"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, NotificationPrefs } from "@/lib/api";

const AVATAR_SIZE = 128;
const AVATAR_MAX_CHARS = 60000;

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        const scale = Math.max(AVATAR_SIZE / img.width, AVATAR_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (AVATAR_SIZE - w) / 2, (AVATAR_SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfileTab() {
  const { user, refreshMe } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [savingPrefs, setSavingPrefs] = useState<keyof NotificationPrefs | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  if (!user) return null;

  const onSelectPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      if (dataUrl.length > AVATAR_MAX_CHARS) {
        throw new Error("Image too large — try a smaller photo");
      }
      await api.updateProfile({ avatarUrl: dataUrl });
      await refreshMe();
    } catch (err) {
      setPhotoError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to upload photo"
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onRemovePhoto = async () => {
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      await api.updateProfile({ avatarUrl: null });
      await refreshMe();
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : "Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onTogglePref = async (key: keyof NotificationPrefs) => {
    setSavingPrefs(key);
    try {
      await api.updateProfile({
        notificationPrefs: { ...user.notificationPrefs, [key]: !user.notificationPrefs[key] },
      });
      await refreshMe();
    } finally {
      setSavingPrefs(null);
    }
  };

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
            <Avatar
              name={user.name}
              seed={user.email}
              avatarUrl={user.avatarUrl}
              className="h-16 w-16 text-lg"
            />
            <div className="flex-1">
              <p className="font-body-md text-body-md font-bold text-on-surface">{user.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
              <div className="mt-xs flex items-center gap-md">
                <label className="cursor-pointer font-label-md text-label-md text-xs text-primary hover:underline">
                  {uploadingPhoto ? "Uploading..." : "Change photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={onSelectPhoto}
                  />
                </label>
                {user.avatarUrl && (
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={onRemovePhoto}
                    className="font-label-md text-label-md text-xs text-on-surface-variant hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              {photoError && (
                <p className="mt-xs font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
                  {photoError}
                </p>
              )}
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

      <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
        <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
          <Icon name="notifications" className="text-primary" />
          <h2 className="font-h3 text-h3 text-on-surface">Notifications</h2>
        </div>
        <div className="flex flex-col divide-y divide-outline-variant p-md">
          <label className="flex items-center justify-between gap-md py-sm">
            <div>
              <p className="font-body-sm text-body-sm font-bold text-on-surface">
                Approval requests
              </p>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Invite approvals and project access requests that need your action.
              </p>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPrefs.approvalRequests}
              disabled={savingPrefs === "approvalRequests"}
              onChange={() => onTogglePref("approvalRequests")}
              className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
            />
          </label>
          <label className="flex items-center justify-between gap-md py-sm">
            <div>
              <p className="font-body-sm text-body-sm font-bold text-on-surface">
                Account activity
              </p>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Access grants/revokes, role changes, and ownership transfers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={user.notificationPrefs.accessChanges}
              disabled={savingPrefs === "accessChanges"}
              onChange={() => onTogglePref("accessChanges")}
              className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
