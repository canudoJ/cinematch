import React, { useState } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useToast } from '../ui/Toast';
import { ModalShell } from '../ui/ModalShell';
import { useConfirm } from '../ui/ConfirmDialog';
import { Avatar } from '../ui/Avatar';
import { Tabs } from '../ui/Tabs';

beforeEach(() => localStorage.clear());

describe('Toast', () => {
    function Trigger() {
        const { showToast } = useToast();
        return <button onClick={() => showToast('Guardado', 'success')}>lanzar</button>;
    }

    it('anuncia el mensaje en una región aria-live y lo quita pasado un tiempo', () => {
        jest.useFakeTimers();
        renderWithProviders(<Trigger />);
        fireEvent.click(screen.getByText('lanzar'));
        const region = screen.getByRole('status');
        expect(region).toHaveAttribute('aria-live', 'polite');
        expect(region).toHaveTextContent('Guardado');
        act(() => { jest.advanceTimersByTime(4000); });
        expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
        jest.useRealTimers();
    });
});

describe('ModalShell', () => {
    function Demo({ onClose }: { onClose: () => void }) {
        return (
            <ModalShell onClose={onClose} label="Ventana de prueba">
                <button>primero</button>
                <button>último</button>
            </ModalShell>
        );
    }

    it('es un diálogo modal accesible y enfoca el primer control', async () => {
        renderWithProviders(<Demo onClose={() => {}} />);
        const dialog = await screen.findByRole('dialog', { name: 'Ventana de prueba' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByText('primero')).toHaveFocus();
    });

    it('Escape cierra el diálogo', async () => {
        const onClose = jest.fn();
        renderWithProviders(<Demo onClose={onClose} />);
        await screen.findByRole('dialog');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('el foco no sale del diálogo con Tab', async () => {
        renderWithProviders(<Demo onClose={() => {}} />);
        await screen.findByRole('dialog');
        screen.getByText('último').focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(screen.getByText('primero')).toHaveFocus();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(screen.getByText('último')).toHaveFocus();
    });

    it('con varios abiertos, Escape cierra solo el de arriba', async () => {
        const outer = jest.fn();
        const inner = jest.fn();
        renderWithProviders(
            <ModalShell onClose={outer} label="fuera">
                <ModalShell onClose={inner} label="dentro" layer="modal-nested"><button>x</button></ModalShell>
            </ModalShell>,
        );
        await screen.findByRole('dialog', { name: 'dentro' });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(inner).toHaveBeenCalled();
        expect(outer).not.toHaveBeenCalled();
    });
});

describe('ConfirmDialog', () => {
    function Asker({ onResult }: { onResult: (v: boolean) => void }) {
        const confirm = useConfirm();
        return <button onClick={async () => onResult(await confirm({ title: '¿Borrar?', confirmLabel: 'Sí, borrar' }))}>preguntar</button>;
    }

    it('resuelve true al confirmar', async () => {
        const onResult = jest.fn();
        renderWithProviders(<Asker onResult={onResult} />);
        await userEvent.click(screen.getByText('preguntar'));
        await userEvent.click(await screen.findByRole('button', { name: 'Sí, borrar' }));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resuelve false al cancelar', async () => {
        const onResult = jest.fn();
        renderWithProviders(<Asker onResult={onResult} />);
        await userEvent.click(screen.getByText('preguntar'));
        await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
        await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    });
});

describe('Avatar', () => {
    it('muestra la inicial si no hay imagen', () => {
        renderWithProviders(<Avatar name="javier" />);
        expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('vuelve a la inicial si la imagen falla', () => {
        const { container } = renderWithProviders(<Avatar name="ana" src="https://x/rota.png" />);
        fireEvent.error(container.querySelector('img')!);
        expect(screen.getByText('A')).toBeInTheDocument();
    });
});

describe('Tabs', () => {
    function Demo() {
        const [value, setValue] = useState<'a' | 'b' | 'c'>('a');
        return <Tabs label="secciones" value={value} onChange={setValue} items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]} />;
    }

    it('marca la pestaña activa y se navega con flechas', () => {
        renderWithProviders(<Demo />);
        const tabA = screen.getByRole('tab', { name: 'A' });
        expect(tabA).toHaveAttribute('aria-selected', 'true');
        tabA.focus();
        fireEvent.keyDown(tabA, { key: 'ArrowRight' });
        expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(screen.getByRole('tab', { name: 'B' }), { key: 'End' });
        expect(screen.getByRole('tab', { name: 'C' })).toHaveFocus();
    });
});
