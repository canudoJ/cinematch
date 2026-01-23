'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Esperar un momento para que la sesión se establezca
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verificar que la sesión se estableció correctamente
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Redirigir después de confirmar la sesión
                router.push('/');
                router.refresh();
            } else {
                throw new Error('No se pudo establecer la sesión');
            }

        } catch (error: any) {
            console.error('Login error:', error);
            setErrorMsg(error.message || 'Error al iniciar sesión');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* 1. FONDO AMBIENTAL (El brillo rojo y morado detrás) */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#FF3366] opacity-5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-purple-900 opacity-10 blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">

                {/* 2. CABECERA CON LOGO */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FF3366]/10 mb-4 animate-pulse">
                        <PlayCircle size={32} className="text-[#FF3366]" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic">
                        CINEMATCH
                    </h1>
                    <p className="text-gray-400 font-medium">Tu próxima película favorita te espera.</p>
                </div>

                {/* 3. TARJETA DE FORMULARIO (Efecto Cristal) */}
                <div className="bg-[var(--bg-dark)]/80 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl">

                    {/* Mensaje de Error (Solo sale si hay error) */}
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Input Email */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-gray-800 text-white px-5 py-4 rounded-xl focus:outline-none focus:border-[#FF3366] focus:ring-1 focus:ring-[#FF3366]/50 transition-all placeholder:text-gray-700"
                                placeholder="nombre@ejemplo.com"
                                required
                            />
                        </div>

                        {/* Input Contraseña */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-gray-800 text-white px-5 py-4 rounded-xl focus:outline-none focus:border-[#FF3366] focus:ring-1 focus:ring-[#FF3366]/50 transition-all placeholder:text-gray-700"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* Botón Rojo Neón */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FF3366] hover:bg-[#ff1f59] text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 shadow-[0_0_20px_rgba(255,51,102,0.3)] hover:shadow-[0_0_30px_rgba(255,51,102,0.5)]"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'ENTRAR'}
                        </button>
                    </form>

                    {/* Link a Registro */}
                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            ¿No tienes cuenta?{' '}
                            <Link href="/register" className="text-[#FF3366] font-bold hover:underline decoration-2 underline-offset-4 transition-colors">
                                Regístrate aquí
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}