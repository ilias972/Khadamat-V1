'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { userApi } from '@/lib/api-client';
import { authManager } from '@/lib/auth';
import { buildProfileUpdatePayload } from '@/lib/profile-payload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2
} from 'lucide-react';

// Validation schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'Le prÃ©nom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(1, 'Le tÃ©lÃ©phone est requis'),
  address: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: z.string().min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractÃ¨res'),
  confirmPassword: z.string().min(1, 'La confirmation est requise'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();

  const personalForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Load user data into form
  useEffect(() => {
    if (user) {
      const profile = user.clientProfile || user.proProfile;
      personalForm.reset({
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        email: user.email,
        phone: user.phone,
        address: user.clientProfile?.address || '',
      });
    }
  }, [user, personalForm]);

  const onPersonalSubmit = async (data: PersonalInfoForm) => {
    try {
      const updateData = buildProfileUpdatePayload({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
      });

      const updatedUser = await userApi.updateUserProfile(updateData);

      // Update localStorage
      authManager.setUser(updatedUser);

      // Refresh user in context
      refreshUser();

      success('Informations personnelles mises Ã  jour avec succÃ¨s');
    } catch (err) {
      console.error('Failed to update profile:', err);
      error('Erreur lors de la mise Ã  jour du profil');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await userApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      passwordForm.reset();
      success('Mot de passe changÃ© avec succÃ¨s');
    } catch (err) {
      console.error('Failed to change password:', err);
      error('Erreur lors du changement de mot de passe');
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-surface rounded-lg w-1/4"></div>
          <div className="space-y-4">
            <div className="h-12 bg-surface rounded-lg"></div>
            <div className="h-12 bg-surface rounded-lg"></div>
            <div className="h-24 bg-surface rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary font-heading mb-2">
          ParamÃ¨tres
        </h1>
        <p className="text-text-secondary">
          GÃ©rez vos informations personnelles et votre sÃ©curitÃ©
        </p>
      </div>

      <div className="space-y-8">
        {/* Personal Information Section */}
        <div className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-text-primary font-heading">
              Informations personnelles
            </h2>
          </div>

          <form onSubmit={personalForm.handleSubmit(onPersonalSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="PrÃ©nom"
                {...personalForm.register('firstName')}
                error={personalForm.formState.errors.firstName?.message}
                startIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="Nom"
                {...personalForm.register('lastName')}
                error={personalForm.formState.errors.lastName?.message}
                startIcon={<User className="w-4 h-4" />}
              />
              <div>
                <Input
                  label="Email"
                  type="email"
                  {...personalForm.register('email')}
                  error={personalForm.formState.errors.email?.message}
                  startIcon={<Mail className="w-4 h-4" />}
                  disabled={true}
                />
                <small className="text-text-secondary text-sm block mt-1">Les changements d'email nÃ©cessitent un processus de vÃ©rification.</small>
              </div>
              <Input
                label="TÃ©lÃ©phone"
                {...personalForm.register('phone')}
                error={personalForm.formState.errors.phone?.message}
                startIcon={<Phone className="w-4 h-4" />}
              />
              {user.role === 'CLIENT' && (
                <div className="md:col-span-2">
                  <Input
                    label="Adresse"
                    {...personalForm.register('address')}
                    error={personalForm.formState.errors.address?.message}
                    startIcon={<MapPin className="w-4 h-4" />}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={personalForm.formState.isSubmitting}
                className="flex items-center space-x-2"
              >
                {personalForm.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {personalForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </span>
              </Button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-gradient-to-br from-[rgba(250,247,242,0.8)] to-[rgba(255,255,255,0.5)] backdrop-blur-sm rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-text-primary font-heading">
              SÃ©curitÃ©
            </h2>
          </div>

          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="Mot de passe actuel"
                type="password"
                {...passwordForm.register('currentPassword')}
                error={passwordForm.formState.errors.currentPassword?.message}
                startIcon={<Lock className="w-4 h-4" />}
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                {...passwordForm.register('newPassword')}
                error={passwordForm.formState.errors.newPassword?.message}
                startIcon={<Lock className="w-4 h-4" />}
              />
              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                {...passwordForm.register('confirmPassword')}
                error={passwordForm.formState.errors.confirmPassword?.message}
                startIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="flex items-center space-x-2"
              >
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>
                  {passwordForm.formState.isSubmitting ? 'Changement...' : 'Changer le mot de passe'}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}



