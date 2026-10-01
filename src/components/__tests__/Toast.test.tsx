import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ui/Toast';

function ToastTrigger({ message }: { message: string }) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(message, 'info')}>
      Mostrar Toast
    </button>
  );
}

function renderWithProvider(message: string) {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} />
    </ToastProvider>
  );
}

describe('useToast / ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('useToast exposes showToast function', () => {
    let toastFn: ((msg: string) => void) | undefined;

    function Inspector() {
      const { showToast } = useToast();
      toastFn = showToast;
      return null;
    }

    render(
      <ToastProvider>
        <Inspector />
      </ToastProvider>
    );

    expect(typeof toastFn).toBe('function');
  });

  it('shows the toast message in the DOM after calling showToast', () => {
    renderWithProvider('Hola desde el test');

    act(() => {
      screen.getByText('Mostrar Toast').click();
    });

    expect(screen.getByText('Hola desde el test')).toBeInTheDocument();
  });

  it('removes the toast from the DOM after 3500ms', () => {
    renderWithProvider('Mensaje temporal');

    act(() => {
      screen.getByText('Mostrar Toast').click();
    });

    expect(screen.getByText('Mensaje temporal')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Mensaje temporal')).not.toBeInTheDocument();
  });
});
