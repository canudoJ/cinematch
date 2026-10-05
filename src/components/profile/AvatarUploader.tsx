'use client';

import React, { useId, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { supabase } from '@/lib/supabase';

const MAX_MB = 2;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const BUCKET = 'avatars';

/** Nombre del archivo dentro del bucket a partir de su URL pública */
function storagePath(publicUrl: string | null | undefined): string | null {
    const marker = `/object/public/${BUCKET}/`;
    const index = publicUrl?.indexOf(marker) ?? -1;
    return publicUrl && index >= 0 ? decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0]) : null;
}

export function AvatarUploader() {
    const { user, profile, updateProfile } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const inputId = useId();
    const [uploading, setUploading] = useState(false);

    const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // permite volver a elegir el mismo archivo
        if (!file || !user) return;
        if (!ALLOWED_TYPES.includes(file.type)) {
            showToast(t.avatarWrongType, 'error');
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            showToast(t.avatarTooBig(MAX_MB), 'error');
            return;
        }

        setUploading(true);
        try {
            const extension = file.type.split('/')[1];
            const fileName = `avatar_${user.id}_${Date.now()}.${extension}`;
            const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file, { contentType: file.type });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
            const previous = storagePath(profile?.avatar_url);
            await updateProfile({ avatar_url: publicUrl });
            // Borrar la foto anterior para no acumular archivos (si falla no pasa nada)
            if (previous?.startsWith(`avatar_${user.id}_`)) void supabase.storage.from(BUCKET).remove([previous]);
            showToast(t.avatarUpdated, 'success');
        } catch {
            showToast(t.genericError, 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mb-10 flex flex-col items-center">
            {/* El label hace de botón: abre el selector de archivo con ratón y teclado */}
            <label htmlFor={inputId} className="group relative cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-[var(--ring)]">
                <span className="sr-only">{t.changeAvatar}</span>
                <span className="relative block rounded-full shadow-[var(--shadow-neon-cyan)] transition-transform group-hover:scale-105">
                    <Avatar src={profile?.avatar_url} name={profile?.username} size={144} ring />
                    {uploading && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--overlay)]">
                            <Loader2 className="animate-spin text-[var(--secondary)]" size={40} aria-hidden />
                        </span>
                    )}
                </span>
                <span className="absolute bottom-1 right-1 rounded-full border-4 border-[var(--background)] bg-[var(--secondary)] p-3 text-[var(--secondary-foreground)] shadow-lg transition-transform group-hover:scale-110" aria-hidden>
                    <Upload size={18} strokeWidth={3} />
                </span>
                <input id={inputId} type="file" accept={ALLOWED_TYPES.join(',')} onChange={handleFile} disabled={uploading} className="sr-only" />
            </label>
            <p className="mt-4 text-sm font-medium text-[var(--muted-foreground)]">{t.tapToChangePhoto}</p>
        </div>
    );
}
