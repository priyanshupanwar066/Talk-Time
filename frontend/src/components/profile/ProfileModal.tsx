// User Profile & Account Settings Modal
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Avatar } from '../ui/Avatar';
import {
  X,
  User,
  Mail,
  Lock,
  Camera,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setError(null);
    try {
      const res = await api.uploadAvatar(file);
      if (res.success && res.data.url) {
        setAvatarUrl(res.data.url);
        await updateProfile({ avatarUrl: res.data.url });
      }
    } catch (err: any) {
      setError(err.message || 'Avatar upload failed.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      setError('Name and username are required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateProfile({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || null,
        ...(newPassword ? { oldPassword, newPassword } : {}),
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Account & Profile</h3>
              <p className="text-xs text-slate-500">Manage your user profile and settings</p>
            </div>
          </div>
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Avatar Edit */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="relative group">
              <Avatar src={avatarUrl} name={name || 'User'} size="xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                title="Change photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-slate-700">Profile Picture</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload a custom photo or paste an image URL below.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl shadow-2xs cursor-pointer"
              >
                Choose Photo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              id="profile-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input
                id="profile-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={currentUser.email}
                disabled
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bio / Status</label>
            <input
              id="profile-bio-input"
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others what you're working on..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Change Password Section */}
          <div className="pt-3 border-t border-slate-100">
            <span className="block text-xs font-bold text-slate-800 mb-2">
              Change Password (Optional)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  id="profile-old-password-input"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <input
                  id="profile-new-password-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-profile-btn"
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
