import React, { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Movie } from '@/types';

// --- Dependencias de contexto y red que estos componentes no necesitan de verdad
const push = jest.fn();
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, replace: jest.fn(), back: jest.fn() }) }));

const signInAsGuest = jest.fn();
let mockIsGuest = false;
jest.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ signInAsGuest, isGuest: mockIsGuest }) }));
jest.mock('@/context/UserContext', () => ({ useUser: () => ({ platforms: [] }) }));
jest.mock('@/services/tmdb', () => ({
    getWatchOptions: jest.fn(async () => ({ providers: [{ name: 'Netflix', link: 'https://netflix/x' }], best: { name: 'Netflix', link: 'https://netflix/x' } })),
    fetchDetails: jest.fn(async () => null),
}));

import DeckTagInput from '../DeckTagInput';
import { GuestAccessButton } from '../GuestAccessButton';
import ShortlistView from '../ShortlistView';

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockIsGuest = false;
});

describe('DeckTagInput', () => {
    function Harness({ initial = [] as string[] }) {
        const [tags, setTags] = useState(initial);
        return (
            <>
                <DeckTagInput tags={tags} onTagsChange={setTags} />
                <output data-testid="tags">{tags.join('|')}</output>
            </>
        );
    }

    it('Enter con el campo vacío no añade nada (antes añadía "Chill")', () => {
        renderWithProviders(<Harness />);
        fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
        expect(screen.getByTestId('tags')).toHaveTextContent('');
    });

    it('añade el tag escrito y usa la forma canónica de los sugeridos', async () => {
        renderWithProviders(<Harness />);
        const input = screen.getByRole('combobox');
        await userEvent.type(input, 'terror{enter}');
        await userEvent.type(input, 'mi tag,');
        expect(screen.getByTestId('tags')).toHaveTextContent('Terror|mi tag');
    });

    it('no admite más de 5 tags', () => {
        renderWithProviders(<Harness initial={['a', 'b', 'c', 'd', 'e']} />);
        expect(screen.getByRole('combobox')).toBeDisabled();
        expect(screen.getByText(/Máximo 5/)).toBeInTheDocument();
    });

    it('quita un tag con su botón accesible', async () => {
        renderWithProviders(<Harness initial={['Chill', 'Cita']} />);
        await userEvent.click(screen.getByRole('button', { name: /Quitar etiqueta: Chill/ }));
        expect(screen.getByTestId('tags')).toHaveTextContent('Cita');
    });
});

describe('GuestAccessButton', () => {
    it('crea la sesión de invitado y navega', async () => {
        signInAsGuest.mockResolvedValue(undefined);
        renderWithProviders(<GuestAccessButton redirectTo="/setup" />);
        await userEvent.click(screen.getByRole('button', { name: /Probar sin registrarse/ }));
        await waitFor(() => expect(push).toHaveBeenCalledWith('/setup'));
        expect(await screen.findByText('Estás usando CineMatch como invitado')).toBeInTheDocument();
    });

    it('si falla, avisa y no navega', async () => {
        signInAsGuest.mockRejectedValue(new Error('anonymous_provider_disabled'));
        renderWithProviders(<GuestAccessButton />);
        await userEvent.click(screen.getByRole('button', { name: /Probar sin registrarse/ }));
        expect(await screen.findByText(/No se pudo entrar como invitado/)).toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
    });

    it('un invitado con sesión sigue con la suya (sin bienvenida nueva)', async () => {
        mockIsGuest = true;
        signInAsGuest.mockResolvedValue(undefined);
        renderWithProviders(<GuestAccessButton redirectTo="/" />);
        await userEvent.click(screen.getByRole('button', { name: /Seguir como invitado/ }));
        await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
        expect(screen.queryByText('Estás usando CineMatch como invitado')).not.toBeInTheDocument();
    });
});

describe('ShortlistView', () => {
    const movie = (id: string, rating = 7): Movie => ({ id, type: 'movie', title: `Peli ${id}`, year: 2020, rating, image: '', synopsis: '', genres: [] });

    it('no pinta un "0" suelto cuando la nota es 0', () => {
        renderWithProviders(<ShortlistView movies={[movie('1', 0)]} onClose={() => {}} onRestart={() => {}} />);
        expect(screen.queryByText('0.0')).not.toBeInTheDocument();
        expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
    });

    it('la muerte súbita indica ronda, fase y enfrentamiento, y termina con un ganador', async () => {
        renderWithProviders(<ShortlistView movies={['1', '2', '3', '4'].map(id => movie(id))} onClose={() => {}} onRestart={() => {}} />);
        await userEvent.click(screen.getByRole('button', { name: /Muerte súbita/ }));
        expect(screen.getByText('Ronda 1 de 2')).toBeInTheDocument();
        expect(screen.getByText('Semifinal')).toBeInTheDocument();
        expect(screen.getByText('Enfrentamiento 1 de 2')).toBeInTheDocument();

        const chooseFirst = async () => {
            const fighters = screen.getAllByRole('button', { name: /^Peli \d$/ });
            await userEvent.click(fighters[0]);
        };
        await chooseFirst();
        expect(screen.getByText('Enfrentamiento 2 de 2')).toBeInTheDocument();
        await chooseFirst();
        expect(screen.getByText('Ronda 2 de 2')).toBeInTheDocument();
        expect(screen.getByText('Final')).toBeInTheDocument();
        await chooseFirst();
        expect(await screen.findByText('¡TENEMOS GANADOR!')).toBeInTheDocument();
    });

    it('sin películas elegidas ofrece volver a jugar o salir', async () => {
        const onRestart = jest.fn();
        renderWithProviders(<ShortlistView movies={[]} onClose={() => {}} onRestart={onRestart} />);
        await userEvent.click(screen.getByRole('button', { name: /Volver a jugar la baraja/ }));
        expect(onRestart).toHaveBeenCalled();
    });
});
